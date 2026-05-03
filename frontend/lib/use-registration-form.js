'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n-context';
import {
  MAX_FILE_BYTES,
  TOTAL_SONGS,
  buildRegistrationFormData,
  countFilledSongs,
  initialSong,
  validateRegistration,
} from '@/lib/registration-form-utils';

const REGISTER_ENDPOINT = '/api/register';

/**
 * Custom hook that owns all registration-form state and the XHR submission.
 * Exposes a clean state + actions interface so the UI can stay declarative.
 */
export function useRegistrationForm() {
  const { t, locale } = useI18n();

  const [childName, setChildName] = useState('');
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [songs, setSongs] = useState(() =>
    Array.from({ length: TOTAL_SONGS }, () => initialSong()),
  );

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [submissionError, setSubmissionError] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [retryAvailable, setRetryAvailable] = useState(false);

  const xhrRef = useRef(null);

  const updateSong = useCallback((idx, patch) => {
    setSongs((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch, error: '' } : s)));
  }, []);

  const onPickFile = useCallback(
    (idx, file) => {
      if (!file) {
        updateSong(idx, { file: null });
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        updateSong(idx, { file: null, error: t('form.validation.sizeTooBig') });
        toast.error(t('form.validation.sizeTooBig'));
        return;
      }
      updateSong(idx, { file, error: '' });
    },
    [t, updateSong],
  );

  const removeFile = useCallback(
    (idx) => updateSong(idx, { file: null }),
    [updateSong],
  );

  const resetForm = useCallback(() => {
    setChildName('');
    setParentName('');
    setEmail('');
    setConsent(false);
    setSongs(Array.from({ length: TOTAL_SONGS }, () => initialSong()));
  }, []);

  const closeSuccessDialog = useCallback(() => setSuccessResult(null), []);

  const cancelSubmission = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
      setSubmitting(false);
      setProgress(0);
      const message = locale === 'vi' ? 'Đã hủy gửi bài' : 'Submission cancelled';
      toast.info(message);
    }
  }, [locale]);

  const submit = useCallback(
    (event) => {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      if (submitting) return;
      setSubmissionError('');
      setRetryAvailable(false);

      const state = { childName, parentName, email, consent, songs };
      const validation = validateRegistration(state, t);
      setErrors(validation.errors);
      setSongs((prev) => prev.map((s, i) => ({ ...s, error: validation.songErrors[i] })));
      if (!validation.valid) {
        toast.error(t('form.validation.required'));
        return;
      }

      setSubmitting(true);
      setProgress(0);

      const fd = buildRegistrationFormData(state, locale);
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open('POST', REGISTER_ENDPOINT, true);

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
            resetForm();
          } else {
            const detail = data?.detail || data?.message || 'Submission failed';
            setSubmissionError(detail);
            setRetryAvailable(true);
            toast.error(detail);
          }
        } catch (err) {
          if (typeof console !== 'undefined') {
            console.error('[register] could not parse response:', err);
          }
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
          locale === 'vi'
            ? 'Hết thời gian chờ. Vui lòng thử lại.'
            : 'Request timed out. Please try again.',
        );
        setRetryAvailable(true);
        setSubmitting(false);
        xhrRef.current = null;
      };

      xhr.send(fd);
    },
    [submitting, childName, parentName, email, consent, songs, t, locale, resetForm],
  );

  const filledCount = useMemo(() => countFilledSongs(songs), [songs]);

  return {
    // values
    childName,
    parentName,
    email,
    consent,
    songs,
    submitting,
    progress,
    errors,
    submissionError,
    successResult,
    retryAvailable,
    filledCount,
    // setters
    setChildName,
    setParentName,
    setEmail,
    setConsent,
    // song actions
    updateSong,
    onPickFile,
    removeFile,
    // submission
    submit,
    cancelSubmission,
    closeSuccessDialog,
  };
}
