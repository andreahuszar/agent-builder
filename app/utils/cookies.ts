// Cookie utility functions for storing user preferences

const COOKIE_NAME = 'chartsInDrawer';
const PO_VISIBILITY_COOKIE = 'poGrEscalationsVisible';
const LAUNCHPAD_VISIBILITY_COOKIE = 'launchpadVisible';
const EXCEPTION_NAVIGATION_COOKIE = 'exceptionNavigation';
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

// PO/GRs/Escalations visibility preference functions
export function setPOVisibilityPreference(value: boolean): void {
  const date = new Date();
  date.setTime(date.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${PO_VISIBILITY_COOKIE}=${value};${expires};path=/`;
}

export function getPOVisibilityPreference(): boolean {
  if (typeof window === 'undefined') {
    return false; // Default value for SSR - hidden by default
  }

  const name = `${PO_VISIBILITY_COOKIE}=`;
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

  return false; // Default value if cookie doesn't exist - hidden by default
}

export function deletePOVisibilityPreference(): void {
  document.cookie = `${PO_VISIBILITY_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// Launchpad visibility preference functions
export function setLaunchpadVisibilityPreference(value: boolean): void {
  const date = new Date();
  date.setTime(date.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${LAUNCHPAD_VISIBILITY_COOKIE}=${value};${expires};path=/`;
}

export function getLaunchpadVisibilityPreference(): boolean {
  if (typeof window === 'undefined') {
    return false; // Default value for SSR - hidden by default
  }

  const name = `${LAUNCHPAD_VISIBILITY_COOKIE}=`;
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

  return false; // Default value if cookie doesn't exist - hidden by default
}

export function deleteLaunchpadVisibilityPreference(): void {
  document.cookie = `${LAUNCHPAD_VISIBILITY_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// Exception navigation preference functions (ON by default)
export function setExceptionNavigationPreference(value: boolean): void {
  const date = new Date();
  date.setTime(date.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${EXCEPTION_NAVIGATION_COOKIE}=${value};${expires};path=/`;

  // Dispatch custom event to notify listeners about the preference change
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('exceptionNavigationChanged', { detail: { value } }));
  }
}

export function getExceptionNavigationPreference(): boolean {
  if (typeof window === 'undefined') {
    return true; // Default value for SSR - ON by default
  }

  const name = `${EXCEPTION_NAVIGATION_COOKIE}=`;
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

  return true; // Default value if cookie doesn't exist - ON by default
}

export function deleteExceptionNavigationPreference(): void {
  document.cookie = `${EXCEPTION_NAVIGATION_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}