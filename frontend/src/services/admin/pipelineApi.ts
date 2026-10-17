import { adminApi } from './client';

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

// ── Global Pipeline Pause / Resume ──────────────────
export const pauseGlobalPipeline = async (): Promise<{ status: string; message: string }> => {
  const response = await adminApi.post('/api/admin/pipeline/pause');
  return response.data;
};

export const resumeGlobalPipeline = async (): Promise<{ status: string; message: string }> => {
  const response = await adminApi.post('/api/admin/pipeline/resume');
  return response.data;
};
