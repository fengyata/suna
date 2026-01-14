import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getFlashcloudAuthFromRequest(request: NextRequest): { token: string; companyId: string } | null {
  // Prefer explicit headers (e.g. Postman / cross-origin client)
  // NOTE: some proxies (nginx/ingress) drop headers with '_' by default.
  // So we support both underscore and hyphen variants.
  const tokenFromFlashcloudHeader =
    request.headers.get('flashcloud_cookie') ||
    request.headers.get('Flashcloud-Cookie') ||
    request.headers.get('flashcloud-cookie') ||
    request.headers.get('flashcloud_cookie'.toUpperCase()) ||
    null;
  const companyIdFromFlashcloudHeader =
    request.headers.get('flashcloud_company_id') ||
    request.headers.get('Flashcloud-Company-Id') ||
    request.headers.get('flashcloud-company-id') ||
    request.headers.get('flashcloud_company_id'.toUpperCase()) ||
    null;

  // Also support "standard-ish" headers used by our backend proxy calls
  const authz = request.headers.get('authorization') || request.headers.get('Authorization');
  const tokenFromAuthz =
    authz && authz.toLowerCase().startsWith('bearer ') ? authz.slice('bearer '.length).trim() : null;
  const companyIdFromXAuthCompany =
    request.headers.get('x-auth-company') ||
    request.headers.get('X-Auth-Company') ||
    request.headers.get('x_auth_company') ||
    request.headers.get('x-auth-company'.toUpperCase()) ||
    null;

  // Optional query fallback (useful for debugging / non-browser clients)
  let tokenFromQuery: string | null = null;
  let companyIdFromQuery: string | null = null;
  try {
    const url = new URL(request.url);
    tokenFromQuery = url.searchParams.get('flashcloud_cookie') || url.searchParams.get('token');
    companyIdFromQuery = url.searchParams.get('flashcloud_company_id') || url.searchParams.get('company_id');
  } catch {
    // ignore
  }

  // Fallback to cookies (browser normal flow)
  const tokenFromCookie = request.cookies.get('flashcloud_cookie')?.value || null;
  const companyIdFromCookie = request.cookies.get('flashcloud_company_id')?.value || null;

  const token = tokenFromFlashcloudHeader || tokenFromAuthz || tokenFromQuery || tokenFromCookie;
  const companyId = companyIdFromFlashcloudHeader || companyIdFromXAuthCompany || companyIdFromQuery || companyIdFromCookie;

  if (!token || !companyId) return null;
  return { token, companyId };
}

export async function GET(request: NextRequest) {
  const auth = getFlashcloudAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ code: 403, message: 'Unauthorized' }, { status: 403 });
  }

  const flashrevBackend = process.env.NEXT_PUBLIC_FLASHREV_BACKEND;
  if (!flashrevBackend) {
    return NextResponse.json({ code: 500, message: 'Missing NEXT_PUBLIC_FLASHREV_BACKEND' }, { status: 500 });
  }

  try {
    const res = await fetch(`${flashrevBackend}/api/v2/auth/check-token`, {
      method: 'GET',
      headers: {
        'x-auth-company': auth.companyId,
        authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { code: res.status, message: 'Invalid response' }, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ code: 500, message: 'Failed to fetch' }, { status: 500 });
  }
}

