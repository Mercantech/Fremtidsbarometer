import React from 'react';
import { History, RefreshCw } from 'lucide-react';
import type { HistoricalExecution } from '../../services/adminApi';

interface ExecutionHistoryTableProps {
  recentExecutions: HistoricalExecution[];
  onRefresh: () => void;
}

const formatTimeAgo = (isoString?: string) => {
  if (!isoString) return '—';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  } catch {
    return isoString;
  }
};

export const ExecutionHistoryTable: React.FC<ExecutionHistoryTableProps> = ({
  recentExecutions,
  onRefresh,
}) => {
  return (
    <div className="admin-card">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="!mb-0.5 text-sm font-semibold text-slate-100">
              Process Execution History
            </h2>
            <p className="text-xs text-slate-400 m-0">
              Complete historical record of pipeline tasks.
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/8 bg-white/2 text-slate-400 font-medium text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3">Run ID / Time</th>
              <th className="py-2.5 px-3">Scope</th>
              <th className="py-2.5 px-3">Trigger</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Duration</th>
              <th className="py-2.5 px-3">Current / Final Step</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {recentExecutions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-500">
                  No execution records recorded yet. Start a run above to populate history.
                </td>
              </tr>
            ) : (
              recentExecutions.map((exec) => (
                <tr key={exec.id} className="hover:bg-white/2 transition">
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-300">
                    <div>{exec.id}</div>
                    <div className="text-[10px] text-slate-500">{formatTimeAgo(exec.started_at)}</div>
                  </td>
                  <td className="py-2 px-3 font-medium uppercase text-slate-200">
                    {exec.sweep}
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    <span className="capitalize">{exec.trigger_type}</span>
                  </td>
                  <td className="py-2 px-3">
                    {exec.status === 'completed' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Completed
                      </span>
                    ) : exec.status === 'running' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        Running
                      </span>
                    ) : exec.status === 'aborted' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Aborted
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-400">
                    {exec.duration_sec ? `${exec.duration_sec}s` : '—'}
                  </td>
                  <td
                    className="py-2 px-3 text-slate-300 max-w-xs truncate"
                    title={exec.error_message || exec.current_step}
                  >
                    {exec.error_message ? (
                      <span className="text-rose-400 font-medium">{exec.error_message}</span>
                    ) : (
                      exec.current_step
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
