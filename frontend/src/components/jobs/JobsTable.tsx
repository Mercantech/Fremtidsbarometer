import React from 'react';
import {
  Briefcase,
  ExternalLink,
  Trash2,
  Flame,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react';
import type { AdminJobItem, AdminJobsResponse } from '../../services/adminApi';

interface JobsTableProps {
  data: AdminJobsResponse | null;
  isLoading: boolean;
  selectedIds: number[];
  onlyHot: boolean;
  page: number;
  onToggleSelectAll: () => void;
  onToggleSelectOne: (id: number) => void;
  onDeleteJob: (job: AdminJobItem) => void;
  onPageChange: (newPage: number) => void;
  onResetHotFilter: () => void;
}

export const JobsTable: React.FC<JobsTableProps> = ({
  data,
  isLoading,
  selectedIds,
  onlyHot,
  page,
  onToggleSelectAll,
  onToggleSelectOne,
  onDeleteJob,
  onPageChange,
  onResetHotFilter,
}) => {
  const isCurrentPageAllSelected =
    data?.items && data.items.length > 0 && data.items.every((j) => selectedIds.includes(j.id));

  return (
    <div className="relative rounded-2xl bg-[#14121a] border border-white/10 overflow-hidden shadow-xl">
      {/* Smooth loading overlay when table already has data */}
      {isLoading && data && (
        <div className="absolute inset-0 bg-[#14121a]/60 backdrop-blur-[2px] z-20 flex items-center justify-center transition-all duration-200">
          <div className="px-4 py-2 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl flex items-center gap-2.5 text-xs text-cyan-300 font-semibold animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Updating vacancies...</span>
          </div>
        </div>
      )}

      {isLoading && !data ? (
        <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
          <span className="font-medium text-slate-300">Loading vacancies from database...</span>
        </div>
      ) : !data || data.items.length === 0 ? (
        onlyHot ? (
          <div className="p-14 text-center text-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400">
              <Flame className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-white text-sm">No Hot Vacancies Found</p>
              <p className="text-slate-400 max-w-sm mx-auto text-[11px]">
                None of the job postings in this view reached the ≥50% hype threshold. Try expanding location or resetting the Hot filter.
              </p>
            </div>
            <button
              onClick={onResetHotFilter}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Show All Available Vacancies</span>
            </button>
          </div>
        ) : (
          <div className="p-14 text-center text-slate-400 text-xs space-y-2">
            <Briefcase className="w-8 h-8 mx-auto text-slate-500 opacity-60" />
            <p className="font-medium text-slate-300">No job postings found matching your filter criteria.</p>
          </div>
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 bg-white/2">
                <th className="py-3 px-4 w-10">
                  <button
                    onClick={onToggleSelectAll}
                    className="text-slate-400 hover:text-white transition cursor-pointer"
                    title={isCurrentPageAllSelected ? 'Deselect all' : 'Select all on page'}
                  >
                    {isCurrentPageAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold">Job Title & Company</th>
                <th className="py-3 px-4 font-semibold">Location</th>
                <th className="py-3 px-4 font-semibold">Stack / Technology</th>
                <th className="py-3 px-4 font-semibold">Salary Range</th>
                <th className="py-3 px-4 font-semibold">Scoring</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.items.map((job) => {
                const isSelected = selectedIds.includes(job.id);
                return (
                  <tr
                    key={job.id}
                    className={`transition group border-l-2 ${
                      isSelected
                        ? 'bg-cyan-950/20 border-l-cyan-400'
                        : job.is_hot
                        ? 'border-l-amber-500 bg-amber-500/[0.03] hover:bg-amber-500/[0.07]'
                        : 'border-l-transparent hover:bg-white/3'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onToggleSelectOne(job.id)}
                        className="text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </td>

                    {/* Title & Company */}
                    <td className="py-3 px-4 max-w-[280px]">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <span className="truncate">{job.title}</span>
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-cyan-400 transition"
                            title="Open external job posting"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{job.company}</span>
                        {job.source && (
                          <span className="text-[10px] text-slate-500 font-mono">via {job.source}</span>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[10px]">
                        {job.city} ({job.country})
                      </span>
                    </td>

                    {/* Stack / Technology */}
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {job.technology && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-mono text-[10px] font-bold">
                            {job.technology}
                          </span>
                        )}
                        {job.tags &&
                          job.tags.slice(0, 3).map((t, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-mono text-[10px]"
                            >
                              {t}
                            </span>
                          ))}
                      </div>
                    </td>

                    {/* Salary Range */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {job.salary_min && job.salary_max ? (
                        <span className="text-emerald-400 font-bold">
                          {job.salary_min.toLocaleString()} – {job.salary_max.toLocaleString()} {job.salary_currency}
                        </span>
                      ) : job.salary_min ? (
                        <span className="text-emerald-400 font-bold">
                          from {job.salary_min.toLocaleString()} {job.salary_currency}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Scoring & Hot Indicator with Breakdown Tooltip */}
                    <td className="py-3 px-4">
                      <div className="relative group/score inline-block">
                        <div className="flex flex-col gap-1 cursor-help">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono text-[11px] font-bold ${
                                job.is_hot ? 'text-amber-400' : 'text-slate-300'
                              }`}
                            >
                              {Math.round(job.hype_score * 100)}%
                            </span>
                            {job.is_hot && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black flex items-center gap-0.5 shadow-sm shadow-amber-500/20">
                                <Flame className="w-2.5 h-2.5 text-amber-400" />
                                <span>HOT</span>
                              </span>
                            )}
                          </div>
                          {/* Micro progress bar */}
                          <div className="w-14 h-1 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, Math.max(8, Math.round(job.hype_score * 100)))}%`,
                                background: job.is_hot
                                  ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'
                                  : '#38bdf8',
                              }}
                            />
                          </div>
                        </div>

                        {/* Hover breakdown tooltip */}
                        <div className="opacity-0 group-hover/score:opacity-100 pointer-events-none transition-all duration-200 absolute bottom-full left-0 mb-2 z-30 w-52 p-3 rounded-xl bg-[#1a1726] border border-white/15 shadow-2xl backdrop-blur-xl text-[10px] space-y-1.5">
                          <div className="font-bold text-white border-b border-white/10 pb-1 flex items-center justify-between">
                            <span>Scoring Breakdown</span>
                            <span className="font-mono text-cyan-400">{Math.round(job.hype_score * 100)}%</span>
                          </div>
                          <div className="space-y-1 text-slate-300">
                            <div className="flex items-center justify-between">
                              <span>🧠 Tech Match:</span>
                              <span className="font-mono font-semibold text-emerald-400">
                                +{Math.round((job.score_breakdown?.tech_score ?? 0) * 100)}%
                              </span>
                            </div>
                            {job.score_breakdown?.matched_tech && job.score_breakdown.matched_tech.length > 0 && (
                              <div className="text-[9px] text-amber-300/90 font-mono truncate pl-1">
                                Stack: {job.score_breakdown.matched_tech.join(', ')}
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span>💰 Salary Tier:</span>
                              <span className="font-mono font-semibold text-emerald-400">
                                +{Math.round((job.score_breakdown?.salary_score ?? 0) * 100)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>⚡ Freshness:</span>
                              <span className="font-mono font-semibold text-emerald-400">
                                +{Math.round((job.score_breakdown?.freshness_score ?? 0) * 100)}%
                              </span>
                            </div>
                            {job.score_breakdown?.hours_old !== undefined && job.score_breakdown?.hours_old !== null && (
                              <div className="text-[9px] text-slate-400 font-mono pl-1">
                                {job.score_breakdown.hours_old < 24
                                  ? `Posted <24h ago (+25% max)`
                                  : `Age: ~${Math.round(job.score_breakdown.hours_old / 24)}d`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onDeleteJob(job)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title="Delete vacancy"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination Footer ── */}
      {data && data.total > 0 && (
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <span className="font-bold text-white">{data.page}</span> of{' '}
            <span className="font-bold text-white">{data.total_pages}</span> ({data.total}{' '}
            {onlyHot ? 'hot vacancies' : 'vacancies'})
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              disabled={page >= data.total_pages}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
