'use client';

import { Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BAR_COLORS = ['bg-sky-500', 'bg-amber-400', 'bg-bubblegum-400', 'bg-emerald-500'];
const BAR_TINTS = ['bg-sky-100', 'bg-amber-100', 'bg-bubblegum-100', 'bg-emerald-100'];

export function Criteria() {
  const { t } = useI18n();
  const items = t('criteria.items');

  return (
    <section
      id="criteria"
      className="section-pad relative gradient-section-blue"
      data-testid="criteria-section"
    >
      <div className="container-app">
        <div className="max-w-2xl">
          <h2 className="heading-display text-3xl sm:text-4xl text-slate-900" data-testid="criteria-title">
            {t('criteria.title')}
          </h2>
          <p className="mt-3 text-slate-700" data-testid="criteria-subtitle">
            {t('criteria.subtitle')}
          </p>
        </div>

        <Card className="mt-8" data-testid="criteria-chart-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="text-amber-500" /> 100% =
              <span className="text-sky-700">40 + 20 + 20 + 20</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="criteria-chart">
              {Array.isArray(items) &&
                items.map((it, i) => (
                  <div key={it.label} className="" data-testid={`criteria-item-${i}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{it.label}</span>
                      <span
                        className="text-sm font-display font-bold text-slate-900"
                        data-testid={`criteria-percent-${i}`}
                      >
                        {it.percent}%
                      </span>
                    </div>
                    <div
                      className={`mt-2 h-3 w-full rounded-full ${BAR_TINTS[i % BAR_TINTS.length]}`}
                      role="progressbar"
                      aria-valuenow={it.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`h-3 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]} transition-[width] duration-700`}
                        style={{ width: `${it.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-amber-200 bg-amber-50/60" data-testid="criteria-tiebreaker">
          <CardHeader>
            <CardTitle>{t('criteria.tieBreakerTitle')}</CardTitle>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">{t('criteria.tieBreaker')}</p>
          </CardHeader>
        </Card>
      </div>
    </section>
  );
}
