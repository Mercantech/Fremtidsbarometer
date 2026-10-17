import { adminApi } from './client';

// ── Audit Logs ─────────────────────────────────────────
export interface AdminAuditLogItem {
  id: number;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  created_at?: string | null;
}

export interface AdminAuditLogResponse {
  items: AdminAuditLogItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface FetchAuditLogsParams {
  action?: string;
  entity_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const fetchAdminAuditLogs = async (
  params?: FetchAuditLogsParams
): Promise<AdminAuditLogResponse> => {
  const response = await adminApi.get<AdminAuditLogResponse>('/api/admin/audit-logs', {
    params,
  });
  return response.data;
};
