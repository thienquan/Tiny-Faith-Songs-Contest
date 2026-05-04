'use client';

import Image from 'next/image';
import { useI18n } from '@/lib/i18n-context';

export function Poster() {
  const { t, locale } = useI18n();
  const posterSrc = locale === 'en' ? '/poster-vertical-en.jpg' : '/poster-vertical.jpg';

  return (
    <section className="py-10 sm:py-14 lg:hidden" data-testid="poster-section" id="poster">
      <div className="container-app">
        <h2
          className="heading-display text-2xl text-slate-900 mb-4"
          data-testid="poster-title"
        >
          {t('poster.title')}
        </h2>
        <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-soft">
          <Image
            src={posterSrc}
            alt={t('poster.alt')}
            width={1200}
            height={1600}
            sizes="(max-width: 640px) 100vw, 420px"
            className="w-full h-auto block"
            data-testid="poster-image"
          />
        </div>
        <p className="mt-3 text-sm text-slate-600 text-center" data-testid="poster-caption">
          {t('poster.caption')}
        </p>
      </div>
    </section>
  );
}
