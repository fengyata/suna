import { NextRequest, NextResponse } from 'next/server';

function isAllowedHostname(hostname: string) {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  if (hostname === 'eape.mobi' || hostname.endsWith('.eape.mobi')) return true;
  if (hostname === 'flashlabs.ai' || hostname.endsWith('.flashlabs.ai')) return true;
  return false;
}

function getAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;

  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return isAllowedHostname(url.hostname) ? origin : null;
  } catch {
    return null;
  }
}

export function withCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = getAllowedOrigin(request);
  if (!origin) return response;

  // If the browser sent a preflight header list, echo it back to avoid missing UA/client-hint headers.
  const requestedHeaders = request.headers.get('access-control-request-headers');
  const allowHeaders =
    requestedHeaders || 'content-type, flashcloud_cookie, flashcloud_company_id, authorization';

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', allowHeaders);
  response.headers.set('Access-Control-Max-Age', '600');
  response.headers.set('Vary', 'Origin');

  return response;
}

export function corsJson<T>(
  request: NextRequest,
  body: T,
  init?: Parameters<typeof NextResponse.json<T>>[1],
): NextResponse {
  return withCors(request, NextResponse.json<T>(body, init));
}

export function corsPreflight(request: NextRequest): NextResponse {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

