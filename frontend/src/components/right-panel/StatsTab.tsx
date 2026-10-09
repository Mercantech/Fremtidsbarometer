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
          {era.stats?.roles?.map((r: string[], i: number) => {
            const desc = lang === 'da' ? r[3] || r[2] : r[2];
            return (
              <div key={i} className="rp-item">
                <div className="rp-row">
                  <span>{r[0]}</span> <span>{r[1]}</span>
                </div>
                {desc && <div className="rp-desc">{desc}</div>}
              </div>
            );
          })}
        </div>
      )}
      {statsSubTab === 'stack' && (
        <div className="rp-tab-content active">
          {era.stats?.stack?.map((s: string[], i: number) => {
            const desc = lang === 'da' ? s[3] || s[2] : s[2];
            return (
              <div key={i} className="rp-item">
                <div className="rp-row">
                  <span>{s[0]}</span> <span>{s[1]}</span>
                </div>
                {desc && <div className="rp-desc">{desc}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
