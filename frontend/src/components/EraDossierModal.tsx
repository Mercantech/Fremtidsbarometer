import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { t } from '../utils/translations';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Award, Cpu, Briefcase, Newspaper } from 'lucide-react';
import type { EraMilestone, EraChronicleItem } from '../services/api';

type DossierTab = 'milestones' | 'roles' | 'stack' | 'chronicle';

export const EraDossierModal: React.FC = () => {
  const isDossierOpen = useStore((s) => s.isDossierOpen);
  const setIsDossierOpen = useStore((s) => s.setIsDossierOpen);
  const currentYear = useStore((s) => s.currentYear);
  const currentEraIndex = useStore((s) => s.currentEraIndex);
  const eras = useStore((s) => s.eras);
  const lang = useStore((s) => s.lang);

  const [activeTab, setActiveTab] = useState<DossierTab>('milestones');

  const era = eras[currentEraIndex];
  if (!isDossierOpen || !era) return null;

  const eraTitle = lang === 'da' ? (era.stats?.title_da as string || era.title) : era.title;
  const eraSubtitle = lang === 'da' ? (era.stats?.subtitle_da as string || era.subtitle) : era.subtitle;
  const eraTagline = lang === 'da' ? (era.stats?.tagline_da as string || era.stats?.tagline as string) : (era.stats?.tagline as string);
  const eraIcon = (era.stats?.icon as string) || '⏳';
  const moodColor = (era.stats?.moodColor as string) || '#00d4ff';

  const milestones: EraMilestone[] = (era.stats?.milestones as EraMilestone[]) || [];
  const chronicle: EraChronicleItem[] = (era.stats?.chronicle as EraChronicleItem[]) || [];
  const roles = (era.stats?.roles as string[][]) || [];
  const stack = (era.stats?.stack as string[][]) || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsDossierOpen(false)}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-3xl max-h-[85vh] bg-[#14121a]/95 text-white border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl"
          style={{ borderColor: `${moodColor}40` }}
        >
          {/* Top Glow Stripe */}
          <div
            className="h-1.5 w-full"
            style={{ background: `linear-gradient(90deg, ${moodColor}, #ff2a85, #ffd000)` }}
          />

          {/* Modal Header */}
          <div className="p-6 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-white/10"
                style={{ background: `${moodColor}20`, borderColor: `${moodColor}60` }}
              >
                {eraIcon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${moodColor}25`, color: moodColor, border: `1px solid ${moodColor}50` }}
                  >
                    ERA {era.year} • {currentYear}
                  </span>
                  <span className="text-xs text-white/50">{eraSubtitle}</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight mt-1 text-white flex items-center gap-2">
                  {eraTitle}
                </h2>
                {eraTagline && (
                  <p className="text-sm text-white/70 mt-1 max-w-xl italic">
                    "{eraTagline}"
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsDossierOpen(false)}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title={t('close', lang)}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 bg-white/5 px-6 gap-2 pt-2">
            <button
              onClick={() => setActiveTab('milestones')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'milestones'
                  ? 'border-cyan-400 text-cyan-300 bg-white/5'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <Award size={14} />
              {t('keyMilestones', lang)} ({milestones.length})
            </button>

            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'roles'
                  ? 'border-cyan-400 text-cyan-300 bg-white/5'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <Briefcase size={14} />
              {t('roles', lang)} ({roles.length})
            </button>

            <button
              onClick={() => setActiveTab('stack')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'stack'
                  ? 'border-cyan-400 text-cyan-300 bg-white/5'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <Cpu size={14} />
              {t('stack', lang)} ({stack.length})
            </button>

            <button
              onClick={() => setActiveTab('chronicle')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'chronicle'
                  ? 'border-cyan-400 text-cyan-300 bg-white/5'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <Newspaper size={14} />
              {t('archiveMode', lang)} ({chronicle.length})
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-6 overflow-y-auto max-h-[50vh] space-y-4">
            {/* 1. Milestones */}
            {activeTab === 'milestones' && (
              <div className="space-y-3">
                {milestones.length === 0 ? (
                  <p className="text-white/40 text-sm">{t('noData', lang)}</p>
                ) : (
                  milestones.map((m, idx) => {
                    const mTitle = lang === 'da' ? m.title_da || m.title : m.title;
                    const mDesc = lang === 'da' ? m.desc_da || m.desc : m.desc;
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all flex items-start gap-4"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0"
                          style={{ background: `${moodColor}25`, color: moodColor }}
                        >
                          {m.year || era.year}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                            {mTitle}
                          </h4>
                          <p className="text-xs text-white/70 mt-1 leading-relaxed">
                            {mDesc}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 2. Roles */}
            {activeTab === 'roles' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roles.map((r, idx) => {
                  const roleTitle = r[0];
                  const badge = r[1];
                  const desc = lang === 'da' ? r[3] || r[2] : r[2];
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-semibold text-sm text-white">{roleTitle}</span>
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold uppercase"
                          style={{ background: `${moodColor}20`, color: moodColor }}
                        >
                          {badge}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">{desc}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. Tech Stack */}
            {activeTab === 'stack' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stack.map((s, idx) => {
                  const techName = s[0];
                  const tag = s[1];
                  const desc = lang === 'da' ? s[3] || s[2] : s[2];
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-pink-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-semibold text-sm text-white flex items-center gap-1.5">
                          <Cpu size={14} className="text-cyan-400" />
                          {techName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold uppercase bg-white/10 text-white/80">
                          {tag}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">{desc}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Chronicle Headlines */}
            {activeTab === 'chronicle' && (
              <div className="space-y-3">
                {chronicle.map((item, idx) => {
                  const headline = lang === 'da' ? item.headline_da || item.headline : item.headline;
                  const snippet = lang === 'da' ? item.snippet_da || item.snippet : item.snippet;
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all flex items-start gap-4"
                    >
                      <div className="flex flex-col items-center justify-center w-12 shrink-0 text-center">
                        <span className="text-xs font-mono font-bold text-white/80">{item.year}</span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 mt-1 rounded bg-white/10 text-cyan-300">
                          {item.tag}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-white mb-1">{headline}</h4>
                        <p className="text-xs text-white/70 leading-relaxed">{snippet}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-white/60">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: moodColor }} />
              <span>{era.stats?.hypeTopic as string || eraTitle}</span>
            </div>
            <button
              onClick={() => setIsDossierOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            >
              {t('closeDossier', lang)}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
