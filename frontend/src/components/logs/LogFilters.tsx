import type { DataSource } from '../../services/adminApi';
import { RotateCcw } from 'lucide-react';

interface SystemLogFiltersProps {
  logLevel?: string;
  component?: string;
  availableComponents: string[];
  onLevelChange: (level: string | undefined) => void;
  onComponentChange: (component: string | undefined) => void;
  onReset: () => void;
}

export function SystemLogFilters({
  logLevel,
  component,
  availableComponents,
  onLevelChange,
  onComponentChange,
  onReset,
}: SystemLogFiltersProps) {
  return (
    <div className="filter-section">
      <div className="filter-group">
        <label>Level:</label>
        <select
          value={logLevel || ''}
          onChange={(e) => onLevelChange(e.target.value || undefined)}
          className="form-input text-xs"
        >
          <option value="">All Levels</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="ERROR">ERROR</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Component:</label>
        <select
          value={component || ''}
          onChange={(e) => onComponentChange(e.target.value || undefined)}
          className="form-input text-xs"
        >
          <option value="">All Components ({availableComponents.length})</option>
          {availableComponents.map((comp) => (
            <option key={comp} value={comp}>
              {comp}
            </option>
          ))}
        </select>
      </div>

      {(logLevel || component) && (
        <button
          onClick={onReset}
          className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer self-end"
          title="Reset filter values"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}

interface SourceLogFiltersProps {
  selectedSource?: number;
  statusCode?: number;
  dataSources: DataSource[];
  onSourceChange: (sourceId: number | undefined) => void;
  onStatusChange: (status: number | undefined) => void;
  onReset: () => void;
}

export function SourceLogFilters({
  selectedSource,
  statusCode,
  dataSources,
  onSourceChange,
  onStatusChange,
  onReset,
}: SourceLogFiltersProps) {
  return (
    <div className="filter-section flex flex-wrap items-center gap-3">
      <div className="filter-group">
        <label>Channel / Data Source:</label>
        <select
          value={selectedSource ?? ''}
          onChange={(e) =>
            onSourceChange(e.target.value ? parseInt(e.target.value, 10) : undefined)
          }
          className="form-input text-xs"
        >
          <option value="">All Channels ({dataSources.length})</option>
          {dataSources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name} [{source.category.toUpperCase()}]
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>HTTP Response / Outcome:</label>
        <select
          value={statusCode ?? ''}
          onChange={(e) =>
            onStatusChange(e.target.value ? parseInt(e.target.value, 10) : undefined)
          }
          className="form-input text-xs"
        >
          <option value="">All Response Statuses</option>
          <option value="403">HTTP 403 (Forbidden / Rate Limited)</option>
          <option value="404">HTTP 404 (Not Found)</option>
          <option value="500">HTTP 500 (Internal Server Error)</option>
          <option value="502">HTTP 502 / 503 (Gateway Error)</option>
        </select>
      </div>

      {(selectedSource !== undefined || statusCode !== undefined) && (
        <button
          onClick={onReset}
          className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer self-end"
          title="Reset filter values"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}
