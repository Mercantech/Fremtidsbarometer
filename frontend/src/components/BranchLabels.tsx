import React, { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

export const globeState = { rotationY: 0 };

export const BranchLabels: React.FC = () => {
  const viewMode = useStore((s) => s.viewMode);
  const liveTopics = useStore((s) => s.liveTopics);
  const setSelectedTopic = useStore((s) => s.setSelectedTopic);

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelEls = useRef<HTMLDivElement[]>([]);
  const lineEls = useRef<SVGLineElement[]>([]);
  const animRef = useRef<number>(0);

  const getScreenDimensions = useCallback(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const CX = W / 2;
    const CY = H / 2 + 40; // Shifted down
    const GLOBE_R = Math.min(W, H) * 0.28;
    return { W, H, CX, CY, GLOBE_R };
  }, []);

  const latLngToScreen = useCallback((lat: number, lng: number, rotY: number) => {
    const { CX, CY, GLOBE_R } = getScreenDimensions();
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lng + 180) * Math.PI / 180;
    const x3 = -GLOBE_R * Math.sin(phi) * Math.cos(theta);
    const z3 = GLOBE_R * Math.sin(phi) * Math.sin(theta);
    const y3 = GLOBE_R * Math.cos(phi);
    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);
    const rx = x3 * cosR + z3 * sinR;
    const rz = -x3 * sinR + z3 * cosR;
    
    return {
      x: CX + rx,
      y: CY - y3,
      visible: rz > -(GLOBE_R * 0.15)
    };
  }, [getScreenDimensions]);

  useEffect(() => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;

    svg.innerHTML = '';
    wrap.innerHTML = '';
    labelEls.current = [];
    lineEls.current = [];

    liveTopics.forEach((t, i) => {
      const div = document.createElement('div');
      div.className = 'branch-label';
      div.style.opacity = '0';
      // Make it clickable
      div.style.pointerEvents = 'auto';
      div.style.cursor = 'pointer';
      
      div.innerHTML = `
        <div class="branch-pill hover:scale-105 transition-transform" style="border: 1px solid ${t.color}40; background: rgba(255,255,255,0.85); backdrop-filter: blur(8px);">
          <div class="branch-dot" style="background:${t.color}; box-shadow: 0 0 8px ${t.color}"></div>
          <span style="color: #111; font-weight: 600;">${t.topic}</span>
        </div>
        <div class="branch-country" style="text-shadow: 0 2px 4px rgba(0,0,0,0.1)">${t.country}</div>
      `;
      
      div.onclick = () => setSelectedTopic(t);
      
      wrap.appendChild(div);
      labelEls.current.push(div);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', t.color);
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-dasharray', '4 4');
      line.setAttribute('opacity', '0');
      svg.appendChild(line);
      lineEls.current.push(line);

      setTimeout(() => {
        div.style.opacity = '1';
        line.setAttribute('opacity', '0.6');
      }, 60 + i * 40);
    });
  }, [liveTopics, setSelectedTopic]);

  useEffect(() => {
    if (viewMode !== 'globe') return;

    const animate = () => {
      const { W, CX, CY, GLOBE_R } = getScreenDimensions();

      liveTopics.forEach((t, i) => {
        const label = labelEls.current[i];
        const line = lineEls.current[i];
        if (!label || !line) return;

        const pos = latLngToScreen(t.lat, t.lng, globeState.rotationY);

        if (!pos.visible) {
          label.style.opacity = '0';
          line.setAttribute('opacity', '0');
          label.style.pointerEvents = 'none';
          return;
        }

        const dx = pos.x - CX;
        const dy = pos.y - CY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // Controlled, uniform spread to avoid chaos. 
        // We use 1.05x radius to keep them closer to the atmosphere
        const spread = GLOBE_R * 1.05 + (i % 3) * (GLOBE_R * 0.04);
        const lx = CX + (dx / dist) * spread;
        const ly = CY + (dy / dist) * spread;

        label.style.left = lx + 'px';
        label.style.top = ly + 'px';
        
        // Edge fade logic (fade out if too close to Left Panel, Right Panel, or Timeline)
        // Left Panel edge ~ 420px, Right Panel edge ~ W - 420px, Top Timeline edge ~ 150px
        const distFromLeft = lx;
        const distFromRight = W - lx;
        const distFromTop = ly;
        const edgeFade = Math.min(1, Math.max(0, (distFromLeft - 380) / 100)) *
                         Math.min(1, Math.max(0, (distFromRight - 380) / 100)) *
                         Math.min(1, Math.max(0, (distFromTop - 150) / 80));

        const fade = Math.min(1, (pos.visible ? 1 : 0) * 1.5) * edgeFade;
        label.style.opacity = String(fade);
        label.style.pointerEvents = fade > 0.5 ? 'auto' : 'none';

        line.setAttribute('x1', String(pos.x));
        line.setAttribute('y1', String(pos.y));
        line.setAttribute('x2', String(lx));
        line.setAttribute('y2', String(ly));
        line.setAttribute('opacity', String(fade * 0.5));
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [viewMode, liveTopics, getScreenDimensions, latLngToScreen]);

  if (viewMode !== 'globe') return null;

  return (
    <>
      <svg ref={svgRef} className="branches" style={{pointerEvents: 'none'}} />
      <div ref={wrapRef} id="labels-wrap" style={{pointerEvents: 'none'}} />
    </>
  );
};
