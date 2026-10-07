import React, { useEffect, useState } from 'react';
import {
    fetchAIModels,
    createAIModel,
    updateAIModel,
    deleteAIModel,
    type AIModelConfig,
    type CreateAIModelConfig,
} from '../services/adminApi';
import '../styles/admin.css';

const TASK_TYPES = ['social_extraction', 'tech_extraction', 'jobs_extraction', 'final_synthesis'];
const PROVIDERS = ['google', 'openai', 'anthropic', 'mistral', 'groq', 'custom'];

export const AIModelManager: React.FC = () => {
  const [models, setModels] = useState<AIModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateAIModelConfig>({
    task_type: TASK_TYPES[0],
    model_name: '',
    provider: PROVIDERS[0],
    api_key: '',
    is_active: 0,
    is_fallback: 0,
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await fetchAIModels();
      setModels(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI models');
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
        api_key: '',
        is_active: 0,
        is_fallback: 0,
      });
      await loadModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create AI model');
    }
  };

  const handleToggleActive = async (modelId: number, currentActive: number) => {
    try {
      await updateAIModel(modelId, { is_active: currentActive === 1 ? 0 : 1 });
      await loadModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update AI model');
    }
  };

  const handleToggleFallback = async (modelId: number, currentFallback: number) => {
    try {
      await updateAIModel(modelId, { is_fallback: currentFallback === 1 ? 0 : 1 });
      await loadModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update fallback status');
    }
  };

  const handleDelete = async (modelId: number) => {
    if (window.confirm('Are you sure you want to delete this model configuration?')) {
      try {
        await deleteAIModel(modelId);
        await loadModels();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete AI model');
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
              placeholder="e.g., gemini-3.8-flash, gpt-4o-mini, claude-3-5-sonnet"
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

          <div className="form-group">
            <label>API Key (Optional / Кастомный токен):</label>
            <input
              type="password"
              placeholder="Leave empty to use .env key, or enter custom token..."
              value={formData.api_key || ''}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              className="form-input"
              autoComplete="new-password"
            />

            {/* Сноска по API токенам */}
            <div className="token-footnote">
              <div className="token-footnote-title">
                <span>ℹ️</span>
                <span>Сноска / Примечание по токенам:</span>
              </div>
              <p>
                • <strong>Пустое</strong> — модель автоматически использует системный ключ из <code>.env</code> (удобно, не надо дублировать).
              </p>
              <p>
                • <strong>Заполненное</strong> — модель использует свой собственный персональный токен (сохраняется в зашифрованном виде в БД). Это позволяет подключать чужие ключи, отдельные лимиты или сторонние шлюзы (Groq, Together AI, OpenRouter).
              </p>
            </div>
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
            + Register & Save Model
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
                        {model.has_custom_key ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title="Custom Token configured in database">
                            🔑 Custom Token {model.masked_key ? `(${model.masked_key})` : ''}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200" title="Uses shared system key from .env">
                            ⚙️ System (.env)
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
