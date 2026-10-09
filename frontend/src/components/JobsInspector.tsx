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
} from 'lucide-react';
import {
  fetchAdminJobs,
  fetchAdminJobsStats,
  deleteAdminJob,
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
          <p className="text-[11px] text-slate-500">Collected from ATS & Job portals</p>
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
        </div>
      </div>

      {/* ── Table of Vacancies ── */}
      <div className="rounded-2xl bg-[#14121a] border border-white/10 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading vacancies from database...</div>
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
                  <th className="py-3 px-4 font-semibold">Job Title & Company</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Stack / Technology</th>
                  <th className="py-3 px-4 font-semibold">Salary Range</th>
                  <th className="py-3 px-4 font-semibold">Scoring</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.items.map((job) => (
                  <tr key={job.id} className="hover:bg-white/3 transition group">
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
                ))}
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
    </div>
  );
};
