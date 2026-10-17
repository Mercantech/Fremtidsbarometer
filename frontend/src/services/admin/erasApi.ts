import { adminApi } from './client';

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
