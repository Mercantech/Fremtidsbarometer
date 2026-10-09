import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { t } from '../utils/translations';
import { motion } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, FileText } from 'lucide-react';

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

const RULER_YEARS = [1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2026, 2035];

const MIN_YEAR = 1960;
const MAX_YEAR = 2035;

export const TimelineSlider: React.FC = () => {
  const currentYear = useStore((s) => s.currentYear);
  const currentEraIndex = useStore((s) => s.currentEraIndex);
  const setCurrentYear = useStore((s) => s.setCurrentYear);
  const eras = useStore((s) => s.eras);
  const lang = useStore((s) => s.lang);
  const setIsDossierOpen = useStore((s) => s.setIsDossierOpen);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragYear, setDragYear] = useState<number>(currentYear);

  const trackRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<number | null>(null);

  const era = eras[currentEraIndex];
  const eraTitle = lang === 'da' ? (era?.stats?.title_da as string || era?.title) : era?.title;

  // Sync dragYear when not dragging
  useEffect(() => {
    if (!isDragging) {
      setDragYear(currentYear);
    }
  }, [currentYear, isDragging]);

  // Auto-play loop
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = window.setInterval(() => {
        const next = currentYear >= MAX_YEAR ? MIN_YEAR : currentYear + 1;
        setCurrentYear(next);
      }, 1100);
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

  // Keyboard navigation
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

  // Compute year from clientX
  const getYearFromPointer = useCallback((clientX: number): number => {
    if (!trackRef.current) return currentYear;
    const rect = trackRef.current.getBoundingClientRect();
    const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = clampedX / rect.width;
    return Math.round(MIN_YEAR + ratio * (MAX_YEAR - MIN_YEAR));
  }, [currentYear]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const yr = getYearFromPointer(e.clientX);
    setDragYear(yr);
    setCurrentYear(yr);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const yr = getYearFromPointer(e.clientX);
    setDragYear(yr);
    if (yr !== currentYear) {
      setCurrentYear(yr);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    setIsDragging(false);
  };

  const activeDisplayYear = isDragging ? dragYear : currentYear;
  const progressPercent = ((activeDisplayYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  return (
    <div className="timeline-container">
      {/* ── Row 1: Header / Navigation Bar ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Left Side: Title + Era Badge + Dossier button */}
        <div className="flex items-center gap-2.5">
          <span className="timeline-badge text-xl text-[#111]">
            {t('timeTravel', lang)}
          </span>
          <span className="text-neutral-400 font-light text-xs">•</span>
          
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/90 border border-neutral-200/80 shadow-xs backdrop-blur-sm">
            <span className="font-mono font-black text-xs text-[#111]">
              {activeDisplayYear}
            </span>
            <span className="text-xs font-semibold text-neutral-800 uppercase tracking-tight truncate max-w-[200px] lg:max-w-[280px]">
              {eraTitle || t('loading', lang)}
            </span>
          </div>

          <button
            onClick={() => setIsDossierOpen(true)}
            className="px-2 py-0.5 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 text-[10px] font-bold tracking-wide transition-all cursor-pointer shadow-2xs flex items-center gap-1"
            title={t('eraDossier', lang)}
          >
            <FileText size={10} />
            <span>{t('eraDossier', lang)}</span>
          </button>
        </div>

        {/* Right Side: Decades segmented capsule + Controls */}
        <div className="flex items-center gap-2">
          {/* Segmented Decades Pill Selector */}
          <div className="flex items-center bg-[#111] p-0.5 rounded-full shadow-sm">
            {DECADES.map((d) => {
              const isActive = activeDisplayYear >= d.min && activeDisplayYear <= d.max;
              return (
                <button
                  key={d.label}
                  onClick={() => setCurrentYear(d.anchor)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono tracking-tight transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#ffd000] text-[#111] font-extrabold shadow-2xs'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Auto-Play Toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-6 h-6 rounded-full bg-[#111] hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title={isPlaying ? t('pauseTour', lang) : t('playTour', lang)}
          >
            {isPlaying ? <Pause size={10} /> : <Play size={10} className="ml-0.5" />}
          </button>

          {/* Return to Present (2026) */}
          {activeDisplayYear !== 2026 && (
            <button
              onClick={() => setCurrentYear(2026)}
              className="px-2 py-0.5 rounded-full bg-[#111] hover:bg-black text-[#ffd000] text-[10px] font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
              title={t('returnToPresent', lang)}
            >
              <RotateCcw size={10} />
              <span>2026</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: Fluid Spring Scrubber Runway ── */}
      <div className="flex items-center gap-2 pt-1">
        {/* Step Back -1Y */}
        <button
          onClick={() => setCurrentYear(Math.max(MIN_YEAR, currentYear - 1))}
          className="w-5 h-5 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 flex items-center justify-center transition cursor-pointer shrink-0"
          title={t('prevYear', lang)}
        >
          <ChevronLeft size={12} />
        </button>

        {/* Tactile Gliding Track */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative flex-1 h-7 flex items-center cursor-pointer select-none touch-none"
        >
          {/* Base Track */}
          <div className="w-full h-1.5 rounded-full bg-neutral-300/80 overflow-hidden relative">
            {/* Smooth Fill Line */}
            <motion.div
              className="h-full bg-[#111] rounded-full"
              animate={{ width: `${progressPercent}%` }}
              transition={
                isDragging
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 350, damping: 30 }
              }
            />
          </div>

          {/* Gliding Thumb */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-10"
            animate={{ left: `${progressPercent}%` }}
            transition={
              isDragging
                ? { duration: 0 }
                : { type: 'spring', stiffness: 350, damping: 30 }
            }
          >
            <div className="w-5 h-5 rounded-full bg-[#ffd000] border-2 border-[#111] shadow-md flex items-center justify-center transition-transform hover:scale-110 active:scale-125">
              <div className="w-1.5 h-1.5 rounded-full bg-[#111]" />
            </div>

            {/* Floating Year Tooltip Pill on drag/hover */}
            {isDragging && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black text-[#ffd000] font-mono text-[10px] font-bold shadow-lg pointer-events-none whitespace-nowrap">
                {activeDisplayYear}
              </div>
            )}
          </motion.div>
        </div>

        {/* Step Forward +1Y */}
        <button
          onClick={() => setCurrentYear(Math.min(MAX_YEAR, currentYear + 1))}
          className="w-5 h-5 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 flex items-center justify-center transition cursor-pointer shrink-0"
          title={t('nextYear', lang)}
        >
          <ChevronRight size={12} />
        </button>
      </div>

      {/* ── Row 3: Ruler Labels with Smooth Scaling ── */}
      <div className="flex justify-between items-center px-6 font-['Bebas_Neue',sans-serif] text-sm select-none pt-0.5">
        {RULER_YEARS.map((y) => {
          const diff = Math.abs(y - activeDisplayYear);
          const isExact = y === activeDisplayYear;
          const isNear = diff <= 2;

          return (
            <span
              key={y}
              onClick={() => setCurrentYear(y)}
              className="relative flex flex-col items-center cursor-pointer transition-all duration-150"
              style={{
                color: isExact ? '#111' : isNear ? '#333' : '#8e887f',
                transform: isExact ? 'scale(1.25)' : isNear ? 'scale(1.1)' : 'scale(1)',
                fontWeight: isExact ? 800 : 500,
              }}
            >
              <span
                className="w-px mb-0.5 transition-all"
                style={{
                  height: isExact ? '8px' : '4px',
                  background: isExact ? '#111' : 'rgba(0,0,0,0.25)',
                }}
              />
              <span>{y}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
