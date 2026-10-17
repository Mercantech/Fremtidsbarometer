import { adminApi } from './client';

// ── Backup & Snapshot ───────────────────────────────────
export interface BackupSnapshot {
  version: string;
  exported_at: string;
  eras_count: number;
  eras: any[];
  globe_config: any;
  broadcasts_count: number;
  broadcasts: any[];
}

export const exportAdminBackup = async (): Promise<BackupSnapshot> => {
  const response = await adminApi.get<BackupSnapshot>('/api/admin/backup/export');
  return response.data;
};

export const importAdminBackup = async (
  payload: any
): Promise<{
  status: string;
  eras_imported: number;
  globe_config_restored: boolean;
  broadcasts_imported: number;
  restored_at: string;
}> => {
  const response = await adminApi.post('/api/admin/backup/import', payload);
  return response.data;
};
