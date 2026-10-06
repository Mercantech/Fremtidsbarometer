import React, { useState } from 'react';
import type { EraInfo } from '../../store/useStore';
import { t } from '../../utils/translations';

interface StatsTabProps {
  era: EraInfo;
  lang: 'en' | 'da';
}

export const StatsTab: React.FC<StatsTabProps> = ({ era, lang }) => {
  const [statsSubTab, setStatsSubTab] = useState<'roles' | 'stack'>('roles');

  return (
    <div className="rp-block rp-block--stats rp-tab-content active" key="tab-stats">
      <div className="spatial-toggle" id="rp-toggle">
        <div 
          className={`toggle-btn ${statsSubTab === 'roles' ? 'active' : ''}`} 
          onClick={() => setStatsSubTab('roles')}
        >
          {t('roles', lang)}
        </div>
        <div 
          className={`toggle-btn ${statsSubTab === 'stack' ? 'active' : ''}`} 
          onClick={() => setStatsSubTab('stack')}
        >
          {t('stack', lang)}
        </div>
      </div>
      
      {statsSubTab === 'roles' && (
        <div className="rp-tab-content active">
          {era.stats?.roles?.map((r: string[], i: number) => (
            <div key={i} className="rp-item">
              <div className="rp-row">
                <span>{r[0]}</span> <span>{r[1]}</span>
              </div>
              {r[2] && <div className="rp-desc">{r[2]}</div>}
            </div>
          ))}
        </div>
      )}
      {statsSubTab === 'stack' && (
        <div className="rp-tab-content active">
          {era.stats?.stack?.map((s: string[], i: number) => (
            <div key={i} className="rp-item">
              <div className="rp-row">
                <span>{s[0]}</span> <span>{s[1]}</span>
              </div>
              {s[2] && <div className="rp-desc">{s[2]}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
