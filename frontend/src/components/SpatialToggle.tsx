import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Globe, Map } from 'lucide-react';

export const SpatialToggle: React.FC = () => {
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const toggleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const positionToggle = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const CY = H / 2 + 40; // MATCH GLOBE SHIFT
      const GLOBE_R = Math.min(W, H) * 0.28;

      if (toggleRef.current) {
        // Place strictly 60px (approx 2cm) below the bottom edge of the globe
        toggleRef.current.style.top = (CY + GLOBE_R + 60) + 'px';
        toggleRef.current.style.left = '50%';
        toggleRef.current.style.transform = 'translate(-50%, -50%)';
      }
    };

    window.addEventListener('resize', positionToggle);
    positionToggle();
    return () => window.removeEventListener('resize', positionToggle);
  }, []);

  return (
    <div 
      ref={toggleRef}
      className="absolute z-40 flex items-center space-x-2 bg-[#111] p-1.5 rounded-[30px] shadow-[0_16px_32px_rgba(0,0,0,0.3)] transition-all"
    >
      <button
        onClick={() => setViewMode('globe')}
        className={`flex items-center space-x-2 px-5 py-2.5 rounded-[24px] text-sm font-black tracking-wide transition-all duration-300 ${
          viewMode === 'globe'
            ? 'bg-[#ffd000] text-[#111] shadow-[0_0_12px_rgba(255,208,0,0.6)]'
            : 'text-white hover:bg-white/10'
        }`}
      >
        <Globe className="w-4 h-4" />
        <span>3D GLOBE</span>
      </button>

      <button
        onClick={() => setViewMode('map')}
        className={`flex items-center space-x-2 px-5 py-2.5 rounded-[24px] text-sm font-black tracking-wide transition-all duration-300 ${
          viewMode === 'map'
            ? 'bg-[#ffd000] text-[#111] shadow-[0_0_12px_rgba(255,208,0,0.6)]'
            : 'text-white hover:bg-white/10'
        }`}
      >
        <Map className="w-4 h-4" />
        <span>2D MAP</span>
      </button>
    </div>
  );
};
