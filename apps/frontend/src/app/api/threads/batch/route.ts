import { NextRequest } from 'next/server';
import { batchGetThreads } from '@/services/threads-service';
import { corsJson, corsPreflight } from '@/lib/utils/cors';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    // ignore
  }

  const threadIds = Array.isArray(body?.threadIds) ? body.threadIds : null;
  if (!threadIds || !threadIds.every((x: any) => typeof x === 'string')) {
    return corsJson(request, { threads: [], message: 'Invalid threadIds' }, { status: 400 });
  }

  try {
    const result = await batchGetThreads({
      threadIds,
    });
    return corsJson(request, result);
  } catch {
    return corsJson(request, { threads: [] }, { status: 500 });
  }
}

