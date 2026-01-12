import { NextRequest } from 'next/server';
import { deleteThread, renameThread } from '@/services/threads-service';
import { corsJson, corsPreflight } from '@/lib/utils/cors';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    // ignore
  }

  const name = typeof body?.name === 'string' ? body.name : '';
  if (!name) {
    return corsJson(request, { ok: false, message: 'Missing name' }, { status: 400 });
  }

  try {
    const result = await renameThread({ request, threadId, name });
    if (!result.ok) {
      return corsJson(request, { ok: false }, { status: 200 });
    }
    return corsJson(request, { ok: true, thread: result.thread });
  } catch {
    return corsJson(request, { ok: false }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;

  try {
    const result = await deleteThread({ request, threadId });
    if (!result.ok) {
      return corsJson(request, { ok: false }, { status: 200 });
    }
    return corsJson(request, { ok: true });
  } catch {
    return corsJson(request, { ok: false }, { status: 500 });
  }
}

