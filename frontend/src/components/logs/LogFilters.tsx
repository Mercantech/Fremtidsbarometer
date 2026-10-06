import type { DataSource } from '../../services/adminApi';

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
          className="form-input"
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
          className="form-input"
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
          className="btn-secondary text-xs px-2.5 py-1 text-slate-500 hover:text-slate-700"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}

interface SourceLogFiltersProps {
  selectedSource?: number;
  dataSources: DataSource[];
  onSourceChange: (sourceId: number | undefined) => void;
}

export function SourceLogFilters({
  selectedSource,
  dataSources,
  onSourceChange,
}: SourceLogFiltersProps) {
  return (
    <div className="filter-section">
      <div className="filter-group">
        <label>Data Source:</label>
        <select
          value={selectedSource ?? ''}
          onChange={(e) =>
            onSourceChange(e.target.value ? parseInt(e.target.value, 10) : undefined)
          }
          className="form-input"
        >
          <option value="">All Sources</option>
          {dataSources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name} ({source.category})
            </option>
          ))}
        </select>
      </div>

      {selectedSource !== undefined && (
        <button
          onClick={() => onSourceChange(undefined)}
          className="btn-secondary text-xs px-2.5 py-1 text-slate-500 hover:text-slate-700"
        >
          Reset Filter
        </button>
      )}
    </div>
  );
}
