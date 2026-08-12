import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

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
  const countries = useStore((s) => s.countries);
  
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

  const compareCountries = countries.filter(c => c !== 'GLOBAL');
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
          <div className="rp-block rp-tab-content active" key="tab-hype">
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


/* ── Isolated Compare Tab Component ── */
const COMPARE_FALLBACK: Record<string, { tech: string; median: number; currency: string }[]> = {
  DK: [
    { tech: 'Go', median: 65000, currency: 'DKK' },
    { tech: 'Python', median: 62000, currency: 'DKK' },
    { tech: 'React', median: 55000, currency: 'DKK' },
    { tech: 'Kubernetes', median: 72000, currency: 'DKK' },
    { tech: 'Rust', median: 68000, currency: 'DKK' },
  ],
  US: [
    { tech: 'Go', median: 165000, currency: 'USD' },
    { tech: 'Python', median: 155000, currency: 'USD' },
    { tech: 'React', median: 140000, currency: 'USD' },
    { tech: 'Kubernetes', median: 175000, currency: 'USD' },
    { tech: 'Rust', median: 180000, currency: 'USD' },
  ],
  DE: [
    { tech: 'Go', median: 75000, currency: 'EUR' },
    { tech: 'Python', median: 70000, currency: 'EUR' },
    { tech: 'React', median: 62000, currency: 'EUR' },
    { tech: 'Kubernetes', median: 80000, currency: 'EUR' },
    { tech: 'Rust', median: 78000, currency: 'EUR' },
  ],
  SE: [
    { tech: 'Go', median: 60000, currency: 'SEK' },
    { tech: 'Python', median: 58000, currency: 'SEK' },
    { tech: 'React', median: 52000, currency: 'SEK' },
    { tech: 'Kubernetes', median: 65000, currency: 'SEK' },
    { tech: 'Rust', median: 63000, currency: 'SEK' },
  ],
  NO: [
    { tech: 'Go', median: 70000, currency: 'NOK' },
    { tech: 'Python', median: 67000, currency: 'NOK' },
    { tech: 'React', median: 60000, currency: 'NOK' },
    { tech: 'Kubernetes', median: 76000, currency: 'NOK' },
    { tech: 'Rust', median: 72000, currency: 'NOK' },
  ],
};

const COMPARE_COUNTRIES = [
  { code: 'DK', label: 'Denmark' },
  { code: 'US', label: 'USA' },
  { code: 'DE', label: 'Germany' },
  { code: 'SE', label: 'Sweden' },
  { code: 'NO', label: 'Norway' },
];

const CompareTab: React.FC = () => {
  const [leftCountry, setLeftCountry] = useState('DK');
  const [rightCountry, setRightCountry] = useState('US');

  const leftData = COMPARE_FALLBACK[leftCountry] || [];
  const rightData = COMPARE_FALLBACK[rightCountry] || [];

  // Build comparison rows by tech name
  const allTechs = [...new Set([...leftData.map(d => d.tech), ...rightData.map(d => d.tech)])];

  return (
    <div className="rp-block rp-tab-content active" key="tab-compare">
      {/* Country Selectors */}
      <div className="vs-container">
        <select
          className="vs-select"
          value={leftCountry}
          onChange={(e) => setLeftCountry(e.target.value)}
        >
          {COMPARE_COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <span className="vs-divider">VS</span>
        <select
          className="vs-select"
          value={rightCountry}
          onChange={(e) => setRightCountry(e.target.value)}
        >
          {COMPARE_COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Comparison Rows */}
      <div style={{ marginTop: '12px' }}>
        {allTechs.map((tech) => {
          const l = leftData.find(d => d.tech === tech);
          const r = rightData.find(d => d.tech === tech);
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
                  <span className="compare-val">{l ? `${(lVal / 1000).toFixed(0)}k ${l.currency}` : '—'}</span>
                </div>
                <div className="compare-bar-wrap">
                  <div
                    className="compare-bar compare-bar--right"
                    style={{ width: `${(rVal / maxVal) * 100}%` }}
                  />
                  <span className="compare-val">{r ? `${(rVal / 1000).toFixed(0)}k ${r.currency}` : '—'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

