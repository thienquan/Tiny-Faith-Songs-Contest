'use client';

import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactInfoCard } from '@/components/forms/ContactInfoCard';
import { SongBlock } from '@/components/forms/SongBlock';
import { ConsentAndSubmitCard } from '@/components/forms/ConsentAndSubmitCard';
import { RegistrationSuccessDialog } from '@/components/forms/RegistrationSuccessDialog';
import { useI18n } from '@/lib/i18n-context';
import { TOTAL_SONGS } from '@/lib/registration-form-utils';
import { useRegistrationForm } from '@/lib/use-registration-form';

/* ------------------------------------------------------------------ */
/* Song tabs section                                                    */
/* ------------------------------------------------------------------ */

function SongTabsSection({
  t,
  songs,
  songUploadStates,
  errors,
  completedCount,
  updateSong,
  onPickFile,
  removeFile,
  uploadSongFile,
  submitSongLink,
  resetSong,
  validateContact,
}) {
  const [activeTab, setActiveTab] = useState('song-1');

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle>{t('form.sectionVideos')}</CardTitle>
          <Badge variant={completedCount === TOTAL_SONGS ? 'success' : 'default'} data-testid="registration-songs-counter">
            {completedCount}/{TOTAL_SONGS}
          </Badge>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{t('form.sectionVideosNote')}</p>
        {errors.songs && (
          <p className="mt-1 text-sm font-medium text-red-700" data-testid="registration-songs-error">
            {errors.songs}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            {songs.map((song, i) => {
              const n = i + 1;
              const isUploaded = song.uploaded;
              const isUploading = songUploadStates[i]?.status === 'uploading';
              return (
                <TabsTrigger
                  key={`tab-trigger-${n}`}
                  value={`song-${n}`}
                  className="relative"
                  data-testid={`song-tab-trigger-${n}`}
                  aria-label={isUploaded ? t('form.songTabUploaded').replace('{n}', n) : t('form.songTab').replace('{n}', n)}
                >
                  {isUploaded ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>{t('form.songTab').replace('{n}', n)}</span>
                    </>
                  ) : (
                    <span className={isUploading ? 'opacity-70' : ''}>{t('form.songTab').replace('{n}', n)}</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {songs.map((song, i) => {
            const n = i + 1;
            const uploadState = songUploadStates[i];
            return (
              <TabsContent key={`tab-content-${n}`} value={`song-${n}`}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 font-display font-bold text-slate-900">
                      {n}
                    </span>
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {t('form.songLabel').replace('{n}', n)}
                      </p>
                      <p className="text-sm font-medium text-slate-600">
                        {song.uploaded ? t('form.uploaded') : t('form.pending')}
                      </p>
                    </div>
                    {song.uploaded && (
                      <Badge variant="success" className="ml-auto">
                        <CheckCircle2 size={13} /> OK
                      </Badge>
                    )}
                  </div>

                  <SongBlock
                    song={song}
                    index={i}
                    t={t}
                    uploadState={uploadState}
                    onModeChange={(mode) => updateSong(i, { mode, error: '' })}
                    onLinkChange={(link) => updateSong(i, { link })}
                    onPickFile={(file) => onPickFile(i, file)}
                    onRemoveFile={() => removeFile(i)}
                    onUploadFile={(file) => {
                      if (!validateContact()) return;
                      uploadSongFile(i, file);
                    }}
                    onSubmitLink={(link) => {
                      if (!validateContact()) return;
                      submitSongLink(i, link);
                    }}
                    onReplace={() => resetSong(i)}
                  />
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {completedCount === TOTAL_SONGS && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {t('form.lookup.allUploaded')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Main RegistrationForm                                               */
/* ------------------------------------------------------------------ */

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

        <div className="mt-8 space-y-6" data-testid="registration-form">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
            <p className="text-sm font-semibold">{t('form.lookup.noticeTitle')}</p>
            <p className="text-sm mt-1">{t('form.lookup.noticeBody')}</p>
          </div>

          <ContactInfoCard
            t={t}
            childName={form.childName}
            parentName={form.parentName}
            email={form.email}
            phone={form.phone}
            lookupState={form.lookupState}
            lookupError={form.lookupError}
            errors={form.errors}
            setChildName={form.setChildName}
            setParentName={form.setParentName}
            setEmail={form.setEmail}
            onPhoneChange={form.onPhoneChange}
            onCheckPhone={form.checkEnrollment}
          />

          {/* Consent is shown once, at the top of the video section */}
          <ConsentAndSubmitCard
            t={t}
            locale={locale}
            consent={form.consent}
            setConsent={form.setConsent}
            errors={form.errors}
            submitting={false}
            retryAvailable={false}
            submissionError=""
            progress={0}
            onCancel={null}
            hideSubmitButton
          />

          {form.lookupState !== 'idle' && (
            <SongTabsSection
              t={t}
              songs={form.songs}
              songUploadStates={form.songUploadStates}
              errors={form.errors}
              completedCount={form.completedCount}
              updateSong={form.updateSong}
              onPickFile={form.onPickFile}
              removeFile={form.removeFile}
              uploadSongFile={form.uploadSongFile}
              submitSongLink={form.submitSongLink}
              resetSong={form.resetSong}
              validateContact={form.validateContact}
            />
          )}

          {form.lookupState === 'idle' && (
            <p className="text-base font-medium text-slate-600 text-center">
              {t('form.contactSaveHint')}
            </p>
          )}
        </div>
      </div>

      <RegistrationSuccessDialog
        result={form.successResult}
        onClose={form.closeSuccessDialog}
        t={t}
      />
    </section>
  );
}

