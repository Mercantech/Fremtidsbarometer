import React, { useEffect, useState } from 'react';
import { fetchSystemLogs, type SystemLog, fetchSourceLogs, type SourceLog, type DataSource, fetchDataSources } from '../services/adminApi';
import '../styles/admin.css';

export const LogsViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'source'>('system');
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [sourceLogs, setSourceLogs] = useState<SourceLog[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logLevel, setLogLevel] = useState<string | undefined>(undefined);
  const [component, setComponent] = useState<string | undefined>(undefined);
  const [selectedSource, setSelectedSource] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadLogs();
  }, [logLevel, component, selectedSource]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'system') {
        const data = await fetchSystemLogs(logLevel, component, 100, 0);
        setSystemLogs(data);
      } else {
        const data = await fetchSourceLogs(selectedSource, 100, 0);
        setSourceLogs(data);

        // Load data sources for display
        const sources = await fetchDataSources();
        setDataSources(sources);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const getComponentOptions = () => {
    const components = new Set(systemLogs.map((log) => log.component));
    return Array.from(components).sort();
  };

  const getSourceName = (sourceId: number) => {
    return dataSources.find((s) => s.id === sourceId)?.name || `Source #${sourceId}`;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
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

  if (loading) return <div className="admin-section-loading">Loading logs...</div>;

  return (
    <div className="admin-card">
      <div className="card-header">
        <h2>System & Source Logs</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('system');
            setLogLevel(undefined);
            setComponent(undefined);
          }}
        >
          System Logs
        </button>
        <button
          className={`tab-button ${activeTab === 'source' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('source');
            setSelectedSource(undefined);
          }}
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
                onChange={(e) => setLogLevel(e.target.value || undefined)}
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
                onChange={(e) => setComponent(e.target.value || undefined)}
                className="form-input"
              >
                <option value="">All Components</option>
                {getComponentOptions().map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="logs-container">
            {systemLogs.length === 0 ? (
              <p className="no-data">No logs found</p>
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
            <label>Data Source:</label>
            <select
              value={selectedSource || ''}
              onChange={(e) => setSelectedSource(e.target.value ? parseInt(e.target.value) : undefined)}
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

          <div className="logs-container">
            {sourceLogs.length === 0 ? (
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
                  <div className="log-message">{log.error_message}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
