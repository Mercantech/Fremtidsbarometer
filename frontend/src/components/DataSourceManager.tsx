import React, { useEffect, useState } from 'react';
import {
  fetchDataSources,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  type DataSource,
  type CreateDataSource,
} from '../services/adminApi';
import '../styles/admin.css';

const CATEGORIES = ['jobs', 'salary', 'hype', 'news', 'tech'];
const SOURCE_TYPES = ['rss', 'api', 'html_scrape'];

export const DataSourceManager: React.FC = () => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState<CreateDataSource>({
    name: '',
    url: '',
    category: CATEGORIES[0],
    source_type: SOURCE_TYPES[0],
    is_active: 1,
  });

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      setLoading(true);
      const data = await fetchDataSources(selectedCategory);
      setSources(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data sources');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.name.trim() || !formData.url.trim()) {
        setError('Name and URL are required');
        return;
      }

      await createDataSource(formData);
      setShowForm(false);
      setFormData({
        name: '',
        url: '',
        category: CATEGORIES[0],
        source_type: SOURCE_TYPES[0],
        is_active: 1,
      });
      await loadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create data source');
    }
  };

  const handleToggleActive = async (sourceId: number, currentActive: number) => {
    try {
      await updateDataSource(sourceId, { is_active: currentActive === 1 ? 0 : 1 });
      await loadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update data source');
    }
  };

  const handleDelete = async (sourceId: number) => {
    if (window.confirm('Are you sure you want to delete this data source?')) {
      try {
        await deleteDataSource(sourceId);
        await loadSources();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete data source');
      }
    }
  };

  if (loading) return <div className="admin-section-loading">Loading data sources...</div>;

  return (
    <div className="admin-card">
      <div className="card-header">
        <h2>Data Sources Management</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary">
          {showForm ? '✕ Cancel' : '+ Add Source'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="filter-section">
        <label>Filter by Category:</label>
        <select
          value={selectedCategory || ''}
          onChange={(e) => {
            setSelectedCategory(e.target.value || undefined);
          }}
          className="form-input"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="form-section">
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              placeholder="e.g., TeamTailor API"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>URL/Endpoint:</label>
            <input
              type="text"
              placeholder="https://example.com/api"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category:</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="form-input"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Source Type:</label>
              <select
                value={formData.source_type}
                onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                className="form-input"
              >
                {SOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
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
          </div>

          <button onClick={handleCreate} className="btn-primary">
            Create Source
          </button>
        </div>
      )}

      <div className="sources-list">
        {sources.length === 0 ? (
          <p className="no-data">No data sources found</p>
        ) : (
          sources.map((source) => (
            <div key={source.id} className="source-item">
              <div className="source-info">
                <div className="source-name">{source.name}</div>
                <div className="source-meta">
                  <span className="category-badge">{source.category}</span>
                  <span className="type-badge">{source.source_type}</span>
                  {source.is_active === 1 ? (
                    <span className="active-badge">✓ Active</span>
                  ) : (
                    <span className="inactive-badge">✗ Inactive</span>
                  )}
                </div>
                <div className="source-url">{source.url}</div>
              </div>

              <div className="source-actions">
                <button
                  onClick={() => handleToggleActive(source.id, source.is_active)}
                  className={`btn-toggle ${source.is_active === 1 ? 'active' : 'inactive'}`}
                >
                  {source.is_active === 1 ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleDelete(source.id)}
                  className="btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
