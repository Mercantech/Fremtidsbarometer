import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  StopCircle,
  CalendarClock,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertOctagon,
  Terminal,
  History,
} from 'lucide-react';
import { 
  triggerPipeline, 
  triggerCleanup, 
  seedDatabase, 
  fetchPipelineExecutions,
  abortPipelineExecution,
  fetchScheduledJobs,
  pauseScheduledJob,
  resumeScheduledJob,
  runScheduledJobNow,
  updateScheduledJobInterval,
  toggleScheduler,
  type ActiveExecution,
  type HistoricalExecution,
  type ScheduledJob,
  type CleanupResponse, 
  type SeedDatabaseResponse 
} from '../services/adminApi';
import '../styles/admin.css';

type SweepType = 'all' | 'social' | 'tech' | 'jobs' | 'salary' | 'synthesis' | 'news';

export const PipelineControl: React.FC = () => {
  // Manual trigger state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSweep, setSelectedSweep] = useState<SweepType>('all');
  const [forceRun, setForceRun] = useState(false);

  // Active execution & history persistence across page reloads
  const [activeExecution, setActiveExecution] = useState<ActiveExecution | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<HistoricalExecution[]>([]);
  const [elapsedTimer, setElapsedTimer] = useState<number>(0);

  // Scheduler state
  const [schedulerRunning, setSchedulerRunning] = useState<boolean>(true);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [schedulerLoading, setSchedulerLoading] = useState<boolean>(false);
  const [actionJobId, setActionJobId] = useState<string | null>(null);

  // Database Seed state
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedDatabaseResponse | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  // Retention cleanup state
  const [cleanupDays, setCleanupDays] = useState(14);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResponse | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);

  // Load execution history & scheduler jobs
  const loadData = useCallback(async () => {
    try {
      const [execData, schedData] = await Promise.all([
        fetchPipelineExecutions(12),
        fetchScheduledJobs(),
      ]);

      setActiveExecution(execData.active_execution);
      setRecentExecutions(execData.recent_executions || []);
      if (execData.active_execution?.elapsed_seconds) {
        setElapsedTimer(Math.round(execData.active_execution.elapsed_seconds));
      }

      setSchedulerRunning(schedData.scheduler_running);
      setScheduledJobs(schedData.jobs || []);
    } catch {
      // ignore transient network errors during polling
    }
  }, []);

  // Optimized polling intervals: 10s when active, 25s when idle
  const POLL_INTERVAL_ACTIVE = 10000;
  const POLL_INTERVAL_IDLE = 25000;

  // Initial load, periodic polling and tab visibility synchronization
  useEffect(() => {
    loadData();

    let timer: ReturnType<typeof setInterval> | null = null;
    const intervalTime = activeExecution ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE;

    const startPolling = () => {
      if (timer !== null) return;
      timer = setInterval(() => {
        if (!document.hidden) {
          loadData();
        }
      }, intervalTime);
    };

    const stopPolling = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Tab restored: immediately sync with backend and restart polling interval
        loadData();
        startPolling();
      }
    };

    // Only start polling interval if tab is currently visible
    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData, activeExecution]);

  // Live timer tick for active process (pauses if tab is hidden)
  useEffect(() => {
    if (!activeExecution) {
      setElapsedTimer(0);
      return;
    }
    const timer = setInterval(() => {
      if (!document.hidden) {
        setElapsedTimer((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeExecution]);

  // Manual Trigger handler
  const handleTrigger = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await triggerPipeline(selectedSweep, forceRun);

      if (result.status === 'dispatched') {
        setSuccess(result.message);
      } else {
        setError('Failed to dispatch pipeline');
      }
      // Immediate fetch after triggering
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger pipeline');
    } finally {
      setLoading(false);
    }
  };

  // Abort execution handler
  const handleAbort = async (executionId: string) => {
    if (!window.confirm(`Are you sure you want to abort execution ${executionId}?`)) {
      return;
    }
    try {
      // Optimistic update: immediately drop active execution in UI
      setActiveExecution((prev) => (prev?.id === executionId ? null : prev));
      await abortPipelineExecution(executionId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to abort execution');
      await loadData();
    }
  };

  // Scheduler Job actions
  const handleToggleJobPause = async (job: ScheduledJob) => {
    try {
      setActionJobId(job.id);
      // Optimistic update of job pause status
      setScheduledJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, is_paused: !job.is_paused } : j))
      );
      if (job.is_paused) {
        await resumeScheduledJob(job.id);
      } else {
        await pauseScheduledJob(job.id);
      }
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update job status');
      await loadData();
    } finally {
      setActionJobId(null);
    }
  };

  const handleRunJobNow = async (job: ScheduledJob) => {
    try {
      setActionJobId(job.id);
      await runScheduledJobNow(job.id);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to trigger scheduled job');
    } finally {
      setActionJobId(null);
    }
  };

  const handleUpdateInterval = async (jobId: string, newInterval: number) => {
    try {
      setActionJobId(jobId);
      await updateScheduledJobInterval(jobId, newInterval);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update interval');
    } finally {
      setActionJobId(null);
    }
  };

  const handleToggleScheduler = async () => {
    try {
      setSchedulerLoading(true);
      const res = await toggleScheduler();
      setSchedulerRunning(res.scheduler_running);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle scheduler');
    } finally {
      setSchedulerLoading(false);
    }
  };

  // Seed handler
  const handleSeed = async () => {
    try {
      setSeedLoading(true);
      setSeedError(null);
      setSeedResult(null);

      const res = await seedDatabase();
      setSeedResult(res);
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : 'Failed to seed database');
    } finally {
      setSeedLoading(false);
    }
  };

  // Cleanup handler
  const handleCleanup = async () => {
    if (!window.confirm(`Are you sure you want to purge raw dumps older than ${cleanupDays} days and logs older than 30 days?`)) {
      return;
    }

    try {
      setCleanupLoading(true);
      setCleanupError(null);
      setCleanupResult(null);

      const res = await triggerCleanup(cleanupDays);
      setCleanupResult(res);
    } catch (err) {
      setCleanupError(err instanceof Error ? err.message : 'Failed to execute database retention cleanup');
    } finally {
      setCleanupLoading(false);
    }
  };

  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${Math.floor(diffHr / 24)}d ago`;
    } catch {
      return isoString;
    }
  };

  const formatNextRun = (isoString: string | null) => {
    if (!isoString) return 'Paused / On Hold';
    try {
      const diffMs = new Date(isoString).getTime() - Date.now();
      if (diffMs <= 0) return 'Due now';
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 60) return `In ${diffMin}m (${new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `In ${diffHr}h ${diffMin % 60}m`;
      return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const isRunning = Boolean(activeExecution);

  return (
    <div className="space-y-6">
      {/* ── 1. ACTIVE PROCESS STATUS (Persists across page reload) ── */}
      {activeExecution ? (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
              <div>
                <h3 className="text-sm font-semibold text-white m-0">
                  Background Process: <span className="uppercase text-blue-300">{activeExecution.sweep}</span>
                </h3>
                <p className="text-xs text-slate-400 m-0">
                  Triggered via {activeExecution.trigger_type === 'manual' ? 'Manual Run' : 'Automated Scheduler'} • Run ID: <code className="text-slate-300">{activeExecution.id}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="px-2.5 py-1 bg-white/5 rounded-md border border-white/10 text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Elapsed: {elapsedTimer}s</span>
              </div>
              <button
                onClick={() => handleAbort(activeExecution.id)}
                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Abort Task</span>
              </button>
            </div>
          </div>

          <div className="bg-white/3 rounded-lg p-2.5 border border-white/6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Phase:</span>
              <span className="text-xs font-semibold text-emerald-300">
                {activeExecution.current_step || 'Processing data...'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Live status polling
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white/3 rounded-xl p-3 border border-white/6 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            <span className="font-semibold text-slate-200">Pipeline Status:</span>
            <span className="text-slate-400">Idle — ready for scheduled or manual execution.</span>
          </div>
          <span className="text-slate-500">
            Workers synchronized
          </span>
        </div>
      )}

      {/* ── 2. AUTOMATED SCHEDULER MANAGEMENT ── */}
      <div className="admin-card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-white/8">
          <div>
            <h2 className="!mb-1 flex items-center gap-2.5 text-sm font-semibold text-slate-100">
              <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                <CalendarClock className="w-4 h-4" />
              </div>
              <span>Automated Pipeline Scheduler</span>
            </h2>
            <p className="text-xs text-slate-400 m-0">
              Manage automated background data collection, AI synthesis cycles and retention cleanup.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium ${schedulerRunning ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${schedulerRunning ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              {schedulerRunning ? 'Active' : 'Paused'}
            </span>

            <button
              onClick={handleToggleScheduler}
              disabled={schedulerLoading}
              className="btn-secondary text-xs px-2.5 py-1"
            >
              {schedulerLoading ? 'Updating...' : schedulerRunning ? 'Pause All' : 'Resume All'}
            </button>
          </div>
        </div>

        {/* Scheduled Tasks Grid */}
        <div className="space-y-2.5">
          {scheduledJobs.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              Loading scheduled background tasks...
            </div>
          ) : (
            scheduledJobs.map((job) => (
              <div 
                key={job.id}
                className="bg-white/2 hover:bg-white/4 transition border border-white/6 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-100">
                      {job.name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-medium uppercase tracking-wider bg-white/5 text-slate-300 border border-white/8">
                      {job.category}
                    </span>
                    {job.is_paused ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Paused
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 m-0">
                    {job.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                    <span>Schedule: <strong className="text-slate-300 font-normal">{job.schedule_display}</strong></span>
                    <span>•</span>
                    <span>Next execution: <strong className={job.is_paused ? 'text-amber-400 font-normal' : 'text-slate-300 font-normal'}>{formatNextRun(job.next_run_time)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {job.trigger_type === 'interval' && (
                    <select
                      value={job.interval_minutes || 15}
                      onChange={(e) => handleUpdateInterval(job.id, parseInt(e.target.value))}
                      disabled={actionJobId === job.id}
                      className="text-xs py-1 px-2 rounded-md border border-white/10 bg-white/5 font-medium text-slate-200 cursor-pointer"
                      title="Adjust execution frequency"
                    >
                      <option value={5}>Every 5 min</option>
                      <option value={15}>Every 15 min</option>
                      <option value={30}>Every 30 min</option>
                      <option value={60}>Every 1 hour</option>
                    </select>
                  )}

                  <button
                    onClick={() => handleToggleJobPause(job)}
                    disabled={actionJobId === job.id}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border flex items-center gap-1.5 ${job.is_paused ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/25' : 'btn-secondary'}`}
                  >
                    {actionJobId === job.id ? <RefreshCw className="w-3 h-3 animate-spin text-slate-400" /> : job.is_paused ? <Play className="w-3 h-3 fill-current text-emerald-400" /> : <Pause className="w-3 h-3" />}
                    <span>{actionJobId === job.id ? '...' : job.is_paused ? 'Resume' : 'Pause'}</span>
                  </button>

                  <button
                    onClick={() => handleRunJobNow(job)}
                    disabled={actionJobId === job.id || isRunning}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    title="Trigger immediate execution of this scheduled task"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run Now</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── 3. MANUAL PIPELINE EXECUTION ── */}
      <div className="pipeline-control-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <Terminal className="w-4 h-4" />
            </div>
            <h2 className="!mb-0 text-sm font-semibold text-slate-100">Manual Pipeline Execution</h2>
          </div>
          {isRunning ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Executing...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-white/5 text-slate-400 border border-white/8">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              Idle
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Execute multi-agent data scrapers and mathematical AI synthesis on demand.
        </p>
        
        <div className="control-section">
          <label className="control-label">
            <span>Data Collection Scope:</span>
            <select
              value={selectedSweep}
              onChange={(e) => setSelectedSweep(e.target.value as SweepType)}
              disabled={loading || isRunning}
              className="control-select"
            >
              <option value="all">Full Cycle (Partitions 1-4: Social, Tech, Jobs, Synthesis)</option>
              <option value="social">Partition 1: Social Discussions (Lobste.rs, Dev.to, Reddit)</option>
              <option value="tech">Partition 2: Technical Trends (HackerNews, GitHub Trending)</option>
              <option value="jobs">Partition 3: ATS Tech Jobs (Teamtailor)</option>
              <option value="salary">Partition Salary: Developer Salaries (RemoteOK API)</option>
              <option value="synthesis">Partition 4: AI Mathematical Synthesis (Clustering & Eras)</option>
              <option value="news">Live Real-Time News (Google News, TechCrunch RSS)</option>
            </select>
          </label>
        </div>

        <div className="control-section">
          <label className="control-checkbox">
            <input
              type="checkbox"
              checked={forceRun}
              onChange={(e) => setForceRun(e.target.checked)}
              disabled={loading || isRunning}
            />
            <span>Force Run (bypass 12h freshness check, re-run AI extraction stages)</span>
          </label>
        </div>

        <button
          onClick={handleTrigger}
          disabled={loading || isRunning}
          className={`trigger-button flex items-center justify-center gap-2 ${loading || isRunning ? 'loading' : ''}`}
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Triggering Pipeline...</span>
            </>
          ) : isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Pipeline Task In Progress...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Pipeline Run</span>
            </>
          )}
        </button>

        {success && (
          <div className="message-box success-message flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>Dispatched:</strong> {success}</span>
          </div>
        )}

        {error && (
          <div className="message-box error-message flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span><strong>Error:</strong> {error}</span>
          </div>
        )}

        <div className="help-text">
          <p>
            <strong>Note:</strong> When "Force Run" is unchecked, the orchestrator checks data freshness.
            If recent data exists within 12 hours, synthesis is skipped to save AI tokens and quota.
          </p>
        </div>
      </div>

      {/* ── 4. PROCESS EXECUTION HISTORY (Persisted in DB) ── */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="!mb-0.5 text-sm font-semibold text-slate-100">
                Process Execution History
              </h2>
              <p className="text-xs text-slate-400 m-0">
                Complete historical record of pipeline tasks.
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-white/2 text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Run ID / Time</th>
                <th className="py-2.5 px-3">Scope</th>
                <th className="py-2.5 px-3">Trigger</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Current / Final Step</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {recentExecutions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500">
                    No execution records recorded yet. Start a run above to populate history.
                  </td>
                </tr>
              ) : (
                recentExecutions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-white/2 transition">
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-300">
                      <div>{exec.id}</div>
                      <div className="text-[10px] text-slate-500">{formatTimeAgo(exec.started_at)}</div>
                    </td>
                    <td className="py-2 px-3 font-medium uppercase text-slate-200">
                      {exec.sweep}
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      <span className="capitalize">{exec.trigger_type}</span>
                    </td>
                    <td className="py-2 px-3">
                      {exec.status === 'completed' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Completed
                        </span>
                      ) : exec.status === 'running' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          Running
                        </span>
                      ) : exec.status === 'aborted' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Aborted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-400">
                      {exec.duration_sec ? `${exec.duration_sec}s` : '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-300 max-w-xs truncate" title={exec.error_message || exec.current_step}>
                      {exec.error_message ? (
                        <span className="text-rose-400 font-medium">{exec.error_message}</span>
                      ) : (
                        exec.current_step
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. DATABASE SEEDING & RETENTION CLEANUP ── */}
      <div className="admin-card">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="!mb-0 text-sm font-semibold text-slate-100">Database Initialization & Seeding</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Populate default historical eras, tech trends, data sources, AI models, and salaries. Idempotent and safe to run anytime.
        </p>

        <button
          onClick={handleSeed}
          disabled={seedLoading}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-2"
        >
          <Sparkles className={`w-3.5 h-3.5 ${seedLoading ? 'animate-spin' : ''}`} />
          <span>{seedLoading ? 'Seeding Database...' : 'Seed / Reinitialize Default Data'}</span>
        </button>

        {seedResult && (
          <div className="message-box success-message text-xs mt-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>Seed Completed:</strong> {seedResult.message} ({seedResult.counts.eras} eras, {seedResult.counts.ai_models} AI models, {seedResult.counts.data_sources} sources, {seedResult.counts.tech_trends} trends)</span>
          </div>
        )}

        {seedError && (
          <div className="message-box error-message text-xs mt-3 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span><strong>Seed Failed:</strong> {seedError}</span>
          </div>
        )}
      </div>

      {/* Database Retention Cleanup Section */}
      <div className="admin-card">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <Trash2 className="w-4 h-4" />
          </div>
          <h2 className="!mb-0 text-sm font-semibold text-slate-100">Database Retention & Disk Cleanup</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Purge obsolete raw scrape dumps and system logs to maintain optimal database performance.
        </p>

        <div className="flex items-center gap-3 mb-2">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
            <span>Retention Period (Days):</span>
            <input
              type="number"
              min={1}
              max={90}
              value={cleanupDays}
              onChange={(e) => setCleanupDays(parseInt(e.target.value) || 14)}
              className="form-input !w-20 !py-1 text-center text-xs"
              disabled={cleanupLoading}
            />
          </label>

          <button
            onClick={handleCleanup}
            disabled={cleanupLoading}
            className="btn-danger text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{cleanupLoading ? 'Cleaning...' : 'Clean Old Records'}</span>
          </button>
        </div>

        {cleanupResult && (
          <div className="message-box success-message text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>Cleanup Completed:</strong> Purged {cleanupResult.deleted_raw_scrapes} raw dumps, {cleanupResult.deleted_system_logs} system logs, and {cleanupResult.deleted_source_logs} source logs.</span>
          </div>
        )}

        {cleanupError && (
          <div className="message-box error-message text-xs flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span><strong>Cleanup Failed:</strong> {cleanupError}</span>
          </div>
        )}
      </div>
    </div>
  );
};
