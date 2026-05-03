'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { messages } from '@/messages/dictionary';

const I18nContext = createContext({
  locale: 'vi',
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState('vi');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('tfs-locale');
      if (saved === 'vi' || saved === 'en') {
        setLocaleState(saved);
      }
    } catch (_e) {}
    setHydrated(true);
  }, []);

  const setLocale = useCallback((next) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem('tfs-locale', next);
      document.documentElement.lang = next;
    } catch (_e) {}
  }, []);

  const t = useCallback(
    (key) => {
      const dict = messages[locale] || {};
      const fallback = messages.vi || {};
      const value = key.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), dict);
      if (value != null) return value;
      const fb = key.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), fallback);
      return fb != null ? fb : key;
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
