import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import 'leaflet/dist/leaflet.css';

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

export const FlatMapView: React.FC = () => {
  const viewMode = useStore((s) => s.viewMode);
  const liveTopics = useStore((s) => s.liveTopics);
  const setSelectedTopic = useStore((s) => s.setSelectedTopic);

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

        {liveTopics.map((t) => (
          <CircleMarker
            key={t.id}
            center={[t.lat, t.lng]}
            radius={6}
            pathOptions={{
              fillColor: t.color,
              fillOpacity: 0.8,
              color: '#fff',
              weight: 1,
              opacity: 0.9,
            }}
            eventHandlers={{
              click: () => setSelectedTopic(t),
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -10]}
              opacity={1}
              permanent={true}
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
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend overlay - moved to bottom right */}
      <div className="absolute bottom-10 right-10 z-[1000] bg-[#111]/90 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 flex items-center space-x-5 text-xs text-white/70">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: '#00d4ff' }} /> Jobs
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: '#ff2a85' }} /> Hype
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: '#ffd000' }} /> Salary
        </span>
      </div>
    </motion.div>
  );
};
