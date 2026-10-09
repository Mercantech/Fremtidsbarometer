import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');
const getAdminKey = (): string => {
  return localStorage.getItem('admin_api_key') || '';
};

export const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminApi.interceptors.request.use((config) => {
  const key = getAdminKey();
  if (key) {
    config.headers['x-api-key'] = key;
  } else {
    delete config.headers['x-api-key'];
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Admin API: Unauthorized - Invalid or missing API key');
    } else if (error.message === 'Network Error') {
      console.error('Admin API: Network Error - Backend might be unreachable');
    }
    return Promise.reject(error);
  }
);

export const getAdminErrorMessage = (error: unknown, fallback: string = 'Operation failed'): string => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
    }
    if (detail && typeof detail === 'object') {
      return JSON.stringify(detail);
    }
    if (error.response?.data?.message) {
      return String(error.response.data.message);
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

// ── System Logs ──────────────────────────────────────
export interface SystemLog {
  id: number;
  created_at: string;
  level: string;
  component: string;
  message: string;
  traceback?: string;
  metadata?: Record<string, any>;
}

export const fetchSystemLogs = async (
  level?: string,
  component?: string,
  limit: number = 50,
  offset: number = 0
): Promise<SystemLog[]> => {
  const response = await adminApi.get('/api/admin/logs', {
    params: { level, component, limit, offset },
  });
  return response.data;
};

export const fetchLogComponents = async (): Promise<string[]> => {
  const response = await adminApi.get('/api/admin/components');
  return response.data;
};

// ── System Status ────────────────────────────────────
export interface SystemStatus {
  status: 'ok' | 'stale' | 'no_data' | 'error';
  is_running?: boolean;
  freshness?: {
    is_fresh: boolean;
    latest_hype_topic?: string;
    latest_hype_created_at?: string;
    recent_raw_records: number;
    max_age_hours?: number;
    message?: string;
  };
  error?: string;
}

export const fetchSystemStatus = async (maxAgeHours: number = 12): Promise<SystemStatus> => {
  const response = await adminApi.get('/api/admin/status', {
    params: { max_age_hours: maxAgeHours },
  });
  return response.data;
};

// ── Database Seeding ──────────────────────────────────
export interface SeedDatabaseResponse {
  status: string;
  message: string;
  counts: {
    eras: number;
    ai_models: number;
    data_sources: number;
    tech_trends: number;
  };
}

export const seedDatabase = async (): Promise<SeedDatabaseResponse> => {
  const response = await adminApi.post('/api/admin/seed-database');
  return response.data;
};


// ── AI Model Configs ─────────────────────────────────
export interface AIModelConfig {
  id: number;
  task_type: string;
  model_name: string;
  provider: string;
  env_key_present: boolean;
  env_var?: string;
  is_active: number;
  is_fallback: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateAIModelConfig {
  task_type: string;
  model_name: string;
  provider: string;
  is_active?: number;
  is_fallback?: number;
}

export interface UpdateAIModelConfig {
  is_active?: number;
  is_fallback?: number;
}

export interface ProviderStatus {
  provider: string;
  env_var: string;
  is_configured: boolean;
  active_count: number;
  fallback_count: number;
}

export const fetchProvidersStatus = async (): Promise<ProviderStatus[]> => {
  const response = await adminApi.get('/api/admin/ai-models/providers-status');
  return response.data;
};

export const fetchAIModels = async (
  taskType?: string,
  isActive?: number
): Promise<AIModelConfig[]> => {
  const response = await adminApi.get('/api/admin/ai-models', {
    params: { task_type: taskType, is_active: isActive },
  });
  return response.data;
};

export const fetchAIModel = async (modelId: number): Promise<AIModelConfig> => {
  const response = await adminApi.get(`/api/admin/ai-models/${modelId}`);
  return response.data;
};

export const createAIModel = async (config: CreateAIModelConfig): Promise<AIModelConfig> => {
  const response = await adminApi.post('/api/admin/ai-models', config);
  return response.data;
};

export const updateAIModel = async (
  modelId: number,
  update: UpdateAIModelConfig
): Promise<AIModelConfig> => {
  const response = await adminApi.patch(`/api/admin/ai-models/${modelId}`, update);
  return response.data;
};

export interface TestModelConnectionResponse {
  success: boolean;
  status: string;
  latency_ms: number;
  message: string;
}

export const testAIModelConnection = async (
  provider: string,
  model_name: string
): Promise<TestModelConnectionResponse> => {
  const response = await adminApi.post<TestModelConnectionResponse>('/api/admin/ai-models/test-connection', {
    provider,
    model_name,
  });
  return response.data;
};

export const deleteAIModel = async (modelId: number): Promise<void> => {
  await adminApi.delete(`/api/admin/ai-models/${modelId}`);
};

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


// ── Pipeline Control ────────────────────────────────
export interface PipelineResponse {
  status: 'dispatched' | 'error';
  sweep: string;
  force: boolean;
  message: string;
}

export const triggerPipeline = async (
  sweep: 'all' | 'social' | 'tech' | 'jobs' | 'salary' | 'synthesis' | 'news' = 'all',
  force: boolean = false
): Promise<PipelineResponse> => {
  const response = await adminApi.post('/api/admin/trigger-pipeline', null, {
    params: { sweep, force },
  });
  return response.data;
};

// ── Database Retention Cleanup ───────────────────────
export interface CleanupResponse {
  status: string;
  deleted_raw_scrapes: number;
  deleted_system_logs: number;
  deleted_source_logs: number;
}

export const triggerCleanup = async (days: number = 14): Promise<CleanupResponse> => {
  const response = await adminApi.post('/api/admin/cleanup', null, {
    params: { days },
  });
  return response.data;
};

// ── Process Tracking & Executions (Persists across page reload) ──
export interface ActiveExecution {
  id: string;
  sweep: string;
  trigger_type: string;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  current_step: string;
  force: boolean;
  started_at: string;
  elapsed_seconds: number;
}

export interface HistoricalExecution {
  id: string;
  sweep: string;
  trigger_type: string;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  current_step: string;
  force: boolean;
  started_at: string;
  finished_at?: string;
  duration_sec?: number;
  error_message?: string;
}

export interface PipelineExecutionsResponse {
  active_execution: ActiveExecution | null;
  recent_executions: HistoricalExecution[];
  is_locked: boolean;
}

export const fetchPipelineExecutions = async (limit: number = 15): Promise<PipelineExecutionsResponse> => {
  const response = await adminApi.get('/api/admin/executions', {
    params: { limit },
  });
  return response.data;
};

export const abortPipelineExecution = async (executionId: string): Promise<{ status: string; message: string }> => {
  const response = await adminApi.post(`/api/admin/executions/${executionId}/abort`);
  return response.data;
};

// ── Scheduler Management ────────────────────────────
export interface ScheduledJob {
  id: string;
  name: string;
  description: string;
  category: 'news' | 'sweep' | 'salary' | 'maintenance';
  schedule_display: string;
  next_run_time: string | null;
  is_paused: boolean;
  trigger_type: 'interval' | 'cron';
  interval_minutes?: number;
}

export interface SchedulerJobsResponse {
  scheduler_running: boolean;
  jobs: ScheduledJob[];
}

export const fetchScheduledJobs = async (): Promise<SchedulerJobsResponse> => {
  const response = await adminApi.get('/api/admin/scheduler/jobs');
  return response.data;
};

export const pauseScheduledJob = async (jobId: string): Promise<{ status: string; message: string }> => {
  const response = await adminApi.post(`/api/admin/scheduler/jobs/${jobId}/pause`);
  return response.data;
};

export const resumeScheduledJob = async (jobId: string): Promise<{ status: string; message: string }> => {
  const response = await adminApi.post(`/api/admin/scheduler/jobs/${jobId}/resume`);
  return response.data;
};

export const runScheduledJobNow = async (jobId: string): Promise<PipelineResponse> => {
  const response = await adminApi.post(`/api/admin/scheduler/jobs/${jobId}/run-now`);
  return response.data;
};

export const updateScheduledJobInterval = async (
  jobId: string,
  intervalMinutes: number
): Promise<{ status: string; interval_minutes: number; schedule_display: string }> => {
  const response = await adminApi.post(`/api/admin/scheduler/jobs/${jobId}/update-interval`, {
    interval_minutes: intervalMinutes,
  });
  return response.data;
};

export const toggleScheduler = async (): Promise<{ status: string; scheduler_running: boolean; message: string }> => {
  const response = await adminApi.post('/api/admin/scheduler/toggle');
  return response.data;
};

// ── 3D Globe Radar Config ──────────────────────────────
export interface AdminGlobeConfig {
  batch_rotation_seconds: number;
  max_visible_pins: number;
  hype_ratio: number;
  prioritize_salary: boolean;
  prioritize_trending_tech: boolean;
  pause_on_hover: boolean;
}

export const fetchAdminGlobeConfig = async (): Promise<AdminGlobeConfig> => {
  const response = await adminApi.get<AdminGlobeConfig>('/api/admin/globe/config');
  return response.data;
};

export const updateAdminGlobeConfig = async (
  config: Partial<AdminGlobeConfig>
): Promise<AdminGlobeConfig> => {
  const response = await adminApi.put<AdminGlobeConfig>('/api/admin/globe/config', config);
  return response.data;
};

// ── Eras & History CMS ──────────────────────────────────
export interface AdminEra {
  id: number;
  year: number;
  title: string;
  subtitle?: string;
  stats?: {
    title_da?: string;
    subtitle_da?: string;
    tagline?: string;
    tagline_da?: string;
    icon?: string;
    moodColor?: string;
    roles?: [string, string, string, string?][];
    stack?: [string, string, string, string?][];
    hypeTopic?: string;
    hypeTopic_da?: string;
    hypeDesc?: string;
    hypeDesc_da?: string;
    milestones?: { year: number; title: string; title_da?: string; desc: string; desc_da?: string }[];
    chronicle?: { year: number; headline: string; headline_da?: string; snippet: string; snippet_da?: string; tag?: string }[];
    [key: string]: any;
  };
  created_at?: string;
}

export const fetchAdminEras = async (): Promise<AdminEra[]> => {
  const response = await adminApi.get<AdminEra[]>('/api/admin/eras');
  return response.data;
};

export const createAdminEra = async (payload: {
  year: number;
  title: string;
  subtitle?: string;
  stats?: Record<string, any>;
}): Promise<AdminEra> => {
  const response = await adminApi.post<AdminEra>('/api/admin/eras', payload);
  return response.data;
};

export const updateAdminEra = async (
  eraId: number,
  payload: Partial<{ year: number; title: string; subtitle: string; stats: Record<string, any> }>
): Promise<AdminEra> => {
  const response = await adminApi.put<AdminEra>(`/api/admin/eras/${eraId}`, payload);
  return response.data;
};

export const deleteAdminEra = async (eraId: number): Promise<{ status: string; id: number; title: string }> => {
  const response = await adminApi.delete(`/api/admin/eras/${eraId}`);
  return response.data;
};

export const resetDefaultEras = async (): Promise<AdminEra[]> => {
  const response = await adminApi.post<AdminEra[]>('/api/admin/eras/reset-defaults');
  return response.data;
};

// ── Live Pins Moderation ────────────────────────────────
export interface AdminPinItem {
  id: string;
  raw_id: number;
  type: 'job' | 'hype';
  title: string;
  subtitle: string;
  city: string;
  country: string;
  is_hidden: boolean;
  salary?: string | null;
  score?: number | null;
  created_at?: string | null;
}

export interface AdminPinsResponse {
  items: AdminPinItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  hidden_count: number;
}

export const fetchAdminPins = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  only_hidden?: boolean;
}): Promise<AdminPinsResponse> => {
  const response = await adminApi.get<AdminPinsResponse>('/api/admin/pins', { params });
  return response.data;
};

