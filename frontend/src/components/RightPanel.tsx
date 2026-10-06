import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { t } from '../utils/translations';
import { StatsTab } from './right-panel/StatsTab';
import { HypeTab } from './right-panel/HypeTab';
import { CompareTab } from './right-panel/CompareTab';

type PanelTab = 'stats' | 'hype' | 'compare';

const DRIP_CONFIG: Record<PanelTab, { drip: string; number: string; translationKey: 'marketStats' | 'hypeRadar' | 'compare' }> = {
  stats:   { drip: 'drip-left',  number: '01', translationKey: 'marketStats' },
  hype:    { drip: 'drip-right', number: '02', translationKey: 'hypeRadar' },
  compare: { drip: 'drip-mid',   number: '03', translationKey: 'compare' },
};

export const RightPanel: React.FC = () => {
  const [panelTab, setPanelTab] = useState<PanelTab>('stats');

  const currentEraIndex = useStore((s) => s.currentEraIndex);
  const eras = useStore((s) => s.eras);
  const hypeList = useStore((s) => s.hype);
  const lang = useStore((s) => s.lang);
  
  const era = eras[currentEraIndex];

  const stripSvgRef = useRef<SVGSVGElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timerId: number | null = null;
    const positionPanels = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const CX = W / 2;
      const CY = H / 2 + 40;
      const GLOBE_R = Math.min(W, H) * 0.28;

      const rightSvg = stripSvgRef.current;
      const rightPanel = rightPanelRef.current;
      
      if (!rightSvg || !rightPanel) return;

      const rightShelfY = Math.max(100, CY - 210); 
      const pAngleR = -0.15; 
      const rDotX = CX + Math.cos(pAngleR) * (GLOBE_R + 15); 
      const rDotY = CY + Math.sin(pAngleR) * (GLOBE_R + 15);
      
      const rightInset = 40;
      const panelWidth = 289; 
      const shelfStartX = W - rightInset - panelWidth;
      const shelfEndX = W - rightInset;

      rightSvg.innerHTML = `
        <defs>
          <linearGradient id="fadeRight" x1="${rDotX}" y1="${rDotY}" x2="${shelfEndX}" y2="${rightShelfY}" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#00d4ff" stop-opacity="1" />
            <stop offset="100%" stop-color="#00d4ff" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path d="M ${rDotX} ${rDotY} L ${shelfStartX} ${rightShelfY} L ${shelfEndX} ${rightShelfY}" fill="none" stroke="url(#fadeRight)" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="${rDotX}" cy="${rDotY}" r="3.5" fill="#00d4ff" />
      `;
      
      rightPanel.style.right = rightInset + 'px'; 
      rightPanel.style.top = (rightShelfY + 20) + 'px';
    };

    window.addEventListener('resize', positionPanels);
    timerId = window.setTimeout(positionPanels, 100);

    return () => {
      window.removeEventListener('resize', positionPanels);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [era]);

  if (!era) return null;

  const activeDrip = DRIP_CONFIG[panelTab];
  const activeTitle = t(activeDrip.translationKey, lang);

  return (
    <>
      <svg id="right-strip-svg" ref={stripSvgRef}></svg>
      <div id="right-panel" ref={rightPanelRef}>

        {/* ── SVG Drip Header (changes per active tab) ── */}
        <div className="rp-block">
          <div className={`rp-title-wrap ${activeDrip.drip}`} key={panelTab}>
            <span className="rp-number">{activeDrip.number}</span>
            <span className="rp-title">{activeTitle}</span>
          </div>

          {/* ── Tab Switcher ── */}
          <div className="rp-tab-bar">
            {(['stats', 'hype', 'compare'] as PanelTab[]).map((tab) => (
              <div
                key={tab}
                className={`rp-tab-btn ${panelTab === tab ? 'active' : ''}`}
                onClick={() => setPanelTab(tab)}
              >
                {t(DRIP_CONFIG[tab].translationKey, lang)}
              </div>
            ))}
          </div>
        </div>

        {panelTab === 'stats' && <StatsTab era={era} lang={lang} />}
        {panelTab === 'hype' && <HypeTab era={era} hypeList={hypeList} />}
        {panelTab === 'compare' && <CompareTab />}

      </div>
    </>
  );
};
