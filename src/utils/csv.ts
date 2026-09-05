import { DailyReport } from '../types';
import { formatTimestampLocal } from './date';
import { downloadTextFile } from './download';

/**
 * Escape a string for CSV.
 *
 * Quoting alone does not stop a spreadsheet from treating a cell as a formula:
 * Excel evaluates anything starting with = + - @ (or a leading tab/CR) when the
 * file is opened. These exports are handed to an accountant, so such cells get
 * a leading apostrophe to force them to be read as text.
 */
function escapeCsvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape embedded quotes, then wrap: handles commas and newlines too
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generate CSV string with UTF-8 BOM for Japanese Excel compatibility
 */
export function generateReportsCsv(reports: DailyReport[]): string {
  const headers = [
    '日付',
    '稼働時間(h)',
    '業務内容・実績',
    '成果・売上・決定事項',
    '課題・気づき・反省',
    '明日の予定・タスク',
    '作成日時',
    '更新日時',
  ];

  // Sort by date descending
  const sorted = [...reports].sort((a, b) => b.date.localeCompare(a.date));

  const rows = sorted.map((r) => [
    escapeCsvCell(r.date),
    escapeCsvCell(r.workingHours ?? ''),
    escapeCsvCell(r.tasksCompleted),
    escapeCsvCell(r.achievements),
    escapeCsvCell(r.learnings),
    escapeCsvCell(r.tomorrowPlans),
    escapeCsvCell(formatTimestampLocal(r.createdAt)),
    escapeCsvCell(formatTimestampLocal(r.updatedAt)),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

  // Prefix with UTF-8 BOM
  return '\uFEFF' + csvContent;
}

/**
 * Trigger browser file download of CSV
 */
export function downloadCsv(csvString: string, filename: string): void {
  downloadTextFile(csvString, filename, 'text/csv;charset=utf-8;');
}

/**
 * Format a daily report into cleanly formatted plain text for copying or sharing
 */
export function formatReportAsText(report: DailyReport, companyOrUserName?: string): string {
  const header = companyOrUserName 
    ? `【日報】${report.date}（${companyOrUserName}）`
    : `【日報】${report.date}`;

  const workingHoursLine = report.workingHours ? `■ 稼働時間: ${report.workingHours}時間\n\n` : '';

  const lines = [
    header,
    ...(workingHoursLine ? [workingHoursLine.trim(), ''] : ['']),
    '■ 今日の業務・活動内容:',
    report.tasksCompleted || '（なし）',
    '',
    '■ 成果・売上・決定事項:',
    report.achievements || '（なし）',
    '',
    '■ 課題・気づき・反省:',
    report.learnings || '（なし）',
    '',
    '■ 明日の予定・タスク:',
    report.tomorrowPlans || '（なし）',
  ];

  return lines.join('\n');
}

