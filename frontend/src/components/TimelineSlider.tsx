import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { t } from '../utils/translations';
import { motion } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, BookOpen } from 'lucide-react';

interface DecadeOption {
  label: string;
  anchor: number;
  min: number;
  max: number;
  icon: string;
}

const DECADES: DecadeOption[] = [
  { label: "'60s", anchor: 1964, min: 1960, max: 1969, icon: '📼' },
  { label: "'70s", anchor: 1972, min: 1970, max: 1979, icon: '📟' },
  { label: "'80s", anchor: 1981, min: 1980, max: 1989, icon: '💾' },
  { label: "'90s", anchor: 1995, min: 1990, max: 1999, icon: '🌐' },
  { label: "'00s", anchor: 2008, min: 2000, max: 2009, icon: '📱' },
  { label: "'10s", anchor: 2018, min: 2010, max: 2019, icon: '☁️' },
  { label: "'20s", anchor: 2026, min: 2020, max: 2029, icon: '🤖' },
  { label: "'30s+", anchor: 2035, min: 2030, max: 2035, icon: '🔮' },
];

const MAJOR_TICKS = [1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025, 2030, 2035];

export const TimelineSlider: React.FC = () => {
  const currentYear = useStore((s) => s.currentYear);
  const currentEraIndex = useStore((s) => s.currentEraIndex);
  const setCurrentYear = useStore((s) => s.setCurrentYear);
  const eras = useStore((s) => s.eras);
  const trendsHistory = useStore((s) => s.trendsHistory);
  const lang = useStore((s) => s.lang);
  const setIsDossierOpen = useStore((s) => s.setIsDossierOpen);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playTimerRef = useRef<number | null>(null);

  const era = eras[currentEraIndex];

  // Auto-Play timer effect
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = window.setInterval(() => {
        const next = currentYear >= 2035 ? 1960 : currentYear + 1;
        setCurrentYear(next);
      }, 1200);
    } else {
      if (playTimerRef.current !== null) {
        window.clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }
    return () => {
      if (playTimerRef.current !== null) {
        window.clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, currentYear, setCurrentYear]);

  // Keyboard navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentYear(Math.max(1960, currentYear - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentYear(Math.min(2035, currentYear + 1));
      } else if (e.key === ' ') {
        // Spacebar toggles auto-play
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentYear, setCurrentYear]);

  // Top tech trends for active year
  const yearTrends = trendsHistory.find((h) => h.year === currentYear);
  const topTechList = yearTrends?.data
    ? [...yearTrends.data]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 3)
    : [];

  const eraTitle = lang === 'da' ? (era?.stats?.title_da as string || era?.title) : era?.title;
  const eraTagline = lang === 'da' ? (era?.stats?.tagline_da as string || era?.stats?.tagline as string || era?.subtitle) : (era?.stats?.tagline as string || era?.subtitle);
  const eraIcon = (era?.stats?.icon as string) || (currentYear < 1970 ? '📼' : currentYear < 1980 ? '📟' : currentYear < 1990 ? '💾' : currentYear < 2008 ? '🌐' : currentYear < 2018 ? '📱' : currentYear < 2026 ? '☁️' : currentYear < 2035 ? '🤖' : '🔮');
  const moodColor = (era?.stats?.moodColor as string) || (currentYear < 1970 ? '#e6a23c' : currentYear < 1980 ? '#00d4aa' : currentYear < 1990 ? '#4facfe' : currentYear < 2010 ? '#ff8c00' : currentYear < 2020 ? '#a855f7' : currentYear < 2030 ? '#ff2a85' : '#38ef7d');

  const progressPercent = ((currentYear - 1960) / (2035 - 1960)) * 100;

  return (
    <div className="absolute top-5 right-6 z-20 flex flex-col gap-2.5 w-[clamp(540px,50vw,820px)] pointer-events-auto select-none">
      {/* ── Top Level: Floating Era Capsule HUD ── */}
      <motion.div
        layout
        className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#121018]/85 border border-white/10 shadow-2xl backdrop-blur-xl"
        style={{ borderColor: `${moodColor}40` }}
      >
        {/* Left: Era Icon, Year & Title */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md border border-white/10 shrink-0"
            style={{ background: `${moodColor}20`, borderColor: `${moodColor}50` }}
          >
            {eraIcon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: `${moodColor}25`, color: moodColor }}>
                {currentYear}
              </span>
              <span className="text-xs text-white/50 hidden sm:inline">
                {era?.year ? `Era ${era.year}` : ''}
              </span>
              <span className="text-xs font-bold text-white tracking-wide truncate max-w-[200px] md:max-w-[280px]">
                {eraTitle || t('loading', lang)}
              </span>
            </div>
            {eraTagline && (
              <p className="text-[11px] text-white/60 truncate max-w-[260px] md:max-w-[360px] mt-0.5 italic">
                {eraTagline}
              </p>
            )}
          </div>
        </div>

        {/* Center/Right: Top Tech Chips & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {topTechList.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 mr-2">
              <span className="text-[10px] uppercase font-mono text-white/40">
                {t('leadingTech', lang)}:
              </span>
              {topTechList.map((tItem) => (
                <span
                  key={tItem.technology}
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-amber-300 border border-white/5"
                >
                  {tItem.technology}
                </span>
              ))}
            </div>
          )}

          {/* Return to Present (2026) Quick Button */}
          {currentYear !== 2026 && (
            <button
              onClick={() => setCurrentYear(2026)}
              className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
              title={t('returnToPresent', lang)}
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">2026</span>
            </button>
          )}

          {/* Dossier Modal Trigger */}
          <button
            onClick={() => setIsDossierOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title={t('eraDossier', lang)}
          >
            <BookOpen size={13} />
            <span className="hidden sm:inline">{t('eraDossier', lang)}</span>
          </button>

          {/* Auto-Play Toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              isPlaying
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30 font-bold'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isPlaying ? t('pauseTour', lang) : t('playTour', lang)}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
          </button>
        </div>
      </motion.div>

      {/* ── Two-Tier Slider Control Box ── */}
      <div className="p-3 rounded-2xl bg-[#121018]/85 border border-white/10 shadow-2xl backdrop-blur-xl flex flex-col gap-2">
        {/* Tier 1: Quick Jump Decades Bar */}
        <div className="flex items-center justify-between gap-1 px-1">
          {DECADES.map((dec) => {
            const isDecadeActive = currentYear >= dec.min && currentYear <= dec.max;
            return (
              <button
                key={dec.label}
                onClick={() => setCurrentYear(dec.anchor)}
                className={`relative px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                  isDecadeActive
                    ? 'text-white shadow-md'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }`}
                style={
                  isDecadeActive
                    ? {
                        background: `${moodColor}30`,
                        border: `1px solid ${moodColor}70`,
                        color: moodColor,
                        boxShadow: `0 0 12px ${moodColor}40`,
                      }
                    : { border: '1px solid transparent' }
                }
              >
                <span className="text-[11px]">{dec.icon}</span>
                <span>{dec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tier 2: Interactive Scrubber Bar with Step Buttons */}
        <div className="flex items-center gap-2 px-1 pt-1">
          {/* Step Back -1Y */}
          <button
            onClick={() => setCurrentYear(Math.max(1960, currentYear - 1))}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors shrink-0"
            title={t('prevYear', lang)}
          >
            <ChevronLeft size={14} />
          </button>

          {/* Slider Runway */}
          <div className="relative flex-1 flex items-center h-8">
            {/* Background Track */}
            <div className="absolute inset-x-0 h-2 rounded-full bg-white/10 overflow-hidden">
              {/* Gradient Progress Fill */}
              <div
                className="h-full transition-all duration-150"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, #e6a23c 0%, #00d4aa 20%, #4facfe 40%, #ff8c00 60%, #00d4ff 75%, #ff2a85 90%, #38ef7d 100%)`,
                }}
              />
            </div>

            {/* Native HTML Range Input for accessibility and full drag reliability */}
            <input
              type="range"
              min={1960}
              max={2035}
              step={1}
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
              aria-label={t('timeTravel', lang)}
            />

            {/* Custom Glowing Thumb Marker */}
            <div
              className="absolute pointer-events-none -translate-x-1/2 z-10 transition-all duration-75"
              style={{ left: `${progressPercent}%` }}
            >
              <div
                className="w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse"
                style={{
                  background: moodColor,
                  boxShadow: `0 0 16px ${moodColor}, 0 2px 6px rgba(0,0,0,0.6)`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-black/60" />
              </div>
            </div>
          </div>

          {/* Step Forward +1Y */}
          <button
            onClick={() => setCurrentYear(Math.min(2035, currentYear + 1))}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors shrink-0"
            title={t('nextYear', lang)}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Fisheye Magnified Year Ruler */}
        <div className="flex justify-between items-center px-2 pt-1 font-mono text-[10px] text-white/40">
          {MAJOR_TICKS.map((tickYear) => {
            const diff = Math.abs(tickYear - currentYear);
            const isExact = tickYear === currentYear;
            const isNear = diff <= 2;
            const isMedium = diff <= 5;

            // Fisheye scale factor & style
            const scale = isExact ? 1.45 : isNear ? 1.2 : isMedium ? 1.05 : 0.95;
            const opacity = isExact ? 1 : isNear ? 0.95 : isMedium ? 0.7 : 0.4;
            const fontWeight = isExact ? 900 : isNear ? 700 : 500;
            const color = isExact ? moodColor : isNear ? '#fff' : 'inherit';

            return (
              <span
                key={tickYear}
                onClick={() => setCurrentYear(tickYear)}
                className="cursor-pointer transition-all duration-200 select-none hover:text-white relative flex flex-col items-center"
                style={{
                  transform: `scale(${scale})`,
                  opacity,
                  fontWeight,
                  color,
                }}
              >
                <span>{tickYear}</span>
                {isExact && (
                  <span
                    className="w-1 h-1 rounded-full mt-0.5"
                    style={{ background: moodColor }}
                  />
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
