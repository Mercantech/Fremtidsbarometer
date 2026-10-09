import type { SystemLog } from '../../services/adminApi';
import {
  Info,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ChevronRight,
  Code2,
} from 'lucide-react';

function getLevelColor(level: string): string {
  switch (level.toUpperCase()) {
    case 'ERROR':
      return 'level-error';
    case 'WARNING':
      return 'level-warning';
    case 'INFO':
      return 'level-info';
    case 'CRITICAL':
      return 'level-critical';
    default:
      return 'level-default';
  }
}

function getLevelIcon(level: string) {
  switch (level.toUpperCase()) {
    case 'CRITICAL':
      return <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />;
    case 'ERROR':
      return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
    case 'WARNING':
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    case 'INFO':
    default:
      return <Info className="w-3.5 h-3.5 text-cyan-400" />;
  }
}

interface SystemLogItemProps {
  log: SystemLog;
}

export function SystemLogItem({ log }: SystemLogItemProps) {
  return (
    <div className={`log-entry ${getLevelColor(log.level)}`}>
      <div className="log-header">
        <span className={`log-level level-${log.level.toLowerCase()} flex items-center gap-1`}>
          {getLevelIcon(log.level)}
          <span>{log.level}</span>
        </span>
        <span className="log-component">{log.component}</span>
        <span className="log-timestamp">{new Date(log.created_at).toLocaleString()}</span>
      </div>
      <div className="log-message">{log.message}</div>
      {log.traceback && (
        <details className="log-details">
          <summary>
            <ChevronRight className="w-3.5 h-3.5 transition-transform details-arrow" />
            <span>View Traceback</span>
          </summary>
          <pre className="log-traceback">{log.traceback}</pre>
        </details>
      )}
      {log.metadata && (
        <div className="log-metadata mt-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <strong className="font-semibold">Metadata:</strong>
          </div>
          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
