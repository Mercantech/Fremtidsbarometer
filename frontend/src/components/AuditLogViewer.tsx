import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Briefcase,
  Megaphone,
  Database,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fetchAdminAuditLogs,
  type AdminAuditLogItem,
  getAdminErrorMessage,
} from '../services/adminApi';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(20);

  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdminAuditLogs({
        page,
        limit,
        search: search.trim() || undefined,
        action: selectedAction || undefined,
        entity_type: selectedEntity || undefined,
      });
      setLogs(res.items);
      setTotal(res.total);
      setTotalPages(res.pages);
    } catch (err) {
      setError(getAdminErrorMessage(err, 'Failed to fetch audit log trail.'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, selectedAction, selectedEntity]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          <Megaphone className="w-3 h-3" />
          {action}
        </span>
      );
    }
    if (action.includes('DELETE') || action.includes('HIDE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
          <Briefcase className="w-3 h-3" />
          {action}
        </span>
      );
    }
    if (action.includes('UNHIDE') || action.includes('SHOW')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
          <Eye className="w-3 h-3" />
          {action}
        </span>
      );
    }
    if (action.includes('BACKUP')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
          <Database className="w-3 h-3" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
        <SlidersHorizontal className="w-3 h-3" />
        {action}
      </span>
    );
  };

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return 'Unknown';
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="audit-log-manager flex flex-col gap-5 p-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xl font-bold text-white">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h2>Administrative Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident chronological log of all administrator operations, pin moderations, bulk purges and system restorations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Recorded Operations: <strong>{total}</strong></span>
          </div>
          <button
            onClick={() => loadLogs()}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh audit records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, entity ID or IP..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value="">All Action Types</option>
            <option value="PIN_HIDE">PIN_HIDE</option>
            <option value="PIN_SHOW">PIN_SHOW</option>
            <option value="PIN_BULK_HIDE">PIN_BULK_HIDE</option>
            <option value="PIN_BULK_UNHIDE">PIN_BULK_UNHIDE</option>
            <option value="PIN_UNHIDE_ALL">PIN_UNHIDE_ALL</option>
            <option value="BROADCAST_CREATE">BROADCAST_CREATE</option>
            <option value="BROADCAST_UPDATE">BROADCAST_UPDATE</option>
            <option value="BROADCAST_DELETE">BROADCAST_DELETE</option>
            <option value="BROADCAST_TOGGLE">BROADCAST_TOGGLE</option>
            <option value="JOB_DELETE">JOB_DELETE</option>
            <option value="JOB_BULK_DELETE">JOB_BULK_DELETE</option>
            <option value="JOB_CLEANUP_EXPIRED">JOB_CLEANUP_EXPIRED</option>
            <option value="BACKUP_IMPORT">BACKUP_IMPORT</option>
          </select>
        </div>

        <div>
          <select
            value={selectedEntity}
            onChange={(e) => {
              setSelectedEntity(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
          >
            <option value="">All Entity Classes</option>
            <option value="pin">pin (Live Radar)</option>
            <option value="broadcast_pin">broadcast_pin (Manual Pins)</option>
            <option value="job">job (ATS Vacancy)</option>
            <option value="backup">backup (JSON Snapshot)</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-semibold">
              <th className="py-2.5 px-4 w-16">ID</th>
              <th className="py-2.5 px-4">Action</th>
              <th className="py-2.5 px-4">Target Entity</th>
              <th className="py-2.5 px-4">Origin IP</th>
              <th className="py-2.5 px-4">Timestamp (UTC)</th>
              <th className="py-2.5 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                    <span>Loading audit trail...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No administrative actions matching query found.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedRowId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        #{log.id}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {log.entity_type ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase bg-white/5 border border-white/10 text-slate-400">
                              {log.entity_type}
                            </span>
                            {log.entity_id && (
                              <span className="font-mono text-slate-200">
                                {log.entity_id}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {log.ip_address || 'local / internal'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatTimestamp(log.created_at)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-medium transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-black/40 border-b border-white/10">
                        <td colSpan={6} className="py-3 px-4">
                          <div className="p-3 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
                            <div className="text-slate-400 mb-1 text-[10px] uppercase tracking-wider">
                              Payload context:
                            </div>
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(log.details || {}, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
        <div>
          Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> (<strong>{total}</strong> operations)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
