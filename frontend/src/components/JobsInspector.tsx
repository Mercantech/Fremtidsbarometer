import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Search,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Flame,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Building,
  Clock,
  CheckSquare,
  Square,
  X,
  Loader2,
} from 'lucide-react';
import {
  fetchAdminJobs,
  fetchAdminJobsStats,
  deleteAdminJob,
  bulkDeleteAdminJobs,
  fetchExpiredJobsCount,
  cleanupExpiredJobs,
  getAdminErrorMessage,
} from '../services/adminApi';
import type { AdminJobItem, AdminJobsResponse, AdminJobsStats } from '../services/adminApi';

export const JobsInspector: React.FC = () => {
  const [data, setData] = useState<AdminJobsResponse | null>(null);
  const [stats, setStats] = useState<AdminJobsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [onlyDanish, setOnlyDanish] = useState(false);
  const [onlyHot, setOnlyHot] = useState(false);
  const [onlySalary, setOnlySalary] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Expired cleanup modal state
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);
  const [expiredStats, setExpiredStats] = useState<{ days: number; cutoff_date: string; expired_count: number } | null>(null);
  const [isCheckingExpired, setIsCheckingExpired] = useState(false);
  const [isCleaningExpired, setIsCleaningExpired] = useState(false);

  const loadStats = async () => {
    try {
      const s = await fetchAdminJobsStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to load job stats:', err);
    }
  };

  const loadJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      setFeedback(null);
      const res = await fetchAdminJobs({
        page,
        limit,
        search: search.trim() || undefined,
        city: selectedCity || undefined,
        only_danish: onlyDanish,
        only_hot: onlyHot,
        only_salary: onlySalary,
      });
      setData(res);
      // Clear selection if items no longer match
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to fetch job postings from database'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, selectedCity, onlyDanish, onlyHot, onlySalary]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleDelete = async (job: AdminJobItem) => {
    const confirmed = window.confirm(
      `Delete job posting "${job.title}" at ${job.company}?\nThis will remove it from the database.`
    );
    if (!confirmed) return;

    try {
      setFeedback(null);
      await deleteAdminJob(job.id);
      setFeedback({ type: 'success', message: `Job #${job.id} deleted from database.` });
      await loadJobs();
      await loadStats();
    } catch (err) {
      console.error('Failed to delete job:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to delete job'),
      });
    }
  };

  // ── Multi-Select Handlers ──
  const toggleSelectAll = () => {
    if (!data?.items) return;
    const currentPageIds = data.items.map((j) => j.id);
    const allSelected = currentPageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      `Permanently delete ${selectedIds.length} selected job postings from the database?\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setIsBulkDeleting(true);
      setFeedback(null);
      const res = await bulkDeleteAdminJobs(selectedIds);
      setFeedback({
        type: 'success',
        message: `Successfully deleted ${res.deleted_count} vacancies from PostgreSQL.`,
      });
      setSelectedIds([]);
      await loadJobs();
      await loadStats();
    } catch (err) {
      console.error('Failed to bulk delete jobs:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Bulk deletion failed'),
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ── Expired Cleanup Modal Handlers ──
  const handleOpenCleanupModal = async () => {
    setShowCleanupModal(true);
    await checkExpiredCount(cleanupDays);
  };

  const checkExpiredCount = async (days: number) => {
    try {
      setIsCheckingExpired(true);
      const res = await fetchExpiredJobsCount(days);
      setExpiredStats(res);
    } catch (err) {
      console.error('Failed to check expired count:', err);
    } finally {
      setIsCheckingExpired(false);
    }
  };

  const handleExecuteCleanup = async () => {
    if (!expiredStats || expiredStats.expired_count === 0) return;
    const confirmed = window.confirm(
      `Confirm permanent deletion of ${expiredStats.expired_count} postings older than ${cleanupDays} days?`
    );
    if (!confirmed) return;

    try {
      setIsCleaningExpired(true);
      const res = await cleanupExpiredJobs(cleanupDays);
      setFeedback({
        type: 'success',
        message: `Database cleanup complete: ${res.deleted_count} expired postings removed.`,
      });
      setShowCleanupModal(false);
      await loadJobs();
      await loadStats();
    } catch (err) {
      console.error('Failed to cleanup expired jobs:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Cleanup failed'),
      });
    } finally {
      setIsCleaningExpired(false);
    }
  };

  const isCurrentPageAllSelected =
    data?.items && data.items.length > 0 && data.items.every((j) => selectedIds.includes(j.id));

  return (
    <div className="space-y-6">
      {/* ── Header Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#14121a] border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Vacancies</span>
            <Briefcase className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats ? stats.total_jobs.toLocaleString() : '—'}
          </div>
          <p className="text-[11px] text-slate-500">Global IT sources & Jobindex DK</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#14121a] border border-cyan-500/20 space-y-1">
          <div className="flex items-center justify-between text-cyan-300 text-xs font-semibold">
            <span>🇩🇰 Danish Tech Jobs</span>
            <MapPin className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {stats ? stats.danish_jobs.toLocaleString() : '—'}
          </div>
          <p className="text-[11px] text-slate-400">Viborg, Aarhus, Copenhagen, etc.</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#14121a] border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold">
            <span>Transparent Salary</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {stats ? stats.salary_disclosed_count.toLocaleString() : '—'}
          </div>
          <p className="text-[11px] text-slate-400">Disclosed compensation brackets</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#14121a] border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-amber-300 text-xs font-semibold">
            <span>Key Hubs in DK</span>
            <Building className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xs text-slate-300 font-mono pt-1">
            {stats && stats.top_cities.length > 0
              ? stats.top_cities.slice(0, 3).map((c) => `${c.city} (${c.count})`).join(', ')
              : 'Indexed across Denmark'}
          </div>
          <p className="text-[11px] text-slate-500">Viborg & Central Denmark Region</p>
        </div>
      </div>

      {/* ── Feedback Notice ── */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ── Filters & Search Toolbar ── */}
      <div className="p-4 rounded-2xl bg-[#14121a] border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by job title, company name, or tech stack..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Danish Filter */}
          <button
            onClick={() => {
              setOnlyDanish(!onlyDanish);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer font-medium ${
              onlyDanish
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <span>🇩🇰 Danish Tech</span>
          </button>

          {/* Hot AI/ML Filter */}
          <button
            onClick={() => {
              setOnlyHot(!onlyHot);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer font-medium ${
              onlyHot
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Hot AI/ML</span>
          </button>

          {/* Salary Disclosed Filter */}
          <button
            onClick={() => {
              setOnlySalary(!onlySalary);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer font-medium ${
              onlySalary
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>With Salary</span>
          </button>

          {/* City Selector */}
          <select
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setPage(1);
            }}
            className="bg-[#1e1c27] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="">All Locations</option>
            {stats?.danish_focus_regions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Cleanup Expired Button */}
          <button
            onClick={handleOpenCleanupModal}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            title="Clean up outdated job postings"
          >
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            <span>Cleanup Expired</span>
          </button>
        </div>
      </div>

      {/* ── Floating Action Bar for Selected Items ── */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 px-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30">
              {selectedIds.length} selected
            </span>
            <span className="text-slate-300">Vacancies chosen across current page</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              Deselect All
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Table of Vacancies ── */}
      <div className="rounded-2xl bg-[#14121a] border border-white/10 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span>Loading vacancies from database...</span>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Briefcase className="w-8 h-8 mx-auto text-slate-500 opacity-60" />
            <p>No job postings found matching your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 bg-white/2">
                  <th className="py-3 px-4 w-10">
                    <button
                      onClick={toggleSelectAll}
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
                      className={`transition group ${
                        isSelected ? 'bg-cyan-950/20' : 'hover:bg-white/3'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelectOne(job.id)}
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

                      {/* Scoring & Hot Indicator */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-slate-300">
                            {Math.round(job.hype_score * 100)}%
                          </span>
                          {job.is_hot && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5 text-amber-400" />
                              <span>HOT</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(job)}
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
        {data && data.total_pages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page <span className="font-bold text-white">{data.page}</span> of{' '}
              <span className="font-bold text-white">{data.total_pages}</span> ({data.total} vacancies)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Cleanup Expired Modal (Zero Fiction / Real Database Stats) ── */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#181622] border border-white/15 p-6 shadow-2xl space-y-5 text-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Database Expired Cleanup</h3>
                  <p className="text-[11px] text-slate-400">Remove stale postings older than chosen days</p>
                </div>
              </div>
              <button
                onClick={() => setShowCleanupModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Threshold Selector */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold block">Select Age Threshold:</label>
              <div className="grid grid-cols-3 gap-2">
                {[30, 45, 60].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setCleanupDays(d);
                      checkExpiredCount(d);
                    }}
                    className={`py-2 rounded-xl border text-center font-semibold transition cursor-pointer ${
                      cleanupDays === d
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Real Stats Verification Block */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>Verified Expired in DB:</span>
                {isCheckingExpired ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                ) : (
                  <span className="font-mono text-white font-bold text-sm">
                    {expiredStats ? expiredStats.expired_count.toLocaleString() : '—'}
                  </span>
                )}
              </div>
              {expiredStats && (
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  Published or ingested prior to{' '}
                  <span className="text-slate-200 font-mono">
                    {new Date(expiredStats.cutoff_date).toLocaleDateString()}
                  </span>
                  .
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCleanupModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCleanup}
                disabled={
                  isCleaningExpired ||
                  isCheckingExpired ||
                  !expiredStats ||
                  expiredStats.expired_count === 0
                }
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
              >
                {isCleaningExpired ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cleaning...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      Delete {expiredStats?.expired_count || 0} Expired Postings
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
