import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getFlashcloudFromRequest(request: NextRequest): { token: string; companyId: string } | null {
  // Prefer headers (e.g. Postman / cross-origin clients); fallback to cookies (browser normal flow)
  const token =
    request.headers.get('flashcloud_cookie') ||
    request.headers.get('Flashcloud-Cookie') ||
    request.cookies.get('flashcloud_cookie')?.value ||
    '';
  const companyId =
    request.headers.get('flashcloud_company_id') ||
    request.headers.get('Flashcloud-Company-Id') ||
    request.cookies.get('flashcloud_company_id')?.value ||
    '';

  if (!token || !companyId) return null;
  return { token, companyId };
}

export async function GET(request: NextRequest) {
  const auth = getFlashcloudFromRequest(request);
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

