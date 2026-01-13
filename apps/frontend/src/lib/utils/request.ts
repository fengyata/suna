//check-token
export const checkToken = function () {
  // IMPORTANT: must go through Next.js same-origin API to avoid browser CORS failures
  return fetch('/api/checkToken', {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
  }).then(async res => await res.json());
}
