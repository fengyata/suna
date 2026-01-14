import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const FLASHCLOUD_FINGERPRINT_COOKIE = 'flashcloud_auth_fingerprint';

function buildExternalLoginUrl() {
  const loginFrontend = process.env.NEXT_PUBLIC_LOGIN_FRONTEND;
  const flashrevFrontend = process.env.NEXT_PUBLIC_FLASHREV_FRONTEND;

  if (!loginFrontend || !flashrevFrontend) return '/auth';

  return `${loginFrontend}/login/flashinfo?redirect_uri=${encodeURIComponent(
    `${flashrevFrontend}/superagent`,
  )}`;
}

function redirectExternalLogin(request: NextRequest) {
  const url = buildExternalLoginUrl();
  // If url is relative (/auth), make it absolute for redirect()
  return NextResponse.redirect(new URL(url, request.url));
}

type SetLoginResponseBody =
  | { ok: true; redirectUrl: string }
  | { ok: false; redirectUrl: string; message?: string };

async function computeFlashcloudFingerprint(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function handleSetLogin(request: NextRequest) {
  const flashcloudToken = request.cookies.get('flashcloud_cookie')?.value;
  const companyId = request.cookies.get('flashcloud_company_id')?.value;

  if (!flashcloudToken) {
    return NextResponse.json<SetLoginResponseBody>(
      { ok: false, redirectUrl: buildExternalLoginUrl(), message: 'Missing flashcloud_cookie' },
      { status: 403 },
    );
  }

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backend) {
    return NextResponse.json<SetLoginResponseBody>(
      { ok: false, redirectUrl: buildExternalLoginUrl(), message: 'Missing NEXT_PUBLIC_BACKEND_URL' },
      { status: 500 },
    );
  }

  // 1) Call Python intranet/login to exchange flashcloud token -> { email, password }
  const pythonRes = await fetch(`${backend}/intranet/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${flashcloudToken}`,
      'x-auth-company': companyId || '',
    },
    cache: 'no-store',
    // Keep body for compatibility (Python can ignore if it only uses headers)
    body: JSON.stringify({
      token: flashcloudToken,
      company_id: companyId,
    }),
  });

  if (pythonRes.status === 403) {
    return NextResponse.json<SetLoginResponseBody>(
      { ok: false, redirectUrl: buildExternalLoginUrl(), message: 'Python auth failed' },
      { status: 403 },
    );
  }

  if (!pythonRes.ok) {
    return NextResponse.json<SetLoginResponseBody>(
      { ok: false, redirectUrl: buildExternalLoginUrl(), message: `Python request failed (${pythonRes.status})` },
      { status: 500 },
    );
  }

  let creds: any = null;
  try {
    creds = await pythonRes.json();
  } catch {
    // ignore
  }

  const email = typeof creds?.email === 'string' ? creds.email : '';
  const password = typeof creds?.password === 'string' ? creds.password : '';

  if (!email || !password) {
    return NextResponse.json<SetLoginResponseBody>(
      { ok: false, redirectUrl: buildExternalLoginUrl(), message: 'Invalid python response: missing email/password' },
      { status: 500 },
    );
  }

  // 2) Login to Supabase via email/password and write session cookies
  const response = NextResponse.json<SetLoginResponseBody>({ ok: true, redirectUrl: '/dashboard' });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          const isHttps = request.nextUrl.protocol === 'https:';
          cookiesToSet.forEach(({ name, value, options }) => {
            // IMPORTANT:
            // In some test environments we run on plain http (e.g. *.local-flashlabs.ai).
            // If cookies are marked as Secure, browsers will drop them on http, causing login redirect loops (307).
            response.cookies.set(name, value, { ...options, secure: isHttps });
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return NextResponse.json<SetLoginResponseBody>(
      { ok: false, redirectUrl: buildExternalLoginUrl(), message: 'Supabase signInWithPassword failed' },
      { status: 403 },
    );
  }

  // 3) Return JSON with Set-Cookie; frontend will navigate to redirectUrl
  // 同步写入 flashcloud 指纹，确保 flashcloud 身份变化时能触发重新登录
  const fingerprint = await computeFlashcloudFingerprint(`${companyId || ''}:${flashcloudToken}`);
  response.cookies.set(FLASHCLOUD_FINGERPRINT_COOKIE, fingerprint, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}

export async function GET(request: NextRequest) {
  return handleSetLogin(request);
}

export async function POST(request: NextRequest) {
  return handleSetLogin(request);
}

