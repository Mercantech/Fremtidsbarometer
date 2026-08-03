import React, { useState, useEffect, useRef } from 'react';
import { useStore, ERAS } from '../store/useStore';

export const RightPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rp-prof' | 'rp-lang'>('rp-prof');
  const currentEraIndex = useStore((s) => s.currentEraIndex);
  const hypeList = useStore((s) => s.hype);
  const era = ERAS[currentEraIndex];

  const stripSvgRef = useRef<SVGSVGElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const positionPanels = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const CX = W / 2;
      const CY = H / 2 + 40; // match globe shift
      const GLOBE_R = Math.min(W, H) * 0.28;

      const rightSvg = stripSvgRef.current;
      const rightPanel = rightPanelRef.current;
      
      if (!rightSvg || !rightPanel) return;

      // Position shelf harmoniously: center the panel vertically.
      // Panel is approx 420px tall, so start it roughly 210px above center, but no higher than 100px.
      const rightShelfY = Math.max(100, CY - 210); 
      // Dot 3mm from planet (25px offset)
      const pAngleR = -0.15; // less steep angle so it points naturally
      const rDotX = CX + Math.cos(pAngleR) * (GLOBE_R + 25); 
      const rDotY = CY + Math.sin(pAngleR) * (GLOBE_R + 25);
      
      const rightInset = 40;
      const panelWidth = 289; // 340px scaled by 0.85
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
      
      // Panel sits strictly under the horizontal segment of the blue line
      // The drip SVG extends 20px above the text, so adding 20px places the SVG exactly at the shelf line.
      rightPanel.style.right = rightInset + 'px'; 
      rightPanel.style.top = (rightShelfY + 20) + 'px';
    };

    window.addEventListener('resize', positionPanels);
    setTimeout(positionPanels, 100);
    return () => window.removeEventListener('resize', positionPanels);
  }, []);

  return (
    <>
      <svg id="right-strip-svg" ref={stripSvgRef}></svg>
      <div id="right-panel" ref={rightPanelRef}>

        {/* 01. Market Stats */}
        <div className="rp-block rp-block--stats">
          <div className="rp-title-wrap drip-left">
            <span className="rp-number">01</span>
            <span className="rp-title">Market Stats</span>
          </div>
          <div className="spatial-toggle" id="rp-toggle">
            <div 
              className={`toggle-btn ${activeTab === 'rp-prof' ? 'active' : ''}`} 
              onClick={() => setActiveTab('rp-prof')}
            >
              Roles
            </div>
            <div 
              className={`toggle-btn ${activeTab === 'rp-lang' ? 'active' : ''}`} 
              onClick={() => setActiveTab('rp-lang')}
            >
              Stack
            </div>
          </div>
          
          <div id="rp-prof" className={`rp-tab-content ${activeTab === 'rp-prof' ? 'active' : ''}`}>
            {era.stats.roles.map((r, i) => (
              <div key={i} className="rp-row">
                <span>{r[0]}</span> <span>{r[1]}</span>
              </div>
            ))}
          </div>
          <div id="rp-lang" className={`rp-tab-content ${activeTab === 'rp-lang' ? 'active' : ''}`}>
            {era.stats.stack.map((s, i) => (
              <div key={i} className="rp-row">
                <span>{s[0]}</span> <span>{s[1]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 02. Hype Radar */}
        <div className="rp-block">
          <div className="rp-title-wrap drip-right">
            <span className="rp-number">02</span>
            <span className="rp-title">Hype Radar</span>
          </div>
          <div className="hype-content">
            <div className="hype-topic" id="hype-topic">{era.stats.hypeTopic}</div>
            <div className="hype-desc" id="hype-desc">{era.stats.hypeDesc}</div>
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

        {/* 03. Compare */}
        <div className="rp-block">
          <div className="rp-title-wrap drip-mid">
            <span className="rp-number">03</span>
            <span className="rp-title">Compare</span>
          </div>
          <div className="vs-container">
            <select className="vs-select"><option>Global</option><option>USA</option></select>
            <span className="vs-divider">VS</span>
            <select className="vs-select" defaultValue="Denmark"><option>Denmark</option><option>Sweden</option></select>
          </div>
        </div>

      </div>
    </>
  );
};
