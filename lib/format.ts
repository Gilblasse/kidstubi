export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const DIVISIONS: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [7, 'day'],
  [4.34524, 'week'],
  [12, 'month'],
  [Number.POSITIVE_INFINITY, 'year'],
];

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatTimeAgo(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  let diff = (date.getTime() - Date.now()) / 1000;
  for (const [step, unit] of DIVISIONS) {
    if (Math.abs(diff) < step) return rtf.format(Math.round(diff), unit);
    diff /= step;
  }
  return rtf.format(Math.round(diff), 'year');
}
