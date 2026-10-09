import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { t } from '../utils/translations';
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

  // Auto-Play effect
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

  // Keyboard navigation
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
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentYear, setCurrentYear]);

  // Find top tech trends for the selected year
  const yearTrends = trendsHistory.find((h) => h.year === currentYear);
  const topTechSummary = yearTrends?.data
    ? [...yearTrends.data]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 3)
        .map((x) => x.technology)
        .join(' · ')
    : null;

  const eraTitle = lang === 'da' ? (era?.stats?.title_da as string || era?.title) : era?.title;

  return (
    <>
      {/* ── Native Minimalist Era Label ── */}
      <div
        className="era-label"
        id="era-label"
        style={{
          opacity: 1,
          transform: 'translateY(0)',
          top: '20px',
          right: '50px',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div>
          <div>
            <span style={{ color: '#111', fontWeight: 800 }}>{currentYear}</span> — {eraTitle || t('loading', lang)}
          </div>
          {topTechSummary && (
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(0,0,0,0.6)', marginTop: '2px', fontFamily: 'Inter, sans-serif', textTransform: 'none' }}>
              ⚡ {t('topTech', lang)}: <span style={{ color: '#92400e', fontWeight: 700 }}>{topTechSummary}</span>
            </div>
          )}
        </div>

        {/* Discreet Apple HIG Dossier Button */}
        <button
          onClick={() => setIsDossierOpen(true)}
          className="ml-2 px-2.5 py-1 rounded-full bg-[#111] hover:bg-black text-[#ffd000] text-[11px] font-sans font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          style={{ letterSpacing: '0.5px' }}
          title={t('eraDossier', lang)}
        >
          <FileText size={12} />
          <span>{t('eraDossier', lang)}</span>
        </button>
      </div>

      {/* ── Timeline Scrubber Bar ── */}
      <div className="timeline-wrapper">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="timeline-badge">{t('timeTravel', lang)}</div>

            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-6 h-6 rounded-full bg-[#111] hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
              title={isPlaying ? t('pauseTour', lang) : t('playTour', lang)}
            >
              {isPlaying ? <Pause size={10} /> : <Play size={10} className="ml-0.5" />}
            </button>

            {/* Return to Present (2026) Button */}
            {currentYear !== 2026 && (
              <button
                onClick={() => setCurrentYear(2026)}
                className="px-2 py-0.5 rounded-full bg-[#111] hover:bg-black text-[#ffd000] text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                title={t('returnToPresent', lang)}
              >
                <RotateCcw size={10} />
                <span>2026</span>
              </button>
            )}
          </div>

          {/* ── Apple-Style Segmented Decades Pill Selector ── */}
          <div className="flex items-center bg-[#111] p-0.5 rounded-full shadow-md">
            {DECADES.map((d) => {
              const isActive = currentYear >= d.min && currentYear <= d.max;
              return (
                <button
                  key={d.label}
                  onClick={() => setCurrentYear(d.anchor)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono tracking-tight transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#ffd000] text-[#111] font-extrabold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Slider with Step Arrows ── */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentYear(Math.max(1960, currentYear - 1))}
            className="w-5 h-5 rounded-full bg-black/5 hover:bg-black/10 text-[#111] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={t('prevYear', lang)}
          >
            <ChevronLeft size={12} />
          </button>

          <input
            type="range"
            className="time-slider flex-1"
            id="era-slider"
            min={1960}
            max={2035}
            step={1}
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
          />

          <button
            onClick={() => setCurrentYear(Math.min(2035, currentYear + 1))}
            className="w-5 h-5 rounded-full bg-black/5 hover:bg-black/10 text-[#111] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={t('nextYear', lang)}
          >
            <ChevronRight size={12} />
          </button>
        </div>

        {/* ── Fisheye Magnified Ruler Labels ── */}
        <div className="timeline-labels" id="timeline-labels">
          {RULER_YEARS.map((y) => {
            const diff = Math.abs(y - currentYear);
            const isExact = y === currentYear;
            const isNear = diff <= 2;
            const isMedium = diff <= 4;

            // Fisheye scale factor & style
            const scale = isExact ? 1.3 : isNear ? 1.15 : isMedium ? 1.05 : 0.95;
            const opacity = isExact ? 1 : isNear ? 0.9 : isMedium ? 0.65 : 0.45;
            const fontWeight = isExact ? 800 : isNear ? 700 : 500;
            const color = isExact ? '#111' : isNear ? '#333' : '#6f6a61';

            return (
              <span
                key={y}
                className={`tick ${isExact ? 'active' : ''}`}
                onClick={() => setCurrentYear(y)}
                style={{
                  cursor: 'pointer',
                  transform: `scale(${scale})`,
                  transformOrigin: 'bottom center',
                  opacity,
                  fontWeight,
                  color,
                  transition: 'transform 0.15s ease, opacity 0.15s ease, color 0.15s ease',
                }}
              >
                {y}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
};
