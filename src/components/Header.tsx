import React, { useRef, useState } from 'react';
import {
  Download,
  Building2,
  User,
  Settings,
  X,
  Check,
  Save,
  Upload,
  ShieldAlert,
} from 'lucide-react';
import { PresidentProfile, saveProfile } from '../utils/storage';
import { DailyReport } from '../types';
import { downloadCsv, generateReportsCsv } from '../utils/csv';
import { getTodayString } from '../utils/date';
import { downloadBackup, parseBackupJson } from '../utils/backup';
import { Modal } from './Modal';

interface HeaderProps {
  currentTab: 'create' | 'list';
  onTabChange: (tab: 'create' | 'list') => void;
  reportsCount: number;
  allReports: DailyReport[];
  profile: PresidentProfile;
  onProfileUpdate: (newProfile: PresidentProfile) => void;
  /** Replace all stored data with a backup. Returns false if persisting failed. */
  onRestore: (reports: DailyReport[], profile: PresidentProfile) => boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  reportsCount,
  allReports,
  profile,
  onProfileUpdate,
  onRestore,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempProfile, setTempProfile] = useState<PresidentProfile>(profile);
  const [savedNotice, setSavedNotice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<
    { reports: DailyReport[]; profile: PresidentProfile } | null
  >(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleOpenSettings = () => {
    setTempProfile(profile);
    setSaveError(null);
    setRestoreError(null);
    setRestoreCandidate(null);
    setIsSettingsOpen(true);
  };

  const handleBackup = () => {
    downloadBackup(allReports, profile);
  };

  const handleBackupFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after a failed attempt
    if (!file) return;
    setRestoreError(null);
    try {
      const result = parseBackupJson(await file.text());
      if (!result.ok) {
        setRestoreError(result.error);
        return;
      }
      setRestoreCandidate({ reports: result.reports, profile: result.profile });
    } catch {
      setRestoreError('ファイルを読み込めませんでした。もう一度お試しください。');
    }
  };

  const handleConfirmRestore = () => {
    if (!restoreCandidate) return;
    if (!onRestore(restoreCandidate.reports, restoreCandidate.profile)) return;
    setRestoreCandidate(null);
    setIsSettingsOpen(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveProfile(tempProfile)) {
      setSaveError('設定を保存できませんでした。ブラウザの保存領域にアクセスできません。');
      return;
    }
    setSaveError(null);
    onProfileUpdate(tempProfile);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      setIsSettingsOpen(false);
    }, 1000);
  };

  const handleQuickAllCsv = () => {
    if (allReports.length === 0) return;
    const csv = generateReportsCsv(allReports);
    const today = getTodayString();
    downloadCsv(csv, `一人社長日報_全件_${today}.csv`);
  };

  return (
    <header className="sticky top-0 z-40 bg-page/95 backdrop-blur-md border-b border-line">
      <div className="max-w-xl mx-auto px-4 py-3">
        {/* Top brand row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-ink text-on-dark flex items-center justify-center font-bold text-sm shadow-xs">
              日
            </div>
            <div>
              <h1 className="text-base font-bold text-ink tracking-tight leading-none">
                一人社長の日報
              </h1>
              <p className="text-[11px] text-ink-3 font-medium mt-0.5">
                {profile.companyName ? `${profile.companyName} ` : ''}
                {profile.presidentName ? `(${profile.presidentName})` : 'スマホから簡単作成 & CSV'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick CSV export button in header */}
            <button
              type="button"
              onClick={handleQuickAllCsv}
              title="全件をCSVで一括ダウンロード"
              aria-label={`全${reportsCount}件の日報をCSVでダウンロード`}
              disabled={allReports.length === 0}
              className={`h-8.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                allReports.length > 0
                  ? 'bg-surface text-accent-ink hover:bg-surface-hover border-line shadow-2xs'
                  : 'bg-sunken text-ink-soft border-line cursor-not-allowed'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV保存</span>
              <span className="text-[10px] bg-accent-soft text-accent-ink px-1.5 py-0.2 rounded-full font-mono">
                {reportsCount}
              </span>
            </button>

            {/* Profile / Settings Button */}
            <button
              type="button"
              onClick={handleOpenSettings}
              className="w-8.5 h-8.5 rounded-xl bg-surface hover:bg-surface-hover border border-line text-ink-3 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              title="会社名・設定"
              aria-label="会社名・設定を開く"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switchers: Mobile-optimized 44px min tap height */}
        <div className="mt-3 grid grid-cols-2 gap-1 bg-sunken-2 p-1 rounded-xl border border-line/60">
          <button
            type="button"
            onClick={() => onTabChange('create')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              currentTab === 'create'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            <span>✏️ 日報を書く</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('list')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              currentTab === 'list'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            <span>📋 一覧・CSV出力</span>
            <span className="text-[10px] bg-sunken-2 text-ink-2 px-1.5 py-0.2 rounded-full font-medium">
              {reportsCount}
            </span>
          </button>
        </div>
      </div>

      {/* Profile Settings Modal */}
      {isSettingsOpen && (
        <Modal
          label="会社名・氏名の設定とバックアップ"
          onClose={() => setIsSettingsOpen(false)}
          panelClassName="max-w-sm max-h-[85vh] overflow-y-auto"
        >
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-bold text-sm text-ink flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-ink-3" />
                日報ヘッダー設定（任意）
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="設定を閉じる"
                className="w-7 h-7 flex items-center justify-center text-ink-3 hover:text-ink rounded-full hover:bg-sunken transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink-3 leading-relaxed">
              設定すると、共有用テキストや日報のヘッダーに会社名や氏名が自動反映されます。空欄のままでも利用できます。
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div>
                <label
                  htmlFor="profile-company"
                  className="text-xs font-bold text-ink-2 mb-1 flex items-center gap-1"
                >
                  <Building2 className="w-3.5 h-3.5 text-ink-3" />
                  会社名・屋号
                </label>
                <input
                  id="profile-company"
                  type="text"
                  placeholder="例: 合同会社〇〇"
                  value={tempProfile.companyName}
                  onChange={(e) =>
                    setTempProfile({ ...tempProfile, companyName: e.target.value })
                  }
                  className="w-full h-10 px-3 bg-sunken border border-line rounded-xl text-base font-medium text-ink focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring focus:bg-surface"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-name"
                  className="text-xs font-bold text-ink-2 mb-1 flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5 text-ink-3" />
                  お名前（役職）
                </label>
                <input
                  id="profile-name"
                  type="text"
                  placeholder="例: 代表 山田太郎"
                  value={tempProfile.presidentName}
                  onChange={(e) =>
                    setTempProfile({ ...tempProfile, presidentName: e.target.value })
                  }
                  className="w-full h-10 px-3 bg-sunken border border-line rounded-xl text-base font-medium text-ink focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring focus:bg-surface"
                />
              </div>

              {saveError && (
                <p
                  role="alert"
                  className="text-[11px] leading-relaxed text-danger-ink bg-danger-soft border border-danger-line rounded-lg px-2.5 py-2"
                >
                  {saveError}
                </p>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 h-10 bg-accent text-on-dark font-bold text-xs rounded-xl hover:bg-accent-hover transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {savedNotice ? (
                    <>
                      <Check className="w-4 h-4 text-on-dark" />
                      <span>保存しました</span>
                    </>
                  ) : (
                    <span>保存する</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="h-10 px-3 bg-sunken hover:bg-line text-ink-2 font-medium text-xs rounded-xl transition-colors"
                >
                  閉じる
                </button>
              </div>
            </form>

            {/* Backup & restore: the only path that survives a lost device */}
            <div className="pt-3 border-t border-line space-y-2.5">
              <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-ink-3" />
                バックアップと復元
              </h4>
              <p className="text-[11px] text-ink-3 leading-relaxed">
                日報はこの端末のブラウザ内にだけ保存されます。機種変更やブラウザのデータ削除で消えるため、
                ときどきバックアップを保存してください。CSVは提出・閲覧用のため、
                復元にはこのJSONファイルが必要です。
              </p>

              <button
                type="button"
                onClick={handleBackup}
                disabled={allReports.length === 0}
                className={`w-full h-10 flex items-center justify-center gap-1.5 rounded-xl font-bold text-xs transition-colors border ${
                  allReports.length > 0
                    ? 'bg-accent text-on-dark hover:bg-accent-hover border-accent cursor-pointer shadow-xs'
                    : 'bg-sunken text-ink-soft border-line cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                バックアップを保存（{allReports.length}件）
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl font-semibold text-xs bg-sunken text-ink hover:bg-line border border-line transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-ink-3" />
                バックアップから復元
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleBackupFileChosen}
                tabIndex={-1}
                className="hidden"
                aria-label="バックアップファイルを選択"
              />

              {restoreError && (
                <p
                  role="alert"
                  className="text-[11px] leading-relaxed text-danger-ink bg-danger-soft border border-danger-line rounded-lg px-2.5 py-2"
                >
                  {restoreError}
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Restore confirmation: replacing everything is irreversible */}
      {restoreCandidate && (
        <Modal
          label="バックアップからの復元の確認"
          onClose={() => setRestoreCandidate(null)}
        >
          <div className="p-5 space-y-4">
            <h3 className="font-bold text-sm text-ink flex items-center gap-1.5 pb-2 border-b border-line">
              <Upload className="w-4 h-4 text-amber-ink" />
              バックアップから復元しますか？
            </h3>

            <div className="rounded-xl bg-sunken border border-line p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-3">現在この端末にある日報</span>
                <span className="font-bold text-ink">{allReports.length} 件</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-3">復元後</span>
                <span className="font-bold text-ink">{restoreCandidate.reports.length} 件</span>
              </div>
            </div>

            <p className="text-xs text-ink-3 leading-relaxed">
              現在の日報は<strong className="text-danger-ink">すべて置き換わります</strong>。
              元に戻せないため、必要であれば先に「バックアップを保存」してください。
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="w-full h-11 bg-danger text-on-dark hover:bg-danger-hover active:bg-danger-active rounded-xl font-bold text-sm shadow-xs transition-colors cursor-pointer"
              >
                置き換えて復元する
              </button>
              <button
                type="button"
                onClick={() => setRestoreCandidate(null)}
                className="w-full h-11 bg-sunken text-ink hover:bg-line rounded-xl font-semibold text-sm border border-line transition-colors cursor-pointer"
              >
                キャンセル
              </button>
            </div>
          </div>
        </Modal>
      )}
    </header>
  );
};
