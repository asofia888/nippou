import React, { useEffect, useMemo, useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Send, 
  Sparkles, 
  PlusCircle, 
  Check, 
  Copy, 
  Share2, 
  X,
  FileSpreadsheet,
  AlertTriangle,
  CalendarClock,
  CornerDownRight
} from 'lucide-react';
import { DailyReport, ReportFormData } from '../types';
import { downloadCsv, formatReportAsText, generateReportsCsv } from '../utils/csv';
import { formatDateJapanese, getTodayString } from '../utils/date';
import { findPlansToCarryOver } from '../utils/reports';
import { Modal } from './Modal';

interface ReportFormProps {
  /** Returns false when persisting failed, so the form keeps the user's input. */
  onSaveReport: (report: DailyReport) => boolean;
  editingReport?: DailyReport | null;
  onCancelEdit?: () => void;
  companyName?: string;
  existingReports: DailyReport[];
}

const TASK_QUICK_TAGS = ['商談・打合せ', '営業・集客', '制作・実務', '経理・事務', '情報収集・学習'];
const ACHIEVEMENT_QUICK_TAGS = ['成約・受注', '見積提出', '合意・決定', '目標達成', 'タスク完了'];

function formFromReport(report: DailyReport): ReportFormData {
  return {
    date: report.date,
    workingHours: report.workingHours ? String(report.workingHours) : '',
    tasksCompleted: report.tasksCompleted,
    achievements: report.achievements,
    learnings: report.learnings,
    tomorrowPlans: report.tomorrowPlans,
  };
}

function createEmptyForm(): ReportFormData {
  return {
    date: getTodayString(),
    workingHours: '8',
    tasksCompleted: '',
    achievements: '',
    learnings: '',
    tomorrowPlans: '',
  };
}

