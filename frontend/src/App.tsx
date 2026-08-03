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

export function App() {
  const loadInitialData = useStore((s) => s.loadInitialData);
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

      {/* Branch labels (dashed lines + flags from globe) */}
      <BranchLabels />

      {/* Timeline */}
      <TimelineSlider />

      {/* Left Panel: News Feed */}
      <NewsFeed />

      {/* Right Panel: Stats, Hype, Compare */}
      <RightPanel />

      <SpatialToggle />
      <LanguageSwitcher />
      <TopicDetailsModal />
    </div>
  );
}

export default App;
