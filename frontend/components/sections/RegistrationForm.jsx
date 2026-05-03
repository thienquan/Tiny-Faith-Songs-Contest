'use client';

import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ContactInfoCard } from '@/components/forms/ContactInfoCard';
import { SongBlock } from '@/components/forms/SongBlock';
import { ConsentAndSubmitCard } from '@/components/forms/ConsentAndSubmitCard';
import { RegistrationSuccessDialog } from '@/components/forms/RegistrationSuccessDialog';
import { useI18n } from '@/lib/i18n-context';
import { TOTAL_SONGS } from '@/lib/registration-form-utils';
import { useRegistrationForm } from '@/lib/use-registration-form';

function SongsSection({ t, songs, errors, filledCount, submitting, updateSong, onPickFile, removeFile }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle>{t('form.sectionVideos')}</CardTitle>
          <Badge variant="default" data-testid="registration-songs-counter">
            {filledCount}/{TOTAL_SONGS}
          </Badge>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{t('form.sectionVideosNote')}</p>
        {errors.songs && (
          <p className="text-xs text-red-600 mt-1" data-testid="registration-songs-error">
            {errors.songs}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {songs.map((song, i) => (
            <SongBlock
              key={`song-${i + 1}`}
              song={song}
              index={i}
              t={t}
              submitting={submitting}
              onModeChange={(mode) => updateSong(i, { mode, error: '' })}
              onLinkChange={(link) => updateSong(i, { link })}
              onPickFile={(file) => onPickFile(i, file)}
              onRemoveFile={() => removeFile(i)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RegistrationForm() {
  const { t, locale } = useI18n();
  const form = useRegistrationForm();

  return (
    <section
      id="register"
      className="section-pad relative scroll-mt-24"
      data-testid="registration-section"
    >
      <div className="container-app">
        <div className="max-w-2xl">
          <Badge variant="success" className="mb-3">
            <ShieldCheck size={14} /> SSL secure submission
          </Badge>
          <h2
            className="heading-display text-3xl sm:text-4xl text-slate-900"
            data-testid="registration-title"
          >
            {t('form.title')}
          </h2>
          <p className="mt-3 text-slate-700 leading-relaxed" data-testid="registration-subtitle">
            {t('form.subtitle')}
          </p>
        </div>

        <form
          onSubmit={form.submit}
          className="mt-8 space-y-6"
          noValidate
          data-testid="registration-form"
        >
          <ContactInfoCard
            t={t}
            childName={form.childName}
            parentName={form.parentName}
            email={form.email}
            errors={form.errors}
            setChildName={form.setChildName}
            setParentName={form.setParentName}
            setEmail={form.setEmail}
          />

          <SongsSection
            t={t}
            songs={form.songs}
            errors={form.errors}
            filledCount={form.filledCount}
            submitting={form.submitting}
            updateSong={form.updateSong}
            onPickFile={form.onPickFile}
            removeFile={form.removeFile}
          />

          <ConsentAndSubmitCard
            t={t}
            locale={locale}
            consent={form.consent}
            setConsent={form.setConsent}
            errors={form.errors}
            submitting={form.submitting}
            retryAvailable={form.retryAvailable}
            submissionError={form.submissionError}
            progress={form.progress}
            onCancel={form.cancelSubmission}
          />
        </form>
      </div>

      <RegistrationSuccessDialog
        result={form.successResult}
        onClose={form.closeSuccessDialog}
        t={t}
      />
    </section>
  );
}
