import 'server-only';

import type { NextRequest } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ThreadRow = {
  thread_id: string;
  project_id: string | null;
  name: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean | null;
};

export type ThreadsListResponse = {
  threads: ThreadRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

type FlashcloudAuth = {
  token: string;
  companyId: string;
};

function getFlashcloudAuthFromRequest(request: NextRequest): FlashcloudAuth | null {
  // Prefer explicit headers (e.g. Postman / cross-origin client)
  const tokenFromHeader = request.headers.get('flashcloud_cookie') || request.headers.get('Flashcloud-Cookie');
  const companyIdFromHeader =
    request.headers.get('flashcloud_company_id') || request.headers.get('Flashcloud-Company-Id');

  // Fallback to cookies (typical browser flow)
  const token = tokenFromHeader || request.cookies.get('flashcloud_cookie')?.value;
  const companyId = companyIdFromHeader || request.cookies.get('flashcloud_company_id')?.value;
  console.log('token', token);
  console.log('companyId', companyId);
  if (!token || !companyId) return null;
  return { token, companyId };
}

/**
 * Fetch accountId from 3rd-party API. On any error, return null (no throw).
 * Contract: creds.accountId
 */
export async function fetchAccountId(request: NextRequest): Promise<string | null> {
  const auth = getFlashcloudAuthFromRequest(request);
  console.log('auth', auth);
  if (!auth) return null;

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
  console.log('backend', backend);
  if (!backend) return null;

  try {
    const res = await fetch(`${backend}/intranet/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${auth.token}`,
        'x-auth-company': auth.companyId,
      },
      cache: 'no-store',
      body: JSON.stringify({
        token: auth.token,
        company_id: auth.companyId,
      }),
    });

    if (!res.ok) return null;

    const creds: any = await res.json().catch(() => null);
    console.log('creds', creds);
    // Prefer accountId; fallback to account_id for compatibility.
    const accountId =
      (typeof creds?.accountId === 'string' && creds.accountId) ||
      (typeof creds?.account_id === 'string' && creds.account_id) ||
      null;
    return accountId;
  } catch {
    return null;
  }
}

function getSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function listThreads(params: {
  request: NextRequest;
  page: number; // 1-based
  limit: number;
}): Promise<ThreadsListResponse> {
  const { request } = params;
  const page = Number.isFinite(params.page) && params.page > 0 ? params.page : 1;
  const limit = Number.isFinite(params.limit) && params.limit > 0 ? Math.min(params.limit, 200) : 20;

  console.log('request', request);

  const accountId = await fetchAccountId(request);

  console.log('accountId', accountId);
  if (!accountId) {
    return {
      threads: [],
      pagination: { page, limit, total: 0, pages: 0 },
    };
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = getSupabaseAdminClient();

  const { data, error, count } = await supabase
    .from('threads')
    .select('thread_id, project_id, name, created_at, updated_at, is_public', { count: 'exact' })
    .eq('account_id', accountId)
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) {
    // For safety, do not leak error details to clients here; caller can map to 500.
    throw error;
  }

  const total = typeof count === 'number' ? count : 0;
  const pages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    threads: (data || []) as ThreadRow[],
    pagination: { page, limit, total, pages },
  };
}

export async function renameThread(params: {
  request: NextRequest;
  threadId: string;
  name: string;
}): Promise<{ ok: true; thread: ThreadRow } | { ok: false }> {
  const { request, threadId, name } = params;

  const accountId = await fetchAccountId(request);
  if (!accountId) return { ok: false };

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('threads')
    .update({ name })
    .eq('thread_id', threadId)
    .eq('account_id', accountId)
    .select('thread_id, project_id, name, created_at, updated_at, is_public')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return { ok: false };
  return { ok: true, thread: data as ThreadRow };
}

export async function deleteThread(params: {
  request: NextRequest;
  threadId: string;
}): Promise<{ ok: true } | { ok: false }> {
  const { request, threadId } = params;

  const accountId = await fetchAccountId(request);
  if (!accountId) return { ok: false };

  const supabase = getSupabaseAdminClient();

  // Mirror backend logic (core/threads/repo.py delete_thread_data + api.py cleanup):
  // 1) Read project_id (and ensure ownership via account_id).
  const { data: threadRow, error: threadRowError } = await supabase
    .from('threads')
    .select('thread_id, project_id')
    .eq('thread_id', threadId)
    .eq('account_id', accountId)
    .maybeSingle();

  if (threadRowError) throw threadRowError;
  if (!threadRow) return { ok: false };

  const projectId = (threadRow as any).project_id as string | null;

  // 2) Delete dependent data first to avoid FK violations (agent_runs has no ON DELETE CASCADE).
  const { error: agentRunsError } = await supabase.from('agent_runs').delete().eq('thread_id', threadId);
  if (agentRunsError) throw agentRunsError;

  // Backend also deletes messages explicitly; keep behavior consistent.
  const { error: messagesError } = await supabase.from('messages').delete().eq('thread_id', threadId);
  if (messagesError) throw messagesError;

  // 3) Delete thread
  const { data: deletedThreads, error: deleteThreadError } = await supabase
    .from('threads')
    .delete()
    .eq('thread_id', threadId)
    .eq('account_id', accountId)
    .select('thread_id');

  if (deleteThreadError) throw deleteThreadError;
  if (!deletedThreads || deletedThreads.length === 0) return { ok: false };

  // 4) If this was the last thread in the project, delete the project (best-effort parity with backend).
  if (projectId) {
    const { count: remainingCount, error: countError } = await supabase
      .from('threads')
      .select('thread_id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (countError) throw countError;

    if ((remainingCount || 0) === 0) {
      const { error: deleteProjectError } = await supabase
        .from('projects')
        .delete()
        .eq('project_id', projectId)
        .eq('account_id', accountId);

      if (deleteProjectError) throw deleteProjectError;
    }
  }

  return { ok: true };
}

