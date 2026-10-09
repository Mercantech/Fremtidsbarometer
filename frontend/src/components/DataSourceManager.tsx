import React, { useEffect, useState, useMemo } from 'react';
import {
  fetchDataSources,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  type DataSource,
  type CreateDataSource,
  fetchSourceTelemetry,
  type SourceTelemetry,
  getAdminErrorMessage,
} from '../services/adminApi';
import {
  Radio,
  Plus,
  X,
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
  Trash2,
  Loader2,
  Power,
  Globe,
} from 'lucide-react';
import '../styles/admin.css';

const CATEGORIES = ['jobs', 'social', 'tech', 'news', 'salary'];
const SOURCE_TYPES = ['rss', 'api', 'html_scrape'];

export const DataSourceManager: React.FC = () => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [telemetry, setTelemetry] = useState<SourceTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<CreateDataSource>({
    name: '',
    url: '',
    category: CATEGORIES[0],
    source_type: SOURCE_TYPES[0],
    is_active: 1,
  });

  const loadSources = React.useCallback(async () => {
    try {
      setLoading(true);
      const [sourcesData, telemetryData] = await Promise.all([
        fetchDataSources(selectedCategory),
        fetchSourceTelemetry().catch(() => null),
      ]);
      setSources(sourcesData);
      if (telemetryData) {
        setTelemetry(telemetryData);
      }
      setError(null);
    } catch (err) {
      setError(getAdminErrorMessage(err, 'Failed to load data sources'));
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) return sources;
    const q = searchQuery.toLowerCase();
    return sources.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [sources, searchQuery]);

  const activeCount = useMemo(() => {
    return sources.filter((s) => s.is_active === 1).length;
  }, [sources]);

  const handleCreate = async () => {
    try {
      const trimmedName = formData.name.trim();
      const trimmedUrl = formData.url.trim();

      if (!trimmedName || !trimmedUrl) {
        setError('Name and URL are required');
        return;
      }

      await createDataSource({
        ...formData,
        name: trimmedName,
        url: trimmedUrl,
      });
      setShowForm(false);
      setFormData({
        name: '',
        url: '',
        category: selectedCategory || CATEGORIES[0],
        source_type: SOURCE_TYPES[0],
        is_active: 1,
      });
      setError(null);
      await loadSources();
    } catch (err) {
      setError(getAdminErrorMessage(err, 'Failed to create data source'));
    }
  };

  const handleToggleActive = async (sourceId: number, currentActive: number) => {
    try {
      await updateDataSource(sourceId, { is_active: currentActive === 1 ? 0 : 1 });
      await loadSources();
    } catch (err) {
      setError(getAdminErrorMessage(err, 'Failed to update data source'));
    }
  };

  const handleDelete = async (sourceId: number) => {
    if (window.confirm('Are you sure you want to delete this data source?')) {
      try {
        await deleteDataSource(sourceId);
        await loadSources();
      } catch (err) {
        setError(getAdminErrorMessage(err, 'Failed to delete data source'));
      }
    }
  };

  if (loading && sources.length === 0) {
    return <div className="admin-section-loading">Loading data sources...</div>;
  }

  return (
    <div className="admin-card">
      <div className="card-header flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-slate-400" />
            <h2>Data Sources Management</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 text-slate-300 border border-white/8">
              {sources.length} Channels ({activeCount} Active)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Single Source of Truth: All scrapers and background agents query active feeds dynamically from this table.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              Updating...
            </span>
          )}
          <button
            onClick={() => {
              if (!showForm) {
                setFormData((prev) => ({
                  ...prev,
                  category: selectedCategory || prev.category,
                }));
              }
              setShowForm(!showForm);
              setError(null);
            }}
            className="btn-secondary"
          >
            {showForm ? (
              <>
                <X className="w-3.5 h-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Add Source
              </>
            )}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="filter-section flex flex-wrap gap-4 items-center mb-5">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search channels by name, URL, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input text-xs pl-9!"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">Category:</label>
          <select
            value={selectedCategory || ''}
            onChange={(e) => {
              setSelectedCategory(e.target.value || undefined);
            }}
            className="form-input text-xs py-1.5"
          >
            <option value="">All Categories ({sources.length})</option>
            {CATEGORIES.map((cat) => {
              const count = sources.filter((s) => s.category === cat).length;
              return (
                <option key={cat} value={cat}>
                  {cat.toUpperCase()} {count > 0 ? `(${count})` : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {showForm && (
        <div className="form-section mb-6">
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              placeholder="e.g., TeamTailor: Podimo Tech, Reddit: r/rust, InfoQ RSS"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>URL / Endpoint:</label>
            <input
              type="text"
              placeholder="https://podimo.teamtailor.com/jobs.rss or https://www.reddit.com/r/rust"
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
                className="form-input uppercase text-xs font-semibold"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Source Type:</label>
              <select
                value={formData.source_type}
                onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                className="form-input uppercase text-xs font-semibold"
              >
                {SOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sources Footnote */}
          <div className="token-footnote">
            <div className="token-footnote-title">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Source Notes & Guidelines:</span>
            </div>
            <p>
              • <strong>RSS / Atom feeds</strong> (TeamTailor jobs, Google News, blogs) are parsed directly via XML URL without authentication.
            </p>
            <p>
              • <strong>APIs & Scrapers</strong> (Reddit, GitHub, Lobste.rs, Dev.to, RemoteOK, Salary APIs) use platform adapters. For Salary APIs, provide REST endpoints that return developer compensation or job listings (e.g., <code>https://remoteok.com/api</code>).
            </p>
          </div>

          <div className="form-group mt-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-300">
              <input
                type="checkbox"
                checked={formData.is_active === 1}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
              />
              Active on Creation
            </label>
          </div>

          <button onClick={handleCreate} className="btn-primary mt-2">
            <Plus className="w-3.5 h-3.5" />
            Register & Save Source
          </button>
        </div>
      )}

      <div className="sources-list">
        {filteredSources.length === 0 ? (
          <p className="no-data">No data sources matched your filter</p>
        ) : (
          filteredSources.map((source) => {
            const tel = telemetry?.sources.find((t) => t.id === source.id);
            return (
              <div key={source.id} className="source-item">
                <div className="source-info">
                  <div className="source-name font-semibold text-slate-100 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span>{source.name}</span>
                  </div>
                  <div className="source-meta flex items-center gap-2 mt-1.5">
                    <span className="category-badge uppercase font-bold text-[10px]">{source.category}</span>
                    <span className="type-badge uppercase font-bold text-[10px]">{source.source_type}</span>
                    {source.is_active === 1 ? (
                      <span className="active-badge">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Active
                      </span>
                    ) : (
                      <span className="inactive-badge">
                        <XCircle className="w-3 h-3 text-slate-400" />
                        Inactive
                      </span>
                    )}

                    {tel && (
                      tel.status === 'healthy' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1" title="Channel is operating normally without errors">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Operational
                        </span>
                      ) : tel.status === 'blocked_403' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1" title={`HTTP 403 Rate Limited: ${tel.last_error || ''}`}>
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          403 Rate Limited
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1" title={`Error: ${tel.last_error || ''}`}>
                          <AlertOctagon className="w-3 h-3 text-rose-400" />
                          Failing ({tel.last_http_status ? `HTTP ${tel.last_http_status}` : 'Err'})
                        </span>
                      )
                    )}
                  </div>
                  <div className="source-url mt-1">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1 transition"
                      title="Open live source URL in new tab"
                    >
                      <span>{source.url}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="source-actions">
                  <button
                    onClick={() => handleToggleActive(source.id, source.is_active)}
                    className={`btn-toggle ${source.is_active === 1 ? 'active' : 'inactive'}`}
                  >
                    <Power className="w-3 h-3" />
                    {source.is_active === 1 ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(source.id)}
                    className="btn-danger"
                    title="Delete data source"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