export const ReportForm: React.FC<ReportFormProps> = ({
  onSaveReport,
  editingReport,
  onCancelEdit,
  companyName,
  existingReports,
}) => {
  // App remounts this component via `key` whenever the edit target changes, so
  // the initial state is always correct and no effect has to re-sync it.
  const [formData, setFormData] = useState<ReportFormData>(() =>
    editingReport ? formFromReport(editingReport) : createEmptyForm(),
  );

  const [submittedReport, setSubmittedReport] = useState<DailyReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<DailyReport | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [carriedOver, setCarriedOver] = useState(false);

  // Bring the form into view when an edit starts. Runs once per mount because
  // `key` gives every edit target a fresh component instance.
  useEffect(() => {
    if (editingReport) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editingReport]);

  // What the previous report said it would do on this day. Without this the
  // 「明日の予定」the user writes every evening never resurfaces.
  const plansToCarryOver = useMemo(
    () => findPlansToCarryOver(existingReports, formData.date, editingReport?.id),
    [existingReports, formData.date, editingReport],
  );

  const handleCarryOver = () => {
    if (!plansToCarryOver) return;
    const carried = plansToCarryOver.tomorrowPlans.trim();
    setFormData((prev) => {
      const current = prev.tasksCompleted.trim();
      return { ...prev, tasksCompleted: current ? `${current}\n${carried}` : carried };
    });
    setCarriedOver(true);
  };

  const handleAppendTag = (field: 'tasksCompleted' | 'achievements', tag: string) => {
    setFormData((prev) => {
      const current = prev[field].trim();
      const prefix = current ? `${current}\n・[${tag}] ` : `・[${tag}] `;
      return {
        ...prev,
        [field]: prefix,
      };
    });
  };

  /**
   * Build the report to persist. `base` supplies the identity to write into:
   * the report being edited, or the same-date report the user chose to
   * overwrite. A null base means a brand new entry.
   */
  const buildReport = (base: DailyReport | null): DailyReport => ({
    id: base ? base.id : `rep-${Date.now()}`,
    date: formData.date,
    workingHours: formData.workingHours ? parseFloat(formData.workingHours) : undefined,
    tasksCompleted: formData.tasksCompleted.trim(),
    achievements: formData.achievements.trim(),
    learnings: formData.learnings.trim(),
    tomorrowPlans: formData.tomorrowPlans.trim(),
    createdAt: base ? base.createdAt : new Date().toISOString(),
    updatedAt: base ? new Date().toISOString() : undefined,
  });

  const commitReport = (report: DailyReport) => {
    // A false result means the write failed. Keep the form populated so the
    // user does not lose what they typed, and let App surface the error.
    if (!onSaveReport(report)) return;

    setSubmittedReport(report);
    if (!editingReport) {
      setFormData(createEmptyForm());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tasksCompleted.trim() && !formData.achievements.trim()) {
      setValidationError('「今日の主な業務・活動内容」か「成果・売上・決定事項」のどちらかを入力してください。');
      return;
    }
    setValidationError(null);

    // One report per day: refuse to silently create a second entry for a date
    // that already has one.
    const duplicate = existingReports.find(
      (r) => r.date === formData.date && r.id !== editingReport?.id,
    );
    if (duplicate) {
      setDuplicateTarget(duplicate);
      return;
    }

    commitReport(buildReport(editingReport ?? null));
  };

  const handleConfirmOverwrite = () => {
    if (!duplicateTarget) return;
    const target = duplicateTarget;
    setDuplicateTarget(null);
    commitReport(buildReport(target));
  };

  const handleCopyText = async (report: DailyReport) => {
    const text = formatReportAsText(report, companyName);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = async (report: DailyReport) => {
    const text = formatReportAsText(report, companyName);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `日報 ${report.date}`,
          text: text,
        });
      } catch (err) {
        // User cancelled or share not supported
        console.log('Share dismissed or failed', err);
      }
    } else {
      // Fallback to copy
      handleCopyText(report);
    }
  };

  const handleDownloadSingleCsv = (report: DailyReport) => {
    const csv = generateReportsCsv([report]);
    downloadCsv(csv, `日報_${report.date}.csv`);
  };

  return (
    <div className="w-full">
      {/* Edit Mode Alert Header */}
      {editingReport && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-amber-soft px-4 py-3 text-amber-ink border border-amber-line">
          <div className="text-sm font-semibold">
            {editingReport.date} の日報を編集中
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs font-medium bg-surface text-amber-ink px-2.5 py-1.5 rounded-lg border border-amber-line hover:bg-amber-soft"
          >
            編集をキャンセル
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date & Hours Row */}
        <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-line shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date Picker & Quick Selectors */}
            <div>
              <label
                htmlFor="report-date"
                className="text-xs font-bold text-ink-2 mb-1.5 flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-ink-3" />
                日報の日付
              </label>
              <div className="flex gap-2 items-center">
                <input
                  id="report-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full h-11 px-3 bg-sunken border border-line rounded-xl text-base font-medium text-ink focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring focus:bg-surface"
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, date: getTodayString() })}
                  className={`h-11 px-3 text-xs font-semibold rounded-xl border shrink-0 transition-colors ${
                    formData.date === getTodayString()
                      ? 'bg-ink text-on-dark border-ink'
                      : 'bg-sunken text-ink-2 border-line hover:bg-line'
                  }`}
                >
                  今日
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, date: getTodayString(-1) })}
                  className={`h-11 px-3 text-xs font-semibold rounded-xl border shrink-0 transition-colors ${
                    formData.date === getTodayString(-1)
                      ? 'bg-ink text-on-dark border-ink'
                      : 'bg-sunken text-ink-2 border-line hover:bg-line'
                  }`}
                >
                  昨日
                </button>
              </div>
            </div>

            {/* Working Hours */}
            <div>
              <label
                htmlFor="report-hours"
                className="text-xs font-bold text-ink-2 mb-1.5 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-ink-3" />
                本日の稼働時間（任意）
              </label>
              <div className="relative">
                <input
                  id="report-hours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  placeholder="8"
                  value={formData.workingHours}
                  onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                  className="w-full h-11 px-3 pr-8 bg-sunken border border-line rounded-xl text-base font-medium text-ink focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring focus:bg-surface"
                />
                <span className="absolute right-3 top-3 text-xs text-ink-3 font-medium">時間</span>
              </div>
            </div>
          </div>
        </div>

        {/* Yesterday's plan, brought forward */}
        {plansToCarryOver && (
          <div className="rounded-2xl border border-accent-line bg-accent-soft p-4 sm:p-5 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xs font-bold text-accent-ink flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                {formatDateJapanese(plansToCarryOver.date)} の「明日の予定」
              </h3>
              <span className="text-[11px] text-accent-ink shrink-0">前回の日報から</span>
            </div>

            <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed bg-surface rounded-xl border border-accent-line p-3">
              {plansToCarryOver.tomorrowPlans}
            </p>

            <button
              type="button"
              onClick={handleCarryOver}
              disabled={carriedOver}
              className={`w-full h-10 flex items-center justify-center gap-1.5 rounded-xl font-bold text-xs transition-colors border ${
                carriedOver
                  ? 'bg-surface text-accent-ink border-accent-line cursor-default'
                  : 'bg-accent text-on-dark hover:bg-accent-hover active:bg-accent-active border-accent cursor-pointer shadow-xs'
              }`}
            >
              {carriedOver ? (
                <>
                  <Check className="w-4 h-4" />
                  今日の業務内容に取り込みました
                </>
              ) : (
                <>
                  <CornerDownRight className="w-4 h-4" />
                  今日の業務内容に取り込む
                </>
              )}
            </button>
          </div>
        )}

        {/* 1. Today's Tasks */}
        <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-line shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="report-tasks"
              className="text-xs font-bold text-ink flex items-center gap-1.5"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-accent"></span>
              今日の主な業務・活動内容 <span className="text-accent-2">*</span>
            </label>
            <span className="text-[11px] text-ink-3">箇条書き推奨</span>
          </div>

          {/* Quick tags for smartphone */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {TASK_QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAppendTag('tasksCompleted', tag)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-2 bg-sunken hover:bg-line active:bg-sunken-2 px-2.5 py-1 rounded-lg transition-colors border border-line/60 cursor-pointer"
              >
                <PlusCircle className="w-3 h-3 text-ink-3" />
                {tag}
              </button>
            ))}
          </div>

          <textarea
            id="report-tasks"
            rows={4}
            value={formData.tasksCompleted}
            onChange={(e) => setFormData({ ...formData, tasksCompleted: e.target.value })}
            placeholder="例:&#10;・株式会社〇〇様との打ち合わせ（30分）&#10;・新規LPの構成案作成&#10;・会計入力と領収書整理"
            className="w-full p-3.5 bg-sunken border border-line rounded-xl text-base leading-relaxed text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring focus:bg-surface resize-y"
            required
          />
        </div>

        {/* 2. Achievements & Decisions */}
        <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-line shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="report-achievements"
              className="text-xs font-bold text-ink flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-2" />
              成果・売上・決定事項
            </label>
            <span className="text-[11px] text-ink-3">意思決定の記録に</span>
          </div>

          {/* Quick tags */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {ACHIEVEMENT_QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAppendTag('achievements', tag)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-2 bg-sunken hover:bg-line active:bg-sunken-2 px-2.5 py-1 rounded-lg transition-colors border border-line/60 cursor-pointer"
              >
                <PlusCircle className="w-3 h-3 text-ink-3" />
                {tag}
              </button>
            ))}
          </div>

          <textarea
            id="report-achievements"
            rows={3}
            value={formData.achievements}
            onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
            placeholder="例:&#10;・〇〇案件の見積書（150万円）を送付、好感触&#10;・新機能のリリース日を今月25日に決定"
            className="w-full p-3.5 bg-sunken border border-line rounded-xl text-base leading-relaxed text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring focus:bg-surface resize-y"
          />
        </div>

        {/* 3. Learnings & Challenges */}
        <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-line shadow-xs space-y-2.5">
          <label htmlFor="report-learnings" className="text-xs font-bold text-ink block">
            課題・気づき・反省
          </label>
          <textarea
            id="report-learnings"
            rows={2}
            value={formData.learnings}
            onChange={(e) => setFormData({ ...formData, learnings: e.target.value })}
            placeholder="例:&#10;・午前中に重い実務を集中して片付けると午後の商談に余裕ができる&#10;・外注先への連絡フォーマットを整備する必要あり"
            className="w-full p-3.5 bg-sunken border border-line rounded-xl text-base leading-relaxed text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring focus:bg-surface resize-y"
          />
        </div>

        {/* 4. Tomorrow's Plans */}
        <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-line shadow-xs space-y-2.5">
          <label htmlFor="report-tomorrow" className="text-xs font-bold text-ink block">
            明日の予定・最優先タスク
          </label>
          <textarea
            id="report-tomorrow"
            rows={2}
            value={formData.tomorrowPlans}
            onChange={(e) => setFormData({ ...formData, tomorrowPlans: e.target.value })}
            placeholder="例:&#10;・10:00〜 税理士と月次ミーティング&#10;・A社提案書の最終確認&#10;・請求書の発行"
            className="w-full p-3.5 bg-sunken border border-line rounded-xl text-base leading-relaxed text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring focus:bg-surface resize-y"
          />
        </div>

        {/* Submit Button (Ergonomic for Phone) */}
        <div className="pt-2">
          {validationError && (
            <p
              role="alert"
              className="mb-2 text-xs leading-relaxed text-danger-ink bg-danger-soft border border-danger-line rounded-xl px-3 py-2.5"
            >
              {validationError}
            </p>
          )}
          <button
            type="submit"
            className="w-full h-13 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover active:bg-accent-active text-on-dark rounded-2xl font-bold text-base shadow-sm transition-all touch-manipulation cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{editingReport ? '日報を更新する' : '日報を保存・送信する'}</span>
          </button>
          <p className="text-center text-xs text-ink-3 mt-2 font-medium">
            保存後、スマホからLINEやメールへの転送、CSV出力もワンタップで行えます
          </p>
        </div>
      </form>

      {/* Same-date confirmation: one report per day */}
      {duplicateTarget && (
        <Modal
          label="同じ日付の日報がある場合の確認"
          onClose={() => setDuplicateTarget(null)}
          align="sheet"
          panelClassName="max-w-md sm:rounded-3xl"
        >
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-line">
              <div className="w-8 h-8 rounded-full bg-amber-soft border border-amber-line flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-ink" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-ink">
                  この日付の日報は既にあります
                </h3>
                <p className="text-xs text-ink-3">{duplicateTarget.date}</p>
              </div>
            </div>

            <div className="rounded-xl bg-sunken border border-line p-3 max-h-32 overflow-y-auto">
              <p className="text-[11px] font-bold text-ink-3 mb-1">登録済みの内容</p>
              <p className="text-xs text-ink-2 whitespace-pre-wrap leading-relaxed">
                {duplicateTarget.tasksCompleted ||
                  duplicateTarget.achievements ||
                  '（内容なし）'}
              </p>
            </div>

            {editingReport ? (
              <>
                <p className="text-xs text-ink-3 leading-relaxed">
                  編集中の日報を「{duplicateTarget.date}」へ移動すると、既存の日報とどちらを残すかが決められません。
                  別の日付を選ぶか、先に上の日報を削除してください。
                </p>
                <button
                  type="button"
                  onClick={() => setDuplicateTarget(null)}
                  className="w-full h-11 bg-accent text-on-dark hover:bg-accent-hover rounded-xl font-bold text-sm transition-colors cursor-pointer"
                >
                  日付を選び直す
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-ink-3 leading-relaxed">
                  上書きすると、登録済みの内容は今入力した内容に置き換わります。元に戻すことはできません。
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleConfirmOverwrite}
                    className="w-full h-11 flex items-center justify-center gap-2 bg-danger text-on-dark hover:bg-danger-hover active:bg-danger-active rounded-xl font-bold text-sm shadow-xs transition-colors cursor-pointer"
                  >
                    上書きして保存する
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateTarget(null)}
                    className="w-full h-11 bg-sunken text-ink hover:bg-line rounded-xl font-semibold text-sm transition-colors cursor-pointer border border-line"
                  >
                    キャンセル（日付を選び直す）
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Submission Success Modal / Sheet */}
      {submittedReport && (
        <Modal
          label="日報の登録完了"
          onClose={() => setSubmittedReport(null)}
          align="sheet"
          panelClassName="max-w-md sm:rounded-3xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2.5 text-accent-ink">
                <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center font-bold">
                  <Check className="w-4 h-4 text-accent-ink" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-ink">日報を登録しました</h3>
                  <p className="text-xs text-ink-3">{submittedReport.date}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmittedReport(null)}
                aria-label="この画面を閉じる"
                className="w-8 h-8 flex items-center justify-center text-ink-3 hover:text-ink rounded-full hover:bg-sunken transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-ink-3 leading-relaxed">
              端末に安全に保存されました。必要に応じて外部ツールへ送信したり、CSVで保管できます。
            </p>

            {/* Action Buttons for Mobile Sharing & CSV */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleShare(submittedReport)}
                className="w-full h-11 flex items-center justify-center gap-2 bg-accent text-on-dark hover:bg-accent-hover active:bg-accent-active rounded-xl font-bold text-sm shadow-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>スマホで共有 (LINE・メール)</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyText(submittedReport)}
                className="w-full h-11 flex items-center justify-center gap-2 bg-sunken text-ink hover:bg-line active:bg-sunken-2 rounded-xl font-semibold text-sm transition-colors cursor-pointer border border-line"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-accent-ink" />
                    <span className="text-accent-ink font-bold">コピーしました！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-ink-3" />
                    <span>日報全文をクリップボードにコピー</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleDownloadSingleCsv(submittedReport)}
                className="w-full h-11 flex items-center justify-center gap-2 bg-sunken border border-line text-ink-2 hover:bg-sunken rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-accent-ink" />
                <span>この日報をCSVダウンロード</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSubmittedReport(null)}
                className="w-full py-2 text-xs font-semibold text-ink-3 hover:text-ink text-center transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
