import React from 'react';
import { useStore, ERAS } from '../store/useStore';
import { motion } from 'framer-motion';

export const FlatMapView: React.FC = () => {
  const viewMode = useStore((s) => s.viewMode);
  const currentEraIndex = useStore((s) => s.currentEraIndex);
  const era = ERAS[currentEraIndex];

  if (viewMode !== 'map') return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="absolute inset-0 flex items-center justify-center p-8 z-10 pointer-events-auto"
    >
      <div className="relative w-full max-w-5xl h-[520px] bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col justify-between">
        {/* Map Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">2D Spatial Projection</span>
            <h3 className="text-xl font-bold text-white tracking-tight">{era.year} — {era.title}</h3>
          </div>
          <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-full">
            {era.subtitle}
          </span>
        </div>

        {/* World Map Grid Background */}
        <div className="relative flex-1 my-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center">
          {/* Subtle Grid Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />

          {/* Continents Representation */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 text-slate-600 font-mono text-sm tracking-widest pointer-events-none select-none">
            [ FLAT MAP PROJECTION LAYER ]
          </div>

          {/* Era Topic Markers mapped onto 2D Coordinates */}
          {era.topics.map((t, idx) => {
            // Map lat (-90 to 90) -> (100% to 0%), lng (-180 to 180) -> (0% to 100%)
            const left = `${((t.lng + 180) / 360) * 100}%`;
            const top = `${((90 - t.lat) / 180) * 100}%`;

            return (
              <motion.div
                key={idx}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.15, type: 'spring' }}
                style={{ left, top }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
              >
                <div className="relative flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full animate-ping opacity-75" 
                    style={{ backgroundColor: t.color }} 
                  />
                  <div 
                    className="absolute w-3 h-3 rounded-full border-2 border-slate-900 shadow-md" 
                    style={{ backgroundColor: t.color }} 
                  />

                  <div className="ml-5 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xl whitespace-nowrap group-hover:scale-105 transition-transform">
                    <span className="text-slate-400 mr-1.5">{t.country}</span>
                    <span className="font-bold">{t.topic}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Map Footer Legend */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
          <div className="flex items-center space-x-4">
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-pink-500 mr-2" /> Global Hubs</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-cyan-400 mr-2" /> Key Tech Trends</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-400 mr-2" /> Market Shifts</span>
          </div>
          <span>Real-time Coordinate Mapping</span>
        </div>
      </div>
    </motion.div>
  );
};
