import { DailyReport } from '../types';
import { PresidentProfile, normalizeProfile, normalizeReports } from './storage';
import { getTodayString } from './date';
import { downloadTextFile } from './download';

/**
 * Full backup in JSON.
 *
 * CSV is for humans (and the accountant); it is lossy and cannot be read back.
 * This file is the one that can actually restore the app after a device change,
 * a cleared browser, or iOS evicting localStorage.
 */
export const BACKUP_FORMAT = 'hitori-shacho-nippo-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: string;
  version: number;
  exportedAt: string;
  reports: DailyReport[];
  profile: PresidentProfile;
}

export function generateBackupJson(reports: DailyReport[], profile: PresidentProfile): string {
  const payload: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    reports,
    profile,
  };
  return JSON.stringify(payload, null, 2);
}

export function backupFilename(): string {
  return `一人社長日報_バックアップ_${getTodayString()}.json`;
}

export function downloadBackup(reports: DailyReport[], profile: PresidentProfile): void {
  downloadTextFile(
    generateBackupJson(reports, profile),
    backupFilename(),
    'application/json;charset=utf-8;',
  );
}

export type ParsedBackup =
  | { ok: true; reports: DailyReport[]; profile: PresidentProfile }
  | { ok: false; error: string };

/**
 * Read a backup file. Accepts our own format and, as a fallback, a bare array
 * of reports so a hand-edited or partial file is still recoverable.
 */
export function parseBackupJson(text: string): ParsedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSONとして読み取れませんでした。バックアップファイルを選び直してください。' };
  }

  if (Array.isArray(parsed)) {
    const reports = normalizeReports(parsed);
    if (reports.length === 0) {
      return { ok: false, error: '日報が1件も含まれていません。別のファイルをお試しください。' };
    }
    return { ok: true, reports, profile: normalizeProfile(null) };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'このファイルはバックアップの形式ではありません。' };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.format !== undefined && obj.format !== BACKUP_FORMAT) {
    return { ok: false, error: '別のアプリのバックアップファイルのようです。' };
  }
  if (!Array.isArray(obj.reports)) {
    return { ok: false, error: 'バックアップに日報のデータが見つかりませんでした。' };
  }

  const reports = normalizeReports(obj.reports);
  if (reports.length === 0) {
    return { ok: false, error: '読み取れる日報が1件もありませんでした。ファイルが壊れている可能性があります。' };
  }
  return { ok: true, reports, profile: normalizeProfile(obj.profile) };
}
