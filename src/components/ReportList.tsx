import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Download, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Share2, 
  FileSpreadsheet,
  AlertCircle,
  X
} from 'lucide-react';
import { DailyReport } from '../types';
import { downloadCsv, formatReportAsText, generateReportsCsv } from '../utils/csv';
import { foldForSearch, toSearchTerms } from '../utils/search';
import { formatDateJapanese } from '../utils/date';

interface ReportListProps {
  reports: DailyReport[];
  onEditReport: (report: DailyReport) => void;
  onDeleteReport: (id: string) => void;
  companyName?: string;
  onNewReportClick: () => void;
}

/**
 * Highlights matched query terms within text
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;

  const escapedTerms = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (terms.some((t) => t.toLowerCase() === part.toLowerCase())) {
      return (
        <mark
          key={index}
          className="bg-mark text-ink font-semibold px-1 py-0.5 rounded"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

const QUICK_SEARCH_TAGS = ['商談', '見積', '請求', '打ち合わせ', '制作', '営業', '反省'];

export const ReportList: React.FC<ReportListProps> = ({
  reports,
  onEditReport,
  onDeleteReport,
  companyName,
  onNewReportClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Available months list for selector
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    reports.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        monthsSet.add(r.date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        // Month filter
        if (selectedMonth !== 'all' && !r.date.startsWith(selectedMonth)) {
          return false;
        }
        // Keyword Search filter (supports multiple space-separated terms)
        if (searchQuery.trim()) {
          const terms = toSearchTerms(searchQuery);
          const fullText = foldForSearch(
            [
              r.date,
              r.tasksCompleted,
              r.achievements,
              r.learnings,
              r.tomorrowPlans,
              r.workingHours ? `${r.workingHours}時間 ${r.workingHours}h` : '',
            ].join(' '),
          );

          return terms.every((term) => fullText.includes(term));
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [reports, selectedMonth, searchQuery]);

  // Total hours of current filter
  const totalHours = useMemo(() => {
    return filteredReports.reduce((acc, r) => acc + (r.workingHours || 0), 0);
  }, [filteredReports]);

  const handleCopy = async (report: DailyReport) => {
    const text = formatReportAsText(report, companyName);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 2000);
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
        console.log('Share dismissed', err);
      }
    } else {
      handleCopy(report);
    }
  };

  const handleExportFilteredCsv = () => {
    if (filteredReports.length === 0) return;
    const csv = generateReportsCsv(filteredReports);
    const suffix = selectedMonth === 'all' ? '全件' : `${selectedMonth}`;
    downloadCsv(csv, `社長日報_${suffix}.csv`);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Controls: Filter & Export Bar */}
      <div className="bg-surface rounded-2xl p-4 sm:p-5 shadow-card space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink">
              日報の記録
            </span>
            <span className="text-xs bg-sunken-2 text-ink-2 px-2.5 py-0.5 rounded-full font-semibold">
              {filteredReports.length} 件
            </span>
            {totalHours > 0 && (
              <span className="text-xs text-ink-3 font-medium">
                (計 {totalHours}h)
              </span>
            )}
          </div>

          {/* Export to CSV Button */}
          <button
            type="button"
            onClick={handleExportFilteredCsv}
            disabled={filteredReports.length === 0}
            className={`h-10 px-3.5 flex items-center justify-center gap-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer shrink-0 ${
              filteredReports.length > 0
                ? 'bg-accent hover:bg-accent-hover active:bg-accent-active text-on-dark shadow-xs'
                : 'bg-sunken text-ink-soft border border-line cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>CSV出力 ({filteredReports.length}件)</span>
          </button>
        </div>

        {/* Dedicated Keyword Search Bar */}
        <div className="pt-2 border-t border-line space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="report-search-input" className="text-xs font-bold text-ink-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-accent" />
              キーワード絞り込み検索
            </label>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-ink-3 hover:text-ink font-medium transition-colors cursor-pointer"
              >
                キーワードをクリア
              </button>
            )}
          </div>

          {/* Search Input with Clear Button */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-ink-3 pointer-events-none" />
            <input
              id="report-search-input"
              type="text"
              placeholder="案件名、取引先、業務内容、気づき、メモを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-10 bg-sunken border border-line rounded-xl text-base font-medium text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring focus:bg-surface transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 w-6 h-6 rounded-full bg-line hover:bg-sunken-2 text-ink-2 flex items-center justify-center transition-colors cursor-pointer"
                title="入力をクリア"
                aria-label="検索キーワードをクリア"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Keyword Suggestion Tags */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] text-ink-3 shrink-0 font-medium">よく使うキーワード:</span>
            {QUICK_SEARCH_TAGS.map((tag) => {
              const isSelected = searchQuery.trim() === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(isSelected ? '' : tag)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-accent text-on-dark border-accent font-semibold shadow-2xs'
                      : 'bg-sunken text-ink-2 border-line hover:bg-sunken'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter: Month Selector */}
        <div className="flex items-center gap-2 pt-2 border-t border-line">
          <label
            htmlFor="report-month-filter"
            className="text-xs text-ink-3 shrink-0 font-medium flex items-center gap-1"
          >
            <Calendar className="w-3.5 h-3.5" />
            表示期間:
          </label>
          <select
            id="report-month-filter"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full h-10 px-2.5 bg-sunken border border-line rounded-lg text-base font-medium text-ink focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
          >
            <option value="all">全期間 （すべて表示）</option>
            {availableMonths.map((m) => {
              const [y, mon] = m.split('-');
              return (
                <option key={m} value={m}>
                  {y}年{parseInt(mon)}月
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Active Search / Filter Feedback Banner */}
      {(searchQuery.trim() || selectedMonth !== 'all') && (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-sunken border border-line text-xs text-ink-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-ink">絞り込み中:</span>
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 bg-surface px-2 py-0.5 rounded-md border border-line text-ink font-medium">
                キーワード:「{searchQuery}」
              </span>
            )}
            {selectedMonth !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-surface px-2 py-0.5 rounded-md border border-line text-ink font-medium">
                期間: {selectedMonth.replace('-', '年')}月
              </span>
            )}
            <span className="text-ink-3 font-medium">({filteredReports.length}件該当)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedMonth('all');
            }}
            className="text-[11px] font-semibold text-accent hover:underline cursor-pointer ml-2 shrink-0"
          >
            条件リセット
          </button>
        </div>
      )}

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-surface rounded-2xl p-8 shadow-card text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-sunken text-ink-3 mx-auto flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">
              {searchQuery.trim()
                ? `「${searchQuery}」に一致する日報はありません`
                : '該当する日報がありません'}
            </p>
            <p className="text-xs text-ink-3 mt-1">
              {searchQuery.trim()
                ? '別のキーワードで再検索するか、絞り込み条件をリセットしてください。'
                : reports.length === 0
                ? 'まだ日報が登録されていません。最初の1件を入力してみましょう。'
                : '検索条件や期間を変更するか、新しい日報を登録してください。'}
            </p>
          </div>
          {searchQuery.trim() ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-on-dark rounded-xl text-xs font-bold hover:bg-accent-hover transition-colors cursor-pointer"
            >
              検索条件をリセット
            </button>
          ) : (
            <button
              type="button"
              onClick={onNewReportClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-on-dark rounded-xl text-xs font-bold hover:bg-accent-hover transition-colors cursor-pointer"
            >
              日報を作成する
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const isExpanded = expandedId === report.id;
            const isCopied = copiedId === report.id;

            return (
              <div
                key={report.id}
                className="bg-surface rounded-2xl shadow-card hover:shadow-card-hover transition-shadow overflow-hidden"
              >
                {/* Card Header: a real button so it is reachable by keyboard */}
                <button
                  type="button"
                  onClick={() => toggleExpand(report.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`report-panel-${report.id}`}
                  className="w-full text-left p-4 sm:p-5 cursor-pointer hover:bg-surface-hover transition-colors"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="block space-y-1">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-ink">
                          {formatDateJapanese(report.date)}
                        </span>
                        {report.id.startsWith('sample-') && (
                          <span className="text-[10px] font-bold bg-sunken-2 text-ink-2 px-1.5 py-0.5 rounded-md border border-line">
                            サンプル
                          </span>
                        )}
                        {report.workingHours !== undefined && (
                          <span className="text-[11px] text-ink-2 flex items-center gap-1 bg-sunken px-2 py-0.5 rounded-md font-medium">
                            <Clock className="w-3 h-3 text-ink-3" />
                            {report.workingHours}h
                          </span>
                        )}
                      </span>

                      {/* Brief snippet when collapsed */}
                      {!isExpanded && (
                        <span className="block text-sm text-ink-3 line-clamp-2 mt-1 leading-relaxed whitespace-pre-line">
                          {highlightMatch(report.tasksCompleted || report.achievements || '内容なし', searchQuery)}
                        </span>
                      )}
                    </span>

                    <span className="flex items-center gap-1 shrink-0 text-ink-3">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </span>
                  </span>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div
                    id={`report-panel-${report.id}`}
                    className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-line space-y-4"
                  >
                    {/* Section 1: Tasks */}
                    {report.tasksCompleted && (
                      <div>
                        <span className="text-xs font-bold text-ink-2 block mb-1.5">
                          ■ 今日の業務・活動内容
                        </span>
                        <div className="text-sm text-ink bg-sunken p-3.5 rounded-xl whitespace-pre-wrap leading-relaxed border border-line font-sans">
                          {highlightMatch(report.tasksCompleted, searchQuery)}
                        </div>
                      </div>
                    )}

                    {/* Section 2: Achievements */}
                    {report.achievements && (
                      <div>
                        <span className="text-xs font-bold text-ink-2 block mb-1.5">
                          ■ 成果・売上・決定事項
                        </span>
                        <div className="text-sm text-ink bg-amber-soft p-3.5 rounded-xl whitespace-pre-wrap leading-relaxed border border-amber-line font-sans">
                          {highlightMatch(report.achievements, searchQuery)}
                        </div>
                      </div>
                    )}

                    {/* Section 3: Learnings */}
                    {report.learnings && (
                      <div>
                        <span className="text-xs font-bold text-ink-2 block mb-1.5">
                          ■ 課題・気づき・反省
                        </span>
                        <div className="text-sm text-ink bg-sunken p-3.5 rounded-xl whitespace-pre-wrap leading-relaxed border border-line font-sans">
                          {highlightMatch(report.learnings, searchQuery)}
                        </div>
                      </div>
                    )}

                    {/* Section 4: Tomorrow */}
                    {report.tomorrowPlans && (
                      <div>
                        <span className="text-xs font-bold text-ink-2 block mb-1.5">
                          ■ 明日の予定・タスク
                        </span>
                        <div className="text-sm text-ink bg-sunken p-3.5 rounded-xl whitespace-pre-wrap leading-relaxed border border-line font-sans">
                          {highlightMatch(report.tomorrowPlans, searchQuery)}
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-line">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Copy Text */}
                        <button
                          type="button"
                          onClick={() => handleCopy(report)}
                          className="h-8 px-2.5 bg-sunken hover:bg-line text-ink-2 border border-line/60 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-accent-ink" />
                              <span className="text-accent-ink">コピー済</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-ink-3" />
                              <span>文面コピー</span>
                            </>
                          )}
                        </button>

                        {/* Share */}
                        <button
                          type="button"
                          onClick={() => handleShare(report)}
                          className="h-8 px-2.5 bg-accent-soft hover:bg-accent-soft-hover text-accent-ink border border-accent-line rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>共有</span>
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => onEditReport(report)}
                          className="h-8 px-2.5 bg-sunken hover:bg-line text-ink-2 border border-line/60 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>編集</span>
                        </button>
                      </div>

                      {/* Delete */}
                      <div>
                        {deleteConfirmId === report.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-danger font-semibold">削除しますか？</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteReport(report.id);
                                setDeleteConfirmId(null);
                              }}
                              className="h-7 px-2 bg-danger hover:bg-danger-hover text-on-dark text-[11px] font-bold rounded cursor-pointer"
                            >
                              はい
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="h-7 px-2 bg-sunken text-ink-2 text-[11px] font-medium rounded border border-line cursor-pointer"
                            >
                              キャンセル
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(report.id)}
                            className="h-8 px-2 text-ink-3 hover:text-danger hover:bg-danger-soft rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>削除</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CSV Notice note */}
      <div className="p-3 bg-sunken/60 border border-line rounded-xl flex items-start gap-2 text-ink-3 text-[11px]">
        <AlertCircle className="w-4 h-4 text-ink-3 shrink-0 mt-0.5" />
        <div>
          <span>出力されるCSVファイルは <strong>UTF-8 (BOM付き)</strong> のため、Excelでそのまま開いても文字化けしません。税理士への月次提出や自社の年次記録管理にそのままご活用いただけます。</span>
        </div>
      </div>
    </div>
  );
};
