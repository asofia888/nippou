import { describe, expect, it } from 'vitest';
import { DailyReport } from '../types';
import { formatReportAsText, generateReportsCsv } from './csv';

const report = (over: Partial<DailyReport> = {}): DailyReport => ({
  id: 'r1',
  date: '2026-09-01',
  workingHours: 8,
  tasksCompleted: 'A社と打合せ',
  achievements: '受注',
  learnings: '',
  tomorrowPlans: '',
  createdAt: '2026-09-01T00:30:00.000Z',
  ...over,
});

const rows = (csv: string) => csv.replace(/^\uFEFF/, '').split('\r\n');

describe('generateReportsCsv', () => {
  it('starts with a UTF-8 BOM so Excel does not mojibake Japanese', () => {
    expect(generateReportsCsv([report()]).startsWith('\uFEFF')).toBe(true);
  });

  it('separates rows with CRLF', () => {
    const csv = generateReportsCsv([report()]);
    expect(csv).toContain('\r\n');
    expect(rows(csv)).toHaveLength(2);
  });

  it('sorts by date descending', () => {
    const csv = generateReportsCsv([
      report({ id: 'a', date: '2026-09-01', tasksCompleted: '古い' }),
      report({ id: 'b', date: '2026-09-03', tasksCompleted: '新しい' }),
    ]);
    expect(rows(csv)[1]).toContain('新しい');
    expect(rows(csv)[2]).toContain('古い');
  });

  it('escapes embedded quotes and keeps newlines inside the cell', () => {
    const csv = generateReportsCsv([report({ tasksCompleted: '「"重要"」\n2行目, カンマ' })]);
    expect(csv).toContain('"「""重要""」\n2行目, カンマ"');
  });

  // Excel evaluates these when the file is opened; the CSV goes to an accountant.
  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '=cmd|\'/c calc\'!A1'])(
    'neutralizes the formula %s',
    (payload) => {
      const csv = generateReportsCsv([report({ tasksCompleted: payload })]);
      expect(csv).toContain(`"'${payload}"`);
    },
  );

  it('leaves ordinary text untouched', () => {
    expect(generateReportsCsv([report({ tasksCompleted: '通常のテキスト' })]))
      .toContain('"通常のテキスト"');
  });

  it('writes timestamps in local time, not UTC', () => {
    const csv = generateReportsCsv([report({ updatedAt: '2026-09-02T13:00:00.000Z' })]);
    expect(rows(csv)[1]).toContain('"2026/09/01 09:30"'); // 作成日時
    expect(rows(csv)[1]).toContain('"2026/09/02 22:00"'); // 更新日時
  });

  it('leaves the updated column empty when never edited', () => {
    expect(rows(generateReportsCsv([report()]))[1].endsWith(',""')).toBe(true);
  });

  it('renders a missing workingHours as an empty cell', () => {
    const csv = generateReportsCsv([report({ workingHours: undefined })]);
    expect(rows(csv)[1]).toContain('"2026-09-01","",');
  });
});

describe('formatReportAsText', () => {
  it('includes the company name when given', () => {
    expect(formatReportAsText(report(), '合同会社テスト')).toContain('【日報】2026-09-01（合同会社テスト）');
  });

  it('omits the parenthesis when no name is set', () => {
    expect(formatReportAsText(report())).toContain('【日報】2026-09-01');
    expect(formatReportAsText(report())).not.toContain('（）');
  });

  it('marks empty sections rather than leaving a blank gap', () => {
    expect(formatReportAsText(report({ learnings: '' }))).toContain('（なし）');
  });
});
