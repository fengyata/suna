import { getCookie } from './cookie';

// check-token
export const checkToken = function () {
  // IMPORTANT: must go through Next.js same-origin API to avoid browser CORS failures
  const token = getCookie('flashcloud_cookie');
  const companyId = getCookie('flashcloud_company_id');

  if (!token || !companyId) return Promise.resolve(null);

  const headers: Record<string, string> = {};
  if (companyId) headers['x-auth-company'] = companyId;
  if (token) headers['authorization'] = `Bearer ${token}`;

  return fetch('/api/checkToken', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
    headers,
  }).then(async (res) => await res.json());
};
