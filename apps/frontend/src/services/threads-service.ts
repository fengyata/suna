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
  account_id?: string;
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

export type ThreadsBatchResponse = {
  threads: Array<{
    thread_id: string;
    project_id: string | null;
    name: string | null;
    created_at: string;
    updated_at: string;
    is_public: boolean | null;
    account_id: string;
  }>;
};

type FlashcloudAuth = {
  token: string;
  companyId: string;
};

function getFlashcloudAuthFromRequest(request: NextRequest): FlashcloudAuth | null {
  // Prefer explicit headers (e.g. Postman / cross-origin client)
  const tokenFromFlashcloudHeader = request.headers.get('flashcloud_cookie') || request.headers.get('Flashcloud-Cookie');
  const companyIdFromFlashcloudHeader =
    request.headers.get('flashcloud_company_id') || request.headers.get('Flashcloud-Company-Id');

  // Also support "standard-ish" headers used by our backend proxy calls
  const authz = request.headers.get('authorization') || request.headers.get('Authorization');
  const tokenFromAuthz =
    authz && authz.toLowerCase().startsWith('bearer ') ? authz.slice('bearer '.length).trim() : null;
  const companyIdFromXAuthCompany =
    request.headers.get('x-auth-company') || request.headers.get('X-Auth-Company') || request.headers.get('x_auth_company');

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

  // Fallback to cookies (browser same-origin / shared-domain cookie flow)
  const tokenFromCookie = request.cookies.get('flashcloud_cookie')?.value || null;
  const companyIdFromCookie = request.cookies.get('flashcloud_company_id')?.value || null;

  const token = tokenFromFlashcloudHeader || tokenFromAuthz || tokenFromQuery || tokenFromCookie;
  const companyId = companyIdFromFlashcloudHeader || companyIdFromXAuthCompany || companyIdFromQuery || companyIdFromCookie;

  if (!token || !companyId) return null;
  return { token, companyId };
}

/**
 * Fetch accountId from 3rd-party API. On any error, return null (no throw).
 * Contract: creds.accountId
 */
export async function fetchAccountId(request: NextRequest): Promise<string | null> {
  const auth = getFlashcloudAuthFromRequest(request);
  if (!auth) return null;

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
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

  const accountId = await fetchAccountId(request);

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
    .select('thread_id, project_id, name, created_at, updated_at, is_public, account_id', { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
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

export async function batchGetThreads(params: {
  threadIds: string[];
}): Promise<ThreadsBatchResponse> {
  const threadIds = Array.isArray(params.threadIds) ? params.threadIds.filter((x) => typeof x === 'string' && x) : [];

  if (threadIds.length === 0) {
    return { threads: [] };
  }

  // Safety cap to avoid giant IN queries
  const cappedIds = threadIds.slice(0, 500);

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('threads')
    .select('thread_id, project_id, name, created_at, updated_at, is_public, account_id')
    .in('thread_id', cappedIds);

  if (error) {
    throw error;
  }

  const byId = new Map<string, ThreadsBatchResponse['threads'][number]>();
  for (const row of (data || []) as any[]) {
    if (row?.thread_id) {
      byId.set(row.thread_id, row);
    }
  }

  // Keep output order identical to input order (including duplicates)
  const ordered: ThreadsBatchResponse['threads'] = [];
  for (const id of cappedIds) {
    const row = byId.get(id);
    if (row) ordered.push(row);
  }

  return { threads: ordered };
}

export async function renameThread(params: {
  threadId: string;
  name: string;
  accountId: string;
}): Promise<{ ok: true; thread: ThreadRow } | { ok: false }> {
  const { threadId, name, accountId } = params;
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
  threadId: string;
  accountId: string;
  projectId: string | null;
}): Promise<{ ok: true } | { ok: false; error_code?: number }> {
  const { threadId, accountId, projectId } = params;
  if (!accountId) return { ok: false };
  const supabase = getSupabaseAdminClient();

  // Guard: do not allow deletion if latest agent run is still running
  const { data: latestRun, error: latestRunError } = await supabase
    .from('agent_runs')
    .select('status')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRunError) throw latestRunError;

  if (latestRun?.status === 'running') {
    return { ok: false, error_code: 80001 };
  }

  // 2) Delete dependent data first to avoid FK violations (agent_runs has no ON DELETE CASCADE).
  // Optimize: delete agent_runs + messages in parallel, and also fetch remainingCount (excluding current thread)
  // so we can decide whether to delete the project later without extra round-trips.
  const [agentRunsRes, messagesRes, remainingRes] = await Promise.all([
    supabase.from('agent_runs').delete().eq('thread_id', threadId),
    supabase.from('messages').delete().eq('thread_id', threadId),
    projectId
      ? supabase
          .from('threads')
          .select('thread_id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('account_id', accountId)
          .neq('thread_id', threadId)
      : Promise.resolve({ count: 0 as number | null, error: null as any }),
  ]);

  if (agentRunsRes.error) throw agentRunsRes.error;
  if (messagesRes.error) throw messagesRes.error;
  if (remainingRes.error) throw remainingRes.error;

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
    const remainingCount = typeof remainingRes.count === 'number' ? remainingRes.count : 0;
    if (remainingCount === 0) {
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

