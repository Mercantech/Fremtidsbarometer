import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Sparkles,
  Database,
  Calendar,
  Loader2,
} from 'lucide-react';
import { fetchSystemStatus, type SystemStatus } from '../services/adminApi';
import '../styles/admin.css';

export const SystemStatusDisplay: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true);
        const data = await fetchSystemStatus(12);
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load system status');
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading && !status) return <div className="status-loading">Loading status...</div>;
  if (error && !status) return <div className="status-error">Error: {error}</div>;
  if (!status) return <div className="status-error">No status data available</div>;

  return (
    <div className="system-status-card">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/5">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="!mb-0 text-base font-extrabold text-slate-100 tracking-wide">System Health & Telemetry</h2>
            <p className="text-xs text-slate-400 m-0">Live monitoring of scraping workers, database freshness & AI pipeline status</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs text-cyan-400 font-semibold animate-pulse flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Syncing...
            </span>
          )}
          <button
            onClick={() => {
              setLoading(true);
              fetchSystemStatus(12)
                .then(setStatus)
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
            }}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer flex items-center gap-1.5 font-semibold border border-slate-700"
            title="Refresh system status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      <div
        className={`flex items-center justify-between p-3.5 rounded-xl mb-4 border transition ${
          status.status === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : status.status === 'stale'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {status.status === 'ok' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : status.status === 'stale' ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <span className="font-bold text-sm block text-slate-100">
              {status.status === 'ok'
                ? 'All Core Services Nominal'
                : status.status === 'stale'
                ? 'Data Stream Needs Refresh'
                : 'Service Attention Required'}
            </span>
            <span className="text-xs opacity-80">
              {status.status === 'ok'
                ? 'Automated scrapers and synthesis pipelines are responding within latency limits.'
                : 'Data was scraped >12h ago. Trigger a pipeline run to refresh signals.'}
            </span>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            status.status === 'ok'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : status.status === 'stale'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}
        >
          {status.status}
        </span>
      </div>

      {status.freshness && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold">Pipeline Freshness</span>
            </div>
            <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  status.freshness.is_fresh ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                }`}
              ></span>
              {status.freshness.is_fresh ? 'Within Threshold (<12h)' : 'Stale (>12h old)'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold">Latest AI Cluster</span>
            </div>
            <div className="text-sm font-bold text-slate-100 truncate" title={status.freshness.latest_hype_topic || 'None'}>
              {status.freshness.latest_hype_topic || 'Awaiting Synthesis'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">Recent Raw Records</span>
            </div>
            <div className="text-sm font-bold text-slate-100 font-mono">
              {status.freshness.recent_raw_records} raw posts
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold">Last AI Synthesis</span>
            </div>
            <div className="text-xs font-bold text-slate-100">
              {status.freshness.latest_hype_created_at
                ? new Date(status.freshness.latest_hype_created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'No recent run'}
            </div>
          </div>
        </div>
      )}

      {status.error && (
        <div className="error-message flex items-center gap-2 mt-3">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{status.error}</span>
        </div>
      )}
    </div>
  );
};
