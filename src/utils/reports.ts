import { DailyReport } from '../types';

/**
 * The most recent report before `date` that left something under
 * 「明日の予定」.
 *
 * Deliberately not "yesterday": a solo owner does not write a report every
 * single day, so the plans to carry over are the last ones actually written.
 * Dates are YYYY-MM-DD, so plain string comparison orders them correctly.
 */
export function findPlansToCarryOver(
  reports: DailyReport[],
  date: string,
  excludeId?: string,
): DailyReport | null {
  let best: DailyReport | null = null;
  for (const report of reports) {
    if (report.id === excludeId) continue;
    if (report.date >= date) continue;
    if (!report.tomorrowPlans.trim()) continue;
    if (!best || report.date > best.date) best = report;
  }
  return best;
}
