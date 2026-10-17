import { adminApi } from './client';

// ── Jobs Directory & Labor Market ───────────────────────
export interface JobScoreBreakdown {
  tech_score: number;
  salary_score: number;
  freshness_score: number;
  matched_tech?: string[];
  hours_old?: number | null;
}

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
  score_breakdown?: JobScoreBreakdown | null;
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

export const fetchExpiredJobsCount = async (
  days: number = 30
): Promise<{ days: number; cutoff_date: string; expired_count: number }> => {
  const response = await adminApi.get('/api/admin/jobs/expired-count', { params: { days } });
  return response.data;
};

export const cleanupExpiredJobs = async (
  days: number = 30
): Promise<{ status: string; deleted_count: number; days: number; cutoff_date: string }> => {
  const response = await adminApi.post('/api/admin/jobs/cleanup-expired', { days });
  return response.data;
};

export const bulkDeleteAdminJobs = async (
  job_ids: number[]
): Promise<{ status: string; deleted_count: number; requested_count: number }> => {
  const response = await adminApi.post('/api/admin/jobs/bulk-delete', { job_ids });
  return response.data;
};
