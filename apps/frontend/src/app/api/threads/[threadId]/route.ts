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

  const bodyThreadId = typeof body?.threadId === 'string' ? body.threadId : null;
  if (bodyThreadId && bodyThreadId !== threadId) {
    return corsJson(request, { ok: false, message: 'threadId mismatch' }, { status: 400 });
  }

  const name = typeof body?.name === 'string' ? body.name : '';
  const accountId = typeof body?.accountId === 'string' ? body.accountId : '';
  if (!name) {
    return corsJson(request, { ok: false, message: 'Missing name' }, { status: 400 });
  }
  if (!accountId) {
    return corsJson(request, { ok: false, message: 'Missing accountId' }, { status: 400 });
  }

  try {
    const result = await renameThread({ threadId, name, accountId });
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

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    // ignore
  }

  const bodyThreadId = typeof body?.threadId === 'string' ? body.threadId : null;
  if (bodyThreadId && bodyThreadId !== threadId) {
    return corsJson(request, { ok: false, message: 'threadId mismatch' }, { status: 400 });
  }

  const accountId = typeof body?.accountId === 'string' ? body.accountId : '';
  const projectId =
    typeof body?.projectId === 'string' ? body.projectId : body?.projectId === null ? null : undefined;

  if (!accountId) {
    return corsJson(request, { ok: false, message: 'Missing accountId' }, { status: 400 });
  }

  try {
    const result = await deleteThread({ threadId, accountId, projectId: projectId ?? null });
    if (!result.ok) {
      const error_code = (result as any)?.error_code;
      return corsJson(request, { ok: false, ...(typeof error_code === 'number' ? { error_code } : {}) }, { status: 200 });
    }
    return corsJson(request, { ok: true });
  } catch {
    return corsJson(request, { ok: false }, { status: 500 });
  }
}

