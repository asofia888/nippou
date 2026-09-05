import { DailyReport } from '../types';
import { getTodayString, isValidDateString } from './date';

const STORAGE_KEY = 'president_daily_reports_v1';
const PROFILE_KEY = 'president_profile_v1';

export interface PresidentProfile {
  companyName: string;
  presidentName: string;
}

const DEFAULT_PROFILE: PresidentProfile = {
  companyName: '',
  presidentName: '',
};

const INITIAL_SAMPLE_REPORTS: DailyReport[] = [
  {
    id: 'sample-1',
    date: getTodayString(-1),
    workingHours: 8,
    tasksCompleted: '・クライアントA社との新規事業MTG（オンライン30分）\n・今期決算に向けた経費仕訳と領収書チェック\n・新サービスLPの修正確認と文言ブラッシュアップ',
    achievements: '・A社より基本合意の内諾を獲得（来週見積送付）\n・月次ルーティン業務を半日で完了',
    learnings: '・商談前の事前ヒアリングシート共有が受注確度を高めると実感\n・午後集中力が落ちたので、散歩休憩を取り入れたのが良かった',
    tomorrowPlans: '・A社向け提案書及び概算見積書の作成・送付\n・税理士への月次資料提出\n・来週の定期面談日程調整',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Coerce one persisted record into a well-formed DailyReport.
 *
 * Stored JSON is only as trustworthy as whatever last wrote it — an older
 * build, a hand-edited backup, a half-finished write. A single record missing
 * `date` used to crash the whole list on `r.date.startsWith(...)`, so anything
 * unrecoverable is dropped and the rest is repaired.
 */
export function normalizeReport(raw: unknown, index = 0): DailyReport | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isValidDateString(r.date)) return null; // 日付がなければ日報として復元できない

  const hours =
    typeof r.workingHours === 'number' && Number.isFinite(r.workingHours) && r.workingHours >= 0
      ? r.workingHours
      : undefined;

  return {
    id: typeof r.id === 'string' && r.id.trim() ? r.id : `rep-${r.date}-${index}`,
    date: r.date,
    workingHours: hours,
    tasksCompleted: asString(r.tasksCompleted),
    achievements: asString(r.achievements),
    learnings: asString(r.learnings),
    tomorrowPlans: asString(r.tomorrowPlans),
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined,
  };
}

/** Normalize a list and guarantee unique ids (duplicates would edit two rows at once). */
export function normalizeReports(raw: unknown): DailyReport[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: DailyReport[] = [];
  raw.forEach((item, i) => {
    const report = normalizeReport(item, i);
    if (!report) return;
    let id = report.id;
    while (seen.has(id)) id = `${report.id}-${seen.size}`;
    seen.add(id);
    out.push(id === report.id ? report : { ...report, id });
  });
  return out;
}

export function loadReports(): DailyReport[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // First time initialization
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_REPORTS));
      return INITIAL_SAMPLE_REPORTS;
    }
    return normalizeReports(JSON.parse(saved));
  } catch (e) {
    console.error('Failed to load reports from localStorage', e);
    return [];
  }
}

/**
 * Persist reports. Returns false when the write failed (quota exceeded,
 * private browsing, storage disabled) so callers can warn the user instead of
 * silently losing the entry.
 */
export function saveReports(reports: DailyReport[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    return true;
  } catch (e) {
    console.error('Failed to save reports to localStorage', e);
    return false;
  }
}

export function normalizeProfile(raw: unknown): PresidentProfile {
  if (!raw || typeof raw !== 'object') return DEFAULT_PROFILE;
  const p = raw as Record<string, unknown>;
  return {
    companyName: asString(p.companyName),
    presidentName: asString(p.presidentName),
  };
}

export function loadProfile(): PresidentProfile {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (!saved) return DEFAULT_PROFILE;
    return normalizeProfile(JSON.parse(saved));
  } catch {
    return DEFAULT_PROFILE;
  }
}

/** Persist the profile. Returns false when the write failed. */
export function saveProfile(profile: PresidentProfile): boolean {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch (e) {
    console.error('Failed to save profile to localStorage', e);
    return false;
  }
}
