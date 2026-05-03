'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X, Languages, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n-context';
import { scrollToId, cn } from '@/lib/utils';

const NAV_ITEMS = [
  { id: 'about', key: 'about' },
  { id: 'timeline', key: 'home' },
  { id: 'prizes', key: 'prizes' },
  { id: 'how-to', key: 'howTo' },
  { id: 'criteria', key: 'criteria' },
];

export function Navbar() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (id) => {
    setOpen(false);
    setTimeout(() => scrollToId(id), 50);
  };

  const toggleLocale = () => setLocale(locale === 'vi' ? 'en' : 'vi');

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b transition-colors',
        scrolled
          ? 'bg-white/85 backdrop-blur border-slate-200'
          : 'bg-white/60 backdrop-blur-sm border-transparent',
      )}
      data-testid="site-navbar"
    >
      <div className="container-app flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 ring-focus rounded-lg pl-1 pr-2 py-1"
          data-testid="navbar-logo"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-bubblegum-400 text-white shadow-soft">
            <Music size={18} strokeWidth={2.6} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-bold text-slate-900">Tiny Faith Songs</span>
            <span className="text-[11px] text-slate-500 font-medium">Bible Song Contest 2026</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 ring-focus transition-colors"
              data-testid={`navbar-link-${item.id}`}
            >
              {t(`nav.${item.key}`)}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLocale}
            className="gap-1.5"
            data-testid="navbar-language-toggle"
            aria-label={t('nav.languageLabel')}
          >
            <Languages size={16} />
            <span className="font-bold tracking-wide" data-testid="navbar-language-current">
              {locale === 'vi' ? 'VI' : 'EN'}
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-400 font-bold">{locale === 'vi' ? 'EN' : 'VI'}</span>
          </Button>
          <Button
            size="sm"
            onClick={() => handleNav('register')}
            className="hidden sm:inline-flex"
            data-testid="navbar-register-button"
          >
            {t('nav.register')}
          </Button>
          <button
            type="button"
            className="lg:hidden rounded-lg p-2 ring-focus hover:bg-slate-100"
            onClick={() => setOpen((o) => !o)}
            aria-label={t('nav.mobileMenu')}
            data-testid="navbar-mobile-menu-button"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-200 bg-white" data-testid="navbar-mobile-menu">
          <div className="container-app py-3 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className="w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 ring-focus"
                data-testid={`navbar-mobile-link-${item.id}`}
              >
                {t(`nav.${item.key}`)}
              </button>
            ))}
            <Button
              size="lg"
              onClick={() => handleNav('register')}
              className="mt-2"
              data-testid="navbar-mobile-register-button"
            >
              {t('nav.register')}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
