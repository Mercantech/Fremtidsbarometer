import React from 'react';
import { useStore } from '../store/useStore';
import { t } from '../utils/translations';

export const TimelineSlider: React.FC = () => {
  const currentYear = useStore((s) => s.currentYear);
  const currentEraIndex = useStore((s) => s.currentEraIndex);
  const setCurrentYear = useStore((s) => s.setCurrentYear);
  const eras = useStore((s) => s.eras);
  const trendsHistory = useStore((s) => s.trendsHistory);
  const lang = useStore((s) => s.lang);

  const era = eras[currentEraIndex];

  // Find top tech trends for the selected year
  const yearTrends = trendsHistory.find((h) => h.year === currentYear);
  const topTechSummary = yearTrends?.data
    ? [...yearTrends.data]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 3)
        .map((x) => x.technology)
        .join(' · ')
    : null;

  // Logic to generate ticks similar to original
  const minYear = 1995;
  const maxYear = 2034;
  const step = 5;
  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y += step) {
    years.push(y);
  }
  if (!years.includes(currentYear)) {
    years.push(currentYear);
  }
  eras.forEach((e) => {
    if (!years.includes(e.year)) years.push(e.year);
  });
  years.sort((a, b) => a - b);

  return (
    <>
      <div className="era-label" id="era-label" style={{ opacity: 1, transform: 'translateY(0)', top: '18px', right: '40px' }}>
        <div>{currentYear} — {era?.title || t('loading', lang)}</div>
        {topTechSummary && (
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
            ⚡ {t('topTech', lang)}: <span style={{ color: '#ffd000' }}>{topTechSummary}</span>
          </div>
        )}
      </div>

      <div className="timeline-wrapper">
        <div className="timeline-badge">{t('timeTravel', lang)}</div>
        <input 
          type="range" 
          className="time-slider" 
          id="era-slider" 
          min={1995} 
          max={2034} 
          step={1} 
          value={currentYear}
          onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
        />
        <div className="timeline-labels" id="timeline-labels">
          {years.map((y) => (
            <span 
              key={y} 
              className={`tick ${y === currentYear ? 'active' : ''}`} 
              onClick={() => setCurrentYear(y)}
              style={{cursor: 'pointer'}}
            >
              {y}
            </span>
          ))}
        </div>
      </div>
    </>
  );
};
