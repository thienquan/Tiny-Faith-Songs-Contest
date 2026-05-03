'use client';

import { Calendar, Clock, ListMusic, Users2, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n-context';

export function Timeline() {
  const { t } = useI18n();
  const eligibility = t('timeline.eligibilityBullets');
  const events = t('timeline.events');

  return (
    <section
      id="timeline"
      className="section-pad relative gradient-section-blue"
      data-testid="timeline-section"
    >
      <div className="container-app">
        <div className="max-w-2xl">
          <h2 className="heading-display text-3xl sm:text-4xl text-slate-900" data-testid="timeline-title">
            {t('timeline.title')}
          </h2>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Eligibility */}
          <Card data-testid="eligibility-card">
            <CardHeader>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <Users2 size={22} strokeWidth={2.2} />
              </div>
              <CardTitle className="mt-3">{t('timeline.eligibilityTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {Array.isArray(eligibility) &&
                  eligibility.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-slate-700">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
                      <span>{bullet}</span>
                    </li>
                  ))}
              </ul>
              <p className="mt-4 text-xs text-slate-500 flex gap-1.5">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>{t('timeline.noteRights')}</span>
              </p>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card data-testid="schedule-card">
            <CardHeader>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-bubblegum-100 text-bubblegum-500">
                <Calendar size={22} strokeWidth={2.2} />
              </div>
              <CardTitle className="mt-3">{t('timeline.timelineTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l-2 border-sky-200 ml-2 space-y-5">
                {Array.isArray(events) &&
                  events.map((ev, i) => (
                    <li key={ev.date} className="pl-5" data-testid={`timeline-event-${i}`}>
                      <span
                        className="absolute -left-[7px] flex h-3 w-3 items-center justify-center rounded-full bg-sky-500 ring-4 ring-white"
                        aria-hidden="true"
                      />
                      <p className="text-sm font-bold text-sky-700">{ev.date}</p>
                      <p className="text-sm text-slate-700 mt-0.5">{ev.label}</p>
                    </li>
                  ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Playlist call-out */}
        <div
          className="mt-8 rounded-2xl border border-sky-200 bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
          data-testid="playlist-callout"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <ListMusic size={22} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{t('timeline.playlistHint')}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Clock size={12} /> 6 songs • official playlist
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" data-testid="playlist-button">
            <a
              href="https://www.youtube.com/playlist?list=PL_76YSYegiJLt7YDQhP7ptUmSBNt2uOz6"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('timeline.playlistCta')}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
