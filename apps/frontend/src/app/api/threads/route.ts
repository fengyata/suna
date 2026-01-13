import { NextRequest, NextResponse } from 'next/server';
import { listThreads } from '@/services/threads-service';
import { corsJson, corsPreflight } from '@/lib/utils/cors';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  console.log('OPTIONS request-->', request.headers);
  return corsPreflight(request);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '20');

  console.log('request-->', request.headers);
  try {
    const result = await listThreads({
      request,
      page,
      limit,
    });

    return corsJson(request, result);
  } catch {
    return corsJson(
      request,
      {
        threads: [],
        pagination: { page: page > 0 ? page : 1, limit: limit > 0 ? limit : 20, total: 0, pages: 0 },
      },
      { status: 500 },
    );
  }
}

