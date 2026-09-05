import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatTimestampLocal, getTodayString, isValidDateString, toDateString } from './date';

afterEach(() => vi.useRealTimers());

describe('toDateString', () => {
  it('zero-pads month and day', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('getTodayString', () => {
  it('uses local time, not UTC', () => {
    // 20:00 UTC は日本時間では翌日の朝5時。toISOString() を使っていると前日になる。
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-04T20:00:00Z'));
    expect(getTodayString()).toBe('2026-09-05');
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-09-04');
  });

  it('shifts by whole days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T03:00:00Z'));
    expect(getTodayString(-1)).toBe('2026-02-28');
    expect(getTodayString(1)).toBe('2026-03-02');
  });
});

describe('isValidDateString', () => {
  it.each(['2026-09-01', '2024-02-29'])('accepts %s', (v) => {
    expect(isValidDateString(v)).toBe(true);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-9-1', '20260901', '', 'abc'])(
    'rejects %s',
    (v) => expect(isValidDateString(v)).toBe(false),
  );

  it('rejects non-strings', () => {
    expect(isValidDateString(null)).toBe(false);
    expect(isValidDateString(20260901)).toBe(false);
    expect(isValidDateString(undefined)).toBe(false);
  });
});

describe('formatTimestampLocal', () => {
  it('renders a stored UTC timestamp in local time', () => {
    expect(formatTimestampLocal('2026-09-01T00:30:00.000Z')).toBe('2026/09/01 09:30');
  });

  it('returns an empty string for missing values', () => {
    expect(formatTimestampLocal(undefined)).toBe('');
    expect(formatTimestampLocal('')).toBe('');
  });

  it('passes unparsable input through rather than showing Invalid Date', () => {
    expect(formatTimestampLocal('not-a-date')).toBe('not-a-date');
  });
});
