import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  RefreshCw,
  CheckCircle2,
  AlertOctagon,
  Terminal,
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
  type SeedDatabaseResponse,
} from '../services/adminApi';
import '../styles/admin.css';
import { ActiveExecutionBanner } from './pipeline/ActiveExecutionBanner';
import { ScheduledJobsTable } from './pipeline/ScheduledJobsTable';
import { ExecutionHistoryTable } from './pipeline/ExecutionHistoryTable';
import { DatabaseOperationsCard } from './pipeline/DatabaseOperationsCard';

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

  const POLL_INTERVAL_ACTIVE = 10000;
  const POLL_INTERVAL_IDLE = 25000;
  const isExecutionActive = Boolean(activeExecution);

  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;

  useEffect(() => {
    loadDataRef.current();

    const intervalTime = isExecutionActive ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE;
    const timer = setInterval(() => {
      if (!document.hidden) {
        loadDataRef.current();
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isExecutionActive]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDataRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isExecutionActive) {
      setElapsedTimer(0);
      return;
    }
    const timer = setInterval(() => {
      if (!document.hidden) {
        setElapsedTimer((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isExecutionActive]);

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
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleAbort = async (executionId: string) => {
    if (!window.confirm(`Are you sure you want to abort execution ${executionId}?`)) {
      return;
    }
    try {
      setActiveExecution((prev: ActiveExecution | null) => (prev?.id === executionId ? null : prev));
      await abortPipelineExecution(executionId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to abort execution');
      await loadData();
    }
  };

  const handleToggleJobPause = async (job: ScheduledJob) => {
    try {
      setActionJobId(job.id);
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

  const isRunning = Boolean(activeExecution);

  return (
    <div className="space-y-6">
      {/* 1. Active Process Status Banner */}
      <ActiveExecutionBanner
        activeExecution={activeExecution}
        elapsedTimer={elapsedTimer}
        onAbort={handleAbort}
      />

      {/* 2. Automated Scheduler Management */}
      <ScheduledJobsTable
        scheduledJobs={scheduledJobs}
        schedulerRunning={schedulerRunning}
        schedulerLoading={schedulerLoading}
        actionJobId={actionJobId}
        isRunning={isRunning}
        onToggleScheduler={handleToggleScheduler}
        onToggleJobPause={handleToggleJobPause}
        onRunJobNow={handleRunJobNow}
        onUpdateInterval={handleUpdateInterval}
      />

      {/* 3. Manual Pipeline Execution Card */}
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
              <option value="social">Partition 1: Developer Discussions (Lobste.rs, Dev.to)</option>
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
          className={`trigger-button flex items-center justify-center gap-2 ${
            loading || isRunning ? 'loading' : ''
          }`}
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
            <span>
              <strong>Dispatched:</strong> {success}
            </span>
          </div>
        )}

        {error && (
          <div className="message-box error-message flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Error:</strong> {error}
            </span>
          </div>
        )}

        <div className="help-text">
          <p>
            <strong>Note:</strong> When "Force Run" is unchecked, the orchestrator checks data freshness.
            If recent data exists within 12 hours, synthesis is skipped to save AI tokens and quota.
          </p>
        </div>
      </div>

      {/* 4. Process Execution History */}
      <ExecutionHistoryTable
        recentExecutions={recentExecutions}
        onRefresh={loadData}
      />

      {/* 5. Database Seeding & Retention Cleanup */}
      <DatabaseOperationsCard
        seedLoading={seedLoading}
        seedResult={seedResult}
        seedError={seedError}
        cleanupDays={cleanupDays}
        cleanupLoading={cleanupLoading}
        cleanupResult={cleanupResult}
        cleanupError={cleanupError}
        onSeed={handleSeed}
        onCleanupDaysChange={setCleanupDays}
        onCleanup={handleCleanup}
      />
    </div>
  );
};
