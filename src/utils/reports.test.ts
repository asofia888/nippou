import { describe, expect, it } from 'vitest';
import { DailyReport } from '../types';
import { findPlansToCarryOver } from './reports';

const make = (id: string, date: string, tomorrowPlans: string): DailyReport => ({
  id, date, tasksCompleted: '', achievements: '', learnings: '', tomorrowPlans,
  createdAt: `${date}T00:00:00.000Z`,
});

const reports = [
  make('a', '2026-09-01', '①A社へ提案書'),
  make('b', '2026-09-03', '②税理士へ月次資料'),
  make('c', '2026-09-05', '③請求書の発行'),
];

describe('findPlansToCarryOver', () => {
  it('picks the closest earlier report, not merely the day before', () => {
    // 9/4 に日報はない。直近で書かれた 9/3 の予定を引き継ぐ。
    expect(findPlansToCarryOver(reports, '2026-09-05')?.id).toBe('b');
  });

  it('ignores reports on or after the given date', () => {
    expect(findPlansToCarryOver(reports, '2026-09-01')).toBeNull();
    expect(findPlansToCarryOver(reports, '2026-09-03')?.id).toBe('a');
  });

  it('skips reports that left no plans', () => {
    const withBlank = [...reports, make('d', '2026-09-04', '   ')];
    expect(findPlansToCarryOver(withBlank, '2026-09-05')?.id).toBe('b');
  });

  it('excludes the report currently being edited', () => {
    expect(findPlansToCarryOver(reports, '2026-09-05', 'b')?.id).toBe('a');
  });

  it('returns null when there is nothing to carry over', () => {
    expect(findPlansToCarryOver([], '2026-09-05')).toBeNull();
    expect(findPlansToCarryOver([make('x', '2026-09-01', '')], '2026-09-05')).toBeNull();
  });

  it('does not depend on the input being sorted', () => {
    expect(findPlansToCarryOver([...reports].reverse(), '2026-09-05')?.id).toBe('b');
  });
});
