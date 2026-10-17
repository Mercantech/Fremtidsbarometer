import React from 'react';
import { Clock, StopCircle } from 'lucide-react';
import type { ActiveExecution } from '../../services/adminApi';

interface ActiveExecutionBannerProps {
  activeExecution: ActiveExecution | null;
  elapsedTimer: number;
  onAbort: (id: string) => void;
}

export const ActiveExecutionBanner: React.FC<ActiveExecutionBannerProps> = ({
  activeExecution,
  elapsedTimer,
  onAbort,
}) => {
  if (!activeExecution) {
    return (
      <div className="bg-white/3 rounded-xl p-3 border border-white/6 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-slate-500"></span>
          <span className="font-semibold text-slate-200">Pipeline Status:</span>
          <span className="text-slate-400">Idle — ready for scheduled or manual execution.</span>
        </div>
        <span className="text-slate-500">Workers synchronized</span>
      </div>
    );
  }

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
          <div>
            <h3 className="text-sm font-semibold text-white m-0">
              Background Process: <span className="uppercase text-blue-300">{activeExecution.sweep}</span>
            </h3>
            <p className="text-xs text-slate-400 m-0">
              Triggered via {activeExecution.trigger_type === 'manual' ? 'Manual Run' : 'Automated Scheduler'} • Run ID:{' '}
              <code className="text-slate-300">{activeExecution.id}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-2.5 py-1 bg-white/5 rounded-md border border-white/10 text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Elapsed: {elapsedTimer}s</span>
          </div>
          <button
            onClick={() => onAbort(activeExecution.id)}
            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span>Abort Task</span>
          </button>
        </div>
      </div>

      <div className="bg-white/3 rounded-lg p-2.5 border border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Phase:</span>
          <span className="text-xs font-semibold text-emerald-300">
            {activeExecution.current_step || 'Processing data...'}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">Live status polling</span>
      </div>
    </div>
  );
};
