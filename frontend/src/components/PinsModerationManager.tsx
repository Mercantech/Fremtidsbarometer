import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Search,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Flame,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react';
import {
  fetchAdminPins,
  toggleHidePin,
  unhideAllPins,
  bulkTogglePins,
  getAdminErrorMessage,
} from '../services/adminApi';
import type { AdminPinItem, AdminPinsResponse } from '../services/adminApi';

export const PinsModerationManager: React.FC = () => {
  const [data, setData] = useState<AdminPinsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [pinType, setPinType] = useState<string>(''); // '' | 'job' | 'hype'
  const [onlyHidden, setOnlyHidden] = useState(false);

  // Multi-select state
  const [selectedPinIds, setSelectedPinIds] = useState<string[]>([]);
  const [isBulkToggling, setIsBulkToggling] = useState(false);

  const loadPins = useCallback(async () => {
    try {
      setIsLoading(true);
      setFeedback(null);
      const res = await fetchAdminPins({
        page,
        limit,
        search: search.trim() || undefined,
        type: pinType || undefined,
        only_hidden: onlyHidden,
      });
      setData(res);
      setSelectedPinIds([]);
    } catch (err) {
      console.error('Failed to load pins:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to fetch radar pins for moderation'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, pinType, onlyHidden]);

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  const handleToggleHide = async (pin: AdminPinItem) => {
    try {
      setFeedback(null);
      const res = await toggleHidePin(pin.id);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          hidden_count: res.total_hidden,
          items: prev.items.map((item) =>
            item.id === pin.id ? { ...item, is_hidden: res.is_hidden } : item
          ),
        };
      });
      setFeedback({
        type: 'success',
        message: res.is_hidden
          ? `Pin "${pin.title.slice(0, 30)}..." hidden from public 3D radar.`
          : `Pin "${pin.title.slice(0, 30)}..." restored to public radar.`,
      });
    } catch (err) {
      console.error('Failed to toggle pin visibility:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to update pin visibility'),
      });
    }
  };

  const handleUnhideAll = async () => {
    const confirmed = window.confirm(
      'Restore all hidden pins so they appear on the 3D radar again?'
    );
    if (!confirmed) return;

    try {
      setFeedback(null);
      await unhideAllPins();
      setFeedback({ type: 'success', message: 'All pins have been restored to visible status.' });
      await loadPins();
    } catch (err) {
      console.error('Failed to unhide all pins:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to restore pins'),
      });
    }
  };

  // ── Multi-select handlers ──
  const toggleSelectAll = () => {
    if (!data?.items) return;
    const currentPageIds = data.items.map((p) => p.id);
    const allSelected = currentPageIds.every((id) => selectedPinIds.includes(id));
    if (allSelected) {
      setSelectedPinIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedPinIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedPinIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkToggle = async (action: 'hide' | 'unhide') => {
    if (selectedPinIds.length === 0) return;
    try {
      setIsBulkToggling(true);
      setFeedback(null);
      const res = await bulkTogglePins(selectedPinIds, action);
      setFeedback({
        type: 'success',
        message: `Successfully ${action === 'hide' ? 'hidden' : 'restored'} ${res.affected_count} pins on the 3D radar.`,
      });
      setSelectedPinIds([]);
      await loadPins();
    } catch (err) {
      console.error('Failed to bulk toggle pins:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Bulk pin operation failed'),
      });
    } finally {
      setIsBulkToggling(false);
    }
  };

  const isCurrentPageAllSelected =
    data?.items && data.items.length > 0 && data.items.every((p) => selectedPinIds.includes(p.id));

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#14121a] border border-white/10 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Radio className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Live Radar Pins Moderation</h2>
          </div>
          <p className="text-xs text-slate-400">
            Control which items appear on the 3D globe and 2D map. Instantly suppress noisy, inaccurate or outdated AI pins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {data && data.hidden_count > 0 && (
            <button
              onClick={handleUnhideAll}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Unhide All ({data.hidden_count})</span>
            </button>
          )}
          <div className="px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-xs font-mono font-bold">
            {data ? `${data.total} total indexed` : 'Connecting...'}
          </div>
        </div>
      </div>

      {/* ── Feedback Notice ── */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ── Filters & Search Toolbar ── */}
      <div className="p-4 rounded-2xl bg-[#14121a] border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by topic, title, company, or city..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Type Segmented Buttons */}
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => {
                setPinType('');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                pinType === '' ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => {
                setPinType('job');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                pinType === 'job' ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              💼 Jobs
            </button>
            <button
              onClick={() => {
                setPinType('hype');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                pinType === 'hype' ? 'bg-pink-500/30 text-pink-200 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              🔥 Hype
            </button>
          </div>

          {/* Only Hidden Filter */}
          <button
            onClick={() => {
              setOnlyHidden(!onlyHidden);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer font-medium ${
              onlyHidden
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Hidden Only</span>
          </button>
        </div>
      </div>

      {/* ── Floating Action Bar for Selected Pins ── */}
      {selectedPinIds.length > 0 && (
        <div className="p-3.5 px-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-4 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30">
              {selectedPinIds.length} selected
            </span>
            <span className="text-slate-300">Pins chosen for bulk moderation</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedPinIds([])}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              Deselect All
            </button>
            <button
              onClick={() => handleBulkToggle('hide')}
              disabled={isBulkToggling}
              className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-600/20"
            >
              {isBulkToggling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              <span>Hide Selected ({selectedPinIds.length})</span>
            </button>
            <button
              onClick={() => handleBulkToggle('unhide')}
              disabled={isBulkToggling}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              {isBulkToggling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <span>Show Selected ({selectedPinIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Table of Pins ── */}
      <div className="rounded-2xl bg-[#14121a] border border-white/10 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span>Loading pins from database...</span>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <ShieldAlert className="w-8 h-8 mx-auto text-slate-500 opacity-60" />
            <p>No pins found matching your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 bg-white/2">
                  <th className="py-3 px-4 w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-white transition cursor-pointer"
                      title={isCurrentPageAllSelected ? 'Deselect all' : 'Select all on page'}
                    >
                      {isCurrentPageAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Topic / Job Title</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Details</th>
                  <th className="py-3 px-4 font-semibold text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.items.map((pin) => {
                  const isSelected = selectedPinIds.includes(pin.id);
                  return (
                    <tr
                      key={pin.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-cyan-950/20'
                          : pin.is_hidden
                          ? 'opacity-50 bg-black/20'
                          : 'hover:bg-white/3'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelectOne(pin.id)}
                          className="text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Status badge */}
                      <td className="py-3 px-4">
                        {pin.is_hidden ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <EyeOff className="w-3 h-3" />
                            <span>Hidden</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <Eye className="w-3 h-3" />
                            <span>Visible</span>
                          </span>
                        )}
                      </td>

                      {/* Type badge */}
                      <td className="py-3 px-4">
                        {pin.type === 'job' ? (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <Briefcase className="w-3 h-3" />
                            <span>Job</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-pink-950/60 text-pink-300 border border-pink-800/50 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <Flame className="w-3 h-3" />
                            <span>Hype</span>
                          </span>
                        )}
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4 font-medium text-white max-w-[280px]">
                        <div className="truncate font-semibold">{pin.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{pin.subtitle}</div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[10px]">
                          {pin.city} ({pin.country})
                        </span>
                      </td>

                      {/* Details (Salary or Score) */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {pin.salary ? (
                          <span className="text-emerald-400 font-bold">{pin.salary}</span>
                        ) : pin.score !== undefined && pin.score !== null ? (
                          <span className="text-cyan-400 font-bold">{pin.score}/100</span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleHide(pin)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ml-auto ${
                            pin.is_hidden
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border-white/10'
                          }`}
                          title={pin.is_hidden ? 'Show on radar' : 'Hide from radar'}
                        >
                          {pin.is_hidden ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Unhide</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Hide</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer ── */}
        {data && data.total_pages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page <span className="font-bold text-white">{data.page}</span> of{' '}
              <span className="font-bold text-white">{data.total_pages}</span> ({data.total} pins)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
