export function getCookie(name: string) {
  if (typeof window === 'undefined') return null;
  return document.cookie.split('; ').find(row => row.startsWith(`${name}=`))?.split('=')[1];
}

export function setCookie(name: string, value: string) {
  console.log('setCookie', name, value);
  if (typeof window === 'undefined') return;
  // 设置 SameSite=Lax 以确保 cookie 在跨站请求时也能被发送
  // 如果是 HTTPS，可以添加 Secure 属性
  const isSecure = window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  document.cookie = `${name}=${value}; path=/; SameSite=Lax${secureFlag}`;
}
