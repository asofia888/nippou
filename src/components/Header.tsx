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
    <header className="sticky top-0 z-40 bg-[#F8F7F4]/95 backdrop-blur-md border-b border-[#E6E2D3]">
      <div className="max-w-xl mx-auto px-4 py-3">
        {/* Top brand row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2D2A26] text-[#F8F7F4] flex items-center justify-center font-bold text-sm shadow-xs">
              日
            </div>
            <div>
              <h1 className="text-base font-bold text-[#2D2A26] tracking-tight leading-none">
                一人社長の日報
              </h1>
              <p className="text-[11px] text-[#6B6359] font-medium mt-0.5">
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
                  ? 'bg-white text-[#58684D] hover:bg-[#FDFCFB] border-[#E6E2D3] shadow-2xs'
                  : 'bg-[#F0EDE4] text-[#B5AEA4] border-[#E6E2D3] cursor-not-allowed'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV保存</span>
              <span className="text-[10px] bg-[#ECEEE6] text-[#58684D] px-1.5 py-0.2 rounded-full font-mono">
                {reportsCount}
              </span>
            </button>

            {/* Profile / Settings Button */}
            <button
              type="button"
              onClick={handleOpenSettings}
              className="w-8.5 h-8.5 rounded-xl bg-white hover:bg-[#FDFCFB] border border-[#E6E2D3] text-[#6B6359] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              title="会社名・設定"
              aria-label="会社名・設定を開く"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switchers: Mobile-optimized 44px min tap height */}
        <div className="mt-3 grid grid-cols-2 gap-1 bg-[#ECE8DC] p-1 rounded-xl border border-[#E6E2D3]/60">
          <button
            type="button"
            onClick={() => onTabChange('create')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              currentTab === 'create'
                ? 'bg-white text-[#2D2A26] shadow-xs'
                : 'text-[#6B6359] hover:text-[#2D2A26]'
            }`}
          >
            <span>✏️ 日報を書く</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('list')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              currentTab === 'list'
                ? 'bg-white text-[#2D2A26] shadow-xs'
                : 'text-[#6B6359] hover:text-[#2D2A26]'
            }`}
          >
            <span>📋 一覧・CSV出力</span>
            <span className="text-[10px] bg-[#DDD8CC] text-[#4A443F] px-1.5 py-0.2 rounded-full font-medium">
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
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E2D3]">
              <h3 className="font-bold text-sm text-[#2D2A26] flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-[#6B6359]" />
                日報ヘッダー設定（任意）
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="設定を閉じる"
                className="w-7 h-7 flex items-center justify-center text-[#6B6359] hover:text-[#2D2A26] rounded-full hover:bg-[#F0EDE4] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B6359] leading-relaxed">
              設定すると、共有用テキストや日報のヘッダーに会社名や氏名が自動反映されます。空欄のままでも利用できます。
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div>
                <label
                  htmlFor="profile-company"
                  className="text-xs font-bold text-[#4A443F] mb-1 flex items-center gap-1"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#6B6359]" />
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
                  className="w-full h-10 px-3 bg-[#F8F7F4] border border-[#E6E2D3] rounded-xl text-base font-medium text-[#2D2A26] focus:outline-none focus:ring-2 focus:ring-[#A5A58D]/30 focus:border-[#A5A58D] focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-name"
                  className="text-xs font-bold text-[#4A443F] mb-1 flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5 text-[#6B6359]" />
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
                  className="w-full h-10 px-3 bg-[#F8F7F4] border border-[#E6E2D3] rounded-xl text-base font-medium text-[#2D2A26] focus:outline-none focus:ring-2 focus:ring-[#A5A58D]/30 focus:border-[#A5A58D] focus:bg-white"
                />
              </div>

              {saveError && (
                <p
                  role="alert"
                  className="text-[11px] leading-relaxed text-[#7A4040] bg-[#F8EEEE] border border-[#E0C4C4] rounded-lg px-2.5 py-2"
                >
                  {saveError}
                </p>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 h-10 bg-[#6B705C] text-white font-bold text-xs rounded-xl hover:bg-[#5A5E4D] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {savedNotice ? (
                    <>
                      <Check className="w-4 h-4 text-[#D8E2DC]" />
                      <span>保存しました</span>
                    </>
                  ) : (
                    <span>保存する</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="h-10 px-3 bg-[#F0EDE4] hover:bg-[#E6E2D3] text-[#4A443F] font-medium text-xs rounded-xl transition-colors"
                >
                  閉じる
                </button>
              </div>
            </form>

            {/* Backup & restore: the only path that survives a lost device */}
            <div className="pt-3 border-t border-[#E6E2D3] space-y-2.5">
              <h4 className="text-xs font-bold text-[#2D2A26] flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#6B6359]" />
                バックアップと復元
              </h4>
              <p className="text-[11px] text-[#6B6359] leading-relaxed">
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
                    ? 'bg-[#6B705C] text-white hover:bg-[#5A5E4D] border-[#6B705C] cursor-pointer shadow-xs'
                    : 'bg-[#F0EDE4] text-[#B5AEA4] border-[#E6E2D3] cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                バックアップを保存（{allReports.length}件）
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl font-semibold text-xs bg-[#F0EDE4] text-[#2D2A26] hover:bg-[#E6E2D3] border border-[#E6E2D3] transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#6B6359]" />
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
                  className="text-[11px] leading-relaxed text-[#7A4040] bg-[#F8EEEE] border border-[#E0C4C4] rounded-lg px-2.5 py-2"
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
            <h3 className="font-bold text-sm text-[#2D2A26] flex items-center gap-1.5 pb-2 border-b border-[#E6E2D3]">
              <Upload className="w-4 h-4 text-[#846231]" />
              バックアップから復元しますか？
            </h3>

            <div className="rounded-xl bg-[#F8F7F4] border border-[#E6E2D3] p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#6B6359]">現在この端末にある日報</span>
                <span className="font-bold text-[#2D2A26]">{allReports.length} 件</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B6359]">復元後</span>
                <span className="font-bold text-[#2D2A26]">{restoreCandidate.reports.length} 件</span>
              </div>
            </div>

            <p className="text-xs text-[#6B6359] leading-relaxed">
              現在の日報は<strong className="text-[#7A4040]">すべて置き換わります</strong>。
              元に戻せないため、必要であれば先に「バックアップを保存」してください。
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="w-full h-11 bg-[#8E4F4F] text-white hover:bg-[#783F3F] active:bg-[#6B3737] rounded-xl font-bold text-sm shadow-xs transition-colors cursor-pointer"
              >
                置き換えて復元する
              </button>
              <button
                type="button"
                onClick={() => setRestoreCandidate(null)}
                className="w-full h-11 bg-[#F0EDE4] text-[#2D2A26] hover:bg-[#E6E2D3] rounded-xl font-semibold text-sm border border-[#E6E2D3] transition-colors cursor-pointer"
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
