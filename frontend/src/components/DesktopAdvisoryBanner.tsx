import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Monitor } from 'lucide-react';

export const BREAKPOINT_WIDTH = 1024;
export const BREAKPOINT_HEIGHT = 620;

export const DesktopAdvisoryBanner: React.FC = () => {
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);

  useEffect(() => {
    const checkScreenDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsNarrowScreen(width < BREAKPOINT_WIDTH || height < BREAKPOINT_HEIGHT);
    };

    checkScreenDimensions();
    window.addEventListener('resize', checkScreenDimensions, { passive: true });
    return () => window.removeEventListener('resize', checkScreenDimensions);
  }, []);

  if (!isNarrowScreen) return null;

  return (
    <AnimatePresence>
      <motion.aside
        role="region"
        aria-label="Desktop Display Required"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2.5rem)] max-w-[380px] pointer-events-auto"
      >
        <div className="relative overflow-hidden rounded-2xl bg-[#0c0e14]/90 backdrop-blur-2xl border border-white/15 p-5 text-center shadow-[0_24px_60px_rgba(0,0,0,0.65),0_1px_0_rgba(255,255,255,0.1)_inset] text-white">
          {/* Subtle top ambient glow */}
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-14 bg-gradient-to-b from-cyan-400/20 via-blue-500/10 to-transparent blur-xl pointer-events-none"
            aria-hidden="true"
          />

          {/* Apple hardware monitor icon */}
          <div className="mx-auto w-11 h-11 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-cyan-300 shadow-inner mb-3">
            <Monitor className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-mono tracking-wider uppercase text-cyan-200 mb-2">
            <span>Desktop Only</span>
          </div>

          <h3 className="text-sm font-semibold tracking-tight text-white/95">
            Designed for Larger Displays
          </h3>

          <p className="mt-1.5 text-xs text-slate-300/80 leading-relaxed font-normal">
            This platform is engineered for desktop screens. Please open Fremtidsbarometer on your Mac or PC to explore interactive 3D telemetry, timeline, and market analytics.
          </p>

          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>fremtidsbarometer.mercantec.tech</span>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
