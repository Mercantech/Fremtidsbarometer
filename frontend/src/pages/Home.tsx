import { useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { NewsFeed } from '../components/NewsFeed';
import { RightPanel } from '../components/RightPanel';
import { TimelineSlider } from '../components/TimelineSlider';
import { GlobeCanvas } from '../components/GlobeCanvas';
import { FlatMapView } from '../components/FlatMapView';
import { BranchLabels } from '../components/BranchLabels';
import { SpatialToggle } from '../components/SpatialToggle';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { TopicDetailsModal } from '../components/TopicDetailsModal';
import { useStore } from '../store/useStore';

export default function Home() {
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
      <Header />
      
      <div id="canvas-wrap">
        <GlobeCanvas />
        <FlatMapView />
      </div>
      
      <BranchLabels />

      <TimelineSlider />

      <NewsFeed />

      <RightPanel />

      <SpatialToggle />
      <LanguageSwitcher />
      <TopicDetailsModal />
    </div>
  );
}