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
import { SourceTelemetryChart } from './logs/SourceTelemetryChart';
import {
  ScrollText,
  RefreshCw,
  Terminal,
  Activity,
  CheckCircle2,
  FileText,
  Loader2,
} from 'lucide-react';
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
  const [statusCode, setStatusCode] = useState<number | undefined>(undefined);
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
        const logsData = await fetchSourceLogs(selectedSource, PAGE_SIZE, offset, statusCode);
        setSourceLogs(logsData);
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
  }, [activeTab, logLevel, component, selectedSource, statusCode, page, dataSources.length]);

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
          <div className="flex items-center gap-2.5">
            <ScrollText className="w-5 h-5 text-cyan-400" />
            <h2>System & Source Logs</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time execution diagnostics, orchestrator logs, and error traces
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs text-cyan-400 font-medium animate-pulse flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Updating...
            </span>
          )}
          <button
            onClick={() => loadLogs()}
            disabled={loading}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
            title="Refresh logs from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
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
          <Terminal className="w-4 h-4" />
          <span>System Logs</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'source' ? 'active' : ''}`}
          onClick={() => handleTabChange('source')}
        >
          <Activity className="w-4 h-4" />
          <span>Source Logs & Telemetry</span>
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
              <div className="admin-section-loading flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Loading system logs...</span>
              </div>
            ) : systemLogs.length === 0 ? (
              <p className="no-data">No logs found for current filters</p>
            ) : (
              systemLogs.map((log) => <SystemLogItem key={log.id} log={log} />)
            )}
          </div>
        </>
      ) : (
        <>
          {/* Telemetry Chart & Health Table */}
          <div className="mb-5">
            <SourceTelemetryChart />
          </div>

          {/* Raw Source Error Log Stream */}
          <div className="mt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pb-2 border-b border-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Raw Error Log Stream</span>
            </div>
            <SourceLogFilters
              selectedSource={selectedSource}
              statusCode={statusCode}
              dataSources={dataSources}
              onSourceChange={(src) => { setSelectedSource(src); setPage(1); }}
              onStatusChange={(status) => { setStatusCode(status); setPage(1); }}
              onReset={() => { setSelectedSource(undefined); setStatusCode(undefined); setPage(1); }}
            />

            <div className="logs-container relative min-h-[220px] space-y-2 mt-3">
              {loading && sourceLogs.length === 0 ? (
                <div className="admin-section-loading flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span>Loading source error & telemetry logs...</span>
                </div>
              ) : sourceLogs.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl border-slate-800 bg-slate-900/30">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <div className="font-semibold text-sm text-slate-200">No source errors recorded for these filters</div>
                  <div className="text-xs text-slate-400 mt-0.5">All monitored endpoints and channels operated cleanly.</div>
                </div>
              ) : (
                sourceLogs.map((log) => (
                  <SourceLogItem key={log.id} log={log} dataSources={dataSources} />
                ))
              )}
            </div>
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
