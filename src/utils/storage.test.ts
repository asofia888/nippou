// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadProfile,
  loadReports,
  normalizeProfile,
  normalizeReport,
  normalizeReports,
  saveProfile,
  saveReports,
} from './storage';

const KEY = 'president_daily_reports_v1';
const PROFILE_KEY = 'president_profile_v1';

beforeEach(() => localStorage.clear());

describe('normalizeReport', () => {
  it('keeps a well-formed record', () => {
    const r = normalizeReport({
      id: 'r1', date: '2026-09-01', workingHours: 7.5,
      tasksCompleted: 'a', achievements: 'b', learnings: 'c', tomorrowPlans: 'd',
      createdAt: '2026-09-01T00:00:00.000Z',
    });
    expect(r).toMatchObject({ id: 'r1', date: '2026-09-01', workingHours: 7.5, tasksCompleted: 'a' });
  });

  // 旧実装ではここで r.date.startsWith が例外になり、一覧全体が落ちていた。
  it.each([
    ['日付がない', { id: 'x', tasksCompleted: 'a' }],
    ['ありえない日付', { date: '2026-02-30' }],
    ['null', null],
    ['文字列', 'ゴミ'],
    ['数値', 42],
    ['配列', []],
  ])('drops a record that is %s', (_label, input) => {
    expect(normalizeReport(input)).toBeNull();
  });

  it('coerces non-string text fields to empty strings', () => {
    const r = normalizeReport({ date: '2026-09-01', tasksCompleted: 123, achievements: null });
    expect(r?.tasksCompleted).toBe('');
    expect(r?.achievements).toBe('');
  });

  it.each([['文字列', '8時間'], ['NaN', NaN], ['負値', -1]])(
    'ignores a workingHours that is %s',
    (_label, value) => {
      expect(normalizeReport({ date: '2026-09-01', workingHours: value })?.workingHours).toBeUndefined();
    },
  );

  it('invents an id when one is missing', () => {
    expect(normalizeReport({ date: '2026-09-01' }, 3)?.id).toBe('rep-2026-09-01-3');
  });

  it('fills in createdAt when absent', () => {
    expect(normalizeReport({ date: '2026-09-01' })?.createdAt).toBeTruthy();
  });
});

describe('normalizeReports', () => {
  it('keeps only the recoverable records', () => {
    const out = normalizeReports([
      { id: 'a', date: '2026-09-01' }, { id: 'b' }, null, 'x', { date: '2026-09-02' },
    ]);
    expect(out).toHaveLength(2);
  });

  it('makes duplicate ids unique so editing cannot hit two rows', () => {
    const out = normalizeReports([
      { id: 'same', date: '2026-09-01' },
      { id: 'same', date: '2026-09-02' },
      { id: 'same', date: '2026-09-03' },
    ]);
    expect(new Set(out.map((r) => r.id)).size).toBe(3);
  });

  it('returns an empty array for anything that is not an array', () => {
    expect(normalizeReports({ reports: [] })).toEqual([]);
    expect(normalizeReports(null)).toEqual([]);
  });
});

describe('normalizeProfile', () => {
  it('keeps string fields and discards the rest', () => {
    expect(normalizeProfile({ companyName: '合同会社A', presidentName: 42, extra: 'x' }))
      .toEqual({ companyName: '合同会社A', presidentName: '' });
  });

  it('falls back to blanks', () => {
    expect(normalizeProfile(null)).toEqual({ companyName: '', presidentName: '' });
  });
});

describe('saveReports / loadReports', () => {
  it('round-trips', () => {
    const reports = normalizeReports([{ id: 'r1', date: '2026-09-01', tasksCompleted: 'a' }]);
    expect(saveReports(reports)).toBe(true);
    expect(loadReports()).toEqual(reports);
  });

  it('reports failure instead of swallowing it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(saveReports([])).toBe(false);
    expect(saveProfile({ companyName: '', presidentName: '' })).toBe(false);
  });

  it('survives corrupted JSON', () => {
    localStorage.setItem(KEY, '{ not json');
    expect(loadReports()).toEqual([]);
  });

  it('repairs a stored array containing junk', () => {
    localStorage.setItem(KEY, JSON.stringify([{ id: 'ok', date: '2026-09-01' }, { nope: true }]));
    expect(loadReports()).toHaveLength(1);
  });

  it('seeds a sample on the very first run', () => {
    expect(loadReports().length).toBeGreaterThan(0);
    expect(localStorage.getItem(KEY)).toBeTruthy();
  });

  it('does not resurrect the sample after the user deletes everything', () => {
    saveReports([]);
    expect(loadReports()).toEqual([]);
  });
});

describe('saveProfile / loadProfile', () => {
  it('round-trips', () => {
    expect(saveProfile({ companyName: '合同会社B', presidentName: '代表 山田' })).toBe(true);
    expect(loadProfile()).toEqual({ companyName: '合同会社B', presidentName: '代表 山田' });
  });

  it('survives corrupted JSON', () => {
    localStorage.setItem(PROFILE_KEY, 'oops');
    expect(loadProfile()).toEqual({ companyName: '', presidentName: '' });
  });
});