export const toggleHidePin = async (
  pinId: string
): Promise<{ id: string; is_hidden: boolean; total_hidden: number }> => {
  const response = await adminApi.post(`/api/admin/pins/${pinId}/toggle-hide`);
  return response.data;
};

export const unhideAllPins = async (): Promise<{ message: string; total_hidden: number }> => {
  const response = await adminApi.post('/api/admin/pins/unhide-all');
  return response.data;
};

// ── Jobs & ATS Directory ────────────────────────────────
export interface AdminJobItem {
  id: number;
  title: string;
  company: string;
  url?: string;
  source?: string;
  country: string;
  city: string;
  technology?: string;
  tags: string[];
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency: string;
  hype_score: number;
  is_hot: boolean;
  created_at?: string | null;
}

export interface AdminJobsResponse {
  items: AdminJobItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AdminJobsStats {
  total_jobs: number;
  danish_jobs: number;
  salary_disclosed_count: number;
  danish_focus_regions: string[];
  top_cities: { city: string; count: number }[];
}

export const fetchAdminJobs = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  country?: string;
  only_danish?: boolean;
  only_hot?: boolean;
  only_salary?: boolean;
}): Promise<AdminJobsResponse> => {
  const response = await adminApi.get<AdminJobsResponse>('/api/admin/jobs', { params });
  return response.data;
};

export const fetchAdminJobsStats = async (): Promise<AdminJobsStats> => {
  const response = await adminApi.get<AdminJobsStats>('/api/admin/jobs/stats');
  return response.data;
};

export const deleteAdminJob = async (jobId: number): Promise<{ status: string; id: number; title: string }> => {
  const response = await adminApi.delete(`/api/admin/jobs/${jobId}`);
  return response.data;
};



