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
          className="bg-[#EADBBD] text-[#2D2A26] font-semibold px-1 py-0.5 rounded"
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
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E6E2D3] shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#2D2A26]">
              日報の記録
            </span>
            <span className="text-xs bg-[#ECE8DC] text-[#4A443F] px-2.5 py-0.5 rounded-full font-semibold">
              {filteredReports.length} 件
            </span>
            {totalHours > 0 && (
              <span className="text-xs text-[#6B6359] font-medium">
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
                ? 'bg-[#6B705C] hover:bg-[#5A5E4D] active:bg-[#4E5243] text-white shadow-xs'
                : 'bg-[#F0EDE4] text-[#B5AEA4] border border-[#E6E2D3] cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>CSV出力 ({filteredReports.length}件)</span>
          </button>
        </div>

        {/* Dedicated Keyword Search Bar */}
        <div className="pt-2 border-t border-[#E6E2D3] space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="report-search-input" className="text-xs font-bold text-[#4A443F] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#6B705C]" />
              キーワード絞り込み検索
            </label>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-[#6B6359] hover:text-[#2D2A26] font-medium transition-colors cursor-pointer"
              >
                キーワードをクリア
              </button>
            )}
          </div>

          {/* Search Input with Clear Button */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-[#6B6359] pointer-events-none" />
            <input
              id="report-search-input"
              type="text"
              placeholder="案件名、取引先、業務内容、気づき、メモを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-10 bg-[#F8F7F4] border border-[#E6E2D3] rounded-xl text-base font-medium text-[#2D2A26] placeholder-[#6F6760] focus:outline-none focus:ring-2 focus:ring-[#A5A58D]/30 focus:border-[#A5A58D] focus:bg-white transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 w-6 h-6 rounded-full bg-[#E6E2D3] hover:bg-[#DDD8CC] text-[#5A544C] flex items-center justify-center transition-colors cursor-pointer"
                title="入力をクリア"
                aria-label="検索キーワードをクリア"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Keyword Suggestion Tags */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] text-[#6B6359] shrink-0 font-medium">よく使うキーワード:</span>
            {QUICK_SEARCH_TAGS.map((tag) => {
              const isSelected = searchQuery.trim() === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(isSelected ? '' : tag)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#6B705C] text-white border-[#6B705C] font-semibold shadow-2xs'
                      : 'bg-[#F8F7F4] text-[#5A544C] border-[#E6E2D3] hover:bg-[#F0EDE4]'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter: Month Selector */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#E6E2D3]">
          <label
            htmlFor="report-month-filter"
            className="text-xs text-[#6B6359] shrink-0 font-medium flex items-center gap-1"
          >
            <Calendar className="w-3.5 h-3.5" />
            表示期間:
          </label>
          <select
            id="report-month-filter"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full h-10 px-2.5 bg-[#F8F7F4] border border-[#E6E2D3] rounded-lg text-base font-medium text-[#2D2A26] focus:outline-none focus:ring-2 focus:ring-[#A5A58D]/30 focus:border-[#A5A58D]"
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
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#F0EDE4] border border-[#E6E2D3] text-xs text-[#4A443F]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#2D2A26]">絞り込み中:</span>
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-[#E6E2D3] text-[#2D2A26] font-medium">
                キーワード:「{searchQuery}」
              </span>
            )}
            {selectedMonth !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-[#E6E2D3] text-[#2D2A26] font-medium">
                期間: {selectedMonth.replace('-', '年')}月
              </span>
            )}
            <span className="text-[#6B6359] font-medium">({filteredReports.length}件該当)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedMonth('all');
            }}
            className="text-[11px] font-semibold text-[#6B705C] hover:underline cursor-pointer ml-2 shrink-0"
          >
            条件リセット
          </button>
        </div>
      )}

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-[#E6E2D3] text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F0EDE4] text-[#6B6359] mx-auto flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#2D2A26]">
              {searchQuery.trim()
                ? `「${searchQuery}」に一致する日報はありません`
                : '該当する日報がありません'}
            </p>
            <p className="text-xs text-[#6B6359] mt-1">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6B705C] text-white rounded-xl text-xs font-bold hover:bg-[#5A5E4D] transition-colors cursor-pointer"
            >
              検索条件をリセット
            </button>
          ) : (
            <button
              type="button"
              onClick={onNewReportClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6B705C] text-white rounded-xl text-xs font-bold hover:bg-[#5A5E4D] transition-colors cursor-pointer"
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
                className="bg-white rounded-2xl border border-[#E6E2D3] shadow-2xs hover:border-[#D5CFC0] transition-all overflow-hidden"
              >
                {/* Card Header: a real button so it is reachable by keyboard */}
                <button
                  type="button"
                  onClick={() => toggleExpand(report.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`report-panel-${report.id}`}
                  className="w-full text-left p-4 sm:p-5 cursor-pointer hover:bg-[#FDFCFB] transition-colors"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="block space-y-1">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#2D2A26]">
                          {formatDateJapanese(report.date)}
                        </span>
                        {report.id.startsWith('sample-') && (
                          <span className="text-[10px] font-bold bg-[#ECE8DC] text-[#5A544C] px-1.5 py-0.5 rounded-md border border-[#E6E2D3]">
                            サンプル
                          </span>
                        )}
                        {report.workingHours !== undefined && (
                          <span className="text-[11px] text-[#5A544C] flex items-center gap-1 bg-[#F0EDE4] px-2 py-0.5 rounded-md font-medium">
                            <Clock className="w-3 h-3 text-[#6B6359]" />
                            {report.workingHours}h
                          </span>
                        )}
                      </span>

                      {/* Brief snippet when collapsed */}
                      {!isExpanded && (
                        <span className="block text-sm text-[#6B6359] line-clamp-2 mt-1 leading-relaxed whitespace-pre-line">
                          {highlightMatch(report.tasksCompleted || report.achievements || '内容なし', searchQuery)}
                        </span>
                      )}
                    </span>

                    <span className="flex items-center gap-1 shrink-0 text-[#6B6359]">
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
                    className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-[#E6E2D3] space-y-4"
                  >
                    {/* Section 1: Tasks */}
                    {report.tasksCompleted && (
                      <div>
                        <span className="text-xs font-bold text-[#4A443F] block mb-1.5">
                          ■ 今日の業務・活動内容
                        </span>
                        <div className="text-sm text-[#2D2A26] bg-[#F8F7F4] p-3.5 rounded-xl whitespace-pre-wrap leading-relaxed border border-[#E6E2D3] font-sans">
                          {highlightMatch(report.tasksCompleted, searchQuery)}
                        </div>
                      </div>
                    )}

                    {/* Section 2: Achievements */}
                    {report.achievements && (
                      <div>
                        <span className="text-xs font-bold text-[#4A443F] block mb-1.5">
                          ■ 成果・売上・決定事項
                        </span>
                        <div className="text-sm text-[#2D2A26] bg-[#FAF5EE] p-3.5 rounded-xl whitespace-pre-wrap leading-relaxed border border-[#EADBBD] font-sans">
                          {highlightMatch(report.achievements, searchQuery)}
                        </div>
                      </div>
                    )}

                    {/* Section 3: Learnings */}
                    {report.learnings && (
                      <div>
                        <span className="text-xs font-bold text-[#4A443F] block mb-1.5">
                          ■ 課題・気づき・反省
                        </span>
                        <div className="text-sm text-[#2D2A26] bg-[#F8F7F4] p-3.5 rounded-xl whitespace-pre-wrap leading-relaxed border border-[#E6E2D3] font-sans">
                          {highlightMatch(report.learnings, searchQuery)}
                        </div>
                      </div>
                    )}

                    {/* Section 4: Tomorrow */}
                    {report.tomorrowPlans && (
                      <div>
                        <span className="text-xs font-bold text-[#4A443F] block mb-1.5">
                          ■ 明日の予定・タスク
                        </span>
                        <div className="text-sm text-[#2D2A26] bg-[#F8F7F4] p-3.5 rounded-xl whitespace-pre-wrap leading-relaxed border border-[#E6E2D3] font-sans">
                          {highlightMatch(report.tomorrowPlans, searchQuery)}
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#E6E2D3]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Copy Text */}
                        <button
                          type="button"
                          onClick={() => handleCopy(report)}
                          className="h-8 px-2.5 bg-[#F0EDE4] hover:bg-[#E6E2D3] text-[#4A443F] border border-[#E6E2D3]/60 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#526346]" />
                              <span className="text-[#526346]">コピー済</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#6B6359]" />
                              <span>文面コピー</span>
                            </>
                          )}
                        </button>

                        {/* Share */}
                        <button
                          type="button"
                          onClick={() => handleShare(report)}
                          className="h-8 px-2.5 bg-[#F1F4EE] hover:bg-[#E5EBDD] text-[#526346] border border-[#D6DFCF] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>共有</span>
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => onEditReport(report)}
                          className="h-8 px-2.5 bg-[#F0EDE4] hover:bg-[#E6E2D3] text-[#4A443F] border border-[#E6E2D3]/60 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>編集</span>
                        </button>
                      </div>

                      {/* Delete */}
                      <div>
                        {deleteConfirmId === report.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-[#8E4F4F] font-semibold">削除しますか？</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteReport(report.id);
                                setDeleteConfirmId(null);
                              }}
                              className="h-7 px-2 bg-[#8E4F4F] hover:bg-[#783F3F] text-white text-[11px] font-bold rounded cursor-pointer"
                            >
                              はい
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="h-7 px-2 bg-[#F0EDE4] text-[#4A443F] text-[11px] font-medium rounded border border-[#E6E2D3] cursor-pointer"
                            >
                              キャンセル
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(report.id)}
                            className="h-8 px-2 text-[#6B6359] hover:text-[#8E4F4F] hover:bg-[#F8EEEE] rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
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
      <div className="p-3 bg-[#F0EDE4]/60 border border-[#E6E2D3] rounded-xl flex items-start gap-2 text-[#6B6359] text-[11px]">
        <AlertCircle className="w-4 h-4 text-[#6B6359] shrink-0 mt-0.5" />
        <div>
          <span>出力されるCSVファイルは <strong>UTF-8 (BOM付き)</strong> のため、Excelでそのまま開いても文字化けしません。税理士への月次提出や自社の年次記録管理にそのままご活用いただけます。</span>
        </div>
      </div>
    </div>
  );
};
