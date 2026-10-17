import React from 'react';
import { Sparkles, Trash2, CheckCircle2, AlertOctagon } from 'lucide-react';
import type { CleanupResponse, SeedDatabaseResponse } from '../../services/adminApi';

interface DatabaseOperationsCardProps {
  seedLoading: boolean;
  seedResult: SeedDatabaseResponse | null;
  seedError: string | null;
  cleanupDays: number;
  cleanupLoading: boolean;
  cleanupResult: CleanupResponse | null;
  cleanupError: string | null;
  onSeed: () => void;
  onCleanupDaysChange: (days: number) => void;
  onCleanup: () => void;
}

export const DatabaseOperationsCard: React.FC<DatabaseOperationsCardProps> = ({
  seedLoading,
  seedResult,
  seedError,
  cleanupDays,
  cleanupLoading,
  cleanupResult,
  cleanupError,
  onSeed,
  onCleanupDaysChange,
  onCleanup,
}) => {
  return (
    <>
      {/* Database Seeding Card */}
      <div className="admin-card">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="!mb-0 text-sm font-semibold text-slate-100">
            Database Initialization & Seeding
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Populate default historical eras, tech trends, data sources, AI models, and salaries. Idempotent and safe to run anytime.
        </p>

        <button
          onClick={onSeed}
          disabled={seedLoading}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-2"
        >
          <Sparkles className={`w-3.5 h-3.5 ${seedLoading ? 'animate-spin' : ''}`} />
          <span>{seedLoading ? 'Seeding Database...' : 'Seed / Reinitialize Default Data'}</span>
        </button>

        {seedResult && (
          <div className="message-box success-message text-xs mt-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Seed Completed:</strong> {seedResult.message} ({seedResult.counts.eras} eras,{' '}
              {seedResult.counts.ai_models} AI models, {seedResult.counts.data_sources} sources,{' '}
              {seedResult.counts.tech_trends} trends)
            </span>
          </div>
        )}

        {seedError && (
          <div className="message-box error-message text-xs mt-3 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Seed Failed:</strong> {seedError}
            </span>
          </div>
        )}
      </div>

      {/* Database Retention Cleanup Card */}
      <div className="admin-card">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <Trash2 className="w-4 h-4" />
          </div>
          <h2 className="!mb-0 text-sm font-semibold text-slate-100">
            Database Retention & Disk Cleanup
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Purge obsolete raw scrape dumps and system logs to maintain optimal database performance.
        </p>

        <div className="flex items-center gap-3 mb-2">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
            <span>Retention Period (Days):</span>
            <input
              type="number"
              min={1}
              max={90}
              value={cleanupDays}
              onChange={(e) => onCleanupDaysChange(parseInt(e.target.value) || 14)}
              className="form-input !w-20 !py-1 text-center text-xs"
              disabled={cleanupLoading}
            />
          </label>

          <button
            onClick={onCleanup}
            disabled={cleanupLoading}
            className="btn-danger text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{cleanupLoading ? 'Cleaning...' : 'Clean Old Records'}</span>
          </button>
        </div>

        {cleanupResult && (
          <div className="message-box success-message text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Cleanup Completed:</strong> Purged {cleanupResult.deleted_raw_scrapes} raw dumps,{' '}
              {cleanupResult.deleted_system_logs} system logs, and {cleanupResult.deleted_source_logs} source logs.
            </span>
          </div>
        )}

        {cleanupError && (
          <div className="message-box error-message text-xs flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Cleanup Failed:</strong> {cleanupError}
            </span>
          </div>
        )}
      </div>
    </>
  );
};
