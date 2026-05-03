'use client';

import Image from 'next/image';
import { CheckCircle2, AlertTriangle, Video, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n-context';

const STEP_BG_BY_INDEX = ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-bubblegum-400'];

function StepCard({ index, title, desc }) {
  return (
    <Card className="h-full hover:-translate-y-0.5 hover:shadow-pop transition-[transform,box-shadow]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-display font-bold text-white shadow-soft ${STEP_BG_BY_INDEX[index % STEP_BG_BY_INDEX.length]}`}
          >
            {index + 1}
          </span>
          <CardTitle>{title}</CardTitle>
        </div>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{desc}</p>
      </CardHeader>
    </Card>
  );
}

function CharacterFrame({ src, alt, tone, size = 'lg', testId }) {
  const widthClass = size === 'sm' ? 'w-32 aspect-[3/4]' : 'w-44 aspect-[3/4]';
  const borderClass = tone === 'pink' ? 'border-bubblegum-200' : 'border-sky-200';
  const sizes = size === 'sm' ? '128px' : '176px';
  return (
    <div
      className={`relative ${widthClass} rounded-3xl overflow-hidden ${borderClass} bg-white shadow-soft`}
    >
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover object-center" data-testid={testId} />
    </div>
  );
}

function StepsGrid({ steps }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2">
      {Array.isArray(steps) &&
        steps.map((step, i) => (
          <li key={step.title} data-testid={`how-to-step-${i + 1}`}>
            <StepCard index={i} title={step.title} desc={step.desc} />
          </li>
        ))}
    </ol>
  );
}

function VideoRulesCard({ title, rules }) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/60" data-testid="video-rules-card">
      <CardHeader>
        <div className="flex items-center gap-2 text-emerald-700">
          <Video size={20} />
          <CardTitle className="text-emerald-900">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {Array.isArray(rules) &&
            rules.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-slate-700 text-sm">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                <span>{rule}</span>
              </li>
            ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function InvalidEntriesCard({ title, items }) {
  return (
    <Card className="border-red-200 bg-red-50/60" data-testid="invalid-card">
      <CardHeader>
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle size={20} />
          <CardTitle className="text-red-900">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {Array.isArray(items) &&
            items.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-slate-700 text-sm">
                <span className="shrink-0 mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                <span>{rule}</span>
              </li>
            ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function HowTo() {
  const { t } = useI18n();
  const steps = t('howTo.steps');
  const rules = t('howTo.videoRules');
  const invalid = t('howTo.invalid');

  return (
    <section id="how-to" className="section-pad relative" data-testid="how-to-section">
      <div className="container-app">
        <div className="max-w-2xl mb-10">
          <h2 className="heading-display text-3xl sm:text-4xl text-slate-900" data-testid="how-to-title">
            {t('howTo.title')}
          </h2>
          <p className="mt-3 text-slate-700" data-testid="how-to-subtitle">
            {t('howTo.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 items-start">
          <div className="hidden lg:flex lg:col-span-2 justify-center">
            <CharacterFrame
              src="/boy-character-tony.jpg"
              alt={t('howTo.tonyAlt')}
              tone="sky"
              testId="how-to-tony-image"
            />
          </div>
          <div className="lg:col-span-8" data-testid="how-to-steps">
            <StepsGrid steps={steps} />
          </div>
          <div className="hidden lg:flex lg:col-span-2 justify-center">
            <CharacterFrame
              src="/girl-character-windy.jpg"
              alt={t('howTo.windyAlt')}
              tone="pink"
              testId="how-to-windy-image"
            />
          </div>
        </div>

        {/* Mobile characters row */}
        <div className="mt-8 flex justify-center gap-4 lg:hidden">
          <CharacterFrame src="/boy-character-tony.jpg" alt={t('howTo.tonyAlt')} tone="sky" size="sm" />
          <CharacterFrame src="/girl-character-windy.jpg" alt={t('howTo.windyAlt')} tone="pink" size="sm" />
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <VideoRulesCard title={t('howTo.videoRulesTitle')} rules={rules} />
          <InvalidEntriesCard title={t('howTo.invalidTitle')} items={invalid} />
        </div>

        <p className="mt-6 text-xs text-slate-500 flex items-center gap-1.5" data-testid="how-to-fairplay">
          <ShieldCheck size={14} className="text-emerald-600" />
          Ban Tổ Chức có quyền loại bỏ các video không hợp lệ. / The Organizer reserves the right to remove
          invalid entries.
        </p>
      </div>
    </section>
  );
}
