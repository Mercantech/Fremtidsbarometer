import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import * as L from 'leaflet';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const MapInvalidateSize: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// Custom HTML icon to keep our circle styling while using standard Markers for clustering
const createDotIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-dot-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); opacity: 0.9;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

export const FlatMapView: React.FC = () => {
  const viewMode = useStore((s) => s.viewMode);
  const liveTopics = useStore((s) => s.liveTopics);
  const setSelectedTopic = useStore((s) => s.setSelectedTopic);
  const activeFilters = useStore((s) => s.activeFilters);
  const toggleFilter = useStore((s) => s.toggleFilter);

  if (viewMode !== 'map') return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="absolute inset-0 z-10"
      style={{ top: '64px' }}
    >
      <MapContainer
        center={[48, 15]}
        zoom={3}
        minZoom={2}
        maxZoom={12}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        className="leaflet-dark"
      >
        <MapInvalidateSize />
        <TileLayer
          attribution='&copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        />

        {/* This handles the heavy lifting of clustering overlapping markers */}
        <MarkerClusterGroup 
          chunkedLoading 
          maxClusterRadius={45} 
          showCoverageOnHover={false}
        >
          {liveTopics.filter(t => activeFilters.includes(t.type)).map((t) => (
            <Marker
              key={t.id}
              position={[t.lat, t.lng]}
              icon={createDotIcon(t.color)}
              eventHandlers={{
                click: () => setSelectedTopic(t),
              }}
            >
              <Tooltip
                direction="auto"
                offset={[0, -5]}
                permanent={true}
                interactive={true}
                className="custom-leaflet-tooltip"
              >
                {t.topic}
              </Tooltip>
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '180px' }}>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: t.color,
                    marginBottom: '4px'
                  }}>
                    {t.type} — {t.country}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#111',
                    marginBottom: '6px'
                  }}>
                    {t.topic}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#555',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.5'
                  }}>
                    {t.details}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Legend overlay - moved to bottom right */}
      <div className="absolute bottom-10 right-10 z-[1000] bg-[#111]/90 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 flex items-center space-x-5 text-xs text-white">
        <span 
          onClick={() => toggleFilter('job')}
          className={`flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-100 ${activeFilters.includes('job') ? 'opacity-100' : 'opacity-40 grayscale'}`}
        >
          <span className="w-3 h-3 rounded-full" style={{ background: '#00d4ff' }} /> Jobs
        </span>
        <span 
          onClick={() => toggleFilter('hype')}
          className={`flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-100 ${activeFilters.includes('hype') ? 'opacity-100' : 'opacity-40 grayscale'}`}
        >
          <span className="w-3 h-3 rounded-full" style={{ background: '#ff2a85' }} /> Hype
        </span>
        <span 
          onClick={() => toggleFilter('salary')}
          className={`flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-100 ${activeFilters.includes('salary') ? 'opacity-100' : 'opacity-40 grayscale'}`}
        >
          <span className="w-3 h-3 rounded-full" style={{ background: '#ffd000' }} /> Salary
        </span>
      </div>
    </motion.div>
  );
};
