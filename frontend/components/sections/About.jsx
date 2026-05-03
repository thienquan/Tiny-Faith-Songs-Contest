'use client';

import { BookOpen, Mic2, Heart, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n-context';

const PILLAR_ICONS = [BookOpen, Mic2, Heart, Users];
const PILLAR_TONES = [
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-bubblegum-100 text-bubblegum-500',
  'bg-violet-100 text-violet-700',
];

export function About() {
  const { t } = useI18n();
  const pillars = t('about.pillars');

  return (
    <section id="about" className="section-pad relative" data-testid="about-section">
      <div className="container-app">
        <div className="max-w-3xl">
          <h2 className="heading-display text-3xl sm:text-4xl text-slate-900" data-testid="about-title">
            {t('about.title')}
          </h2>
          <p className="mt-4 text-slate-700 text-base sm:text-lg leading-relaxed" data-testid="about-lead">
            {t('about.lead')}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{t('about.organizerLabel')}:</span>{' '}
            <a
              href="https://www.youtube.com/@TinyFaithSongs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-700 hover:underline ring-focus"
              data-testid="about-organizer-link"
            >
              {t('about.organizer')}
            </a>
          </p>
        </div>

        <div
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="about-pillars"
        >
          {Array.isArray(pillars) &&
            pillars.map((p, i) => {
              const Icon = PILLAR_ICONS[i] || BookOpen;
              return (
                <Card
                  key={p.title}
                  className="hover:-translate-y-0.5 hover:shadow-pop transition-[box-shadow,transform]"
                  data-testid={`about-pillar-${i}`}
                >
                  <CardHeader>
                    <div
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${PILLAR_TONES[i] || PILLAR_TONES[0]}`}
                    >
                      <Icon size={22} strokeWidth={2.2} />
                    </div>
                    <CardTitle className="mt-3">{p.title}</CardTitle>
                    <CardDescription>{p.desc}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
        </div>

        <div
          className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex gap-3"
          data-testid="about-notice"
        >
          <AlertCircle className="shrink-0 mt-0.5 text-amber-600" size={20} />
          <div>
            <p className="text-sm font-semibold text-slate-900">{t('about.noticeTitle')}</p>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">{t('about.noticeBody')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
