'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { messages } from '@/messages/dictionary';

const SUPPORTED_LOCALES = ['vi', 'en'];
const DEFAULT_LOCALE = 'en';
const STORAGE_KEY = 'tfs-locale';

const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
  hydrated: false,
});

/**
 * Read a dot-path (e.g. "form.success.title") from a nested dictionary.
 * Returns `undefined` if any segment is missing. Defined outside the
 * provider so it has zero hook-deps overhead.
 */
function readDictPath(dict, key) {
  if (!dict || typeof key !== 'string') return undefined;
  return key.split('.').reduce((acc, k) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, k) && acc[k] != null) {
      return acc[k];
    }
    return undefined;
  }, dict);
}

function detectLocaleFromPath() {
  try {
    if (typeof window === 'undefined') return null;
    const pathname = window.location.pathname;
    const match = pathname.match(/^\/(vi|en)(?:\/|$)/i);
    if (match) return match[1].toLowerCase();
    // Check URL query param ?locale=vi or ?lang=vi
    const params = new URLSearchParams(window.location.search);
    const localeParam = params.get('locale') || params.get('lang');
    return SUPPORTED_LOCALES.includes(localeParam) ? localeParam : null;
  } catch (err) {
    return null;
  }
}

function readSavedLocale() {
  try {
    if (typeof window === 'undefined') return null;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LOCALES.includes(saved) ? saved : null;
  } catch (err) {
    // localStorage may be disabled (private mode / SSR) — log and continue.
    if (typeof console !== 'undefined') {
      console.warn('[i18n] Could not read locale from storage:', err);
    }
    return null;
  }
}

function detectLocaleFromBrowser() {
  try {
    if (typeof window === 'undefined') return null;
    const langs = Array.isArray(window.navigator.languages)
      ? window.navigator.languages
      : [window.navigator.language].filter(Boolean);
    const hasVietnamese = langs.some((lang) => String(lang).toLowerCase().startsWith('vi'));
    return hasVietnamese ? 'vi' : 'en';
  } catch (err) {
    return null;
  }
}

function persistLocale(next) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
      // Also set a cookie so middleware can read preference server-side.
      document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    }
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[i18n] Could not persist locale to storage:', err);
    }
  }
}

function removeLocalePrefix(pathname) {
  const stripped = pathname.replace(/^\/(vi|en)(?=\/|$)/i, '');
  return stripped || '/';
}

function syncUrlWithLocale(nextLocale) {
  try {
    if (typeof window === 'undefined') return;
    const { pathname, search, hash } = window.location;
    const basePath = removeLocalePrefix(pathname);
    const targetPath = nextLocale === 'vi' ? `/vi${basePath === '/' ? '' : basePath}` : basePath;
    const targetUrl = `${targetPath}${search}${hash}`;
    const currentUrl = `${pathname}${search}${hash}`;
    if (targetUrl !== currentUrl) {
      window.history.replaceState(window.history.state, '', targetUrl);
    }
  } catch (err) {
    // Ignore URL sync failures in non-browser contexts.
  }
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  // Run once on mount: rehydrate locale from localStorage. The empty deps
  // array is intentional — this is a mount-only effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const pathLocale = detectLocaleFromPath();
    const saved = readSavedLocale();
    const browserLocale = detectLocaleFromBrowser();

    // Priority: explicit URL locale > saved preference > browser language.
    const nextLocale = pathLocale || saved || browserLocale || DEFAULT_LOCALE;
    setLocaleState(nextLocale);
    persistLocale(nextLocale);
    syncUrlWithLocale(nextLocale);
    setHydrated(true);
  }, []);

  // setLocaleState is stable across renders (React setter), so no dep needed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setLocale = useCallback((next) => {
    if (!SUPPORTED_LOCALES.includes(next)) return;
    setLocaleState(next);
    persistLocale(next);
    syncUrlWithLocale(next);
  }, []);

  const t = useCallback(
    (key) => {
      const value = readDictPath(messages[locale], key);
      if (value !== undefined) return value;
      const fallbackValue = readDictPath(messages[DEFAULT_LOCALE], key);
      return fallbackValue !== undefined ? fallbackValue : key;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, hydrated }),
    [locale, setLocale, t, hydrated],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
