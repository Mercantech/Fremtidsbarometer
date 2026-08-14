import { useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { NewsFeed } from './components/NewsFeed';
import { RightPanel } from './components/RightPanel';
import { TimelineSlider } from './components/TimelineSlider';
import { GlobeCanvas } from './components/GlobeCanvas';
import { FlatMapView } from './components/FlatMapView';
import { BranchLabels } from './components/BranchLabels';
import { SpatialToggle } from './components/SpatialToggle';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { TopicDetailsModal } from './components/TopicDetailsModal';
import { useStore } from './store/useStore';
import { AnimatePresence, motion } from 'framer-motion';

export function App() {
  const loadInitialData = useStore((s) => s.loadInitialData);
  const viewMode = useStore((s) => s.viewMode);
  const apiError = useStore((s) => s.apiError);
  const clearApiError = useStore((s) => s.clearApiError);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadInitialData();
    }
  }, [loadInitialData]);

  return (
    <div className="root">
      {/* Backend API Error Banner */}
      <AnimatePresence>
        {apiError && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-rose-900/90 text-white backdrop-blur-md border border-rose-500/30 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-xs"
          >
            <div className="flex flex-col">
              <span className="font-bold text-rose-200">Backend Connection Error</span>
              <span className="text-white/80">{apiError}</span>
            </div>
            <button
              onClick={() => {
                clearApiError();
                loadInitialData();
              }}
              className="bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Globe/Map toggle */}
      <Header />

      {/* 3D Globe / 2D Map in center */}
      <div id="canvas-wrap">
        <GlobeCanvas />
        <FlatMapView />
      </div>

      <AnimatePresence>
        {viewMode === 'globe' && (
          <motion.div
            key="globe-ui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none"
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
              className="absolute inset-0 pointer-events-none"
            >
              <TimelineSlider />
            </motion.div>

            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0 pointer-events-none"
            >
              <NewsFeed />
            </motion.div>

            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0 pointer-events-none"
            >
              <RightPanel />
            </motion.div>

            <BranchLabels />
          </motion.div>
        )}
      </AnimatePresence>

      <SpatialToggle />
      <LanguageSwitcher />
      <TopicDetailsModal />
    </div>
  );
}

export default App;
