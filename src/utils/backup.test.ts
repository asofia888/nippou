import { describe, expect, it } from 'vitest';
import { DailyReport } from '../types';
import { BACKUP_FORMAT, generateBackupJson, parseBackupJson } from './backup';

const reports: DailyReport[] = [{
  id: 'r1', date: '2026-09-01', workingHours: 8,
  tasksCompleted: 'A社と打合せ', achievements: '受注', learnings: '', tomorrowPlans: '',
  createdAt: '2026-09-01T00:00:00.000Z',
}];
const profile = { companyName: '合同会社テスト', presidentName: '代表 山田' };

describe('backup round trip', () => {
  it('restores exactly what was exported', () => {
    const result = parseBackupJson(generateBackupJson(reports, profile));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reports).toEqual(reports);
    expect(result.profile).toEqual(profile);
  });

  it('stamps the file with a format marker and export time', () => {
    const parsed = JSON.parse(generateBackupJson(reports, profile));
    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.version).toBe(1);
    expect(Number.isNaN(Date.parse(parsed.exportedAt))).toBe(false);
  });
});

describe('parseBackupJson', () => {
  it('accepts a bare array of reports so a hand-edited file still works', () => {
    const result = parseBackupJson(JSON.stringify(reports));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.reports).toHaveLength(1);
  });

  it('repairs broken records inside an otherwise valid backup', () => {
    const result = parseBackupJson(JSON.stringify({
      format: BACKUP_FORMAT, version: 1, reports: [...reports, { nope: true }, null], profile,
    }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.reports).toHaveLength(1);
  });

  it.each([
    ['壊れたJSON', 'これはJSONではありません', 'JSONとして読み取れません'],
    ['他アプリの形式', JSON.stringify({ format: 'other-app', reports: [] }), '別のアプリ'],
    ['reports がない', JSON.stringify({ format: BACKUP_FORMAT }), '日報のデータが見つかりません'],
    ['中身が空', JSON.stringify({ format: BACKUP_FORMAT, reports: [] }), '読み取れる日報が1件も'],
    ['空配列', '[]', '1件も含まれていません'],
    ['数値', '42', 'バックアップの形式ではありません'],
  ])('rejects %s with an explanation', (_label, input, expected) => {
    const result = parseBackupJson(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(expected);
  });
});
