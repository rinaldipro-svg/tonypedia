export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/([.*+?^=!:${}()|\[\]\\])/g, '\\$1')}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, maxAge: number = 31536000): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/`;
}

export function initTheme(): void {
  const theme = getCookie('theme') || 'dark';
  const html = document.documentElement;

  if (theme === 'light') {
    html.classList.add('light');
  } else {
    html.classList.remove('light');
  }
}

export function toggleTheme(): void {
  const html = document.documentElement;
  const isLight = html.classList.contains('light');

  if (isLight) {
    html.classList.remove('light');
    setCookie('theme', 'dark');
  } else {
    html.classList.add('light');
    setCookie('theme', 'light');
  }
}
