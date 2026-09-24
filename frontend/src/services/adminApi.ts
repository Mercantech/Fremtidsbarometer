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

// ── AI Model Configs ─────────────────────────────────
export interface AIModelConfig {
  id: number;
  task_type: string;
  model_name: string;
  provider: string;
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

// ── Source Logs ──────────────────────────────────────
export interface SourceLog {
  id: number;
  data_source_id: number;
  error_message: string;
  http_status?: number;
  created_at: string;
}

export const fetchSourceLogs = async (
  dataSourceId?: number,
  limit: number = 50,
  offset: number = 0
): Promise<SourceLog[]> => {
  const response = await adminApi.get('/api/admin/source-logs', {
    params: { data_source_id: dataSourceId, limit, offset },
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
