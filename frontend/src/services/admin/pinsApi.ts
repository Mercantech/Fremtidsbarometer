import { adminApi } from './client';

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

export const bulkTogglePins = async (
  pin_ids: string[],
  action: 'hide' | 'unhide' = 'hide'
): Promise<{ action: string; affected_count: number; total_hidden: number; requested_count: number }> => {
  const response = await adminApi.post('/api/admin/pins/bulk-toggle', { pin_ids, action });
  return response.data;
};
