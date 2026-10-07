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
  api_key?: string;
  has_custom_key?: boolean;
  masked_key?: string;
  is_active: number;
  is_fallback: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateAIModelConfig {
  task_type: string;
  model_name: string;
  provider: string;
  api_key?: string;
  is_active?: number;
  is_fallback?: number;
}

export interface UpdateAIModelConfig {
  is_active?: number;
  is_fallback?: number;
  api_key?: string;
}

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
  is_active: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateDataSource {
  name: string;
  url: string;
  category: string;
  source_type: string;
  is_active?: number;
}

export interface UpdateDataSource {
  name?: string;
  url?: string;
  category?: string;
  source_type?: string;
  is_active?: number;
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

