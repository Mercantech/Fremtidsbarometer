import React from 'react';
import { CalendarClock, Play, Pause, RefreshCw } from 'lucide-react';
import type { ScheduledJob } from '../../services/adminApi';

interface ScheduledJobsTableProps {
  scheduledJobs: ScheduledJob[];
  schedulerRunning: boolean;
  schedulerLoading: boolean;
  actionJobId: string | null;
  isRunning: boolean;
  onToggleScheduler: () => void;
  onToggleJobPause: (job: ScheduledJob) => void;
  onRunJobNow: (job: ScheduledJob) => void;
  onUpdateInterval: (jobId: string, interval: number) => void;
}

const formatNextRun = (isoString: string | null) => {
  if (!isoString) return 'Paused / On Hold';
  try {
    const diffMs = new Date(isoString).getTime() - Date.now();
    if (diffMs <= 0) return 'Due now';
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `In ${diffMin}m (${new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `In ${diffHr}h ${diffMin % 60}m`;
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
};

export const ScheduledJobsTable: React.FC<ScheduledJobsTableProps> = ({
  scheduledJobs,
  schedulerRunning,
  schedulerLoading,
  actionJobId,
  isRunning,
  onToggleScheduler,
  onToggleJobPause,
  onRunJobNow,
  onUpdateInterval,
}) => {
  return (
    <div className="admin-card">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-white/8">
        <div>
          <h2 className="!mb-1 flex items-center gap-2.5 text-sm font-semibold text-slate-100">
            <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <CalendarClock className="w-4 h-4" />
            </div>
            <span>Automated Pipeline Scheduler</span>
          </h2>
          <p className="text-xs text-slate-400 m-0">
            Manage automated background data collection, AI synthesis cycles and retention cleanup.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium ${
              schedulerRunning
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                schedulerRunning ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            ></span>
            {schedulerRunning ? 'Active' : 'Paused'}
          </span>

          <button
            onClick={onToggleScheduler}
            disabled={schedulerLoading}
            className="btn-secondary text-xs px-2.5 py-1"
          >
            {schedulerLoading ? 'Updating...' : schedulerRunning ? 'Pause All' : 'Resume All'}
          </button>
        </div>
      </div>

      {/* Scheduled Tasks Grid */}
      <div className="space-y-2.5">
        {scheduledJobs.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            Loading scheduled background tasks...
          </div>
        ) : (
          scheduledJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white/2 hover:bg-white/4 transition border border-white/6 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="space-y-1 max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-100">{job.name}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium uppercase tracking-wider bg-white/5 text-slate-300 border border-white/8">
                    {job.category}
                  </span>
                  {job.is_paused ? (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-medium uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Paused
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 m-0">{job.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                  <span>
                    Schedule: <strong className="text-slate-300 font-normal">{job.schedule_display}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Next execution:{' '}
                    <strong className={job.is_paused ? 'text-amber-400 font-normal' : 'text-slate-300 font-normal'}>
                      {formatNextRun(job.next_run_time)}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {job.trigger_type === 'interval' && (
                  <select
                    value={job.interval_minutes || 15}
                    onChange={(e) => onUpdateInterval(job.id, parseInt(e.target.value))}
                    disabled={actionJobId === job.id}
                    className="text-xs py-1 px-2 rounded-md border border-white/10 bg-white/5 font-medium text-slate-200 cursor-pointer"
                    title="Adjust execution frequency"
                  >
                    <option value={5}>Every 5 min</option>
                    <option value={15}>Every 15 min</option>
                    <option value={30}>Every 30 min</option>
                    <option value={60}>Every 1 hour</option>
                  </select>
                )}

                <button
                  onClick={() => onToggleJobPause(job)}
                  disabled={actionJobId === job.id}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border flex items-center gap-1.5 ${
                    job.is_paused
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/25'
                      : 'btn-secondary'
                  }`}
                >
                  {actionJobId === job.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                  ) : job.is_paused ? (
                    <Play className="w-3 h-3 fill-current text-emerald-400" />
                  ) : (
                    <Pause className="w-3 h-3" />
                  )}
                  <span>{actionJobId === job.id ? '...' : job.is_paused ? 'Resume' : 'Pause'}</span>
                </button>

                <button
                  onClick={() => onRunJobNow(job)}
                  disabled={actionJobId === job.id || isRunning}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  title="Trigger immediate execution of this scheduled task"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run Now</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
