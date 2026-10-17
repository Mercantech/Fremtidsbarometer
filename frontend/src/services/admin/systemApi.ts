import { adminApi } from './client';

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
