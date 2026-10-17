import { adminApi } from './client';

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
