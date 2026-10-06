import type { SystemLog } from '../../services/adminApi';

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

interface SystemLogItemProps {
  log: SystemLog;
}

export function SystemLogItem({ log }: SystemLogItemProps) {
  return (
    <div className={`log-entry ${getLevelColor(log.level)}`}>
      <div className="log-header">
        <span className={`log-level level-${log.level.toLowerCase()}`}>{log.level}</span>
        <span className="log-component">{log.component}</span>
        <span className="log-timestamp">{new Date(log.created_at).toLocaleString()}</span>
      </div>
      <div className="log-message">{log.message}</div>
      {log.traceback && (
        <details className="log-details">
          <summary>View Traceback</summary>
          <pre className="log-traceback">{log.traceback}</pre>
        </details>
      )}
      {log.metadata && (
        <div className="log-metadata">
          <strong>Metadata:</strong>
          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
