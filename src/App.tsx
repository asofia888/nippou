import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { DailyReport } from './types';
import { loadReports, saveReports, loadProfile, saveProfile, PresidentProfile } from './utils/storage';
import { Header } from './components/Header';
import { ReportForm } from './components/ReportForm';
import { ReportList } from './components/ReportList';

export default function App() {
  // Read straight from localStorage on first render. Doing it in an effect
  // instead would paint an empty list first and then swap it in.
  const [reports, setReports] = useState<DailyReport[]>(loadReports);
  const [profile, setProfile] = useState<PresidentProfile>(loadProfile);
  const [currentTab, setCurrentTab] = useState<'create' | 'list'>('create');
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  /**
   * Persist first, then update state. Returns false when the write failed so
   * the form can keep the user's input instead of showing a false success.
   */
  const handleSaveReport = (savedReport: DailyReport): boolean => {
    const exists = reports.some((r) => r.id === savedReport.id);
    const updated = exists
      ? reports.map((r) => (r.id === savedReport.id ? savedReport : r))
      : [savedReport, ...reports];

    if (!saveReports(updated)) {
      setStorageError(
        '日報を保存できませんでした。ブラウザの保存容量が不足しているか、プライベートブラウズのため保存が制限されています。入力内容は画面に残しています。既存の日報をCSVに書き出してから、不要な日報を削除してお試しください。',
      );
      return false;
    }

    setStorageError(null);
    setReports(updated);

    if (editingReport) {
      setEditingReport(null);
      setCurrentTab('list');
    }
    return true;
  };

  const handleDeleteReport = (id: string) => {
    const updated = reports.filter((r) => r.id !== id);
    if (!saveReports(updated)) {
      setStorageError('日報を削除できませんでした。ブラウザの保存領域にアクセスできません。');
      return;
    }
    setStorageError(null);
    setReports(updated);
  };

  /** Replace all data with the contents of a backup file. */
  const handleRestore = (nextReports: DailyReport[], nextProfile: PresidentProfile): boolean => {
    if (!saveReports(nextReports)) {
      setStorageError(
        '復元したデータを保存できませんでした。ブラウザの保存容量が不足しているか、保存が制限されています。既存のデータはそのままです。',
      );
      return false;
    }
    saveProfile(nextProfile);
    setStorageError(null);
    setReports(nextReports);
    setProfile(nextProfile);
    setEditingReport(null);
    setCurrentTab('list');
    return true;
  };

  const handleEditReport = (report: DailyReport) => {
    setEditingReport(report);
    setCurrentTab('create');
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
  };

  const displayName = profile.companyName
    ? `${profile.companyName}${profile.presidentName ? ` / ${profile.presidentName}` : ''}`
    : profile.presidentName || undefined;

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#4A443F] pb-16 flex flex-col selection:bg-[#6B705C] selection:text-white">
      {/* Top Fixed / Sticky Navigation */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        reportsCount={reports.length}
        allReports={reports}
        profile={profile}
        onProfileUpdate={setProfile}
        onRestore={handleRestore}
      />

      {/* Main Content Area */}
      <main className="w-full max-w-xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 flex-1">
        {/* Storage failure banner: never let a failed write look like a success */}
        {storageError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#E0C4C4] bg-[#F8EEEE] px-4 py-3 text-[#7A4040]"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs leading-relaxed">
              <p className="font-bold mb-0.5">保存に失敗しました</p>
              <p>{storageError}</p>
            </div>
            <button
              type="button"
              onClick={() => setStorageError(null)}
              aria-label="この警告を閉じる"
              className="shrink-0 w-6 h-6 rounded-full hover:bg-[#EFDCDC] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {currentTab === 'create' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6B6359]">
                {editingReport ? '日報の修正' : '本日の日報作成'}
              </h2>
              <span className="text-[11px] text-[#6F6760] font-medium">
                一人社長の静かな記録
              </span>
            </div>

            <ReportForm
              key={editingReport ? `edit-${editingReport.id}` : 'new'}
              onSaveReport={handleSaveReport}
              editingReport={editingReport}
              onCancelEdit={handleCancelEdit}
              companyName={displayName}
              existingReports={reports}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6B6359]">
                記録済みの履歴・データ
              </h2>
              <button
                type="button"
                onClick={() => setCurrentTab('create')}
                className="text-xs font-semibold text-[#2D2A26] hover:text-[#6B705C] transition-colors cursor-pointer"
              >
                + 新しい日報を書く
              </button>
            </div>

            <ReportList
              reports={reports}
              onEditReport={handleEditReport}
              onDeleteReport={handleDeleteReport}
              companyName={displayName}
              onNewReportClick={() => setCurrentTab('create')}
            />
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="mt-12 text-center text-xs text-[#6B6359] py-6 border-t border-[#E6E2D3]">
        <p className="font-medium text-[#4A443F]">一人社長の日報</p>
        <p className="text-[11px] text-[#6F6760] mt-0.5">
          データはこの端末のブラウザ内に保存されます。機種変更やデータ削除に備え、
          設定からバックアップを保存できます
        </p>
      </footer>
    </div>
  );
}
