import { adminApi } from './client';

// ── AI Model Configs ─────────────────────────────────
export interface AIModelConfig {
  id: number;
  task_type: string;
  model_name: string;
  provider: string;
  env_key_present: boolean;
  env_var?: string;
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
  model_name?: string;
  provider?: string;
  is_active?: number;
  is_fallback?: number;
}

export interface ProviderStatus {
  provider: string;
  env_var: string;
  is_configured: boolean;
  active_count: number;
  fallback_count: number;
}

export const fetchProvidersStatus = async (): Promise<ProviderStatus[]> => {
  const response = await adminApi.get('/api/admin/ai-models/providers-status');
  return response.data;
};

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

export interface TestModelConnectionResponse {
  success: boolean;
  status: string;
  latency_ms: number;
  message: string;
}

export const testAIModelConnection = async (
  provider: string,
  model_name: string
): Promise<TestModelConnectionResponse> => {
  const response = await adminApi.post<TestModelConnectionResponse>('/api/admin/ai-models/test-connection', {
    provider,
    model_name,
  });
  return response.data;
};

export const deleteAIModel = async (modelId: number): Promise<void> => {
  await adminApi.delete(`/api/admin/ai-models/${modelId}`);
};
