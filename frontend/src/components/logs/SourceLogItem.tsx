import type { DataSource, SourceLog } from '../../services/adminApi';

interface SourceLogItemProps {
  log: SourceLog;
  dataSources: DataSource[];
}

export function SourceLogItem({ log, dataSources }: SourceLogItemProps) {
  const matchedSource = dataSources.find((s) => s.id === log.data_source_id);
  const sourceName = log.source_name || matchedSource?.name || `Source #${log.data_source_id}`;
  const sourceUrl = log.source_url || matchedSource?.url;
  const category = log.source_category || matchedSource?.category;

  const is403 = log.http_status === 403 || log.error_message.includes('403');
  const is500 = log.http_status && log.http_status >= 500;

  return (
    <div className={`log-entry log-source p-3.5 rounded-xl border transition-all ${
      is403 
        ? 'bg-amber-500/5 border-amber-500/30 dark:bg-amber-950/20' 
        : is500 
        ? 'bg-rose-500/5 border-rose-500/30 dark:bg-rose-950/20' 
        : 'bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'
    }`}>
      <div className="log-header flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{sourceName}</span>
          {category && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {category}
            </span>
          )}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 underline truncate max-w-[260px]"
              title={sourceUrl}
            >
              {sourceUrl} ↗
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          {log.http_status != null ? (
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
              is403 
                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200' 
                : is500 
                ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900/60 dark:text-rose-200' 
                : 'bg-slate-100 text-slate-800 border-slate-300'
            }`}>
              HTTP {log.http_status} {is403 ? '• Blocked / 403' : ''}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
              Scraping Exception
            </span>
          )}
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            {new Date(log.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="log-message font-mono text-xs text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-black/30 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60 break-words leading-relaxed">
        {log.error_message}
      </div>
    </div>
  );
}
