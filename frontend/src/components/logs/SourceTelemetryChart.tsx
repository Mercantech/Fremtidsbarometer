import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';
import {
  fetchSourceTelemetry,
  fetchSourceTelemetryHistory,
  type SourceTelemetry,
  type SourceTelemetryItem,
  type TelemetryHistoryBucket,
} from '../../services/adminApi';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  healthy: {
    label: 'Healthy',
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(52, 211, 153, 0.3)',
    icon: CheckCircle2,
  },
  blocked_403: {
    label: '403 Rate-limit',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(251, 191, 36, 0.3)',
    icon: AlertTriangle,
  },
  error: {
    label: 'Channel Error',
    color: '#fb7185',
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(251, 113, 133, 0.3)',
    icon: AlertOctagon,
  },
};

const WINDOW_OPTIONS = [
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '3 days', hours: 72 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#181a20] border border-white/10 rounded-lg p-2.5 min-w-[170px] shadow-lg text-xs">
      <p className="text-slate-400 font-medium mb-2 pb-1 border-b border-white/8">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between items-center gap-4 mb-1">
          <span className="flex items-center gap-1.5 font-normal text-slate-300">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
            {entry.name}
          </span>
          <span className="font-mono font-semibold text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const SourceHealthTable: React.FC<{ sources: SourceTelemetryItem[]; filterStatus?: string }> = ({ sources, filterStatus }) => {
  const filtered = filterStatus ? sources.filter((s) => s.status === filterStatus) : sources;
  if (filtered.length === 0) return (
    <div className="text-center py-6 text-slate-500 text-xs">No channels match this filter.</div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-white/8 bg-white/2 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
            {['Channel', 'Category', 'Type', 'Status', 'Last HTTP', 'Errors 24h', 'Last Error'].map((h) => (
              <th key={h} className="text-left py-2 px-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/6">
          {filtered.map((s) => {
            const conf = STATUS_CONFIG[s.status] || STATUS_CONFIG.error;
            const Icon = conf.icon;
            return (
              <tr key={s.id} className="hover:bg-white/2 transition">
                <td className="py-2 px-3 font-medium text-slate-200 max-w-[200px]">
                  <div className="truncate" title={s.name}>{s.name}</div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5" title={s.url}>{s.url}</div>
                </td>
                <td className="py-2 px-3">
                  <span className="bg-white/5 text-slate-300 border border-white/8 rounded px-1.5 py-0.2 text-[10px] font-medium uppercase tracking-wider">
                    {s.category}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{s.source_type}</td>
                <td className="py-2 px-3 whitespace-nowrap">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border"
                    style={{ backgroundColor: conf.bg, color: conf.color, borderColor: conf.border }}
                  >
                    <Icon className="w-3 h-3" />
                    {conf.label}
                  </span>
                </td>
                <td className="py-2 px-3 text-center">
                  {s.last_http_status ? (
                    <span
                      className={`font-mono font-medium text-xs ${
                        s.last_http_status >= 400 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {s.last_http_status}
                    </span>
                  ) : <span className="text-slate-600 text-xs">—</span>}
                </td>
                <td className="py-2 px-3 text-center">
                  <span className={`font-mono text-xs ${s.errors_24h > 0 ? 'text-amber-400 font-medium' : 'text-slate-400'}`}>
                    {s.errors_24h}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-400 max-w-[220px]">
                  {s.last_error ? (
                    <div className="truncate text-[11px] text-rose-300/90" title={s.last_error}>
                      {s.last_error}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[11px]">Clean</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const SourceTelemetryChart: React.FC = () => {
  const [telemetry, setTelemetry] = useState<SourceTelemetry | null>(null);
  const [history, setHistory] = useState<TelemetryHistoryBucket[]>([]);
  const [windowHours, setWindowHours] = useState(24);
  const [activeSourceFilter, setActiveSourceFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tel, hist] = await Promise.all([
        fetchSourceTelemetry(),
        fetchSourceTelemetryHistory(windowHours),
      ]);
      setTelemetry(tel);
      setHistory(hist.history);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load telemetry');
    } finally {
      setLoading(false);
    }
  }, [windowHours]);

  useEffect(() => { load(); }, [load]);

  const hasAnyErrors = history.some((b) => b.total_errors > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="m-0 text-sm font-semibold text-slate-100">Source Error Telemetry</h3>
            <p className="m-0 text-xs text-slate-400">Hourly breakdown of channel dropouts, 403 rate-limits and timeouts</p>
          </div>
        </div>

        <div className="flex gap-1.5 items-center">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.hours}
              onClick={() => setWindowHours(opt.hours)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition border cursor-pointer ${
                windowHours === opt.hours
                  ? 'bg-white/10 border-white/15 text-white'
                  : 'bg-white/3 border-white/6 text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={load}
            disabled={loading}
            className="p-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer disabled:opacity-50 transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-rose-300 text-xs flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Clean Apple-style Bar Chart */}
      <div className="bg-[#16181f] rounded-xl p-4 border border-white/8 shadow-xs">
        {loading && history.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
            <span>Loading telemetry stream...</span>
          </div>
        ) : !hasAnyErrors ? (
          <div className="text-center py-8 flex flex-col items-center justify-center">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-emerald-400 font-medium text-xs">
              All Scraping Endpoints Operational (Last {windowHours}h)
            </div>
            <div className="text-slate-500 text-xs mt-0.5">
              Zero 403 rate-limits or network failures recorded in recent sweep windows.
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={history} margin={{ top: 8, right: 12, left: -16, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#8e8e93' }}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
                  tickLine={false}
                  interval={windowHours <= 6 ? 0 : windowHours <= 24 ? 3 : 11}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#8e8e93' }}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#8e8e93', paddingTop: 8 }}
                  iconType="circle"
                  iconSize={7}
                />
                <Bar
                  dataKey="blocked_403"
                  name="Rate-limited (403)"
                  stackId="a"
                  fill="#ff9f0a"
                />
                <Bar
                  dataKey="other_errors"
                  name="Network / Parsing Errors"
                  stackId="a"
                  fill="#ff453a"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-slate-500 text-center mt-2 m-0">
              Stacked telemetry: Orange = 403 Rate-limit cooldowns · Red = HTTP drops & parser retries
            </p>
          </>
        )}
      </div>

      {/* Per-source health table */}
      {telemetry && (
        <div className="bg-[#16181f] rounded-xl border border-white/8 shadow-xs overflow-hidden">
          <div className="px-4 pt-2.5 border-b border-white/8 flex gap-1 overflow-x-auto">
            {[
              { key: 'all', label: `All Channels (${telemetry.total_sources})` },
              { key: 'error', label: `Errors (${telemetry.failing_sources})` },
              { key: 'blocked_403', label: `403 Limits (${telemetry.blocked_403_sources})` },
              { key: 'healthy', label: `Healthy (${telemetry.healthy_sources})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSourceFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium transition border-b-2 cursor-pointer whitespace-nowrap ${
                  activeSourceFilter === tab.key
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-1 max-h-96 overflow-y-auto">
            <SourceHealthTable
              sources={telemetry.sources}
              filterStatus={activeSourceFilter === 'all' ? undefined : activeSourceFilter}
            />
          </div>
        </div>
      )}
    </div>
  );
};

