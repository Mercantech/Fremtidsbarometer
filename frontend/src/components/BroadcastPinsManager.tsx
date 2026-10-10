import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MapPin,
  Clock,
  ShieldAlert,
  Loader2,
  X,
  GraduationCap,
  Trophy,
  Briefcase,
  BellRing,
} from 'lucide-react';
import {
  fetchAdminBroadcasts,
  createAdminBroadcast,
  deleteAdminBroadcast,
  toggleAdminBroadcast,
  getAdminErrorMessage,
} from '../services/adminApi';
import type { AdminBroadcastPin, CreateBroadcastPinPayload } from '../services/adminApi';

const LOCATION_PRESETS = [
  { name: 'Viborg (Mercantec Campus)', lat: 56.4532, lng: 9.4020 },
  { name: 'Silkeborg Region', lat: 56.1697, lng: 9.5451 },
  { name: 'Aarhus Tech Hub', lat: 56.1629, lng: 10.2039 },
  { name: 'Copenhagen Capital', lat: 55.6761, lng: 12.5683 },
];

export const BroadcastPinsManager: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default +30 days
  const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const [form, setForm] = useState<CreateBroadcastPinPayload>({
    title: '',
    description: '',
    category: 'education',
    institution: 'Mercantec',
    location_name: 'Viborg (Mercantec Campus)',
    latitude: 56.4532,
    longitude: 9.4020,
    url: '',
    justification: '',
    expires_at: defaultExpiry,
  });

  const loadBroadcasts = async () => {
    try {
      setIsLoading(true);
      setFeedback(null);
      const data = await fetchAdminBroadcasts();
      setBroadcasts(data);
    } catch (err) {
      console.error('Failed to load broadcasts:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to fetch manual broadcasts'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const handleSelectPreset = (preset: typeof LOCATION_PRESETS[0]) => {
    setForm((prev) => ({
      ...prev,
      location_name: preset.name,
      latitude: preset.lat,
      longitude: preset.lng,
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.justification.trim()) {
      setFeedback({
        type: 'error',
        message: 'Title, description, and operational justification are mandatory.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);
      const created = await createAdminBroadcast({
        ...form,
        expires_at: new Date(form.expires_at).toISOString(),
      });
      setFeedback({
        type: 'success',
        message: `Broadcast pin "${created.title}" successfully published to the live 3D radar!`,
      });
      setIsModalOpen(false);
      // Reset form
      setForm({
        title: '',
        description: '',
        category: 'education',
        institution: 'Mercantec',
        location_name: 'Viborg (Mercantec Campus)',
        latitude: 56.4532,
        longitude: 9.4020,
        url: '',
        justification: '',
        expires_at: defaultExpiry,
      });
      await loadBroadcasts();
    } catch (err) {
      console.error('Failed to create broadcast:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to publish broadcast pin'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (pin: AdminBroadcastPin) => {
    try {
      setFeedback(null);
      const updated = await toggleAdminBroadcast(pin.id);
      setFeedback({
        type: 'success',
        message: updated.is_active
          ? `Broadcast #${pin.id} activated on radar.`
          : `Broadcast #${pin.id} paused from live display.`,
      });
      setBroadcasts((prev) => prev.map((p) => (p.id === pin.id ? updated : p)));
    } catch (err) {
      console.error('Failed to toggle broadcast:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to toggle broadcast state'),
      });
    }
  };

  const handleDelete = async (pin: AdminBroadcastPin) => {
    const confirmed = window.confirm(
      `Permanently delete broadcast pin "${pin.title}" from the database and radar?`
    );
    if (!confirmed) return;

    try {
      setFeedback(null);
      await deleteAdminBroadcast(pin.id);
      setFeedback({
        type: 'success',
        message: `Broadcast pin #${pin.id} deleted.`,
      });
      await loadBroadcasts();
    } catch (err) {
      console.error('Failed to delete broadcast:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to delete broadcast pin'),
      });
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'education':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
            <GraduationCap className="w-3 h-3" />
            <span>Course / Education</span>
          </span>
        );
      case 'hackathon':
        return (
          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            <span>Hackathon / Event</span>
          </span>
        );
      case 'partner_job':
        return (
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1">
            <Briefcase className="w-3 h-3" />
            <span>Partner Role</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
            <BellRing className="w-3 h-3" />
            <span>Announcement</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#14121a] border border-white/10 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Megaphone className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Mercantec Broadcast Pins
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Publish official announcements, educational course launches, and regional hackathons directly onto the 3D globe radar.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Broadcast Pin</span>
        </button>
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

      {/* ── Broadcasts List ── */}
      <div className="rounded-2xl bg-[#14121a] border border-white/10 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span>Loading broadcast pins from PostgreSQL...</span>
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <ShieldAlert className="w-8 h-8 mx-auto text-slate-500 opacity-60" />
            <p>No manual broadcast pins currently published.</p>
            <p className="text-slate-500 text-[11px]">
              Use the button above to publish an official Mercantec course or event pin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 bg-white/2">
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Broadcast Title & Scope</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Expiration & Justification</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {broadcasts.map((pin) => {
                  const isExpired = new Date(pin.expires_at) <= new Date();
                  return (
                    <tr
                      key={pin.id}
                      className={`hover:bg-white/3 transition ${
                        !pin.is_active || isExpired ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Status */}
                      <td className="py-3 px-4">
                        {isExpired ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                            Expired
                          </span>
                        ) : pin.is_active ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>Live on Radar</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            Paused
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">{getCategoryBadge(pin.category)}</td>

                      {/* Title & Scope */}
                      <td className="py-3 px-4 max-w-[280px]">
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <span className="truncate">{pin.title}</span>
                          {pin.url && (
                            <a
                              href={pin.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-500 hover:text-emerald-400 transition"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {pin.description}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center gap-1 font-semibold">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{pin.location_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                        </div>
                      </td>

                      {/* Expiration & Justification */}
                      <td className="py-3 px-4 max-w-[240px]">
                        <div className="flex items-center gap-1 text-[11px] text-slate-300 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Expires: {new Date(pin.expires_at).toLocaleDateString()}</span>
                        </div>
                        <div
                          className="text-[10px] text-slate-400 truncate italic mt-0.5"
                          title={pin.justification}
                        >
                          "{pin.justification}"
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggle(pin)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                              pin.is_active
                                ? 'bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border-white/10'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {pin.is_active ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(pin)}
                            className="p-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                            title="Delete broadcast"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Modal with Explicit Guidance & Justification ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#181622] border border-white/15 p-6 shadow-2xl space-y-5 text-xs text-slate-200">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create Official Broadcast Pin</h3>
                  <p className="text-[11px] text-slate-400">
                    High-priority announcement displayed on the global 3D radar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanatory Policy Notice */}
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-200 leading-relaxed space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-300">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Moderation Policy & Radar Integrity</span>
              </span>
              <p>
                Broadcast pins are displayed globally to all website visitors. Use this form exclusively for verified educational programs, campus initiatives, hackathons, and certified vacancies. Every publication requires an operational justification to prevent clutter.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Category */}
              <div className="space-y-1">
                <label className="font-semibold text-white block">Broadcast Category:</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as CreateBroadcastPinPayload['category'] })
                  }
                  className="w-full bg-[#12111a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="education">🎓 Education & Course Launch (Mercantec)</option>
                  <option value="hackathon">🏆 Tech Hackathon & Regional Event</option>
                  <option value="partner_job">💼 Direct Partner Vacancy / Apprenticeship</option>
                  <option value="announcement">📢 Institutional Announcement</option>
                </select>
              </div>

              {/* Title & Organization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-white block">Broadcast Title:</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. AI Engineering Vocational Track 2027"
                    className="w-full bg-[#12111a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-white block">Issuing Organization:</label>
                  <input
                    type="text"
                    required
                    value={form.institution}
                    onChange={(e) => setForm({ ...form, institution: e.target.value })}
                    placeholder="e.g. Mercantec Tech Campus"
                    className="w-full bg-[#12111a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-white block">Announcement Body / Description:</label>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed context about the course, prerequisites, dates, or partner role..."
                  className="w-full bg-[#12111a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              {/* Location Presets & Coordinates */}
              <div className="space-y-2 p-3.5 rounded-xl bg-black/30 border border-white/10">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-white">Campus & Geographical Location:</label>
                  <span className="text-[10px] text-slate-400">Quick Danish Presets</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LOCATION_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] transition cursor-pointer font-medium ${
                        form.location_name === preset.name
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Location Label:</label>
                    <input
                      type="text"
                      value={form.location_name}
                      onChange={(e) => setForm({ ...form, location_name: e.target.value })}
                      className="w-full bg-[#12111a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Latitude:</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#12111a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Longitude:</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#12111a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* URL & Expiration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-white block">External Link (Optional):</label>
                  <input
                    type="url"
                    value={form.url || ''}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://mercantec.dk/education/..."
                    className="w-full bg-[#12111a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-white block">Automatic Expiration Date:</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full bg-[#12111a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              {/* Mandatory Operational Justification */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <span className="text-emerald-400">★</span>
                    <span>Operational Purpose / Justification (Mandatory):</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Required for moderation audit</span>
                </div>
                <input
                  type="text"
                  required
                  value={form.justification}
                  onChange={(e) => setForm({ ...form, justification: e.target.value })}
                  placeholder="Explain why this pin is broadcast (e.g. Official launch of Q1 2027 vocational AI curriculum approved by faculty)"
                  className="w-full bg-[#12111a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
                <span className="text-[10px] text-slate-400 block leading-tight">
                  This explanation is logged into the audit record to ensure every broadcast pin has an authentic institutional purpose.
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Publish to 3D Radar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
