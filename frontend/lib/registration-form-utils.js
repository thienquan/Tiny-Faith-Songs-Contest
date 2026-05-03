import { isAcceptedSubmissionLink } from '@/lib/utils';

export const TOTAL_SONGS = 6;
export const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

export const SUBMIT_BUTTON_STATE = {
  IDLE: 'idle',
  SUBMITTING: 'submitting',
  RETRY: 'retry',
};

export const initialSong = () => ({ mode: 'upload', file: null, link: '', error: '' });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate the registration form state. Pure function — easy to unit test.
 * Returns { valid, errors, songErrors }.
 */
export function validateRegistration(state, t) {
  const errors = {};
  if (!state.childName.trim()) errors.childName = t('form.validation.required');
  if (!state.parentName.trim()) errors.parentName = t('form.validation.required');
  if (!state.email.trim()) errors.email = t('form.validation.required');
  else if (!EMAIL_REGEX.test(state.email)) errors.email = t('form.validation.email');
  if (!state.consent) errors.consent = t('form.consentRequired');

  const songErrors = state.songs.map((song) => {
    if (song.mode === 'upload' && song.file && song.file.size > MAX_FILE_BYTES) {
      return t('form.validation.sizeTooBig');
    }
    if (song.mode === 'link' && song.link.trim() && !isAcceptedSubmissionLink(song.link)) {
      return t('form.validation.invalidLink');
    }
    return '';
  });

  const filledCount = countFilledSongs(state.songs);
  if (filledCount === 0) errors.songs = t('form.validation.atLeastOne');

  const allSongOk = songErrors.every((e) => !e);
  const valid = Object.keys(errors).length === 0 && allSongOk;
  return { valid, errors, songErrors };
}

export function countFilledSongs(songs) {
  return songs.filter(
    (s) => (s.mode === 'upload' && s.file) || (s.mode === 'link' && s.link.trim()),
  ).length;
}

/**
 * Build the multipart FormData body to POST to /api/register.
 */
export function buildRegistrationFormData(state, locale) {
  const fd = new FormData();
  fd.append('child_name', state.childName.trim());
  fd.append('parent_name', state.parentName.trim());
  fd.append('parent_email', state.email.trim());
  fd.append('consent', 'true');
  fd.append('locale', locale);

  state.songs.forEach((song, i) => {
    const idx = i + 1;
    fd.append(`song_${idx}_mode`, song.mode);
    if (song.mode === 'upload' && song.file) {
      fd.append(`song_${idx}_file`, song.file, song.file.name);
    } else if (song.mode === 'link' && song.link.trim()) {
      fd.append(`song_${idx}_link`, song.link.trim());
    }
  });
  return fd;
}

/**
 * Resolve the visible state of the submit button for clean rendering.
 */
export function getSubmitButtonState({ submitting, retryAvailable }) {
  if (submitting) return SUBMIT_BUTTON_STATE.SUBMITTING;
  if (retryAvailable) return SUBMIT_BUTTON_STATE.RETRY;
  return SUBMIT_BUTTON_STATE.IDLE;
}
