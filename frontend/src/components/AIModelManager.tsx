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
const PROVIDERS = ['google', 'openai', 'mistral', 'azure', 'custom'];

export const AIModelManager: React.FC = () => {
  const [models, setModels] = useState<AIModelConfig[]>([]);
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
        setError('Model name is required');
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

  if (loading) return <div className="admin-section-loading">Loading AI models...</div>;

  // Group models by task type
  const modelsByTask = TASK_TYPES.reduce((acc, task) => {
    acc[task] = models.filter((m) => m.task_type === task);
    return acc;
  }, {} as Record<string, AIModelConfig[]>);

  return (
    <div className="admin-card">
      <div className="card-header">
        <h2>AI Model Configurations</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary">
          {showForm ? '✕ Cancel' : '+ Add Model'}
        </button>
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
            <label>Model Name:</label>
            <input
              type="text"
              placeholder="e.g., gemini-3.6-flash"
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Provider:</label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              className="form-input"
            >
              {PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_active === 1}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
              />
              Active
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.is_fallback === 1}
                onChange={(e) => setFormData({ ...formData, is_fallback: e.target.checked ? 1 : 0 })}
              />
              Fallback
            </label>
          </div>

          <button onClick={handleCreate} className="btn-primary">
            Create Model
          </button>
        </div>
      )}

      <div className="models-section">
        {TASK_TYPES.map((taskType) => (
          <div key={taskType} className="task-group">
            <h3 className="task-title">{taskType}</h3>
            {modelsByTask[taskType].length === 0 ? (
              <p className="no-data">No models configured for this task</p>
            ) : (
              <div className="model-list">
                {modelsByTask[taskType].map((model) => (
                  <div key={model.id} className="model-item">
                    <div className="model-info">
                      <div className="model-name">{model.model_name}</div>
                      <div className="model-meta">
                        <span className="provider-badge">{model.provider}</span>
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
