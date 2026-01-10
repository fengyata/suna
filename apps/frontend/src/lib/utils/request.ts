import { getCookie, setCookie } from "./cookie";

const backend = process.env.NEXT_PUBLIC_FLASHREV_BACKEND;

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
    ...options
  }).then(async res => await res.json());
}

//check-token
export const checkToken = function () {
  return request(`${backend}/api/v2/auth/check-token`)
}

// getLoginInfo
export const getLoginInfo = function () {
  const token = getCookie('flashcloud_cookie');
  const company_id = getCookie('flashcloud_company_id');
  
  // Check if token exists, return 403 if not
  if (!token) {
    return Promise.resolve({
      status: 403,
      message: 'Unauthorized: No authentication token found'
    });
  }
  
  return request('/api/v1/intranet/login', { // `${process.env.NEXT_PUBLIC_BACKEND_URL}/intranet/login`
    method: 'POST',
    body: JSON.stringify({
      token: token,
      company_id: company_id
    })
  }).then(response => {
    console.log('response', response);
    // 如果请求成功且返回的响应中包含 token，则保存到 cookie
    if (response && response.token) {
      setCookie('sb-gisiphzofmhgbjdzdgtx-auth-token', response.token);
    }
    return response;
  })
}