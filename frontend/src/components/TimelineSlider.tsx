import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { t } from '../utils/translations';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, FileText } from 'lucide-react';

const DECADES = [
  { label: "'60s", anchor: 1964, min: 1960, max: 1969 },
  { label: "'70s", anchor: 1972, min: 1970, max: 1979 },
  { label: "'80s", anchor: 1981, min: 1980, max: 1989 },
  { label: "'90s", anchor: 1995, min: 1990, max: 1999 },
  { label: "'00s", anchor: 2008, min: 2000, max: 2009 },
  { label: "'10s", anchor: 2018, min: 2010, max: 2019 },
  { label: "'20s", anchor: 2026, min: 2020, max: 2029 },
  { label: "'30s+", anchor: 2035, min: 2030, max: 2035 },
];

const MAJOR_TICKS = [1960, 1970, 1980, 1990, 2000, 2010, 2020, 2035];
const MINOR_TICKS = [1965, 1975, 1985, 1995, 2005, 2015, 2026];

const MIN_YEAR = 1960;
const MAX_YEAR = 2035;
const TOTAL_SPAN = MAX_YEAR - MIN_YEAR;

export const TimelineSlider: React.FC = () => {
  const currentYear = useStore((s) => s.currentYear);
  const currentEraIndex = useStore((s) => s.currentEraIndex);
  const setCurrentYear = useStore((s) => s.setCurrentYear);
  const eras = useStore((s) => s.eras);
  const lang = useStore((s) => s.lang);
  const setIsDossierOpen = useStore((s) => s.setIsDossierOpen);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragRatio, setDragRatio] = useState<number>((currentYear - MIN_YEAR) / TOTAL_SPAN);

  const trackRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<number | null>(null);

  const era = eras[currentEraIndex];
  const eraTitle = lang === 'da' ? (era?.stats?.title_da as string || era?.title) : era?.title;

  const currentYearRef = useRef<number>(currentYear);
  useEffect(() => {
    currentYearRef.current = currentYear;
  }, [currentYear]);

  // Reliable Auto-Play Tour loop: timer runs stably without getting recreated on every year change
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current !== null) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
      return;
    }

    playTimerRef.current = window.setInterval(() => {
      const yr = currentYearRef.current;
      const next = yr >= MAX_YEAR ? MIN_YEAR : yr + 1;
      setCurrentYear(next);
    }, 1200);

    return () => {
      if (playTimerRef.current !== null) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [isPlaying, setCurrentYear]);

  // Keep dragRatio synchronized when currentYear changes externally (not while dragging)
  useEffect(() => {
    if (!isDragging) {
      setDragRatio((currentYear - MIN_YEAR) / TOTAL_SPAN);
    }
  }, [currentYear, isDragging]);

  const stopTour = useCallback(() => {
    if (playTimerRef.current !== null) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handleReturnToPresent = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    stopTour();
    setIsDragging(false);
    setDragRatio((2026 - MIN_YEAR) / TOTAL_SPAN);
    setCurrentYear(2026);
  }, [stopTour, setCurrentYear]);

  const toggleTour = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsPlaying((prev) => !prev);
  }, []);

  // Keyboard navigation (Left / Right / Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentYear(Math.max(MIN_YEAR, currentYear - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentYear(Math.min(MAX_YEAR, currentYear + 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentYear, setCurrentYear]);

  // Compute normalized continuous ratio [0..1] from pointer position
  const getRatioFromPointer = useCallback((clientX: number): number => {
    if (!trackRef.current) return (currentYear - MIN_YEAR) / TOTAL_SPAN;
    const rect = trackRef.current.getBoundingClientRect();
    const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return rect.width > 0 ? clampedX / rect.width : 0;
  }, [currentYear]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const ratio = getRatioFromPointer(e.clientX);
    setDragRatio(ratio);
    const yr = Math.round(MIN_YEAR + ratio * TOTAL_SPAN);
    setCurrentYear(yr);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const ratio = getRatioFromPointer(e.clientX);
    setDragRatio(ratio);
    const yr = Math.round(MIN_YEAR + ratio * TOTAL_SPAN);
    if (yr !== currentYear) {
      setCurrentYear(yr);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if pointer already released
    }
    setIsDragging(false);
  };

  // Continuous floating ratio while dragging for 100% fluid scrubbing; discrete ratio on idle
  const activePercent = isDragging
    ? Math.max(0, Math.min(100, dragRatio * 100))
    : ((currentYear - MIN_YEAR) / TOTAL_SPAN) * 100;

  return (
    <div className="timeline-container relative z-50 pointer-events-auto select-none">
      {/* ── Tier 1: Header Status Bar & Quick Actions ── */}
      <div className="flex items-center justify-between gap-3 h-7 pointer-events-auto">
        {/* Left: Brand + Active Year & Era Subtitle */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="timeline-badge text-xl text-[#111] shrink-0 tracking-widest">
            {t('timeTravel', lang)}
          </span>
          <span className="text-neutral-300 font-light text-xs shrink-0">•</span>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-black text-sm text-[#111] shrink-0 tracking-tight">
              {currentYear}
            </span>
            <span className="text-xs font-semibold text-neutral-600 uppercase tracking-tight truncate max-w-[180px] sm:max-w-[240px] md:max-w-[320px]">
              {eraTitle || t('loading', lang)}
            </span>
          </div>
        </div>

        {/* Right: Discrete Apple Pill Actions */}
        <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
          {/* Era Dossier Modal Button */}
          <button
            type="button"
            onClick={() => setIsDossierOpen(true)}
            className="px-2.5 py-1 rounded-full bg-black/5 hover:bg-black/10 text-[#111] border border-black/10 text-[11px] font-sans font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs pointer-events-auto"
            title={t('eraDossier', lang)}
          >
            <FileText size={11} />
            <span>{t('eraDossier', lang)}</span>
          </button>

          {/* Return to Present (2026) */}
          {currentYear !== 2026 && (
            <button
              type="button"
              onClick={handleReturnToPresent}
              className="px-2.5 py-1 rounded-full bg-[#111] hover:bg-black active:scale-95 text-[#ffd000] text-[11px] font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1 shrink-0 select-none pointer-events-auto"
              title={t('returnToPresent', lang)}
              aria-label={t('returnToPresent', lang)}
            >
              <RotateCcw size={10} className="stroke-[2.5]" />
              <span>2026</span>
            </button>
          )}

          {/* Auto-Play Tour Toggle */}
          <button
            type="button"
            onClick={toggleTour}
            className="w-6.5 h-6.5 rounded-full bg-[#111] hover:bg-black active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs select-none pointer-events-auto"
            title={isPlaying ? t('pauseTour', lang) : t('playTour', lang)}
            aria-label={isPlaying ? t('pauseTour', lang) : t('playTour', lang)}
          >
            {isPlaying ? <Pause size={10} /> : <Play size={10} className="ml-0.5" />}
          </button>
        </div>
      </div>

      {/* ── Tier 2: Apple Segmented Decades Pill Selector (100% Width, Zero Overflow) ── */}
      <div className="w-full flex items-center bg-[#111] p-0.5 rounded-full shadow-sm pointer-events-auto">
        {DECADES.map((d) => {
          const isActive = currentYear >= d.min && currentYear <= d.max;
          return (
            <button
              key={d.label}
              type="button"
              onClick={() => {
                stopTour();
                setCurrentYear(d.anchor);
              }}
              className={`flex-1 py-1 rounded-full text-[11px] font-mono tracking-tight transition-all cursor-pointer text-center pointer-events-auto ${
                isActive
                  ? 'bg-[#ffd000] text-[#111] font-extrabold shadow-2xs'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* ── Tier 3: Tactile Fluid Scrubber Runway ── */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full h-6 flex items-center cursor-pointer select-none touch-none group"
      >
        {/* Slender Track Groove */}
        <div className="w-full h-1.5 rounded-full bg-[#e4e0d7] overflow-hidden relative">
          <motion.div
            className="h-full bg-[#111] rounded-full"
            animate={{ width: `${activePercent}%` }}
            transition={
              isDragging
                ? { duration: 0 }
                : { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }
            }
          />
        </div>

        {/* Subtle Era Anchor Markers on Runway */}
        {eras.map((e) => {
          const pct = ((e.year - MIN_YEAR) / TOTAL_SPAN) * 100;
          return (
            <div
              key={e.year}
              className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2 rounded-full bg-black/15 pointer-events-none"
              style={{ left: `${pct}%` }}
            />
          );
        })}

        {/* Gliding Apple Tactile Scrubber Thumb */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-10"
          animate={{ left: `${activePercent}%` }}
          transition={
            isDragging
              ? { duration: 0 }
              : { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }
          }
        >
          <div className="w-4.5 h-4.5 rounded-full bg-[#ffd000] border-2 border-[#111] shadow-[0_2px_6px_rgba(0,0,0,0.35)] flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-125">
            <div className="w-1.5 h-1.5 rounded-full bg-[#111]" />
          </div>

          {/* Floating Glass Tooltip Bubble */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#111] text-[#ffd000] font-mono text-[10px] font-bold shadow-md pointer-events-none whitespace-nowrap border border-white/10"
              >
                {currentYear}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Tier 4: Minimalist Geometric Ruler ── */}
      <div className="relative w-full h-5 select-none font-['Bebas_Neue',sans-serif]">
        {/* Major Decade Ticks */}
        {MAJOR_TICKS.map((tickYear) => {
          const pct = ((tickYear - MIN_YEAR) / TOTAL_SPAN) * 100;
          const isExact = tickYear === currentYear;
          const diff = Math.abs(tickYear - currentYear);
          const isNear = diff <= 2;
          const transformX = tickYear === MIN_YEAR ? '0%' : tickYear === MAX_YEAR ? '-100%' : '-50%';

          return (
            <button
              key={tickYear}
              type="button"
              onClick={() => {
                stopTour();
                setCurrentYear(tickYear);
              }}
              className="absolute top-0 flex flex-col items-center cursor-pointer transition-all duration-150 group pointer-events-auto"
              style={{
                left: `${pct}%`,
                transform: `translateX(${transformX})`,
                color: isExact ? '#111' : isNear ? '#333' : '#9c968d',
              }}
            >
              <span
                className="w-px mb-0.5 transition-all"
                style={{
                  height: isExact ? '7px' : '4px',
                  background: isExact ? '#111' : 'rgba(0,0,0,0.22)',
                }}
              />
              <span
                className={`text-xs leading-none transition-transform ${
                  isExact ? 'scale-110 font-black text-[#111]' : 'group-hover:text-[#111]'
                }`}
              >
                {tickYear}
              </span>
            </button>
          );
        })}

        {/* Minor Sub-Decade Ticks */}
        {MINOR_TICKS.map((subYear) => {
          const pct = ((subYear - MIN_YEAR) / TOTAL_SPAN) * 100;
          const isExact = subYear === currentYear;
          return (
            <button
              key={subYear}
              type="button"
              onClick={() => {
                stopTour();
                setCurrentYear(subYear);
              }}
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center cursor-pointer group pointer-events-auto"
              style={{ left: `${pct}%` }}
              title={`${subYear}`}
            >
              <span
                className="w-px transition-all"
                style={{
                  height: isExact ? '5px' : '3px',
                  background: isExact ? '#111' : 'rgba(0,0,0,0.12)',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
