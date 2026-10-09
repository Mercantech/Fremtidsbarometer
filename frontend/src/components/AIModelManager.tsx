import React, { useEffect, useState } from 'react';
import {
    fetchAIModels,
    fetchProvidersStatus,
    createAIModel,
    updateAIModel,
    deleteAIModel,
    type AIModelConfig,
    type CreateAIModelConfig,
    type ProviderStatus,
    getAdminErrorMessage,
} from '../services/adminApi';
import '../styles/admin.css';

const TASK_TYPES = ['social_extraction', 'tech_extraction', 'jobs_extraction', 'final_synthesis'];
const PROVIDERS = ['google', 'openai', 'mistral', 'groq', 'custom'];

export const AIModelManager: React.FC = () => {
  const [models, setModels] = useState<AIModelConfig[]>([]);
  const [providersStatus, setProvidersStatus] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateAIModelConfig>({
    task_type: TASK_TYPES[0],
    model_name: '',
    provider: PROVIDERS[0],
    is_active: 0,
    is_fallback: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [modelsData, pStatus] = await Promise.all([
        fetchAIModels(),
        fetchProvidersStatus()
      ]);
      setModels(modelsData);
      setProvidersStatus(pStatus);
      setError(null);
    } catch (err) {
      setError(getAdminErrorMessage(err, 'Failed to load AI models'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.model_name.trim()) {
        setError('Model name / ID is required');
        return;
      }

      await createAIModel(formData);
      setShowForm(false);
      setFormData({
        task_type: TASK_TYPES[0],
        model_name: '',
        provider: PROVIDERS[0],
        is_active: 0,
        is_fallback: 0,
      });
      await loadData();
    } catch (err) {
      setError(getAdminErrorMessage(err, 'Failed to create AI model'));
    }
  };

  const handleToggleActive = async (modelId: number, currentActive: number) => {
    try {
      await updateAIModel(modelId, { is_active: currentActive === 1 ? 0 : 1 });
      await loadData();
    } catch (err) {
      setError(getAdminErrorMessage(err, 'Failed to update AI model'));
    }
  };

  const handleToggleFallback = async (modelId: number, currentFallback: number) => {
    try {
      await updateAIModel(modelId, { is_fallback: currentFallback === 1 ? 0 : 1 });
      await loadData();
    } catch (err) {
      setError(getAdminErrorMessage(err, 'Failed to update fallback status'));
    }
  };

  const handleDelete = async (modelId: number) => {
    if (window.confirm('Are you sure you want to delete this model configuration?')) {
      try {
        await deleteAIModel(modelId);
        await loadData();
      } catch (err) {
        setError(getAdminErrorMessage(err, 'Failed to delete AI model'));
      }
    }
  };

  if (loading && models.length === 0) {
    return <div className="admin-section-loading">Loading AI models...</div>;
  }

  // Group models by task type
  const modelsByTask = TASK_TYPES.reduce((acc, task) => {
    acc[task] = models.filter((m) => m.task_type === task);
    return acc;
  }, {} as Record<string, AIModelConfig[]>);

  return (
    <div className="admin-card">
      <div className="card-header flex justify-between items-center">
        <div>
          <h2>AI Model Configurations</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure models for social, tech, jobs extraction & synthesis</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs text-blue-600 font-medium animate-pulse">
              Syncing...
            </span>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-secondary">
            {showForm ? '✕ Cancel' : '+ Add Model'}
          </button>
        </div>
      </div>

      {/* Provider API Key Status Panel */}
      <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>AI Providers Key Status (.env)</span>
          <span className="text-[11px] font-normal text-slate-500">Ключи хранятся строго в переменных окружения сервера</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {providersStatus.map((ps) => (
            <div key={ps.provider} className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 shadow-xs">
              <div>
                <span className="font-bold text-xs uppercase block text-slate-800">{ps.provider}</span>
                <span className="text-[10px] font-mono text-slate-500">{ps.env_var}</span>
              </div>
              {ps.is_configured ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1" title="API key is active in environment">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Ключ найден
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1" title="Missing in .env">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Не найден
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="form-section">
          <div className="form-group">
            <label>Task Type:</label>
            <select
              value={formData.task_type}
              onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
              className="form-input"
            >
              {TASK_TYPES.map((task) => (
                <option key={task} value={task}>
                  {task}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Model Identifier (Exact Model ID):</label>
            <input
              type="text"
              placeholder="e.g., gemini-3.8-flash, gpt-4o-mini, open-mistral-nemo"
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
              className="form-input"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Specify the exact API model version ID (e.g. <code>gemini-3.8-flash</code> or <code>gpt-4o-mini</code>) to be utilized by the pipeline engine.
            </span>
          </div>

          <div className="form-group">
            <label>Provider:</label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              className="form-input uppercase text-xs font-semibold"
            >
              {PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group flex items-center gap-6 mt-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
              <input
                type="checkbox"
                checked={formData.is_active === 1}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
              />
              Set as Primary Active Model
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
              <input
                type="checkbox"
                checked={formData.is_fallback === 1}
                onChange={(e) => setFormData({ ...formData, is_fallback: e.target.checked ? 1 : 0 })}
              />
              Set as Fallback Model
            </label>
          </div>

          <button onClick={handleCreate} className="btn-primary mt-3">
            + Register Model
          </button>
        </div>
      )}

      <div className="models-section">
        {TASK_TYPES.map((taskType) => (
          <div key={taskType} className="task-group">
            <h3 className="task-title capitalize">{taskType.replace('_', ' ')}</h3>
            {modelsByTask[taskType].length === 0 ? (
              <p className="no-data">No models configured for this task</p>
            ) : (
              <div className="model-list">
                {modelsByTask[taskType].map((model) => (
                  <div key={model.id} className="model-item">
                    <div className="model-info">
                      <div className="model-name font-mono font-bold text-sm text-slate-900">{model.model_name}</div>
                      <div className="model-meta flex flex-wrap items-center gap-2 mt-1">
                        <span className="provider-badge uppercase font-bold text-[10px]">{model.provider}</span>
                        {model.env_key_present ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Active via ${model.env_var || '.env'}`}>
                            🟢 Ключ найден (.env)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200" title={`Требуется ${model.env_var || 'API_KEY'} в .env`}>
                            🔴 Ключ не найден в .env
                          </span>
                        )}
                        {model.is_active === 1 && <span className="active-badge">✓ Active</span>}
                        {model.is_fallback === 1 && <span className="fallback-badge">⚡ Fallback</span>}
                      </div>
                    </div>

                    <div className="model-actions">
                      <button
                        onClick={() => handleToggleActive(model.id, model.is_active)}
                        className={`btn-toggle ${model.is_active === 1 ? 'active' : 'inactive'}`}
                      >
                        {model.is_active === 1 ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleToggleFallback(model.id, model.is_fallback)}
                        className={`btn-toggle ${model.is_fallback === 1 ? 'fallback-on' : 'fallback-off'}`}
                        title={model.is_fallback === 1 ? 'Disable Fallback' : 'Enable Fallback'}
                      >
                        {model.is_fallback === 1 ? '⚡ Fallback ON' : '+ Fallback'}
                      </button>
                      <button
                        onClick={() => handleDelete(model.id)}
                        className="btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
