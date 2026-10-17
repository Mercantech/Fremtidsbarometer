import React from 'react';
import { Clock, X, Loader2, Trash2 } from 'lucide-react';

interface JobsCleanupModalProps {
  show: boolean;
  cleanupDays: number;
  expiredStats: { days: number; cutoff_date: string; expired_count: number } | null;
  isCheckingExpired: boolean;
  isCleaningExpired: boolean;
  onDaysChange: (days: number) => void;
  onClose: () => void;
  onExecute: () => void;
}

export const JobsCleanupModal: React.FC<JobsCleanupModalProps> = ({
  show,
  cleanupDays,
  expiredStats,
  isCheckingExpired,
  isCleaningExpired,
  onDaysChange,
  onClose,
  onExecute,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-[#181622] border border-white/15 p-6 shadow-2xl space-y-5 text-xs">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Database Expired Cleanup</h3>
              <p className="text-[11px] text-slate-400">Remove stale postings older than chosen days</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Threshold Selector */}
        <div className="space-y-1.5">
          <label className="text-slate-300 font-semibold block">Select Age Threshold:</label>
          <div className="grid grid-cols-3 gap-2">
            {[30, 45, 60].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDaysChange(d)}
                className={`py-2 rounded-xl border text-center font-semibold transition cursor-pointer ${
                  cleanupDays === d
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {/* Real Stats Verification Block */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>Verified Expired in DB:</span>
            {isCheckingExpired ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
            ) : (
              <span className="font-mono text-white font-bold text-sm">
                {expiredStats ? expiredStats.expired_count.toLocaleString() : '—'}
              </span>
            )}
          </div>
          {expiredStats && (
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Published or ingested prior to{' '}
              <span className="text-slate-200 font-mono">
                {new Date(expiredStats.cutoff_date).toLocaleDateString()}
              </span>
              .
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onExecute}
            disabled={
              isCleaningExpired ||
              isCheckingExpired ||
              !expiredStats ||
              expiredStats.expired_count === 0
            }
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-600/20"
          >
            {isCleaningExpired ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Cleaning...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  Delete {expiredStats?.expired_count || 0} Expired Postings
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
