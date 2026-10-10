import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
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
const createDotIcon = (color: string, isHot = false) => {
  const glow = isHot
    ? 'box-shadow: 0 0 10px #ff5500, 0 0 16px rgba(255,85,0,0.6); border: 2px solid #ff7700;'
    : 'box-shadow: 0 2px 5px rgba(0,0,0,0.4); border: 2px solid white;';
  const size = isHot ? 16 : 14;
  return L.divIcon({
    className: 'custom-dot-icon',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; ${glow} opacity: 0.95;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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

        {/* This handles clustering overlapping markers cleanly */}
        <MarkerClusterGroup 
          chunkedLoading 
          maxClusterRadius={25}
          disableClusteringAtZoom={6}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
        >
          {liveTopics.filter(t => t.type === 'broadcast' || activeFilters.includes(t.type as ('job' | 'salary' | 'hype'))).map((t) => {
            const isHot = Boolean(t.is_hot || t.meta?.is_hot);
            return (
              <Marker
                key={t.id}
                position={[t.lat, t.lng]}
                icon={createDotIcon(t.color, isHot)}
                eventHandlers={{
                  click: () => setSelectedTopic(t),
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -8]}
                  permanent={false}
                  interactive={false}
                  className="custom-leaflet-tooltip"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left', minWidth: '120px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{t.city ? `${t.city}, ${t.country}` : t.country} • {t.type}</span>
                      {isHot && <span style={{ color: '#ea580c', fontWeight: 900 }}>🔥 HOT</span>}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                      {t.topic}
                    </div>
                    {t.meta?.medianSalary && (
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                        ${t.meta.medianSalary.toLocaleString()} USD
                      </div>
                    )}
                    {t.meta?.company && (
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#0284c7' }}>
                        {t.meta.company}
                      </div>
                    )}
                  </div>
                </Tooltip>
              </Marker>
            );
          })}
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
