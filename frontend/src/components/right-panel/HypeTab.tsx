import React from 'react';
import type { EraInfo } from '../../store/useStore';
import type { HypeTopic } from '../../services/api';

interface HypeTabProps {
  era: EraInfo;
  hypeList: HypeTopic[];
}

export const HypeTab: React.FC<HypeTabProps> = ({ era, hypeList }) => {
  return (
    <div className="rp-block rp-block--stats rp-tab-content active" key="tab-hype">
      <div className="hype-content">
        <div className="hype-topic" id="hype-topic">{era.stats?.hypeTopic}</div>
        <div className="hype-desc" id="hype-desc">{era.stats?.hypeDesc}</div>
      </div>
      {hypeList.length > 0 && (
        <div className="hype-content mt-4" style={{ borderLeftColor: '#ff2a85' }}>
          <div className="hype-topic" style={{ fontSize: '14px', marginBottom: '8px' }}>
            AI Agents News
          </div>
          {hypeList.map((h, i) => (
            <div key={i} style={{ marginBottom: '6px', fontSize: '12px', color: '#555' }}>
              <span style={{ fontWeight: 'bold', color: '#111' }}>{h.topic}</span>: {h.summary}
              <span
                style={{
                  fontWeight: 'bold',
                  marginLeft: '6px',
                  color: h.direction === 'rising' ? '#00d4ff' : '#ff2a85',
                }}
              >
                ({h.score}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
