/** Two-letter initials from first + last name (e.g. "Sneh Jetwani" -> "SJ"). */
export function initials(first?: string | null, last?: string | null): string {
  const a = (first ?? '').trim();
  const b = (last ?? '').trim();
  const i1 = a ? a[0] : '';
  const i2 = b ? b[0] : '';
  return (i1 + i2).toUpperCase() || '?';
}

/** "1h 23m", "45m", or "<1m" from a minute count. */
export function formatDuration(minutes?: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 1) return '<1m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** HH:MM:SS from elapsed milliseconds (for the live session timer). */
export function elapsedHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Compact relative time: "just now", "5m", "3h", "2d", or a date. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString();
}

const OUTLET_LABELS: Record<string, string> = {
  NONE: 'No outlets',
  LOW: 'Few outlets',
  MEDIUM: 'Some outlets',
  HIGH: 'Many outlets',
};

export function outletLabel(value?: string | null): string {
  if (!value) return '';
  return OUTLET_LABELS[value] ?? value;
}
