import { getCookie } from "./cookie";

const flashrevBackend = process.env.NEXT_PUBLIC_FLASHREV_BACKEND;
const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

const request = async (url: string, options = {}) => {
    const token = getCookie('flashcloud_cookie');
    const company_id = getCookie('flashcloud_company_id');

    // Check if token exists, return 403 if not
    if (!token) {
        return Promise.resolve({
        status: 403,
        message: 'Unauthorized: No authentication token found'
        });
    }
  return await fetch(url, {
    headers: {
      'x-auth-company': company_id,
      'authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    credentials: 'include',
    ...options
  }).then(async res => await res.json());
}

//check-token
export const checkToken = function () {
  return request(`${flashrevBackend}/api/v2/auth/check-token`)
}
