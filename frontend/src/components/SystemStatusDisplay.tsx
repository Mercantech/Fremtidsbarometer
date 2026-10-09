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
          <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="!mb-0 text-sm font-semibold text-slate-100">System Health & Diagnostics</h2>
            <p className="text-xs text-slate-400 m-0">Live status of scraping workers, data freshness and AI pipeline</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
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
            className="text-xs px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-200 transition cursor-pointer flex items-center gap-1.5 font-medium border border-white/10"
            title="Refresh system status"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      <div
        className={`flex items-center justify-between p-3 rounded-lg mb-4 border transition ${
          status.status === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : status.status === 'stale'
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {status.status === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : status.status === 'stale' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <div>
            <span className="font-semibold text-xs block text-slate-100">
              {status.status === 'ok'
                ? 'All Core Services Operational'
                : status.status === 'stale'
                ? 'Data Stream Stale'
                : 'Service Requires Attention'}
            </span>
            <span className="text-xs text-slate-400">
              {status.status === 'ok'
                ? 'Automated scrapers and synthesis pipelines are operating within nominal thresholds.'
                : 'Data was scraped >12h ago. Run pipeline to refresh market signals.'}
            </span>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
            status.status === 'ok'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : status.status === 'stale'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          {status.status}
        </span>
      </div>

      {status.freshness && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-1">
          <div className="p-3 rounded-lg bg-white/3 border border-white/6">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Data Freshness</span>
            </div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  status.freshness.is_fresh ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              ></span>
              {status.freshness.is_fresh ? 'Current (<12h)' : 'Stale (>12h old)'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/3 border border-white/6">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Latest AI Cluster</span>
            </div>
            <div className="text-xs font-semibold text-slate-200 truncate" title={status.freshness.latest_hype_topic || 'None'}>
              {status.freshness.latest_hype_topic || 'Awaiting Synthesis'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/3 border border-white/6">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Recent Records</span>
            </div>
            <div className="text-xs font-semibold text-slate-200 font-mono">
              {status.freshness.recent_raw_records} raw items
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/3 border border-white/6">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Last Synthesis</span>
            </div>
            <div className="text-xs font-semibold text-slate-200">
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
