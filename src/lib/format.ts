import type { GameStatus } from '@/lib/types';

export const statusLabels: Record<GameStatus, string> = {
  submitted: 'Eingereicht',
  planned: 'Geplant',
  playing: 'Aktuell gespielt',
  played: 'Bereits gespielt',
  rejected: 'Abgelehnt'
};

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

export function relativeDate(value: string): string {
  const timestamp = new Date(value).getTime();
  const diff = timestamp - Date.now();
  const abs = Math.abs(diff);
  const formatter = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });
  if (abs < 60 * 60 * 1000) return formatter.format(Math.round(diff / (60 * 1000)), 'minute');
  if (abs < 24 * 60 * 60 * 1000) return formatter.format(Math.round(diff / (60 * 60 * 1000)), 'hour');
  if (abs < 30 * 24 * 60 * 60 * 1000) return formatter.format(Math.round(diff / (24 * 60 * 60 * 1000)), 'day');
  return formatDate(value);
}

export function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

