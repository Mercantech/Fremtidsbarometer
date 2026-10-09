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
  testDataSourceUrl,
  ingestDataSourceNow,
  type DataSourceTestResult,
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
  Sparkles,
  Zap,
} from 'lucide-react';
import '../styles/admin.css';

const CATEGORIES = ['jobs', 'social', 'tech', 'news', 'salary'];
const SOURCE_TYPES = ['rss', 'api', 'html_scrape'];

const POPULAR_COUNTRIES = [
  { code: 'GLOBAL', label: '🌐 Global / Remote' },
  { code: 'DK', label: '🇩🇰 Denmark' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'PL', label: '🇵🇱 Poland' },
  { code: 'UA', label: '🇺🇦 Ukraine' },
  { code: 'SE', label: '🇸🇪 Sweden' },
  { code: 'NO', label: '🇳🇴 Norway' },
  { code: 'UK', label: '🇬🇧 United Kingdom' },
  { code: 'US', label: '🇺🇸 United States' },
  { code: 'NL', label: '🇳🇱 Netherlands' },
  { code: 'CH', label: '🇨🇭 Switzerland' },
  { code: 'EE', label: '🇪🇪 Estonia' },
  { code: 'FR', label: '🇫🇷 France' },
];

export const DataSourceManager: React.FC = () => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [telemetry, setTelemetry] = useState<SourceTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState<CreateDataSource>({
    name: '',
    url: '',
    category: CATEGORIES[0],
    source_type: SOURCE_TYPES[0],
    country_code: 'GLOBAL',
    is_active: 1,
  });

  // URL Testing State
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<DataSourceTestResult | null>(null);

  // Instant Ingest State
  const [ingestingId, setIngestingId] = useState<number | null>(null);
  const [ingestNotice, setIngestNotice] = useState<{ id: number; message: string; success: boolean } | null>(null);

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
        s.category.toLowerCase().includes(q) ||
        (s.country_code && s.country_code.toLowerCase().includes(q))
    );
  }, [sources, searchQuery]);

  const activeCount = useMemo(() => {
    return sources.filter((s) => s.is_active === 1).length;
  }, [sources]);

  const handleTestUrl = async () => {
    const trimmedUrl = formData.url.trim();
    if (!trimmedUrl) {
      setError('Please enter a URL to test');
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await testDataSourceUrl(trimmedUrl, formData.source_type);
      setTestResult(res);
    } catch (err) {
      setError(getAdminErrorMessage(err, 'Failed to test endpoint'));
    } finally {
      setTestLoading(false);
    }
  };

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
        country_code: formData.country_code || 'GLOBAL',
      });
      setShowForm(false);
      setTestResult(null);
      setFormData({
        name: '',
        url: '',
        category: selectedCategory || CATEGORIES[0],
        source_type: SOURCE_TYPES[0],
        country_code: 'GLOBAL',
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

  const handleInstantIngest = async (sourceId: number) => {
    setIngestingId(sourceId);
    setIngestNotice(null);
    try {
      const res = await ingestDataSourceNow(sourceId);
      setIngestNotice({
        id: sourceId,
        message: res.message,
        success: res.success,
      });
      await loadSources();
    } catch (err) {
      setIngestNotice({
        id: sourceId,
        message: getAdminErrorMessage(err, 'Ingest failed'),
        success: false,
      });
    } finally {
      setIngestingId(null);
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
            Single Source of Truth: All scrapers, radar pins, and background agents query active feeds dynamically from this table.
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
              setTestResult(null);
              setError(null);
            }}
            className="btn-secondary cursor-pointer"
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
            placeholder="Search channels by name, URL, country, or keyword..."
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
              placeholder="e.g., TeamTailor: Podimo Tech, NoFluffJobs Poland, InfoQ RSS"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>URL / Endpoint:</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="https://podimo.teamtailor.com/jobs.rss or https://www.arbeitnow.com/api/job-board-api"
                value={formData.url}
                onChange={(e) => {
                  setFormData({ ...formData, url: e.target.value });
                  setTestResult(null);
                }}
                className="form-input flex-1"
              />
              <button
                type="button"
                onClick={handleTestUrl}
                disabled={testLoading || !formData.url.trim()}
                className="px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Проверить ответ сервера и распарсить превью записей"
              >
                {testLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Проверка...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                    <span>Проверить URL</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div
                className={`mt-2.5 p-3 rounded-lg border text-xs ${
                  testResult.is_valid
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    {testResult.is_valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertOctagon className="w-4 h-4 text-rose-400" />
                    )}
                    <span>
                      {testResult.is_valid
                        ? `HTTP 200 OK — Обнаружен формат ${testResult.detected_type.toUpperCase()} (${testResult.item_count} записей)`
                        : `Сбой проверки (${testResult.error || `HTTP ${testResult.status_code}`})`}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/10 text-slate-300">
                    {testResult.detected_type}
                  </span>
                </div>
                {testResult.sample_titles.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/10">
                    <div className="text-[11px] text-slate-400 mb-1 font-medium">Превью обнаруженных заголовков:</div>
                    <ul className="space-y-1 text-slate-200">
                      {testResult.sample_titles.map((title, i) => (
                        <li key={i} className="truncate flex items-center gap-1.5">
                          <span className="text-emerald-400 text-[10px]">•</span>
                          <span>{title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-row grid grid-cols-1 md:grid-cols-3 gap-3">
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

            <div className="form-group">
              <label>Country / Region (Страна):</label>
              <select
                value={formData.country_code || 'GLOBAL'}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                className="form-input text-xs font-semibold"
              >
                {POPULAR_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label} ({c.code})
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
              • <strong>RSS / Atom feeds</strong> (TeamTailor jobs, Job boards, Google News, blogs) are parsed directly via XML URL without authentication.
            </p>
            <p>
              • <strong>APIs & Scrapers</strong> (Dev.to, Lobste.rs, RemoteOK, Arbeitnow) use JSON data adapters. For regional job boards, specify the exact country code to pin jobs accurately to the 3D globe.
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

          <button onClick={handleCreate} className="btn-primary mt-2 cursor-pointer">
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
            const notice = ingestNotice?.id === source.id ? ingestNotice : null;
            return (
              <div key={source.id} className="source-item">
                <div className="source-info">
                  <div className="source-name font-semibold text-slate-100 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span>{source.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-slate-300 border border-white/8">
                      {source.country_code || 'GLOBAL'}
                    </span>
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

                  {notice && (
                    <div className={`mt-2 text-xs font-medium px-2.5 py-1 rounded inline-flex items-center gap-1.5 ${
                      notice.success
                        ? 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/50 border border-rose-500/30 text-rose-300'
                    }`}>
                      <span>{notice.message}</span>
                    </div>
                  )}
                </div>

                <div className="source-actions flex items-center gap-2">
                  <button
                    onClick={() => handleInstantIngest(source.id)}
                    disabled={ingestingId === source.id}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    title="Запустить сбор данных по этому источнику прямо сейчас"
                  >
                    {ingestingId === source.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                        <span>Сбор...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Собрать</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleActive(source.id, source.is_active)}
                    className={`btn-toggle cursor-pointer ${source.is_active === 1 ? 'active' : 'inactive'}`}
                  >
                    <Power className="w-3 h-3" />
                    {source.is_active === 1 ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(source.id)}
                    className="btn-danger cursor-pointer"
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
