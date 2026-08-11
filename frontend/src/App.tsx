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
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadInitialData();
    }
  }, [loadInitialData]);

  return (
    <div className="root">
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
