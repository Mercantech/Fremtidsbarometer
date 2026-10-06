import React, { useEffect, useState } from 'react';
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

  const isHealthy = status.status === 'ok';
  const statusClass = `status-indicator status-${status.status}`;

  return (
    <div className="system-status-card">
      <div className="flex justify-between items-center mb-3">
        <h2 className="!mb-0">System Status</h2>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs text-blue-600 font-medium animate-pulse">
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
            className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Refresh system status"
          >
            🔄 Sync
          </button>
        </div>
      </div>
      <div className={statusClass}>
        <span className="status-dot"></span>
        <span className="status-text">
          {status.status === 'ok' ? '✓ Healthy' : status.status === 'stale' ? '⚠ Stale' : '✗ No Data'}
        </span>
      </div>

      {status.freshness && (
        <div className="freshness-info">
          <div className="info-row">
            <span className="label">Data Freshness:</span>
            <span className={isHealthy ? 'value-ok' : 'value-stale'}>
              {status.freshness.is_fresh ? 'Fresh ✓' : 'Stale ✗'}
            </span>
          </div>

          {status.freshness.latest_hype_topic && (
            <div className="info-row">
              <span className="label">Latest Topic:</span>
              <span className="value">{status.freshness.latest_hype_topic}</span>
            </div>
          )}

          {status.freshness.latest_hype_created_at && (
            <div className="info-row">
              <span className="label">Last Updated:</span>
              <span className="value">
                {new Date(status.freshness.latest_hype_created_at).toLocaleString()}
              </span>
            </div>
          )}

          <div className="info-row">
            <span className="label">Recent Records:</span>
            <span className="value">{status.freshness.recent_raw_records}</span>
          </div>

          <div className="info-row">
            <span className="label">Max Age (hours):</span>
            <span className="value">{status.freshness.max_age_hours || 12}</span>
          </div>
        </div>
      )}

      {status.error && (
        <div className="error-message">
          <strong>Error:</strong> {status.error}
        </div>
      )}
    </div>
  );
};
