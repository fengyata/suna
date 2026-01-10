export function getCookie(name: string) {
  if (typeof window === 'undefined') return null;
  return document.cookie.split('; ').find(row => row.startsWith(`${name}=`))?.split('=')[1];
}

export function setCookie(name: string, value: string) {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=${value}; path=/`;
}
