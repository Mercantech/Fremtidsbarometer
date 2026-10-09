import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { t } from '../utils/translations';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Cpu, Briefcase, Newspaper } from 'lucide-react';
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
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window (Apple HIG Laconic Design) */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-2xl max-h-[82vh] bg-[#16151c]/95 text-white border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#ffd000] text-[#111]">
                  {currentYear}
                </span>
                <span className="text-xs text-white/50">{eraSubtitle}</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight mt-1 text-white font-['Bebas_Neue',sans-serif] tracking-wider text-2xl">
                {eraTitle}
              </h2>
              {eraTagline && (
                <p className="text-xs text-white/60 mt-1 max-w-lg leading-relaxed">
                  {eraTagline}
                </p>
              )}
            </div>

            <button
              onClick={() => setIsDossierOpen(false)}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={t('close', lang)}
            >
              <X size={18} />
            </button>
          </div>

          {/* Segmented Control Tabs */}
          <div className="flex border-b border-white/10 bg-black/20 px-6 gap-2 pt-2">
            <button
              onClick={() => setActiveTab('milestones')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                activeTab === 'milestones'
                  ? 'border-[#ffd000] text-[#ffd000]'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <Award size={13} />
              <span>{t('keyMilestones', lang)}</span>
            </button>

            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                activeTab === 'roles'
                  ? 'border-[#ffd000] text-[#ffd000]'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <Briefcase size={13} />
              <span>{t('roles', lang)}</span>
            </button>

            <button
              onClick={() => setActiveTab('stack')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                activeTab === 'stack'
                  ? 'border-[#ffd000] text-[#ffd000]'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <Cpu size={13} />
              <span>{t('stack', lang)}</span>
            </button>

            <button
              onClick={() => setActiveTab('chronicle')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                activeTab === 'chronicle'
                  ? 'border-[#ffd000] text-[#ffd000]'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <Newspaper size={13} />
              <span>{t('archiveMode', lang)}</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto max-h-[48vh] space-y-3">
            {/* 1. Milestones */}
            {activeTab === 'milestones' && (
              <div className="space-y-2.5">
                {milestones.map((m, idx) => {
                  const mTitle = lang === 'da' ? m.title_da || m.title : m.title;
                  const mDesc = lang === 'da' ? m.desc_da || m.desc : m.desc;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3"
                    >
                      <span className="font-mono text-xs font-bold text-[#ffd000] shrink-0 mt-0.5">
                        {m.year || era.year}
                      </span>
                      <div>
                        <h4 className="font-semibold text-white text-xs">{mTitle}</h4>
                        <p className="text-[11px] text-white/60 mt-1 leading-relaxed">{mDesc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Roles */}
            {activeTab === 'roles' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {roles.map((r, idx) => {
                  const roleTitle = r[0];
                  const badge = r[1];
                  const desc = lang === 'da' ? r[3] || r[2] : r[2];
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-xs text-white">{roleTitle}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                          {badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed">{desc}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. Tech Stack */}
            {activeTab === 'stack' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {stack.map((s, idx) => {
                  const techName = s[0];
                  const tag = s[1];
                  const desc = lang === 'da' ? s[3] || s[2] : s[2];
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-xs text-white">{techName}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ffd000]/10 text-[#ffd000]">
                          {tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed">{desc}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Chronicle */}
            {activeTab === 'chronicle' && (
              <div className="space-y-2.5">
                {chronicle.map((item, idx) => {
                  const headline = lang === 'da' ? item.headline_da || item.headline : item.headline;
                  const snippet = lang === 'da' ? item.snippet_da || item.snippet : item.snippet;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3"
                    >
                      <span className="font-mono text-xs font-bold text-white/80 shrink-0 mt-0.5">
                        {item.year}
                      </span>
                      <div>
                        <h4 className="font-semibold text-xs text-white">{headline}</h4>
                        <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">{snippet}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 px-6 border-t border-white/10 bg-black/20 flex items-center justify-end">
            <button
              onClick={() => setIsDossierOpen(false)}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              {t('closeDossier', lang)}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
