import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Flame,
  DollarSign,
  Clock,
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
import { JobsInspectorStats } from './jobs/JobsInspectorStats';
import { JobsCleanupModal } from './jobs/JobsCleanupModal';
import { JobsTable } from './jobs/JobsTable';

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

  // Multi-Select Handlers
  const toggleSelectAll = () => {
    if (!data?.items) return;
    const currentPageIds = data.items.map((j: AdminJobItem) => j.id);
    const allSelected = currentPageIds.every((id: number) => selectedIds.includes(id));
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

  // Expired Cleanup Handlers
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

  const handleOpenCleanupModal = async () => {
    setShowCleanupModal(true);
    await checkExpiredCount(cleanupDays);
  };

  const handleDaysChange = (days: number) => {
    setCleanupDays(days);
    checkExpiredCount(days);
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

  return (
    <div className="space-y-6">
      {/* Header Stats Cards */}
      <JobsInspectorStats stats={stats} />

      {/* Feedback Notice */}
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

      {/* Filters & Search Toolbar */}
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
                ? 'bg-amber-500/25 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10 font-bold'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${onlyHot ? 'text-amber-400 animate-pulse' : ''}`} />
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
            {stats?.danish_focus_regions.map((city: string) => (
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

      {/* Active Hot Filter Context Banner */}
      {onlyHot && (
        <div className="p-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-[#14121a] border border-amber-500/30 flex items-center justify-between text-xs text-amber-200 shadow-lg shadow-amber-950/20 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide">Hot Vacancies Filter Active</span>
                {data && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/30">
                    {data.total} {data.total === 1 ? 'hot vacancy' : 'hot vacancies'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-300/80">
                Displaying high-signal tech roles with hype score ≥ 50% (AI/ML stack, verified salary, or recent posting &lt; 3 days).
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setOnlyHot(false);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Hot Filter</span>
          </button>
        </div>
      )}

      {/* Floating Action Bar for Selected Items */}
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

      {/* Vacancies Table Component */}
      <JobsTable
        data={data}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onlyHot={onlyHot}
        page={page}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelectOne={toggleSelectOne}
        onDeleteJob={handleDelete}
        onPageChange={setPage}
        onResetHotFilter={() => {
          setOnlyHot(false);
          setPage(1);
        }}
      />

      {/* Cleanup Expired Modal Component */}
      <JobsCleanupModal
        show={showCleanupModal}
        cleanupDays={cleanupDays}
        expiredStats={expiredStats}
        isCheckingExpired={isCheckingExpired}
        isCleaningExpired={isCleaningExpired}
        onDaysChange={handleDaysChange}
        onClose={() => setShowCleanupModal(false)}
        onExecute={handleExecuteCleanup}
      />
    </div>
  );
};
