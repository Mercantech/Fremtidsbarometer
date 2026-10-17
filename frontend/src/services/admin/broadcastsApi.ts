import { adminApi } from './client';

// ── Broadcast Pins (Manual Announcements) ───────────────
export interface AdminBroadcastPin {
  id: number;
  title: string;
  description: string;
  category: 'education' | 'hackathon' | 'partner_job' | 'announcement';
  institution: string;
  location_name: string;
  latitude: number;
  longitude: number;
  url?: string | null;
  justification: string;
  expires_at: string;
  is_active: boolean;
  created_at?: string | null;
}

export interface CreateBroadcastPinPayload {
  title: string;
  description: string;
  category?: 'education' | 'hackathon' | 'partner_job' | 'announcement';
  institution?: string;
  location_name?: string;
  latitude: number;
  longitude: number;
  url?: string;
  justification: string;
  expires_at: string;
}

export const fetchAdminBroadcasts = async (
  activeOnly: boolean = false
): Promise<AdminBroadcastPin[]> => {
  const response = await adminApi.get<AdminBroadcastPin[]>('/api/admin/broadcasts', {
    params: { active_only: activeOnly },
  });
  return response.data;
};

export const createAdminBroadcast = async (
  payload: CreateBroadcastPinPayload
): Promise<AdminBroadcastPin> => {
  const response = await adminApi.post<AdminBroadcastPin>('/api/admin/broadcasts', payload);
  return response.data;
};

export const deleteAdminBroadcast = async (
  pinId: number
): Promise<{ status: string; id: number; title: string }> => {
  const response = await adminApi.delete(`/api/admin/broadcasts/${pinId}`);
  return response.data;
};

export const toggleAdminBroadcast = async (
  pinId: number
): Promise<AdminBroadcastPin> => {
  const response = await adminApi.post<AdminBroadcastPin>(`/api/admin/broadcasts/${pinId}/toggle`);
  return response.data;
};
