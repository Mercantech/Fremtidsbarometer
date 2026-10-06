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
import { SystemLogFilters, SourceLogFilters } from './logs/LogFilters';
import { SystemLogItem } from './logs/SystemLogItem';
import { SourceLogItem } from './logs/SourceLogItem';
import { LogsPagination } from './logs/LogsPagination';
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
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchLogComponents()
      .then((comps) => setAvailableComponents(comps))
      .catch(() => {
        setAvailableComponents([
          'FastAPI', 'JobsScraper', 'NewsAgent', 'Orchestrator',
          'SalaryScraper', 'Scheduler', 'SocialScraper', 'Synthesizer', 'TechScraper'
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

  const handleTabChange = (tab: 'system' | 'source') => {
    setActiveTab(tab);
    setPage(1);
    setError(null);
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

      {activeTab === 'system' ? (
        <>
          <SystemLogFilters
            logLevel={logLevel}
            component={component}
            availableComponents={availableComponents}
            onLevelChange={(lvl) => { setLogLevel(lvl); setPage(1); }}
            onComponentChange={(comp) => { setComponent(comp); setPage(1); }}
            onReset={() => { setLogLevel(undefined); setComponent(undefined); setPage(1); }}
          />

          <div className="logs-container relative min-h-[220px]">
            {loading && systemLogs.length === 0 ? (
              <div className="admin-section-loading">Loading system logs...</div>
            ) : systemLogs.length === 0 ? (
              <p className="no-data">No logs found for current filters</p>
            ) : (
              systemLogs.map((log) => <SystemLogItem key={log.id} log={log} />)
            )}
          </div>
        </>
      ) : (
        <>
          <SourceLogFilters
            selectedSource={selectedSource}
            dataSources={dataSources}
            onSourceChange={(src) => { setSelectedSource(src); setPage(1); }}
          />

          <div className="logs-container relative min-h-[220px]">
            {loading && sourceLogs.length === 0 ? (
              <div className="admin-section-loading">Loading source logs...</div>
            ) : sourceLogs.length === 0 ? (
              <p className="no-data">No source logs found</p>
            ) : (
              sourceLogs.map((log) => (
                <SourceLogItem key={log.id} log={log} dataSources={dataSources} />
              ))
            )}
          </div>
        </>
      )}

      <LogsPagination
        page={page}
        currentCount={currentCount}
        pageSize={PAGE_SIZE}
        loading={loading}
        onPageChange={setPage}
      />
    </div>
  );
};
