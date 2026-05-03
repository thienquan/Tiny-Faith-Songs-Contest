'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { messages } from '@/messages/dictionary';

const SUPPORTED_LOCALES = ['vi', 'en'];
const DEFAULT_LOCALE = 'vi';
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

function persistLocale(next) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    }
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[i18n] Could not persist locale to storage:', err);
    }
  }
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  // Run once on mount: rehydrate locale from localStorage. The empty deps
  // array is intentional — this is a mount-only effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const saved = readSavedLocale();
    if (saved) setLocaleState(saved);
    setHydrated(true);
  }, []);

  // setLocaleState is stable across renders (React setter), so no dep needed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setLocale = useCallback((next) => {
    if (!SUPPORTED_LOCALES.includes(next)) return;
    setLocaleState(next);
    persistLocale(next);
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
