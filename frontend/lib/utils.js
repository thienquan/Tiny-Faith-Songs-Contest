import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function scrollToId(id) {
  if (typeof window === 'undefined') return;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const n = bytes / Math.pow(1024, i);
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function isValidUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const u = new URL(value.trim());
    return ['http:', 'https:'].includes(u.protocol);
  } catch (_e) {
    return false;
  }
}

export function isAcceptedSubmissionLink(value) {
  if (!isValidUrl(value)) return false;
  const v = value.trim().toLowerCase();
  return (
    v.includes('youtube.com') ||
    v.includes('youtu.be') ||
    v.includes('drive.google.com') ||
    v.includes('docs.google.com')
  );
}
