import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { fetchSalary, type SalaryData } from '../services/api';

type PanelTab = 'stats' | 'hype' | 'compare';

const DRIP_MAP: Record<PanelTab, { drip: string; number: string; title: string }> = {
  stats:   { drip: 'drip-left',  number: '01', title: 'Market Stats' },
  hype:    { drip: 'drip-right', number: '02', title: 'Hype Radar' },
  compare: { drip: 'drip-mid',   number: '03', title: 'Compare' },
};

export const RightPanel: React.FC = () => {
  const [panelTab, setPanelTab] = useState<PanelTab>('stats');
  const [statsSubTab, setStatsSubTab] = useState<'roles' | 'stack'>('roles');

  const currentEraIndex = useStore((s) => s.currentEraIndex);
  const eras = useStore((s) => s.eras);
  const hypeList = useStore((s) => s.hype);
  
  const era = eras[currentEraIndex];

  const stripSvgRef = useRef<SVGSVGElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      // Adjusted offset from 25 to 15 to visually balance with the left side
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
    const tId = setTimeout(positionPanels, 100);
    return () => {
      window.removeEventListener('resize', positionPanels);
      clearTimeout(tId);
    };
  }, [era]);

  if (!era) return null;

  const activeDrip = DRIP_MAP[panelTab];

  return (
    <>
      <svg id="right-strip-svg" ref={stripSvgRef}></svg>
      <div id="right-panel" ref={rightPanelRef}>

        {/* ── SVG Drip Header (changes per active tab) ── */}
        <div className="rp-block">
          <div className={`rp-title-wrap ${activeDrip.drip}`} key={panelTab}>
            <span className="rp-number">{activeDrip.number}</span>
            <span className="rp-title">{activeDrip.title}</span>
          </div>

          {/* ── Tab Switcher ── */}
          <div className="rp-tab-bar">
            {(['stats', 'hype', 'compare'] as PanelTab[]).map((tab) => (
              <div
                key={tab}
                className={`rp-tab-btn ${panelTab === tab ? 'active' : ''}`}
                onClick={() => setPanelTab(tab)}
              >
                {DRIP_MAP[tab].title}
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab Content: Stats ── */}
        {panelTab === 'stats' && (
          <div className="rp-block rp-block--stats rp-tab-content active" key="tab-stats">
            <div className="spatial-toggle" id="rp-toggle">
              <div 
                className={`toggle-btn ${statsSubTab === 'roles' ? 'active' : ''}`} 
                onClick={() => setStatsSubTab('roles')}
              >
                Roles
              </div>
              <div 
                className={`toggle-btn ${statsSubTab === 'stack' ? 'active' : ''}`} 
                onClick={() => setStatsSubTab('stack')}
              >
                Stack
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
        )}

        {/* ── Tab Content: Hype ── */}
        {panelTab === 'hype' && (
          <div className="rp-block rp-block--stats rp-tab-content active" key="tab-hype">
            <div className="hype-content">
              <div className="hype-topic" id="hype-topic">{era.stats?.hypeTopic}</div>
              <div className="hype-desc" id="hype-desc">{era.stats?.hypeDesc}</div>
            </div>
            {hypeList.length > 0 && (
              <div className="hype-content mt-4" style={{borderLeftColor: '#ff2a85'}}>
                 <div className="hype-topic" style={{fontSize: '14px', marginBottom: '8px'}}>AI Agents News</div>
                 {hypeList.map((h, i) => (
                   <div key={i} style={{marginBottom: '6px', fontSize: '12px', color: '#555'}}>
                     <span style={{fontWeight: 'bold', color: '#111'}}>{h.topic}</span>: {h.summary}
                     <span style={{fontWeight: 'bold', marginLeft: '6px', color: h.direction === 'rising' ? '#00d4ff' : '#ff2a85'}}>
                       ({h.score}%)
                     </span>
                   </div>
                 ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab Content: Compare ── */}
        {panelTab === 'compare' && (
          <CompareTab />
        )}

      </div>
    </>
  );
};


/* ── Isolated Compare Tab Component with Real API Data ── */
const CompareTab: React.FC = () => {
  const storeCountries = useStore((s) => s.countries);
  // Default country candidates if store is still loading
  const availableCountries = storeCountries.length > 0 
    ? storeCountries.filter(c => c !== 'GLOBAL') 
    : ['DK', 'US', 'DE', 'SE', 'NO'];

  const [leftCountry, setLeftCountry] = useState(availableCountries[0] || 'DK');
  const [rightCountry, setRightCountry] = useState(availableCountries[1] || availableCountries[0] || 'US');
  const [leftData, setLeftData] = useState<SalaryData[]>([]);
  const [rightData, setRightData] = useState<SalaryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadComparison = async () => {
      setIsLoading(true);
      try {
        const [lData, rData] = await Promise.all([
          fetchSalary(leftCountry).catch(() => []),
          fetchSalary(rightCountry).catch(() => []),
        ]);
        if (isMounted) {
          setLeftData(lData);
          setRightData(rData);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadComparison();
    return () => {
      isMounted = false;
    };
  }, [leftCountry, rightCountry]);

  // Build comparison rows by unique technology name
  const allTechs = Array.from(new Set([
    ...leftData.map(d => d.technology),
    ...rightData.map(d => d.technology)
  ]));

  return (
    <div className="rp-block rp-tab-content active" key="tab-compare">
      {/* Country Selectors */}
      <div className="vs-container">
        <select
          className="vs-select"
          value={leftCountry}
          onChange={(e) => setLeftCountry(e.target.value)}
        >
          {availableCountries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="vs-divider">VS</span>
        <select
          className="vs-select"
          value={rightCountry}
          onChange={(e) => setRightCountry(e.target.value)}
        >
          {availableCountries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: '#666' }}>
          Loading comparison data...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allTechs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: '#888' }}>
          No salary records found for {leftCountry} and {rightCountry}.
        </div>
      )}

      {/* Comparison Rows */}
      {!isLoading && allTechs.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          {allTechs.map((tech) => {
            const l = leftData.find(d => d.technology === tech);
            const r = rightData.find(d => d.technology === tech);
            const lVal = l?.median ?? 0;
            const rVal = r?.median ?? 0;
            const maxVal = Math.max(lVal, rVal, 1);

            return (
              <div key={tech} className="compare-row">
                <div className="compare-row-header">
                  <span className="compare-tech">{tech}</span>
                </div>
                <div className="compare-bars">
                  <div className="compare-bar-wrap">
                    <div
                      className="compare-bar compare-bar--left"
                      style={{ width: `${(lVal / maxVal) * 100}%` }}
                    />
                    <span className="compare-val">
                      {l && l.median ? `${(lVal / 1000).toFixed(0)}k ${l.currency || ''}` : '—'}
                    </span>
                  </div>
                  <div className="compare-bar-wrap">
                    <div
                      className="compare-bar compare-bar--right"
                      style={{ width: `${(rVal / maxVal) * 100}%` }}
                    />
                    <span className="compare-val">
                      {r && r.median ? `${(rVal / 1000).toFixed(0)}k ${r.currency || ''}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

