import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Code,
  Flame,
} from 'lucide-react';
import {
  fetchAdminEras,
  createAdminEra,
  updateAdminEra,
  deleteAdminEra,
  resetDefaultEras,
  getAdminErrorMessage,
} from '../services/adminApi';
import type { AdminEra } from '../services/adminApi';

export const ErasManager: React.FC = () => {
  const [eras, setEras] = useState<AdminEra[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit / Create Modal state
  const [editingEra, setEditingEra] = useState<AdminEra | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [formYear, setFormYear] = useState<number>(2026);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formTitleDa, setFormTitleDa] = useState<string>('');
  const [formSubtitle, setFormSubtitle] = useState<string>('');
  const [formSubtitleDa, setFormSubtitleDa] = useState<string>('');
  const [formTagline, setFormTagline] = useState<string>('');
  const [formTaglineDa, setFormTaglineDa] = useState<string>('');
  const [formIcon, setFormIcon] = useState<string>('🌐');
  const [formMoodColor, setFormMoodColor] = useState<string>('#ffd000');
  const [formHypeTopic, setFormHypeTopic] = useState<string>('');
  const [formHypeDesc, setFormHypeDesc] = useState<string>('');

  useEffect(() => {
    loadEras();
  }, []);

  const loadEras = async () => {
    try {
      setIsLoading(true);
      setFeedback(null);
      const data = await fetchAdminEras();
      setEras(data);
    } catch (err) {
      console.error('Failed to load eras:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to load eras from database'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = (era: AdminEra) => {
    setEditingEra(era);
    setIsCreating(false);
    setFormYear(era.year);
    setFormTitle(era.title);
    setFormTitleDa(era.stats?.title_da || '');
    setFormSubtitle(era.subtitle || '');
    setFormSubtitleDa(era.stats?.subtitle_da || '');
    setFormTagline(era.stats?.tagline || '');
    setFormTaglineDa(era.stats?.tagline_da || '');
    setFormIcon(era.stats?.icon || '🌐');
    setFormMoodColor(era.stats?.moodColor || '#ffd000');
    setFormHypeTopic(era.stats?.hypeTopic || '');
    setFormHypeDesc(era.stats?.hypeDesc || '');
  };

  const handleOpenCreate = () => {
    setEditingEra(null);
    setIsCreating(true);
    const highestYear = eras.length > 0 ? Math.max(...eras.map((e) => e.year)) : 2026;
    setFormYear(highestYear + 5);
    setFormTitle('');
    setFormTitleDa('');
    setFormSubtitle('');
    setFormSubtitleDa('');
    setFormTagline('');
    setFormTaglineDa('');
    setFormIcon('✨');
    setFormMoodColor('#00d4ff');
    setFormHypeTopic('');
    setFormHypeDesc('');
  };

  const handleCloseModal = () => {
    setEditingEra(null);
    setIsCreating(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFeedback({ type: 'error', message: 'Title is required' });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);

      const existingStats = editingEra?.stats || {};
      const updatedStats = {
        ...existingStats,
        title_da: formTitleDa.trim() || undefined,
        subtitle_da: formSubtitleDa.trim() || undefined,
        tagline: formTagline.trim() || undefined,
        tagline_da: formTaglineDa.trim() || undefined,
        icon: formIcon.trim() || '🌐',
        moodColor: formMoodColor.trim() || '#ffd000',
        hypeTopic: formHypeTopic.trim() || undefined,
        hypeDesc: formHypeDesc.trim() || undefined,
      };

      if (isCreating) {
        await createAdminEra({
          year: Number(formYear),
          title: formTitle.trim(),
          subtitle: formSubtitle.trim() || undefined,
          stats: updatedStats,
        });
        setFeedback({ type: 'success', message: `Era ${formYear} successfully created in database!` });
      } else if (editingEra) {
        await updateAdminEra(editingEra.id, {
          year: Number(formYear),
          title: formTitle.trim(),
          subtitle: formSubtitle.trim() || undefined,
          stats: updatedStats,
        });
        setFeedback({ type: 'success', message: `Era ${formYear} successfully updated!` });
      }

      handleCloseModal();
      await loadEras();
    } catch (err) {
      console.error('Failed to save era:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to save era to database'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (era: AdminEra) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the era "${era.year} — ${era.title}"?\nThis change cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setFeedback(null);
      await deleteAdminEra(era.id);
      setFeedback({ type: 'success', message: `Era ${era.year} deleted from database.` });
      await loadEras();
    } catch (err) {
      console.error('Failed to delete era:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to delete era'),
      });
    }
  };

  const handleResetDefaults = async () => {
    const confirmed = window.confirm(
      'Reset all eras to default historical seed data (1964–2035)?\nAny custom changes will be overwritten.'
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);
      setFeedback(null);
      await resetDefaultEras();
      setFeedback({ type: 'success', message: 'All eras successfully synchronized to default seeds.' });
      await loadEras();
    } catch (err) {
      console.error('Failed to reset eras:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to reset eras'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#14121a] border border-white/10 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Eras & Timeline CMS</h2>
          </div>
          <p className="text-xs text-slate-400">
            Dynamic database content management. No hardcoded eras — all periods, titles, and dossiers are stored in PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            title="Reset to default seed data"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Era</span>
          </button>
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

      {/* ── Eras List ── */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading eras from database...</div>
      ) : eras.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs bg-[#14121a] rounded-2xl border border-white/10">
          No eras found in database. Click &quot;Add New Era&quot; or &quot;Reset Defaults&quot; to populate.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eras.map((era) => {
            const icon = era.stats?.icon || '🌐';
            const moodColor = era.stats?.moodColor || '#ffd000';
            const rolesCount = era.stats?.roles?.length || 0;
            const stackCount = era.stats?.stack?.length || 0;

            return (
              <div
                key={era.id}
                className="p-5 rounded-2xl bg-[#14121a] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Year Pill & Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-1 rounded-lg font-mono font-black text-xs text-black shadow-xs flex items-center gap-1.5"
                        style={{ backgroundColor: moodColor }}
                      >
                        <span>{icon}</span>
                        <span>{era.year}</span>
                      </span>
                      {era.year === 2026 && (
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                          Current Anchor
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenEdit(era)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 transition cursor-pointer"
                        title="Edit era"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(era)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title="Delete era"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{era.title}</h3>
                    {era.stats?.title_da && (
                      <p className="text-xs text-slate-400 font-medium">{era.stats.title_da}</p>
                    )}
                    {era.subtitle && (
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{era.subtitle}</p>
                    )}
                  </div>

                  {/* Hype preview */}
                  {era.stats?.hypeTopic && (
                    <div className="flex items-start gap-1.5 text-xs text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 p-2.5 rounded-xl">
                      <Flame className="w-3.5 h-3.5 mt-0.5 shrink-0 text-cyan-400" />
                      <div className="min-w-0">
                        <span className="font-bold">{era.stats.hypeTopic}: </span>
                        <span className="text-slate-300 line-clamp-1">{era.stats.hypeDesc}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer metadata */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-500" />
                      <span>{rolesCount} roles</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Code className="w-3 h-3 text-slate-500" />
                      <span>{stackCount} stack items</span>
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">ID #{era.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit / Create Modal ── */}
      {(editingEra || isCreating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#181622] border border-white/15 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isCreating ? 'Create New Era' : `Edit Era ${formYear}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isCreating ? 'Add a new period to the chronological radar' : 'Update titles, translations, and theme'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Year & Icon & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Anchor Year *</label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                    required
                    min={1950}
                    max={2100}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Icon (Emoji) *</label>
                  <input
                    type="text"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-center focus:outline-none focus:border-amber-400"
                    placeholder="📼"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Theme Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formMoodColor}
                      onChange={(e) => setFormMoodColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={formMoodColor}
                      onChange={(e) => setFormMoodColor(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Title EN & DA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Title (English) *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    placeholder="Mainframe & Punch Cards"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Title (Danish)</label>
                  <input
                    type="text"
                    value={formTitleDa}
                    onChange={(e) => setFormTitleDa(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    placeholder="Hovedrammer & Hulkort"
                  />
                </div>
              </div>

              {/* Subtitle EN & DA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subtitle (English)</label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    placeholder="IBM System/360, COBOL & Apollo"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subtitle (Danish)</label>
                  <input
                    type="text"
                    value={formSubtitleDa}
                    onChange={(e) => setFormSubtitleDa(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    placeholder="IBM System/360, COBOL & Apollo"
                  />
                </div>
              </div>

              {/* Tagline EN & DA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tagline (English)</label>
                  <textarea
                    rows={2}
                    value={formTagline}
                    onChange={(e) => setFormTagline(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    placeholder="The dawn of enterprise computing and modular architecture."
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tagline (Danish)</label>
                  <textarea
                    rows={2}
                    value={formTaglineDa}
                    onChange={(e) => setFormTaglineDa(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    placeholder="Begyndelsen på virksomheds-IT og modulær arkitektur."
                  />
                </div>
              </div>

              {/* Hype Radar Content */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="block text-slate-300 font-semibold">Hype Radar Showcase Topic</label>
                <input
                  type="text"
                  value={formHypeTopic}
                  onChange={(e) => setFormHypeTopic(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  placeholder="Modular Mainframes & Space Race"
                />
                <textarea
                  rows={2}
                  value={formHypeDesc}
                  onChange={(e) => setFormHypeDesc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  placeholder="IBM invests a record $5B into System/360, while Margaret Hamilton lands Apollo 11."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save to Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
