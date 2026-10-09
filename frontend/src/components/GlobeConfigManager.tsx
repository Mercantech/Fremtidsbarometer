import React, { useState, useEffect } from 'react';
import {
  Globe,
  Clock,
  Layers,
  Flame,
  DollarSign,
  PauseCircle,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  fetchAdminGlobeConfig,
  updateAdminGlobeConfig,
  getAdminErrorMessage,
} from '../services/adminApi';
import type { AdminGlobeConfig } from '../services/adminApi';
import { useStore, DEFAULT_GLOBE_CONFIG } from '../store/useStore';

export const GlobeConfigManager: React.FC = () => {
  const setStoreGlobeConfig = useStore((s) => s.setGlobeConfig);

  const [config, setConfig] = useState<AdminGlobeConfig>(DEFAULT_GLOBE_CONFIG);
  const [initialConfig, setInitialConfig] = useState<AdminGlobeConfig>(DEFAULT_GLOBE_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      setFeedback(null);
      const data = await fetchAdminGlobeConfig();
      setConfig(data);
      setInitialConfig(data);
      setStoreGlobeConfig(data);
    } catch (err) {
      console.error('Failed to load globe config:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to load 3D Radar settings'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setFeedback(null);
      const updated = await updateAdminGlobeConfig(config);
      setConfig(updated);
      setInitialConfig(updated);
      setStoreGlobeConfig(updated);
      setFeedback({
        type: 'success',
        message: '3D Radar settings saved successfully and applied in real time!',
      });
      setTimeout(() => setFeedback(null), 4500);
    } catch (err) {
      console.error('Failed to save globe config:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to save settings'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_GLOBE_CONFIG);
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(initialConfig);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading 3D Radar configuration...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-blue-950/40 border border-white/10 p-6 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Intelligent 3D Radar Engine</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage globe pin density, dynamic batch rotation, and prioritization algorithm.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
              title="Restore recommended default settings"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Defaults</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-lg ${
                hasChanges
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 border border-blue-400/30'
                  : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl border flex items-center gap-2.5 text-xs transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Batch Rotation Duration */}
        <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5 backdrop-blur-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Batch Display Duration</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-300 font-mono text-xs font-semibold">
                {config.batch_rotation_seconds}s
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              How many seconds each batch of pins remains visible on the globe before cycling. 12–18s is optimal for comfortable reading.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <input
              type="range"
              min={6}
              max={45}
              step={1}
              value={config.batch_rotation_seconds}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  batch_rotation_seconds: parseInt(e.target.value, 10),
                }))
              }
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Fast (6s)</span>
              <span>Optimal (15s)</span>
              <span>Slow (45s)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Screen Density Cap */}
        <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5 backdrop-blur-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Display Density (Pin Limit)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 font-mono text-xs font-semibold">
                {config.max_visible_pins} pins
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Maximum simultaneous visible pins on the globe. Prevents visual clutter across Denmark and Europe.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <input
              type="range"
              min={6}
              max={24}
              step={1}
              value={config.max_visible_pins}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  max_visible_pins: parseInt(e.target.value, 10),
                }))
              }
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Min (6)</span>
              <span>Standard (14)</span>
              <span>Max (24)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Content Splitter (Hype vs Jobs) */}
        <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5 backdrop-blur-md md:col-span-2 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Content Balance: Hype Trends vs Vacancies</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-300 font-mono text-xs font-semibold border border-pink-500/20">
                  {config.hype_ratio}% Trends
                </span>
                <span className="text-slate-600">:</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 font-mono text-xs font-semibold border border-blue-500/20">
                  {100 - config.hype_ratio}% Jobs
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Batch ratio between emerging community tech trends (magenta pins) and live market vacancies (cyan pins).
            </p>
          </div>

          {/* Visual split progress bar */}
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-pink-600 to-rose-500 transition-all duration-300"
              style={{ width: `${config.hype_ratio}%` }}
              title={`Trends: ${config.hype_ratio}%`}
            />
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300"
              style={{ width: `${100 - config.hype_ratio}%` }}
              title={`Vacancies: ${100 - config.hype_ratio}%`}
            />
          </div>

          <div className="space-y-2">
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={config.hype_ratio}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  hype_ratio: parseInt(e.target.value, 10),
                }))
              }
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span className="text-pink-400">More Trends (90%)</span>
              <span>Balanced (50/50)</span>
              <span className="text-blue-400">More Jobs (90%)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Toggles Section */}
        <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5 backdrop-blur-md md:col-span-2 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Smart Filters & UI Behavior
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Toggle 1: Prioritize Salary */}
            <div
              onClick={() =>
                setConfig((prev) => ({ ...prev, prioritize_salary: !prev.prioritize_salary }))
              }
              className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-white">Prioritize Salaries</span>
                </div>
                {/* Switch indicator */}
                <div
                  className={`w-10 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                    config.prioritize_salary ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Vacancies with transparent salary disclosures are prioritized in the initial batches.
              </p>
            </div>

            {/* Toggle 2: Prioritize Trending Tech */}
            <div
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  prioritize_trending_tech: !prev.prioritize_trending_tech,
                }))
              }
              className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <Flame className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-white">Hot AI/ML Stack</span>
                </div>
                {/* Switch indicator */}
                <div
                  className={`w-10 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                    config.prioritize_trending_tech ? 'bg-rose-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Postings featuring AI, LLM, Agents, Rust, or CUDA are tagged Hot 🔥 and given higher weight.
              </p>
            </div>

            {/* Toggle 3: Pause on Hover */}
            <div
              onClick={() =>
                setConfig((prev) => ({ ...prev, pause_on_hover: !prev.pause_on_hover }))
              }
              className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <PauseCircle className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-white">Pause on Hover</span>
                </div>
                {/* Switch indicator */}
                <div
                  className={`w-10 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                    config.pause_on_hover ? 'bg-blue-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Freezes the rotation timer when hovering over a pin or manually rotating the globe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
