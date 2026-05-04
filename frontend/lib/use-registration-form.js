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
  normalizePhone,
  songsWithUploadedState,
  validateRegistration,
} from '@/lib/registration-form-utils';

const REGISTER_ENDPOINT = '/api/register';
const LOOKUP_ENDPOINT = '/api/lookup';
const UPLOAD_INIT_ENDPOINT = '/api/upload/init';
const UPLOAD_COMPLETE_ENDPOINT = '/api/upload/complete';
const UPLOAD_CONFIRM_ENDPOINT = '/api/upload/confirm';
const UPLOAD_DIRECT_ENDPOINT = '/api/upload/direct';
const REGISTER_LINK_ENDPOINT = '/api/register/link';

const initialSongUploadState = () => ({ status: 'idle', progress: 0, error: '' });

/**
 * Custom hook that owns all registration-form state and the XHR submission.
 * Exposes a clean state + actions interface so the UI can stay declarative.
 */
export function useRegistrationForm() {
  const { t, locale } = useI18n();

  const [childName, setChildName] = useState('');
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
  const [lookupState, setLookupState] = useState('idle');
  const [lookupError, setLookupError] = useState('');
  const [resolvedPhone, setResolvedPhone] = useState('');
  const [uploadedSongs, setUploadedSongs] = useState([]);
  const [songUploadStates, setSongUploadStates] = useState(() =>
    Array.from({ length: TOTAL_SONGS }, () => initialSongUploadState()),
  );

  const xhrRef = useRef(null);
  // Map of per-song XHR refs for direct uploads: idx → XHR
  const songXhrRefs = useRef({});

  const updateSong = useCallback((idx, patch) => {
    setSongs((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        if (s.uploaded) return s;
        return { ...s, ...patch, error: '' };
      }),
    );
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

  const applyLookupResult = useCallback((data) => {
    const uploaded = Array.isArray(data?.uploaded_songs) ? data.uploaded_songs : [];
    setUploadedSongs(uploaded);
    setSongs(songsWithUploadedState(uploaded));
    setSongUploadStates(Array.from({ length: TOTAL_SONGS }, () => initialSongUploadState()));

    const participant = data?.participant || {};
    if (participant.child_name) setChildName(participant.child_name);
    if (participant.parent_name) setParentName(participant.parent_name);
    if (participant.parent_email) setEmail(participant.parent_email);
  }, []);

  const resetForm = useCallback(() => {
    setChildName('');
    setParentName('');
    setEmail('');
    setPhone('');
    setConsent(false);
    setSongs(Array.from({ length: TOTAL_SONGS }, () => initialSong()));
    setSongUploadStates(Array.from({ length: TOTAL_SONGS }, () => initialSongUploadState()));
    setLookupState('idle');
    setLookupError('');
    setResolvedPhone('');
    setUploadedSongs([]);
  }, []);

  const onPhoneChange = useCallback(
    (value) => {
      setPhone(value);
      setLookupError('');

      const normalized = normalizePhone(value);
      if (resolvedPhone && normalized !== resolvedPhone) {
        setLookupState('idle');
        setResolvedPhone('');
        setUploadedSongs([]);
        setSongs(Array.from({ length: TOTAL_SONGS }, () => initialSong()));
      }
    },
    [resolvedPhone],
  );

  const checkEnrollment = useCallback(async () => {
    const normalized = normalizePhone(phone);
    if (!/^\d{9,12}$/.test(normalized)) {
      setErrors((prev) => ({ ...prev, phone: t('form.validation.phone') }));
      setLookupState('error');
      setLookupError(t('form.validation.phone'));
      return;
    }

    setLookupState('checking');
    setLookupError('');
    setErrors((prev) => ({ ...prev, phone: '' }));

    try {
      const res = await fetch(`${LOOKUP_ENDPOINT}?phone=${encodeURIComponent(phone.trim())}`, {
        method: 'GET',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || 'Lookup failed');
      }

      if (data?.exists) {
        applyLookupResult(data);
        setLookupState('found');
        setResolvedPhone(data.phone || normalized);
        toast.success(t('form.lookup.returningFound'));
      } else {
        setLookupState('new');
        setResolvedPhone(normalized);
        setUploadedSongs([]);
        setSongs(Array.from({ length: TOTAL_SONGS }, () => initialSong()));
        toast.message(t('form.lookup.newUser'));
      }
    } catch (err) {
      const message = err?.message || t('form.lookup.error');
      setLookupState('error');
      setLookupError(message);
      toast.error(message);
    }
  }, [applyLookupResult, phone, t]);

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

      const state = { childName, parentName, email, phone, consent, songs };
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
            const normalized = data?.phone ? normalizePhone(data.phone) : normalizePhone(phone);
            const uploaded = Array.isArray(data?.uploaded_songs) ? data.uploaded_songs : [];
            setResolvedPhone(normalized);
            setUploadedSongs(uploaded);
            setSongs(songsWithUploadedState(uploaded));
            setConsent(false);
            setErrors({});
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
    [submitting, childName, parentName, email, phone, consent, songs, t, locale],
  );

  // ---------------------------------------------------------------------------
  // Direct upload helpers
  // ---------------------------------------------------------------------------

  const _updateSongUploadState = useCallback((idx, patch) => {
    setSongUploadStates((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  }, []);

  /** Allow the user to re-upload an already-uploaded song. */
  const resetSong = useCallback((idx) => {
    setSongs((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...initialSong(), uploaded: false, uploadedType: '' } : s,
      ),
    );
    _updateSongUploadState(idx, initialSongUploadState());
  }, [_updateSongUploadState]);

  /**
   * Upload a single song video directly to Google Drive.
   * 1. POST /api/upload/init → session_uri
   * 2. PUT file directly to session_uri (XHR for progress)
   * 3. POST /api/upload/complete → update SQLite
   */
  const uploadSongFile = useCallback(
    async (idx, file) => {
      if (!file) return;
      if (file.size > MAX_FILE_BYTES) {
        _updateSongUploadState(idx, { status: 'error', error: t('form.validation.sizeTooBig') });
        toast.error(t('form.validation.sizeTooBig'));
        return;
      }

      // Cancel previous upload for this song if any
      if (songXhrRefs.current[idx]) {
        songXhrRefs.current[idx].abort();
        delete songXhrRefs.current[idx];
      }

      _updateSongUploadState(idx, { status: 'uploading', progress: 0, error: '' });

      const formData = new FormData();
      formData.append('phone', phone.trim());
      formData.append('child_name', childName.trim());
      formData.append('parent_name', parentName.trim());
      formData.append('parent_email', email.trim());
      formData.append('consent', 'true');
      formData.append('song_idx', idx + 1);
      formData.append('file', file);

      if (typeof console !== 'undefined') {
        console.log(
          `[upload] Uploading file to /api/upload/direct: ${file.name}, size: ${file.size}`,
        );
      }

      await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        songXhrRefs.current[idx] = xhr;
        xhr.open('POST', UPLOAD_DIRECT_ENDPOINT, true);

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
            _updateSongUploadState(idx, { progress: pct });
          }
        };

        xhr.onload = () => {
          if (typeof console !== 'undefined') {
            console.log(`[upload] Upload completed: status=${xhr.status}`);
          }
          (async () => {
            delete songXhrRefs.current[idx];

            if (xhr.status === 200 || xhr.status === 201) {
              try {
                const result = JSON.parse(xhr.responseText);
                if (result?.success) {
                  _updateSongUploadState(idx, { progress: 100, status: 'done', error: '' });
                  const uploaded = result?.uploaded_songs || [];
                  setUploadedSongs(uploaded);
                  setSongs(songsWithUploadedState(uploaded));
                  toast.success(
                    locale === 'vi'
                      ? `Đã tải lên bài ${idx + 1} thành công!`
                      : `Song ${idx + 1} uploaded successfully!`,
                  );
                  resolve();
                  return;
                }
              } catch (_) {}
            }

            const errMsg =
              locale === 'vi'
                ? `Upload thất bại (HTTP ${xhr.status})`
                : `Upload failed (HTTP ${xhr.status})`;
            _updateSongUploadState(idx, { status: 'error', error: errMsg });
            toast.error(errMsg);
            resolve();
          })();
        };

        xhr.onerror = () => {
          if (typeof console !== 'undefined') {
            console.error(
              `[upload] Network error: readyState=${xhr.readyState}, status=${xhr.status}`,
            );
          }
          delete songXhrRefs.current[idx];
          const errMsg =
            locale === 'vi'
              ? 'Mất kết nối khi tải lên. Vui lòng thử lại.'
              : 'Connection lost during upload. Please try again.';
          _updateSongUploadState(idx, { status: 'error', error: errMsg });
          toast.error(errMsg);
          resolve();
        };

        xhr.send(formData);
      });
    },
    [phone, childName, parentName, email, locale, t, _updateSongUploadState],
  );

  /** Submit a YouTube/Drive link for a single song. */
  const submitSongLink = useCallback(
    async (idx, link) => {
      if (!link.trim()) return;

      _updateSongUploadState(idx, { status: 'uploading', progress: 50, error: '' });

      try {
        const res = await fetch(REGISTER_LINK_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone.trim(),
            child_name: childName.trim(),
            parent_name: parentName.trim(),
            parent_email: email.trim(),
            consent: true,
            song_idx: idx + 1,
            link: link.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Lỗi khi lưu link');

        const uploaded = data?.uploaded_songs || [];
        setUploadedSongs(uploaded);
        setSongs(songsWithUploadedState(uploaded));
        setSongUploadStates((prev) =>
          prev.map((s, i) => (i === idx ? { ...s, status: 'done', progress: 100 } : s)),
        );
        toast.success(
          locale === 'vi'
            ? `Đã lưu link bài ${idx + 1}!`
            : `Song ${idx + 1} link saved!`,
        );
      } catch (err) {
        _updateSongUploadState(idx, { status: 'error', error: err.message });
        toast.error(err.message);
      }
    },
    [phone, childName, parentName, email, locale, _updateSongUploadState],
  );

  /** Validate contact fields for use before direct uploads. */
  const validateContact = useCallback(() => {
    const errs = {};
    if (!childName.trim()) errs.childName = t('form.validation.required');
    if (!parentName.trim()) errs.parentName = t('form.validation.required');
    if (!email.trim()) errs.email = t('form.validation.required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t('form.validation.email');
    const normalized = normalizePhone(phone);
    if (!phone.trim()) errs.phone = t('form.validation.required');
    else if (!/^\d{9,12}$/.test(normalized)) errs.phone = t('form.validation.phone');
    if (!consent) errs.consent = t('form.consentRequired');
    if (Object.keys(errs).length > 0) {
      setErrors((prev) => ({ ...prev, ...errs }));
      toast.error(t('form.validation.required'));
      return false;
    }
    return true;
  }, [childName, parentName, email, phone, consent, t]);

  const completedCount = useMemo(
    () => songs.filter((song) => song.uploaded).length,
    [songs],
  );
  const filledCount = useMemo(
    () => completedCount + countFilledSongs(songs),
    [completedCount, songs],
  );
  const remainingCount = TOTAL_SONGS - completedCount;

  return {
    // values
    childName,
    parentName,
    email,
    phone,
    consent,
    songs,
    submitting,
    progress,
    errors,
    submissionError,
    successResult,
    retryAvailable,
    filledCount,
    completedCount,
    remainingCount,
    lookupState,
    lookupError,
    uploadedSongs,
    songUploadStates,
    // setters
    setChildName,
    setParentName,
    setEmail,
    onPhoneChange,
    setConsent,
    // song actions
    updateSong,
    onPickFile,
    removeFile,
    resetSong,
    // direct upload actions
    uploadSongFile,
    submitSongLink,
    validateContact,
    checkEnrollment,
    // legacy submission (proxy through backend)
    submit,
    cancelSubmission,
    closeSuccessDialog,
    resetForm,
  };
}
