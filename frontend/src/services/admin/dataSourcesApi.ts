import { adminApi } from './client';

// ── Data Sources ─────────────────────────────────────
export interface DataSource {
  id: number;
  name: string;
  url: string;
  category: string;
  source_type: string;
  country_code?: string;
  is_active: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateDataSource {
  name: string;
  url: string;
  category: string;
  source_type: string;
  country_code?: string;
  is_active?: number;
}

export interface UpdateDataSource {
  name?: string;
  url?: string;
  category?: string;
  source_type?: string;
  country_code?: string;
  is_active?: number;
}

export interface DataSourceTestResult {
  status_code: number;
  is_valid: boolean;
  detected_type: string;
  item_count: number;
  sample_titles: string[];
  error?: string | null;
}

export interface DataSourceIngestResult {
  success: boolean;
  source_id: number;
  source_name: string;
  items_saved: number;
  message: string;
}

export const fetchDataSources = async (
  category?: string,
  isActive?: number
): Promise<DataSource[]> => {
  const response = await adminApi.get('/api/admin/data-sources', {
    params: { category, is_active: isActive },
  });
  return response.data;
};

export const fetchDataSource = async (sourceId: number): Promise<DataSource> => {
  const response = await adminApi.get(`/api/admin/data-sources/${sourceId}`);
  return response.data;
};

export const createDataSource = async (source: CreateDataSource): Promise<DataSource> => {
  const response = await adminApi.post('/api/admin/data-sources', source);
  return response.data;
};

export const updateDataSource = async (
  sourceId: number,
  update: UpdateDataSource
): Promise<DataSource> => {
  const response = await adminApi.patch(`/api/admin/data-sources/${sourceId}`, update);
  return response.data;
};

export const deleteDataSource = async (sourceId: number): Promise<void> => {
  await adminApi.delete(`/api/admin/data-sources/${sourceId}`);
};

export const testDataSourceUrl = async (
  url: string,
  sourceType: string = 'rss'
): Promise<DataSourceTestResult> => {
  const response = await adminApi.post<DataSourceTestResult>('/api/admin/data-sources/test', {
    url,
    source_type: sourceType,
  });
  return response.data;
};

export const ingestDataSourceNow = async (
  sourceId: number
): Promise<DataSourceIngestResult> => {
  const response = await adminApi.post<DataSourceIngestResult>(`/api/admin/data-sources/${sourceId}/ingest`);
  return response.data;
};

// ── Source Logs & Telemetry ──────────────────────────
export interface SourceLog {
  id: number;
  data_source_id: number;
  source_name?: string;
  source_url?: string;
  source_category?: string;
  error_message: string;
  http_status?: number;
  created_at: string;
}

export interface SourceTelemetryItem {
  id: number;
  name: string;
  url: string;
  category: string;
  source_type: string;
  is_active: number;
  status: 'healthy' | 'blocked_403' | 'error';
  last_http_status?: number | null;
  last_error?: string | null;
  last_error_at?: string | null;
  errors_24h: number;
}

export interface SourceTelemetry {
  total_sources: number;
  active_sources: number;
  healthy_sources: number;
  blocked_403_sources: number;
  failing_sources: number;
  recent_errors_24h: number;
  sources: SourceTelemetryItem[];
}

export const fetchSourceLogs = async (
  dataSourceId?: number,
  limit: number = 50,
  offset: number = 0,
  statusCode?: number
): Promise<SourceLog[]> => {
  const response = await adminApi.get('/api/admin/source-logs', {
    params: { data_source_id: dataSourceId, limit, offset, status_code: statusCode },
  });
  return response.data;
};

export const fetchSourceTelemetry = async (): Promise<SourceTelemetry> => {
  const response = await adminApi.get('/api/admin/sources/telemetry');
  return response.data;
};

export const clearSourceLogs = async (sourceId?: number): Promise<{ status: string; deleted_logs: number }> => {
  const url = sourceId ? `/api/admin/source-logs?source_id=${sourceId}` : '/api/admin/source-logs';
  const response = await adminApi.delete(url);
  return response.data;
};

// ── Source Telemetry History (time-series) ───────────────────
export interface TelemetryHistoryBucket {
  hour: string;       // ISO string "2024-01-01T14:00:00Z"
  label: string;      // "14:00"
  total_errors: number;
  blocked_403: number;
  other_errors: number;
  sources_affected: number;
}

export interface TelemetryHistory {
  history: TelemetryHistoryBucket[];
  window_hours: number;
}

export const fetchSourceTelemetryHistory = async (hours: number = 24): Promise<TelemetryHistory> => {
  const response = await adminApi.get('/api/admin/sources/telemetry/history', {
    params: { hours },
  });
  return response.data;
};
