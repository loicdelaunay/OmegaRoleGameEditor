/**
 * Browser detection utilities for OmegaJDR.
 * Checks whether the current browser environment is Google Chrome.
 */

export interface BrowserInfo {
  isChrome: boolean;
  browserName: string;
}

/**
 * Returns true if the detected browser is Google Chrome (and not Chromium derivatives like Edge, Opera, Brave, etc.).
 */
export function isGoogleChrome(customUserAgent?: string, customVendor?: string): boolean {
  if (typeof window === 'undefined' && customUserAgent === undefined) {
    return true;
  }

  const nav = typeof navigator !== 'undefined' ? (navigator as any) : undefined;
  const ua = customUserAgent !== undefined ? customUserAgent : (nav?.userAgent || '');
  const vendor = customVendor !== undefined ? customVendor : (nav?.vendor || '');

  // 1. Check if Brave (has navigator.brave)
  if (customUserAgent === undefined && nav?.brave !== undefined) {
    return false;
  }

  // 2. Check if Opera legacy object exists
  if (customUserAgent === undefined && typeof window !== 'undefined') {
    if ((window as any).opr !== undefined || (window as any).opera !== undefined) {
      return false;
    }
  }

  // 3. Check navigator.userAgentData if supported (modern Chromium browsers)
  if (customUserAgent === undefined && nav?.userAgentData?.brands && Array.isArray(nav.userAgentData.brands)) {
    const brands: string[] = nav.userAgentData.brands.map((b: { brand: string; version?: string }) => b.brand || '');
    const hasEdge = brands.some(b => /Edge|Microsoft Edge/i.test(b));
    const hasOpera = brands.some(b => /Opera|OPR/i.test(b));
    const hasBrave = brands.some(b => /Brave/i.test(b));
    const hasVivaldi = brands.some(b => /Vivaldi/i.test(b));
    const hasYandex = brands.some(b => /YaBrowser|Yandex/i.test(b));

    if (hasEdge || hasOpera || hasBrave || hasVivaldi || hasYandex) {
      return false;
    }

    const hasGoogleChrome = brands.some(b => b === 'Google Chrome');
    if (hasGoogleChrome) {
      return true;
    }
  }

  // 4. Disqualify based on User-Agent patterns
  if (/Edg\/|Edge\//i.test(ua)) return false;
  if (/OPR\/|Opera\//i.test(ua)) return false;
  if (/Firefox\/|FxiOS\//i.test(ua)) return false;
  if (/SamsungBrowser\//i.test(ua)) return false;
  if (/Vivaldi\//i.test(ua)) return false;
  if (/YaBrowser\//i.test(ua)) return false;
  if (/UCBrowser\//i.test(ua)) return false;
  if (/DuckDuckGo\//i.test(ua)) return false;
  if (/Silk\//i.test(ua)) return false;

  // Safari without Chrome
  const hasChromeToken = /Chrome\/|CriOS\//i.test(ua);
  if (/Safari\//i.test(ua) && !hasChromeToken) {
    return false;
  }

  if (!hasChromeToken) {
    return false;
  }

  // Google Inc. vendor check (standard on Chrome Desktop & Android)
  if (vendor && !/Google Inc/i.test(vendor)) {
    return false;
  }

  return true;
}

/**
 * Returns a human-friendly name of the current browser.
 */
export function getDetectedBrowserName(customUserAgent?: string): string {
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : undefined;
  const ua = customUserAgent !== undefined ? customUserAgent : (nav?.userAgent || '');

  if (customUserAgent === undefined && nav?.brave !== undefined) return 'Brave';
  if (customUserAgent === undefined && typeof window !== 'undefined' && ((window as any).opr !== undefined || (window as any).opera !== undefined)) {
    return 'Opera';
  }

  if (/Edg\/|Edge\//i.test(ua)) return 'Microsoft Edge';
  if (/OPR\/|Opera\//i.test(ua)) return 'Opera';
  if (/Firefox\/|FxiOS\//i.test(ua)) return 'Mozilla Firefox';
  if (/SamsungBrowser\//i.test(ua)) return 'Samsung Internet';
  if (/Vivaldi\//i.test(ua)) return 'Vivaldi';
  if (/YaBrowser\//i.test(ua)) return 'Yandex Browser';
  if (/UCBrowser\//i.test(ua)) return 'UC Browser';
  if (/Safari\//i.test(ua) && !/Chrome\/|CriOS\//i.test(ua)) return 'Apple Safari';
  if (/Chrome\/|CriOS\//i.test(ua)) return 'Google Chrome';

  return 'Unknown Browser';
}
