/**
 * Date helpers.
 *
 * Everything here works in the device's local timezone on purpose. Using
 * `toISOString()` would emit UTC, which in Japan renders yesterday's date
 * between 00:00 and 09:00 — wrong on CSV rows and export filenames alike.
 */

/** Local YYYY-MM-DD, optionally shifted by whole days. */
export function getTodayString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toDateString(d);
}

/** Local YYYY-MM-DD for a given Date. */
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** True for a well-formed, real calendar date such as 2026-09-01. */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/**
 * Render a stored ISO timestamp as local "YYYY/MM/DD HH:mm" for humans
 * (CSV cells, screen labels). Returns '' for missing or unparsable input.
 */
export function formatTimestampLocal(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** "2026-09-01" → "2026年9月1日 (火)". Falls back to the raw string. */
export function formatDateJapanese(dateStr: string): string {
  if (!isValidDateString(dateStr)) return dateStr;
  const [year, month, day] = dateStr.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  return `${year}年${month}月${day}日 (${weekday})`;
}
