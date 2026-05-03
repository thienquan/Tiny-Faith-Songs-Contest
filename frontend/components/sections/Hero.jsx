'use client';

import Image from 'next/image';
import { ArrowDown, Sparkles, Cake, Trophy, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FloatingDecor } from '@/components/ui/floating-decor';
import { useI18n } from '@/lib/i18n-context';
import { scrollToId } from '@/lib/utils';

export function Hero() {
  const { t, locale } = useI18n();
  const banner = locale === 'en' ? '/banner-horizontal-en.jpg' : '/banner-horizontal-vi.jpg';

  return (
    <section
      id="hero"
      className="relative overflow-hidden gradient-hero"
      data-testid="hero-section"
    >
      <FloatingDecor tone="sky" />
      <div className="container-app relative pt-10 pb-12 sm:pt-14 sm:pb-16 lg:pt-20 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text */}
          <div className="animate-fade-up order-2 lg:order-1">
            <Badge
              variant="warning"
              className="mb-4"
              data-testid="hero-eyebrow"
            >
              <Sparkles size={14} className="text-amber-600" />
              {t('hero.eyebrow')}
            </Badge>
            <h1
              className="heading-display text-4xl sm:text-5xl lg:text-6xl text-slate-900 leading-[1.1]"
              data-testid="hero-title"
            >
              {t('hero.title')}
            </h1>
            <p
              className="mt-5 text-base sm:text-lg text-slate-700 max-w-prose leading-relaxed"
              data-testid="hero-tagline"
            >
              {t('hero.tagline')}
            </p>

            <div className="mt-6 flex flex-wrap gap-2" data-testid="hero-tag-row">
              <Badge variant="default" data-testid="hero-tag-age">
                <Cake size={14} /> {t('hero.tagAge')}
              </Badge>
              <Badge variant="pink" data-testid="hero-tag-submission">
                <CalendarDays size={14} /> {t('hero.tagSubmission')}
              </Badge>
              <Badge variant="warning" data-testid="hero-tag-prize">
                <Trophy size={14} className="text-amber-600" /> {t('hero.tagPrize')}
              </Badge>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="xl"
                onClick={() => scrollToId('register')}
                data-testid="hero-register-button"
              >
                {t('hero.cta')}
                <ArrowDown size={18} />
              </Button>
              <Button
                asChild
                size="xl"
                variant="secondary"
                data-testid="hero-playlist-button"
              >
                <a
                  href="https://www.youtube.com/playlist?list=PL_76YSYegiJLt7YDQhP7ptUmSBNt2uOz6"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('hero.ctaSecondary')}
                </a>
              </Button>
            </div>
          </div>

          {/* Banner image */}
          <div className="order-1 lg:order-2 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="relative rounded-3xl overflow-hidden border border-white shadow-pop bg-white">
              <Image
                src={banner}
                alt={t('hero.bannerAlt')}
                width={1600}
                height={1600}
                priority
                className="w-full h-auto block"
                data-testid="hero-banner-image"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
