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
  fetchSourceTelemetry,
  fetchSourceTelemetryHistory,
  type SourceTelemetry,
  type SourceTelemetryItem,
  type TelemetryHistoryBucket,
} from '../../services/adminApi';

const STATUS_LABELS: Record<string, string> = {
  healthy: '✓ Healthy',
  blocked_403: '🚫 403 / Rate-limited',
  error: '⚠ Error',
};
const STATUS_COLOR: Record<string, string> = {
  healthy: '#10b981',
  blocked_403: '#f59e0b',
  error: '#ef4444',
};
const STATUS_BG: Record<string, string> = {
  healthy: 'rgba(16,185,129,0.08)',
  blocked_403: 'rgba(245,158,11,0.10)',
  error: 'rgba(239,68,68,0.10)',
};

const WINDOW_OPTIONS = [
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '3 days', hours: 72 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'rgba(15,23,42,0.97)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:10, padding:'10px 14px', minWidth:160, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
      <p style={{ color:'#94a3b8', fontSize:11, marginBottom:6, fontWeight:600 }}>{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ display:'flex', justifyContent:'space-between', gap:16, fontSize:12, color:entry.color, marginBottom:2 }}>
          <span>{entry.name}</span>
          <span style={{ fontWeight:700 }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const SourceHealthTable: React.FC<{ sources: SourceTelemetryItem[]; filterStatus?: string }> = ({ sources, filterStatus }) => {
  const filtered = filterStatus ? sources.filter((s) => s.status === filterStatus) : sources;
  if (filtered.length === 0) return (
    <div style={{ textAlign:'center', padding:'24px', color:'#64748b', fontSize:13 }}>No channels match this filter.</div>
  );
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ borderBottom:'1px solid rgba(99,102,241,0.15)' }}>
            {['Channel', 'Category', 'Type', 'Status', 'Last HTTP', 'Errors 24h', 'Last Error'].map((h) => (
              <th key={h} style={{ textAlign:'left', padding:'6px 10px', color:'#64748b', fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <tr key={s.id} style={{ borderBottom:'1px solid rgba(99,102,241,0.07)', background: s.status !== 'healthy' ? STATUS_BG[s.status] : 'transparent' }}>
              <td style={{ padding:'7px 10px', fontWeight:600, color:'#e2e8f0', maxWidth:200 }}>
                <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={s.name}>{s.name}</div>
                <div style={{ fontSize:10, color:'#64748b', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={s.url}>{s.url}</div>
              </td>
              <td style={{ padding:'7px 10px' }}>
                <span style={{ background:'rgba(99,102,241,0.12)', color:'#818cf8', borderRadius:5, padding:'2px 7px', fontSize:10, fontWeight:700 }}>{s.category}</span>
              </td>
              <td style={{ padding:'7px 10px', color:'#94a3b8', fontSize:11 }}>{s.source_type}</td>
              <td style={{ padding:'7px 10px' }}>
                <span style={{ background:STATUS_BG[s.status], color:STATUS_COLOR[s.status], borderRadius:6, padding:'3px 9px', fontSize:11, fontWeight:700, border:`1px solid ${STATUS_COLOR[s.status]}40`, whiteSpace:'nowrap' }}>
                  {STATUS_LABELS[s.status]}
                </span>
              </td>
              <td style={{ padding:'7px 10px', textAlign:'center' }}>
                {s.last_http_status ? (
                  <span style={{ fontWeight:700, color: s.last_http_status >= 400 ? '#ef4444' : '#10b981', fontFamily:'monospace', fontSize:12 }}>{s.last_http_status}</span>
                ) : <span style={{ color:'#475569', fontSize:11 }}>—</span>}
              </td>
              <td style={{ padding:'7px 10px', textAlign:'center' }}>
                <span style={{ fontWeight:700, color: s.errors_24h > 0 ? '#f59e0b' : '#10b981', fontSize:13 }}>{s.errors_24h}</span>
              </td>
              <td style={{ padding:'7px 10px', color:'#94a3b8', maxWidth:220 }}>
                {s.last_error ? (
                  <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11 }} title={s.last_error}>{s.last_error.slice(0, 80)}{s.last_error.length > 80 ? '…' : ''}</div>
                ) : <span style={{ color:'#475569', fontSize:11 }}>No errors</span>}
              </td>
            </tr>
          ))}
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
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:'#e2e8f0' }}>📊 Source Error Telemetry</h3>
          <p style={{ margin:'3px 0 0', fontSize:12, color:'#64748b' }}>Hourly breakdown of channel failures, 403 rate-limits, and affected sources</p>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {WINDOW_OPTIONS.map((opt) => (
            <button key={opt.hours} onClick={() => setWindowHours(opt.hours)} style={{ padding:'4px 12px', borderRadius:7, border:'1px solid', borderColor: windowHours===opt.hours ? '#6366f1' : 'rgba(99,102,241,0.2)', background: windowHours===opt.hours ? 'rgba(99,102,241,0.2)' : 'transparent', color: windowHours===opt.hours ? '#818cf8' : '#64748b', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s' }}>{opt.label}</button>
          ))}
          <button onClick={load} disabled={loading} style={{ padding:'4px 12px', borderRadius:7, border:'1px solid rgba(99,102,241,0.2)', background:'transparent', color:'#64748b', fontSize:12, cursor: loading?'default':'pointer', opacity: loading?0.5:1 }}>🔄</button>
        </div>
      </div>

      {error && (
        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', color:'#fca5a5', fontSize:13 }}>⚠ {error}</div>
      )}

      {/* Chart */}
      <div style={{ background:'rgba(15,23,42,0.6)', borderRadius:14, padding:'18px 16px 10px', border:'1px solid rgba(99,102,241,0.15)' }}>
        {loading && history.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#64748b', fontSize:13 }}>Loading chart data...</div>
        ) : !hasAnyErrors ? (
          <div style={{ textAlign:'center', padding:'36px 0' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🎉</div>
            <div style={{ color:'#10b981', fontWeight:700, fontSize:14 }}>No channel errors in the last {windowHours}h</div>
            <div style={{ color:'#475569', fontSize:12, marginTop:4 }}>All monitored endpoints responded cleanly.</div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={history} margin={{ top:0, right:8, left:-20, bottom:0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                <XAxis dataKey="label" tick={{ fontSize:10, fill:'#475569' }} axisLine={false} tickLine={false} interval={windowHours<=6?0:windowHours<=24?3:11} />
                <YAxis tick={{ fontSize:10, fill:'#475569' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize:11, color:'#94a3b8', paddingTop:8 }} iconType="rect" iconSize={10} />
                <Bar dataKey="blocked_403" name="Rate-limited (403)" stackId="a" fill="#f59e0b" />
                <Bar dataKey="other_errors" name="Other Errors" stackId="a" fill="#ef4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <p style={{ fontSize:10, color:'#475569', textAlign:'center', marginTop:4 }}>Stacked: orange = 403 rate-limits · red = network / parsing errors</p>
          </>
        )}
      </div>

      {/* Per-source health table */}
      {telemetry && (
        <div style={{ background:'rgba(15,23,42,0.6)', borderRadius:14, border:'1px solid rgba(99,102,241,0.15)', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px 0', borderBottom:'1px solid rgba(99,102,241,0.12)', display:'flex', gap:0, overflowX:'auto' }}>
            {[
              { key:'all', label:`All (${telemetry.total_sources})` },
              { key:'error', label:`Errors (${telemetry.failing_sources})` },
              { key:'blocked_403', label:`403 (${telemetry.blocked_403_sources})` },
              { key:'healthy', label:`Healthy (${telemetry.healthy_sources})` },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveSourceFilter(tab.key)} style={{ padding:'7px 16px', border:'none', borderBottom: activeSourceFilter===tab.key ? '2px solid #6366f1' : '2px solid transparent', background:'transparent', color: activeSourceFilter===tab.key ? '#818cf8' : '#64748b', fontSize:12, fontWeight: activeSourceFilter===tab.key ? 700 : 500, cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap' }}>{tab.label}</button>
            ))}
          </div>
          <div style={{ padding:'0 4px', maxHeight:420, overflowY:'auto' }}>
            <SourceHealthTable sources={telemetry.sources} filterStatus={activeSourceFilter==='all' ? undefined : activeSourceFilter} />
          </div>
        </div>
      )}
    </div>
  );
};
