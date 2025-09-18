// Cookie utility functions for storing user preferences

const COOKIE_NAME = 'chartsInDrawer';
const COOKIE_EXPIRY_DAYS = 365; // Store preference for 1 year

export function setChartsInDrawerPreference(value: boolean): void {
  const date = new Date();
  date.setTime(date.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${COOKIE_NAME}=${value};${expires};path=/`;
}

export function getChartsInDrawerPreference(): boolean {
  if (typeof window === 'undefined') {
    return false; // Default value for SSR
  }

  const name = `${COOKIE_NAME}=`;
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');

  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name) === 0) {
      const value = cookie.substring(name.length, cookie.length);
      return value === 'true';
    }
  }

  return false; // Default value if cookie doesn't exist
}

export function deleteChartsInDrawerPreference(): void {
  document.cookie = `${COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}