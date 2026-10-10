import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { globeState } from '../utils/globeState';
import { generateDispersedBatches } from '../utils/globeBatcher';

const escapeHtml = (str: string) =>
  String(str || '').replace(/[&<>'"]/g, (tag) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[tag] || tag));

export const BranchLabels: React.FC = () => {
  const viewMode = useStore((s) => s.viewMode);
  const liveTopics = useStore((s) => s.liveTopics);
  const activeFilters = useStore((s) => s.activeFilters);
  const setSelectedTopic = useStore((s) => s.setSelectedTopic);
  const globeConfig = useStore((s) => s.globeConfig);

  // Filter all live topics matching active filters (broadcast pins are always visible)
  const filteredTopics = useMemo(() => {
    return liveTopics.filter((t) => t.type === 'broadcast' || activeFilters.includes(t.type));
  }, [liveTopics, activeFilters]);

  // Generate spatially dispersed rotating batches
  const batches = useMemo(() => {
    return generateDispersedBatches(filteredTopics, globeConfig);
  }, [filteredTopics, globeConfig]);

  const [batchIndex, setBatchIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Clamp batchIndex if batches array length changes
  const activeBatchIndex = batchIndex % Math.max(1, batches.length);
  const currentBatch = useMemo(() => {
    return batches[activeBatchIndex] || [];
  }, [batches, activeBatchIndex]);

  const isHoveredRef = useRef<boolean>(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelEls = useRef<HTMLDivElement[]>([]);
  const pillEls = useRef<HTMLDivElement[]>([]);
  const lineEls = useRef<SVGLineElement[]>([]);
  const currentPosRef = useRef<{ x: number; y: number }[]>([]);
  const animRef = useRef<number>(0);

  // Handle batch rotation timer
  useEffect(() => {
    if (viewMode !== 'globe' || batches.length <= 1) return;

    const rotationIntervalSec = Math.max(5, globeConfig.batch_rotation_seconds || 15);
    const intervalMs = rotationIntervalSec * 1000;

    let timerId: number | null = null;

    const scheduleNext = () => {
      timerId = window.setTimeout(() => {
        // Check if user is hovering a label or dragging the globe
        const shouldPause = globeConfig.pause_on_hover && (isHoveredRef.current || globeState.isInteracting);
        if (shouldPause) {
          setIsPaused(true);
          // Retry check after 1 second
          scheduleNext();
          return;
        }

        setIsPaused(false);
        // Start cross-fade transition
        setIsTransitioning(true);

        // Fade out current items over 300ms
        labelEls.current.forEach((el) => {
          if (el) el.style.opacity = '0';
        });
        lineEls.current.forEach((line) => {
          if (line) line.setAttribute('opacity', '0');
        });

        window.setTimeout(() => {
          setBatchIndex((prev) => (prev + 1) % batches.length);
          setIsTransitioning(false);
        }, 320);
      }, intervalMs);
    };

    scheduleNext();

    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [viewMode, batches.length, globeConfig.batch_rotation_seconds, globeConfig.pause_on_hover, activeBatchIndex]);

  const getScreenDimensions = useCallback(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const CX = W / 2;
    const CY = H / 2 + 40; // Shifted down
    const GLOBE_R = Math.min(W, H) * 0.28;
    return { W, H, CX, CY, GLOBE_R };
  }, []);

  const latLngToScreen = useCallback(
    (lat: number, lng: number, rotY: number) => {
      const { H, CX, CY, GLOBE_R } = getScreenDimensions();
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

      // Perspective projection matching GlobeCanvas (PerspectiveCamera fov 42)
      const fovRad = (42 / 2) * (Math.PI / 180);
      const camDistInRadii = H / (2 * Math.tan(fovRad)) / GLOBE_R;
      const perspectiveFactor = camDistInRadii / Math.max(0.1, camDistInRadii - rz / GLOBE_R);

      return {
        x: CX + rx * perspectiveFactor,
        y: CY - y3 * perspectiveFactor,
        rz: rz,
        visible: rz > -10, // Visible if on front hemisphere
      };
    },
    [getScreenDimensions]
  );

  // Mount active batch DOM pills and SVG lines
  useEffect(() => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;

    svg.innerHTML = '';
    wrap.innerHTML = '';
    labelEls.current = [];
    pillEls.current = [];
    lineEls.current = [];
    currentPosRef.current = [];
    const timers: number[] = [];

    currentBatch.forEach((t, i) => {
      const div = document.createElement('div');
      div.className =
        'branch-label pointer-events-none select-none max-w-[200px] sm:max-w-[240px] transition-opacity duration-300';
      div.style.opacity = '0';
      div.style.pointerEvents = 'none';

      const isHot = Boolean(t.is_hot || t.meta?.is_hot);
      const borderStyle = isHot
        ? 'border: 1px solid rgba(255, 95, 31, 0.7); box-shadow: 0 0 12px rgba(255, 80, 0, 0.25);'
        : `border: 1px solid ${escapeHtml(t.color)}40;`;

      div.innerHTML = `
        <div class="branch-pill pointer-events-auto cursor-pointer max-w-[180px] sm:max-w-[220px] overflow-hidden hover:scale-105 transition-transform" style="${borderStyle} background: rgba(255,255,255,0.88); backdrop-filter: blur(8px);">
          <div class="branch-dot" style="background:${escapeHtml(t.color)}; box-shadow: 0 0 8px ${escapeHtml(t.color)}"></div>
          <span class="truncate min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap" style="color: #111; font-weight: 600;" title="${escapeHtml(t.topic)}">${escapeHtml(t.topic)}</span>
        </div>
        <div class="branch-country truncate max-w-[160px] overflow-hidden mx-auto" style="text-shadow: 0 2px 4px rgba(0,0,0,0.1)">${escapeHtml(t.country || '')}</div>
      `;

      const pill = div.querySelector('.branch-pill') as HTMLDivElement | null;
      if (pill) {
        pill.onclick = (e) => {
          e.stopPropagation();
          setSelectedTopic(t);
        };
        pill.onmouseenter = () => {
          isHoveredRef.current = true;
          if (globeConfig.pause_on_hover) setIsPaused(true);
        };
        pill.onmouseleave = () => {
          isHoveredRef.current = false;
          if (globeConfig.pause_on_hover) setIsPaused(false);
        };
        pillEls.current.push(pill);
      }

      wrap.appendChild(div);
      labelEls.current.push(div);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', isHot ? '#ff5500' : t.color);
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-dasharray', '4 4');
      line.setAttribute('opacity', '0');
      svg.appendChild(line);
      lineEls.current.push(line);

      const tid = window.setTimeout(() => {
        if (!isTransitioning) {
          div.style.opacity = '1';
          line.setAttribute('opacity', '0.6');
        }
      }, Math.min(40 + i * 25, 450));
      timers.push(tid);
    });

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [currentBatch, setSelectedTopic, isTransitioning, globeConfig.pause_on_hover]);

  // Animation frame loop for position projection and collision avoidance
  useEffect(() => {
    if (viewMode !== 'globe') return;

    const animate = () => {
      const { CX, CY, GLOBE_R } = getScreenDimensions();
      const positions: {
        x: number;
        y: number;
        visible: boolean;
        dx: number;
        dy: number;
        dist: number;
        rz: number;
        originalIdx: number;
      }[] = [];

      currentBatch.forEach((t, i) => {
        const pos = latLngToScreen(t.lat, t.lng, globeState.rotationY);
        const dx = pos.x - CX;
        const dy = pos.y - CY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        positions.push({ x: pos.x, y: pos.y, visible: pos.visible, dx, dy, dist, rz: pos.rz, originalIdx: i });
      });

      // Calculate target label positions with radial stacking
      const labelTargets = positions.map((p) => {
        if (!p.visible) return { x: 0, y: 0 };
        return {
          x: CX + (p.dx / p.dist) * (GLOBE_R * 1.02),
          y: CY + (p.dy / p.dist) * (GLOBE_R * 1.02),
        };
      });

      // Repulsive collision resolution with elliptical bounds matching wide rectangular pills
      for (let iter = 0; iter < 8; iter++) {
        for (let i = 0; i < labelTargets.length; i++) {
          if (!positions[i].visible) continue;
          for (let j = i + 1; j < labelTargets.length; j++) {
            if (!positions[j].visible) continue;

            const dx = labelTargets[i].x - labelTargets[j].x;
            const dy = labelTargets[i].y - labelTargets[j].y;
            const normDist = Math.sqrt((dx / 130) ** 2 + (dy / 38) ** 2);

            if (normDist > 0 && normDist < 1.0) {
              const pushFactor = (1.0 - normDist) * 10;
              const angle = Math.atan2(dy, dx);

              labelTargets[i].x += Math.cos(angle) * pushFactor * 1.5;
              labelTargets[i].y += Math.sin(angle) * pushFactor;
              labelTargets[j].x -= Math.cos(angle) * pushFactor * 1.5;
              labelTargets[j].y -= Math.sin(angle) * pushFactor;
            }
          }
        }
      }

      currentBatch.forEach((_, i) => {
        const label = labelEls.current[i];
        const line = lineEls.current[i];
        const pill = pillEls.current[i];
        if (!label || !line) return;

        const pos = positions[i];

        if (!pos.visible) {
          label.style.opacity = '0';
          line.setAttribute('opacity', '0');
          label.style.pointerEvents = 'none';
          if (pill) pill.style.pointerEvents = 'none';
          return;
        }

        const target = labelTargets[i];

        // Smooth interpolation (lerp) to prevent jittering
        let currentPos = currentPosRef.current[i];
        if (!currentPos) {
          currentPos = { x: target.x, y: target.y };
          currentPosRef.current[i] = currentPos;
        }

        const LERP_FACTOR = 0.05;
        currentPos.x += (target.x - currentPos.x) * LERP_FACTOR;
        currentPos.y += (target.y - currentPos.y) * LERP_FACTOR;

        const lx = currentPos.x;
        const ly = currentPos.y;

        label.style.left = lx + 'px';
        label.style.top = ly + 'px';

        // Smooth opacity fade based on depth (rz)
        const edgeThreshold = GLOBE_R * 0.15;
        let fade = 0;
        if (pos.rz > edgeThreshold) {
          fade = 1;
        } else if (pos.rz > -10) {
          fade = (pos.rz + 10) / (edgeThreshold + 10);
        }

        label.style.opacity = String(fade);
        label.style.pointerEvents = 'none';
        if (pill) {
          pill.style.pointerEvents = fade > 0.5 ? 'auto' : 'none';
          pill.style.cursor = fade > 0.5 ? 'pointer' : 'default';
        }

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
  }, [viewMode, currentBatch, getScreenDimensions, latLngToScreen]);

  if (viewMode !== 'globe') return null;

  return (
    <>
      <svg ref={svgRef} className="branches" style={{ pointerEvents: 'none' }} />
      <div ref={wrapRef} id="labels-wrap" style={{ pointerEvents: 'none' }} />

      {/* Discrete Radar Batch Status Pill (Apple HIG Minimalist Glassmorphism) */}
      {batches.length > 1 && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white/85 select-none shadow-lg transition-all hover:bg-black/60">
          <span
            className={`w-2 h-2 rounded-full ${
              isPaused ? 'bg-amber-400' : 'bg-cyan-400 animate-pulse'
            }`}
          />
          <span className="font-medium tracking-wide">
            Radar Batch {activeBatchIndex + 1}/{batches.length}
          </span>
          <span className="text-white/30">•</span>
          <span className="text-white/60">{currentBatch.length} pins</span>
          {isPaused ? (
            <span className="text-amber-300 font-medium ml-1">⏸ Paused</span>
          ) : (
            <span className="text-cyan-300/80 font-mono text-[10px] ml-1">
              {globeConfig.batch_rotation_seconds || 15}s
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setBatchIndex((prev) => (prev + 1) % batches.length);
            }}
            className="ml-1 text-white/50 hover:text-white px-1.5 py-0.5 hover:bg-white/10 rounded transition cursor-pointer"
            title="Next batch"
          >
            ⏭
          </button>
        </div>
      )}
    </>
  );
};
