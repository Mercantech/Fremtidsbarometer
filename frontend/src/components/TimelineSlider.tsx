import React from 'react';
import { useStore, ERAS } from '../store/useStore';

export const TimelineSlider: React.FC = () => {
  const currentYear = useStore((s) => s.currentYear);
  const currentEraIndex = useStore((s) => s.currentEraIndex);
  const setCurrentYear = useStore((s) => s.setCurrentYear);

  const era = ERAS[currentEraIndex];

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
  ERAS.forEach(e => {
    if (!years.includes(e.year)) years.push(e.year);
  });
  years.sort((a, b) => a - b);

  return (
    <>
      <div className="era-label" id="era-label" style={{ opacity: 1, transform: 'translateY(0)', top: '18px', right: '40px' }}>
        {currentYear} — {era.title}
      </div>

      <div className="timeline-wrapper">
        <div className="timeline-badge">Time Travel</div>
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
          {years.map(y => (
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
