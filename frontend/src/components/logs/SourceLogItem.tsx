import type { DataSource, SourceLog } from '../../services/adminApi';

interface SourceLogItemProps {
  log: SourceLog;
  dataSources: DataSource[];
}

export function SourceLogItem({ log, dataSources }: SourceLogItemProps) {
  const sourceName =
    dataSources.find((s) => s.id === log.data_source_id)?.name || `Source #${log.data_source_id}`;

  return (
    <div className="log-entry log-source">
      <div className="log-header">
        <span className="log-source-name">{sourceName}</span>
        <span className="log-timestamp">{new Date(log.created_at).toLocaleString()}</span>
        {log.http_status != null && (
          <span className={`http-status status-${String(log.http_status)[0]}`}>
            HTTP {log.http_status}
          </span>
        )}
      </div>
      <div className="log-message font-mono text-xs">{log.error_message}</div>
    </div>
  );
}
