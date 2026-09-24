import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchSystemLogs,
  type SystemLog,
  fetchSourceLogs,
  type SourceLog,
  type DataSource,
  fetchDataSources,
  fetchLogComponents,
} from '../services/adminApi';
import '../styles/admin.css';

const PAGE_SIZE = 50;

export const LogsViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'source'>('system');
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [sourceLogs, setSourceLogs] = useState<SourceLog[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [availableComponents, setAvailableComponents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [logLevel, setLogLevel] = useState<string | undefined>(undefined);
  const [component, setComponent] = useState<string | undefined>(undefined);
  const [selectedSource, setSelectedSource] = useState<number | undefined>(undefined);

  // Pagination
  const [page, setPage] = useState(1);

  // Load components once on mount
  useEffect(() => {
    fetchLogComponents()
      .then((comps) => setAvailableComponents(comps))
      .catch(() => {
        // Fallback default components if API unavailable
        setAvailableComponents([
          'FastAPI',
          'JobsScraper',
          'NewsAgent',
          'Orchestrator',
          'Orchestrator-FullCycle',
          'Orchestrator-Jobs',
          'Orchestrator-Social',
          'Orchestrator-Synthesis',
          'Orchestrator-Tech',
          'Scheduler',
          'SocialScraper',
          'Synthesizer',
          'TechScraper',
        ]);
      });
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * PAGE_SIZE;

      if (activeTab === 'system') {
        const data = await fetchSystemLogs(logLevel, component, PAGE_SIZE, offset);
        setSystemLogs(data);

        // Also merge any new components observed in logs
        setAvailableComponents((prev) => {
          const merged = new Set([...prev, ...data.map((l) => l.component).filter(Boolean)]);
          return Array.from(merged).sort();
        });
      } else {
        const data = await fetchSourceLogs(selectedSource, PAGE_SIZE, offset);
        setSourceLogs(data);

        if (dataSources.length === 0) {
          const sources = await fetchDataSources();
          setDataSources(sources);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [activeTab, logLevel, component, selectedSource, page, dataSources.length]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Reset page to 1 when filters change
  const handleLevelChange = (lvl: string | undefined) => {
    setLogLevel(lvl);
    setPage(1);
  };

  const handleComponentChange = (comp: string | undefined) => {
    setComponent(comp);
    setPage(1);
  };

  const handleSourceChange = (src: number | undefined) => {
    setSelectedSource(src);
    setPage(1);
  };

  const handleTabChange = (tab: 'system' | 'source') => {
    setActiveTab(tab);
    setPage(1);
    setError(null);
  };

  const getSourceName = (sourceId: number) => {
    return dataSources.find((s) => s.id === sourceId)?.name || `Source #${sourceId}`;
  };

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'level-error';
      case 'WARNING':
        return 'level-warning';
      case 'INFO':
        return 'level-info';
      case 'CRITICAL':
        return 'level-critical';
      default:
        return 'level-default';
    }
  };

  const currentCount = activeTab === 'system' ? systemLogs.length : sourceLogs.length;

  return (
    <div className="admin-card">
      <div className="card-header flex justify-between items-center">
        <div>
          <h2>System & Source Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time execution diagnostics, orchestrator logs, and error traces
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs text-blue-600 font-medium animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Updating...
            </span>
          )}
          <button
            onClick={() => loadLogs()}
            disabled={loading}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 cursor-pointer"
            title="Refresh logs from database"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && <div className="error-message mb-4">{error}</div>}

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => handleTabChange('system')}
        >
          System Logs
        </button>
        <button
          className={`tab-button ${activeTab === 'source' ? 'active' : ''}`}
          onClick={() => handleTabChange('source')}
        >
          Source Logs
        </button>
      </div>

      {activeTab === 'system' && (
        <>
          <div className="filter-section">
            <div className="filter-group">
              <label>Level:</label>
              <select
                value={logLevel || ''}
                onChange={(e) => handleLevelChange(e.target.value || undefined)}
                className="form-input"
              >
                <option value="">All Levels</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Component:</label>
              <select
                value={component || ''}
                onChange={(e) => handleComponentChange(e.target.value || undefined)}
                className="form-input"
              >
                <option value="">All Components ({availableComponents.length})</option>
                {availableComponents.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            </div>

            {(logLevel || component) && (
              <button
                onClick={() => {
                  setLogLevel(undefined);
                  setComponent(undefined);
                  setPage(1);
                }}
                className="btn-secondary text-xs px-2.5 py-1 text-slate-500 hover:text-slate-700"
              >
                Reset Filters ✕
              </button>
            )}
          </div>

          <div className="logs-container relative min-h-[220px]">
            {loading && systemLogs.length === 0 ? (
              <div className="admin-section-loading">Loading system logs...</div>
            ) : systemLogs.length === 0 ? (
              <p className="no-data">No logs found for current filters</p>
            ) : (
              systemLogs.map((log) => (
                <div key={log.id} className={`log-entry ${getLevelColor(log.level)}`}>
                  <div className="log-header">
                    <span className={`log-level level-${log.level.toLowerCase()}`}>{log.level}</span>
                    <span className="log-component">{log.component}</span>
                    <span className="log-timestamp">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="log-message">{log.message}</div>
                  {log.traceback && (
                    <details className="log-details">
                      <summary>View Traceback</summary>
                      <pre className="log-traceback">{log.traceback}</pre>
                    </details>
                  )}
                  {log.metadata && (
                    <div className="log-metadata">
                      <strong>Metadata:</strong>
                      <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'source' && (
        <>
          <div className="filter-section">
            <div className="filter-group">
              <label>Data Source:</label>
              <select
                value={selectedSource || ''}
                onChange={(e) =>
                  handleSourceChange(e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="form-input"
              >
                <option value="">All Sources</option>
                {dataSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name} ({source.category})
                  </option>
                ))}
              </select>
            </div>

            {selectedSource !== undefined && (
              <button
                onClick={() => handleSourceChange(undefined)}
                className="btn-secondary text-xs px-2.5 py-1 text-slate-500 hover:text-slate-700"
              >
                Reset Filter ✕
              </button>
            )}
          </div>

          <div className="logs-container relative min-h-[220px]">
            {loading && sourceLogs.length === 0 ? (
              <div className="admin-section-loading">Loading source logs...</div>
            ) : sourceLogs.length === 0 ? (
              <p className="no-data">No source logs found</p>
            ) : (
              sourceLogs.map((log) => (
                <div key={log.id} className="log-entry log-source">
                  <div className="log-header">
                    <span className="log-source-name">{getSourceName(log.data_source_id)}</span>
                    <span className="log-timestamp">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                    {log.http_status && (
                      <span className={`http-status status-${log.http_status}`}>
                        HTTP {log.http_status}
                      </span>
                    )}
                  </div>
                  <div className="log-message font-mono text-xs">{log.error_message}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Pagination Footer */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600">
        <div>
          Showing page {page} {currentCount > 0 ? `(${currentCount} entries)` : ''}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="btn-secondary px-3 py-1 rounded cursor-pointer disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="font-semibold px-1">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={currentCount < PAGE_SIZE || loading}
            className="btn-secondary px-3 py-1 rounded cursor-pointer disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};
