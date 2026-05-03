'use client';

import { Mail, Youtube, Heart } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer
      className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-bubblegum-50 border-t border-slate-200"
      data-testid="site-footer"
    >
      <div className="container-app py-10 sm:py-14">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="font-display text-xl font-bold text-slate-900">Tiny Faith Songs</p>
            <p className="mt-2 text-sm text-slate-600 max-w-prose leading-relaxed" data-testid="footer-tagline">
              {t('footer.tagline')}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <a
              href={`mailto:${t('footer.contactEmail')}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:underline ring-focus rounded-md"
              data-testid="footer-contact-email"
            >
              <Mail size={16} /> {t('footer.contactEmail')}
            </a>
            <a
              href="https://www.youtube.com/@TinyFaithSongs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-sky-700 ring-focus rounded-md"
              data-testid="footer-youtube-link"
            >
              <Youtube size={16} /> {t('footer.youtube')}
            </a>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 justify-between items-center">
          <p data-testid="footer-copyright">{t('footer.copyright')}</p>
          <p className="inline-flex items-center gap-1">
            Made with <Heart size={12} className="text-bubblegum-400" fill="currentColor" /> for kids and families.
          </p>
        </div>
      </div>
    </footer>
  );
}
