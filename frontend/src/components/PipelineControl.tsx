import React, { useState, useEffect } from 'react';
import { 
  triggerPipeline, 
  triggerCleanup, 
  seedDatabase, 
  fetchSystemStatus, 
  type CleanupResponse, 
  type SeedDatabaseResponse 
} from '../services/adminApi';
import '../styles/admin.css';

type SweepType = 'all' | 'social' | 'tech' | 'jobs' | 'salary' | 'synthesis' | 'news';

export const PipelineControl: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSweep, setSelectedSweep] = useState<SweepType>('all');
  const [forceRun, setForceRun] = useState(false);

  // Database Seed state
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedDatabaseResponse | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  // Retention cleanup state
  const [cleanupDays, setCleanupDays] = useState(14);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResponse | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);

  // Polling pipeline active running state
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await fetchSystemStatus();
        if (isMounted && typeof res.is_running === 'boolean') {
          setIsRunning(res.is_running);
        }
      } catch {
        // ignore polling error
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleTrigger = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await triggerPipeline(selectedSweep, forceRun);

      if (result.status === 'dispatched') {
        setSuccess(result.message);
        setIsRunning(true);
      } else {
        setError('Failed to dispatch pipeline');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger pipeline');
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <div className="pipeline-control-card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="!mb-0">Manual Pipeline Execution (Пуск)</h2>
          {isRunning ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Pipeline Running...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              Idle
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Trigger real-time multi-agent data scrapers and mathematical AI synthesis on demand.
        </p>
        
        <div className="control-section">
          <label className="control-label">
            <span>Data Collection Scope:</span>
            <select
              value={selectedSweep}
              onChange={(e) => setSelectedSweep(e.target.value as SweepType)}
              disabled={loading}
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
              disabled={loading}
            />
            <span>Force Run (bypass 12h freshness check, force AI token consumption)</span>
          </label>
        </div>

        <button
          onClick={handleTrigger}
          disabled={loading || isRunning}
          className={`trigger-button ${loading || isRunning ? 'loading' : ''}`}
        >
          {loading ? 'Triggering Pipeline...' : isRunning ? '⏳ Pipeline In Progress...' : '▶ Start Pipeline Run'}
        </button>

        {success && (
          <div className="message-box success-message">
            <strong>✓ Dispatched:</strong> {success}
          </div>
        )}

        {error && (
          <div className="message-box error-message">
            <strong>✗ Error:</strong> {error}
          </div>
        )}

        <div className="help-text">
          <p>
            <strong>Note:</strong> When "Force Run" is unchecked, the orchestrator checks data freshness.
            If recent data exists within 12 hours, synthesis is skipped to save AI tokens and quota.
          </p>
        </div>
      </div>

      {/* Database Seeding & Initialization Section */}
      <div className="admin-card">
        <h2>🌱 Database Seeding & Initialization</h2>
        <p className="text-xs text-slate-500 mb-4">
          Populate default historical eras (1995–2026), tech trends (1960–2034), data sources, AI models, and salaries. Idempotent and safe to run anytime.
        </p>

        <button
          onClick={handleSeed}
          disabled={seedLoading}
          className="btn-primary !bg-emerald-600 hover:!bg-emerald-500 text-xs px-4 py-2 rounded-lg font-semibold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          <span>🌱</span>
          <span>{seedLoading ? 'Seeding Database...' : 'Seed / Reinitialize Default Data'}</span>
        </button>

        {seedResult && (
          <div className="message-box success-message text-xs mt-3">
            <strong>✓ Seed Completed:</strong> {seedResult.message} ({seedResult.counts.eras} eras, {seedResult.counts.ai_models} AI models, {seedResult.counts.data_sources} sources, {seedResult.counts.tech_trends} trends)
          </div>
        )}

        {seedError && (
          <div className="message-box error-message text-xs mt-3">
            <strong>✗ Seed Failed:</strong> {seedError}
          </div>
        )}
      </div>

      {/* Database Retention Cleanup Section */}
      <div className="admin-card">
        <h2>PostgreSQL Retention & Disk Cleanup</h2>
        <p className="text-xs text-slate-500 mb-4">
          Purge obsolete raw discussion dumps and system logs to prevent database disk space exhaustion.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <span>Raw Scrape Retention (Days):</span>
            <input
              type="number"
              min={1}
              max={90}
              value={cleanupDays}
              onChange={(e) => setCleanupDays(parseInt(e.target.value) || 14)}
              className="form-input !w-24 !py-1.5 text-center"
              disabled={cleanupLoading}
            />
          </label>

          <button
            onClick={handleCleanup}
            disabled={cleanupLoading}
            className="btn-secondary !bg-rose-50 hover:!bg-rose-100 !text-rose-700 !border-rose-300 text-xs px-4 py-2 rounded-lg font-semibold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>🗑️</span>
            <span>{cleanupLoading ? 'Cleaning up...' : 'Purge Stale Data Now'}</span>
          </button>
        </div>

        {cleanupResult && (
          <div className="message-box success-message text-xs">
            <strong>✓ Cleanup Completed:</strong> Purged {cleanupResult.deleted_raw_scrapes} raw dumps, {cleanupResult.deleted_system_logs} system logs, and {cleanupResult.deleted_source_logs} source logs.
          </div>
        )}

        {cleanupError && (
          <div className="message-box error-message text-xs">
            <strong>✗ Cleanup Failed:</strong> {cleanupError}
          </div>
        )}
      </div>
    </div>
  );
};
