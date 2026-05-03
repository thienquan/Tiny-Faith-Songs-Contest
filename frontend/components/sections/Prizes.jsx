'use client';

import { Trophy, Medal, Award, Sparkles, BadgeDollarSign, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FloatingDecor } from '@/components/ui/floating-decor';
import { useI18n } from '@/lib/i18n-context';

function PrizeCard({ icon: Icon, rank, amount, count, accent, testId }) {
  return (
    <Card
      className={`relative overflow-hidden ${accent.border} ${accent.bg} hover:-translate-y-1 hover:shadow-pop transition-[transform,box-shadow]`}
      data-testid={testId}
    >
      <div className={`absolute -top-12 -right-10 h-32 w-32 rounded-full ${accent.blob} blur-2xl`} />
      <CardHeader className="relative">
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accent.iconBg}`}>
          <Icon size={24} strokeWidth={2.2} className={accent.iconText} />
        </div>
        <Badge variant="outline" className={`mt-3 ${accent.badgeText}`}>
          {rank}
        </Badge>
        <CardTitle className="mt-2 font-display text-3xl sm:text-4xl" data-testid={`${testId}-amount`}>
          {amount}
        </CardTitle>
        <CardDescription className="text-sm">{count}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function RobotMascot({ alt }) {
  // Placeholder mascot until robot-mascot.jpg is uploaded.
  return (
    <div
      className="relative mx-auto w-44 sm:w-56 lg:w-64 aspect-square rounded-3xl bg-gradient-to-br from-sky-100 via-white to-bubblegum-100 border border-sky-200 shadow-soft animate-floaty-lg flex items-center justify-center"
      data-testid="robot-mascot-placeholder"
      role="img"
      aria-label={alt}
    >
      <div className="absolute inset-3 rounded-2xl border-2 border-dashed border-sky-300/70" />
      <div className="flex flex-col items-center gap-2 text-sky-700">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-soft">
          <Bot size={36} strokeWidth={2.2} />
        </span>
        <span className="text-xs font-semibold tracking-wide uppercase text-slate-500">Tiny Faith</span>
      </div>
    </div>
  );
}

export function Prizes() {
  const { t } = useI18n();
  return (
    <section id="prizes" className="section-pad relative" data-testid="prizes-section">
      <FloatingDecor tone="amber" density="sparse" />

      <div className="container-app relative">
        <div className="max-w-2xl">
          <h2 className="heading-display text-3xl sm:text-4xl text-slate-900" data-testid="prizes-title">
            {t('prizes.title')}
          </h2>
          <p className="mt-3 text-slate-700" data-testid="prizes-subtitle">
            {t('prizes.subtitle')}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-12 items-center">
          {/* Mascot column */}
          <div className="lg:col-span-3 order-1 lg:order-1">
            <RobotMascot alt={t('prizes.mascotAlt')} />
          </div>
          {/* Prize cards */}
          <div className="lg:col-span-9 order-2 lg:order-2">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PrizeCard
                testId="prize-first-card"
                icon={Trophy}
                rank={t('prizes.first.rank')}
                amount={t('prizes.first.amount')}
                count={t('prizes.first.count')}
                accent={{
                  border: 'border-amber-200',
                  bg: 'bg-amber-50',
                  blob: 'bg-amber-200/50',
                  iconBg: 'bg-amber-100',
                  iconText: 'text-amber-600',
                  badgeText: 'border-amber-300 text-amber-800 bg-white',
                }}
              />
              <PrizeCard
                testId="prize-second-card"
                icon={Medal}
                rank={t('prizes.second.rank')}
                amount={t('prizes.second.amount')}
                count={t('prizes.second.count')}
                accent={{
                  border: 'border-sky-200',
                  bg: 'bg-sky-50',
                  blob: 'bg-sky-200/50',
                  iconBg: 'bg-sky-100',
                  iconText: 'text-sky-700',
                  badgeText: 'border-sky-300 text-sky-800 bg-white',
                }}
              />
              <PrizeCard
                testId="prize-third-card"
                icon={Award}
                rank={t('prizes.third.rank')}
                amount={t('prizes.third.amount')}
                count={t('prizes.third.count')}
                accent={{
                  border: 'border-bubblegum-200',
                  bg: 'bg-bubblegum-50',
                  blob: 'bg-bubblegum-200/50',
                  iconBg: 'bg-bubblegum-100',
                  iconText: 'text-bubblegum-500',
                  badgeText: 'border-bubblegum-300 text-pink-700 bg-white',
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card className="bg-gradient-to-br from-white to-amber-50/60 border-amber-200" data-testid="prize-bonus-card">
            <CardHeader>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Sparkles size={22} />
              </div>
              <CardTitle className="mt-3">{t('prizes.bonusTitle')}</CardTitle>
              <CardDescription>{t('prizes.bonus')}</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-white to-sky-50/60 border-sky-200" data-testid="prize-payout-card">
            <CardHeader>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <BadgeDollarSign size={22} />
              </div>
              <CardTitle className="mt-3">{t('prizes.payoutTitle')}</CardTitle>
              <CardDescription>{t('prizes.payout')}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  );
}
