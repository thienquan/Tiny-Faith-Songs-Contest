'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Upload,
  Link2,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  ExternalLink,
  Loader2,
  PartyPopper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n-context';
import { formatBytes, isAcceptedSubmissionLink, isValidUrl } from '@/lib/utils';

const TOTAL_SONGS = 6;
const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

const initialSong = () => ({ mode: 'upload', file: null, link: '', error: '' });

export function RegistrationForm() {
  const { t, locale } = useI18n();

  const [childName, setChildName] = useState('');
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);

  const [songs, setSongs] = useState(() =>
    Array.from({ length: TOTAL_SONGS }, () => initialSong()),
  );

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0); // overall request progress (0-100)
  const [errors, setErrors] = useState({}); // top-level form errors
  const [submissionError, setSubmissionError] = useState('');
  const [successResult, setSuccessResult] = useState(null); // { folder_url, folder_id, song_results }
  const [retryAvailable, setRetryAvailable] = useState(false);

  const xhrRef = useRef(null);

  const updateSong = (idx, patch) =>
    setSongs((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch, error: '' } : s)));

  const onPickFile = (idx, file) => {
    if (!file) return updateSong(idx, { file: null });
    if (file.size > MAX_FILE_BYTES) {
      updateSong(idx, { file: null, error: t('form.validation.sizeTooBig') });
      toast.error(t('form.validation.sizeTooBig'));
      return;
    }
    updateSong(idx, { file, error: '' });
  };

  const removeFile = (idx) => updateSong(idx, { file: null });

  const validate = () => {
    const next = {};
    if (!childName.trim()) next.childName = t('form.validation.required');
    if (!parentName.trim()) next.parentName = t('form.validation.required');
    if (!email.trim()) next.email = t('form.validation.required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t('form.validation.email');
    if (!consent) next.consent = t('form.consentRequired');

    const songErrors = songs.map((s) => {
      if (s.mode === 'upload') {
        if (!s.file) return ''; // empty = optional? We'll require at least one overall.
        if (s.file.size > MAX_FILE_BYTES) return t('form.validation.sizeTooBig');
        return '';
      }
      if (s.mode === 'link') {
        if (!s.link.trim()) return '';
        if (!isAcceptedSubmissionLink(s.link)) return t('form.validation.invalidLink');
      }
      return '';
    });

    const filledCount = songs.filter(
      (s) => (s.mode === 'upload' && s.file) || (s.mode === 'link' && s.link.trim()),
    ).length;
    if (filledCount === 0) next.songs = t('form.validation.atLeastOne');

    setSongs((prev) => prev.map((s, i) => ({ ...s, error: songErrors[i] })));
    setErrors(next);
    if (Object.keys(next).length === 0 && songErrors.every((e) => !e)) return true;
    return false;
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('child_name', childName.trim());
    fd.append('parent_name', parentName.trim());
    fd.append('parent_email', email.trim());
    fd.append('consent', 'true');
    fd.append('locale', locale);

    songs.forEach((s, i) => {
      const idx = i + 1;
      fd.append(`song_${idx}_mode`, s.mode);
      if (s.mode === 'upload' && s.file) {
        fd.append(`song_${idx}_file`, s.file, s.file.name);
      } else if (s.mode === 'link' && s.link.trim()) {
        fd.append(`song_${idx}_link`, s.link.trim());
      }
    });
    return fd;
  };

  const submit = (e) => {
    e?.preventDefault?.();
    if (submitting) return;
    setSubmissionError('');
    setRetryAvailable(false);
    if (!validate()) {
      toast.error(t('form.validation.required'));
      return;
    }

    setSubmitting(true);
    setProgress(0);

    const fd = buildFormData();
    // Same-origin: K8s ingress routes /api/* to backend (port 8001).
    const url = '/api/register';

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('POST', url, true);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
        setProgress(pct);
      }
    };
    xhr.onload = () => {
      try {
        const ok = xhr.status >= 200 && xhr.status < 300;
        const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        if (ok && data.success) {
          setProgress(100);
          setSuccessResult(data);
          toast.success(t('form.success.title'));
          // Reset form
          setChildName('');
          setParentName('');
          setEmail('');
          setConsent(false);
          setSongs(Array.from({ length: TOTAL_SONGS }, () => initialSong()));
        } else {
          const detail = data?.detail || data?.message || 'Submission failed';
          setSubmissionError(detail);
          setRetryAvailable(true);
          toast.error(detail);
        }
      } catch (err) {
        setSubmissionError('Unexpected response from server');
        setRetryAvailable(true);
      } finally {
        setSubmitting(false);
        xhrRef.current = null;
      }
    };
    xhr.onerror = () => {
      setSubmissionError(
        locale === 'vi'
          ? 'Mất kết nối tới máy chủ. Vui lòng thử lại.'
          : 'Lost connection to the server. Please try again.',
      );
      setRetryAvailable(true);
      setSubmitting(false);
      xhrRef.current = null;
    };
    xhr.ontimeout = () => {
      setSubmissionError(
        locale === 'vi' ? 'Hết thời gian chờ. Vui lòng thử lại.' : 'Request timed out. Please try again.',
      );
      setRetryAvailable(true);
      setSubmitting(false);
      xhrRef.current = null;
    };

    xhr.send(fd);
  };

  const cancelSubmission = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
      setSubmitting(false);
      setProgress(0);
      toast.info(locale === 'vi' ? 'Đã hủy gửi bài' : 'Submission cancelled');
    }
  };

  const filledCount = useMemo(
    () =>
      songs.filter((s) => (s.mode === 'upload' && s.file) || (s.mode === 'link' && s.link.trim())).length,
    [songs],
  );

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
          onSubmit={submit}
          className="mt-8 space-y-6"
          noValidate
          data-testid="registration-form"
        >
          {/* Contact info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('form.sectionInfo')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="childName">
                    {t('form.childName')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="childName"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder={t('form.childNamePlaceholder')}
                    aria-invalid={!!errors.childName}
                    data-testid="registration-child-name-input"
                  />
                  {errors.childName && (
                    <p className="text-xs text-red-600">{errors.childName}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentName">
                    {t('form.parentName')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="parentName"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder={t('form.parentNamePlaceholder')}
                    aria-invalid={!!errors.parentName}
                    data-testid="registration-parent-name-input"
                  />
                  {errors.parentName && (
                    <p className="text-xs text-red-600">{errors.parentName}</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="email">
                    {t('form.email')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('form.emailPlaceholder')}
                    aria-invalid={!!errors.email}
                    data-testid="registration-email-input"
                  />
                  {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6 songs */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle>{t('form.sectionVideos')}</CardTitle>
                <Badge variant="default" data-testid="registration-songs-counter">
                  {filledCount}/{TOTAL_SONGS}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('form.sectionVideosNote')}
              </p>
              {errors.songs && (
                <p className="text-xs text-red-600 mt-1" data-testid="registration-songs-error">
                  {errors.songs}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {songs.map((s, i) => {
                  const idx = i + 1;
                  const filled = (s.mode === 'upload' && s.file) || (s.mode === 'link' && s.link.trim());
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5"
                      data-testid={`song-block-${idx}`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 font-display font-bold text-slate-900">
                            {idx}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {t('form.songLabel').replace('{n}', idx)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {filled ? t('form.uploaded') : t('form.pending')}
                            </p>
                          </div>
                        </div>
                        {filled ? (
                          <Badge variant="success" data-testid={`song-${idx}-status`}>
                            <CheckCircle2 size={14} /> OK
                          </Badge>
                        ) : (
                          <Badge variant="outline" data-testid={`song-${idx}-status`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            {t('form.pending')}
                          </Badge>
                        )}
                      </div>

                      <Tabs
                        value={s.mode}
                        onValueChange={(v) => updateSong(i, { mode: v, error: '' })}
                        data-testid={`song-${idx}-mode-tabs`}
                      >
                        <TabsList>
                          <TabsTrigger value="upload" data-testid={`song-${idx}-mode-upload`}>
                            <Upload size={14} /> {t('form.modeUpload')}
                          </TabsTrigger>
                          <TabsTrigger value="link" data-testid={`song-${idx}-mode-link`}>
                            <Link2 size={14} /> {t('form.modeLink')}
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="upload">
                          {!s.file ? (
                            <label
                              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-200 bg-white px-4 py-6 cursor-pointer hover:bg-sky-50 transition-colors ring-focus"
                              htmlFor={`song-${idx}-file`}
                              data-testid={`song-${idx}-upload-dropzone`}
                            >
                              <Upload size={22} className="text-sky-600" />
                              <p className="text-sm font-semibold text-slate-800">
                                {t('form.pickFile')}
                              </p>
                              <p className="text-xs text-slate-500">{t('form.uploadHint')}</p>
                              <input
                                id={`song-${idx}-file`}
                                type="file"
                                accept="video/*"
                                className="sr-only"
                                onChange={(e) => onPickFile(i, e.target.files?.[0])}
                                data-testid={`song-${idx}-file-input`}
                                disabled={submitting}
                              />
                            </label>
                          ) : (
                            <div
                              className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3 justify-between"
                              data-testid={`song-${idx}-file-info`}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {s.file.name}
                                </p>
                                <p className="text-xs text-slate-500">{formatBytes(s.file.size)}</p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => document.getElementById(`song-${idx}-file`)?.click()}
                                  disabled={submitting}
                                  data-testid={`song-${idx}-change-file`}
                                >
                                  {t('form.changeFile')}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(i)}
                                  disabled={submitting}
                                  data-testid={`song-${idx}-remove-file`}
                                >
                                  <X size={14} />
                                </Button>
                                <input
                                  id={`song-${idx}-file`}
                                  type="file"
                                  accept="video/*"
                                  className="sr-only"
                                  onChange={(e) => onPickFile(i, e.target.files?.[0])}
                                />
                              </div>
                            </div>
                          )}
                          {s.error && (
                            <p
                              className="mt-2 text-xs text-red-600"
                              data-testid={`song-${idx}-error`}
                            >
                              {s.error}
                            </p>
                          )}
                        </TabsContent>

                        <TabsContent value="link">
                          <Input
                            type="url"
                            placeholder={t('form.linkPlaceholder')}
                            value={s.link}
                            onChange={(e) => updateSong(i, { link: e.target.value })}
                            disabled={submitting}
                            data-testid={`song-${idx}-link-input`}
                          />
                          <p className="mt-2 text-xs text-slate-500">{t('form.linkHint')}</p>
                          {s.error && (
                            <p
                              className="mt-1 text-xs text-red-600"
                              data-testid={`song-${idx}-error`}
                            >
                              {s.error}
                            </p>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Consent + submit */}
          <Card>
            <CardContent className="p-5 sm:p-6 pt-5 sm:pt-6 space-y-4">
              <label
                htmlFor="consent"
                className="flex items-start gap-3 cursor-pointer"
                data-testid="registration-consent-row"
              >
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(v) => setConsent(!!v)}
                  data-testid="registration-consent-checkbox"
                />
                <span className="text-sm text-slate-700 leading-relaxed">
                  {t('form.consent')}
                </span>
              </label>
              {errors.consent && (
                <p className="text-xs text-red-600" data-testid="registration-consent-error">
                  {errors.consent}
                </p>
              )}

              {submissionError && (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3"
                  data-testid="registration-submission-error"
                >
                  <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={18} />
                  <div className="text-sm text-red-700">
                    <p className="font-semibold">{t('form.error.title')}</p>
                    <p className="mt-1 break-words">{submissionError}</p>
                  </div>
                </div>
              )}

              {submitting && (
                <div
                  className="space-y-2 rounded-xl border border-sky-200 bg-sky-50/60 p-4"
                  data-testid="registration-progress-block"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-sky-900 inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} /> {t('form.submitting')}
                    </span>
                    <span
                      className="font-display font-bold text-sky-700"
                      data-testid="registration-progress-percent"
                    >
                      {progress}%
                    </span>
                  </div>
                  <Progress value={progress} data-testid="registration-progress-bar" />
                  <p className="text-xs text-slate-600">{t('form.submittingHint')}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  size="xl"
                  disabled={submitting}
                  className="w-full sm:w-auto"
                  data-testid="registration-submit-button"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      {t('form.submitting')}
                    </>
                  ) : retryAvailable ? (
                    t('form.error.retry')
                  ) : (
                    t('form.submit')
                  )}
                </Button>
                {submitting && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xl"
                    onClick={cancelSubmission}
                    data-testid="registration-cancel-button"
                  >
                    <X size={16} /> Cancel
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck size={12} /> {t('form.privacyNote')}
              </p>
            </CardContent>
          </Card>
        </form>
      </div>

      {/* Success dialog */}
      <Dialog
        open={!!successResult}
        onOpenChange={(o) => {
          if (!o) setSuccessResult(null);
        }}
      >
        <DialogContent data-testid="registration-success-dialog">
          <DialogHeader>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 mb-2">
              <PartyPopper size={26} />
            </div>
            <DialogTitle>{t('form.success.title')}</DialogTitle>
            <DialogDescription>{t('form.success.body')}</DialogDescription>
          </DialogHeader>
          {successResult?.folder_url && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700 mb-1">
                {t('form.success.folderLabel')}
              </p>
              <a
                href={successResult.folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-sky-700 hover:underline break-all"
                data-testid="registration-success-folder-link"
              >
                <ExternalLink size={14} /> {successResult.folder_url}
              </a>
            </div>
          )}
          <p className="text-sm text-slate-600 leading-relaxed">{t('form.success.nextSteps')}</p>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setSuccessResult(null)}
              data-testid="registration-success-close-button"
            >
              {t('form.success.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
