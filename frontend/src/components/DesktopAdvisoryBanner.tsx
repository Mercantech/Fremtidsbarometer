import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Monitor, X, ArrowUpRight } from 'lucide-react';

const BREAKPOINT_WIDTH = 1024;
const BREAKPOINT_HEIGHT = 620;
const SESSION_STORAGE_KEY = 'fremtidsbarometer_mobile_banner_dismissed';

export const DesktopAdvisoryBanner: React.FC = () => {
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed previously in this session
    try {
      const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // Fallback if sessionStorage is blocked
    }

    const checkScreenDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Triggers as soon as layout begins to constrain / narrow
      const shouldShow = width < BREAKPOINT_WIDTH || height < BREAKPOINT_HEIGHT;
      setIsNarrowScreen(shouldShow);
    };

    // Initial check
    checkScreenDimensions();

    // Smooth resize listener
    window.addEventListener('resize', checkScreenDimensions, { passive: true });
    return () => window.removeEventListener('resize', checkScreenDimensions);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  };

  const isVisible = isNarrowScreen && !isDismissed;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          role="region"
          aria-label="Desktop Display Recommendation"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
          }}
          exit={{
            opacity: 0,
            y: 30,
            scale: 0.96,
            transition: { duration: 0.25, ease: 'easeOut' },
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9990] w-[calc(100%-2rem)] max-w-[440px] pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-2xl bg-[#0f1118]/85 backdrop-blur-2xl border border-white/12 shadow-[0_20px_50px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.08)_inset] p-4 sm:p-5 text-white">
            {/* Subtle top ambient glow */}
            <div
              className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-16 bg-gradient-to-b from-cyan-400/15 via-blue-500/10 to-transparent blur-2xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative flex items-start gap-3.5">
              {/* Apple-style hardware icon */}
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-200 shrink-0 shadow-inner">
                <Monitor className="w-5 h-5 text-cyan-300" strokeWidth={1.8} />
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-white/95">
                    Designed for Larger Displays
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-medium bg-white/10 text-slate-300 border border-white/10">
                    Desktop
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-300/85 leading-relaxed font-normal">
                  Fremtidsbarometer’s spatial 3D radar, telemetry feeds, and interactive timeline are
                  engineered for expansive desktop screens.
                </p>

                {/* Bottom actions */}
                <div className="mt-3.5 flex items-center gap-2.5">
                  <button
                    onClick={handleDismiss}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/10 hover:bg-white/15 active:bg-white/20 text-white/90 border border-white/10 transition-all cursor-pointer"
                  >
                    <span>Continue Anyway</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-400" />
                  </button>

                  <span className="text-[11px] text-slate-400/80">
                    Rotate or enlarge window for full view
                  </span>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-0 right-0 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5"
                title="Dismiss notice"
                aria-label="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
