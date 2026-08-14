import React, { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

export const globeState = { rotationY: 0 };

export const BranchLabels: React.FC = () => {
  const viewMode = useStore((s) => s.viewMode);
  const liveTopics = useStore((s) => s.liveTopics);
  const activeFilters = useStore((s) => s.activeFilters);
  const setSelectedTopic = useStore((s) => s.setSelectedTopic);

  const filteredTopics = liveTopics.filter(t => activeFilters.includes(t.type));

  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelEls = useRef<HTMLDivElement[]>([]);
  const lineEls = useRef<SVGLineElement[]>([]);
  const currentPosRef = useRef<{x: number, y: number}[]>([]);
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
    const radLat = lat * (Math.PI / 180);
    const radLng = lng * (Math.PI / 180);

    const x3 = GLOBE_R * Math.cos(radLat) * Math.sin(radLng);
    const y3 = GLOBE_R * Math.sin(radLat);
    const z3 = GLOBE_R * Math.cos(radLat) * Math.cos(radLng);

    // Rotate point by camera azimuthal angle rotY
    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);
    const rx = x3 * cosR - z3 * sinR;
    const rz = x3 * sinR + z3 * cosR;
    
    return {
      x: CX + rx,
      y: CY - y3,
      rz: rz,
      visible: rz > -10 // Visible if on front hemisphere
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

    filteredTopics.forEach((t, i) => {
      const div = document.createElement('div');
      div.className = 'branch-label';
      div.style.opacity = '0';
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
  }, [filteredTopics, setSelectedTopic]);

  useEffect(() => {
    if (viewMode !== 'globe') return;

    const animate = () => {
      const { CX, CY, GLOBE_R } = getScreenDimensions();
      const positions: { x: number, y: number, visible: boolean, dx: number, dy: number, dist: number, rz: number, originalIdx: number }[] = [];

      filteredTopics.forEach((t, i) => {
        const pos = latLngToScreen(t.lat, t.lng, globeState.rotationY);
        const dx = pos.x - CX;
        const dy = pos.y - CY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        positions.push({ x: pos.x, y: pos.y, visible: pos.visible, dx, dy, dist, rz: pos.rz, originalIdx: i });
      });

      // Calculate target label positions with collision avoidance (radial stacking)
      const labelTargets = positions.map(p => {
        if (!p.visible) return { x: 0, y: 0 };
        return {
          x: CX + (p.dx / p.dist) * (GLOBE_R * 1.02),
          y: CY + (p.dy / p.dist) * (GLOBE_R * 1.02)
        };
      });

      // Repulsive collision resolution to spread them apart sideways
      const PADDING = 45; // Increase padding to spread them out more
      for (let iter = 0; iter < 4; iter++) {
        for (let i = 0; i < labelTargets.length; i++) {
          if (!positions[i].visible) continue;
          for (let j = i + 1; j < labelTargets.length; j++) {
            if (!positions[j].visible) continue;
            
            const dx = labelTargets[i].x - labelTargets[j].x;
            const dy = labelTargets[i].y - labelTargets[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0 && dist < PADDING) {
              // Softened push force to prevent aggressive bouncing
              const pushFactor = (PADDING - dist) * 0.15;
              const angle = Math.atan2(dy, dx);
              
              labelTargets[i].x += Math.cos(angle) * pushFactor;
              labelTargets[i].y += Math.sin(angle) * pushFactor;
              labelTargets[j].x -= Math.cos(angle) * pushFactor;
              labelTargets[j].y -= Math.sin(angle) * pushFactor;
            }
          }
        }
      }

      filteredTopics.forEach((_, i) => {
        const label = labelEls.current[i];
        const line = lineEls.current[i];
        if (!label || !line) return;

        const pos = positions[i];

        if (!pos.visible) {
          label.style.opacity = '0';
          line.setAttribute('opacity', '0');
          label.style.pointerEvents = 'none';
          return;
        }

        const target = labelTargets[i];
        
        // Smooth interpolation (lerp) to prevent jittering
        let currentPos = currentPosRef.current[i];
        if (!currentPos) {
            currentPos = { x: target.x, y: target.y };
            currentPosRef.current[i] = currentPos;
        }
        
        const LERP_FACTOR = 0.04; // Extremely smooth factor to completely kill micro-jitter
        currentPos.x += (target.x - currentPos.x) * LERP_FACTOR;
        currentPos.y += (target.y - currentPos.y) * LERP_FACTOR;

        const lx = currentPos.x;
        const ly = currentPos.y;

        label.style.left = lx + 'px';
        label.style.top = ly + 'px';
        
        // Smooth opacity fade based on depth (rz)
        // rz goes from roughly +GLOBE_R (front) to 0 (edge) to -GLOBE_R (back)
        const edgeThreshold = GLOBE_R * 0.15;
        let fade = 0;
        if (pos.rz > edgeThreshold) {
            fade = 1;
        } else if (pos.rz > -10) {
            fade = (pos.rz + 10) / (edgeThreshold + 10);
        }
        
        label.style.opacity = String(fade);
        label.style.pointerEvents = fade > 0.5 ? 'auto' : 'none';

        line.setAttribute('x1', String(pos.x));
        line.setAttribute('y1', String(pos.y));
        line.setAttribute('x2', String(lx));
        line.setAttribute('y2', String(ly));
        line.setAttribute('opacity', String(fade * 0.6));
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [viewMode, filteredTopics, getScreenDimensions, latLngToScreen]);

  if (viewMode !== 'globe') return null;

  return (
    <>
      <svg ref={svgRef} className="branches" style={{pointerEvents: 'none'}} />
      <div ref={wrapRef} id="labels-wrap" style={{pointerEvents: 'none'}} />
    </>
  );
};
