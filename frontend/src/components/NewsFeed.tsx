import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { t } from '../utils/translations';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, BookOpen, Clock } from 'lucide-react';
import type { EraChronicleItem } from '../services/api';

export const NewsFeed: React.FC = () => {
  const news = useStore((s) => s.news);
  const isLoadingNews = useStore((s) => s.isLoadingNews);
  const currentYear = useStore((s) => s.currentYear);
  const currentEraIndex = useStore((s) => s.currentEraIndex);
  const eras = useStore((s) => s.eras);
  const setCurrentYear = useStore((s) => s.setCurrentYear);
  const setIsDossierOpen = useStore((s) => s.setIsDossierOpen);
  const lang = useStore((s) => s.lang);
  
  const stripSvgRef = useRef<SVGSVGElement>(null);
  const newsChatRef = useRef<HTMLDivElement>(null);
  const newsLabelRef = useRef<HTMLDivElement>(null);

  const era = eras[currentEraIndex];
  const isHistoricalMode = currentYear < 2026;
  const moodColor = (era?.stats?.moodColor as string) || (currentYear < 1970 ? '#e6a23c' : currentYear < 1980 ? '#00d4aa' : currentYear < 1990 ? '#4facfe' : currentYear < 2010 ? '#ff8c00' : currentYear < 2020 ? '#a855f7' : '#ff2a85');
  const eraTitle = lang === 'da' ? (era?.stats?.title_da as string || era?.title) : era?.title;
  const eraIcon = (era?.stats?.icon as string) || '📼';
  const chronicleItems: EraChronicleItem[] = (era?.stats?.chronicle as EraChronicleItem[]) || [];
  
  useEffect(() => {
    const positionPanels = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const CX = W / 2;
      const CY = H / 2 + 40; // match globe shift
      const GLOBE_R = Math.min(W, H) * 0.28;

      const stripSvg = stripSvgRef.current;
      const newsChat = newsChatRef.current;
      const newsLabel = newsLabelRef.current;
      
      if (!stripSvg || !newsChat || !newsLabel) return;
      
      const leftShelfY = 90; 
      const chatLeft = 40; 
      const chatW = newsChat.offsetWidth || 300; 
      const shelfEndX = chatLeft + chatW;
      
      const pAngleL = -(Math.PI - 0.7); 
      // Dot 3mm from planet (25px offset)
      const lDotX = CX + Math.cos(pAngleL) * (GLOBE_R + 25); 
      const lDotY = CY + Math.sin(pAngleL) * (GLOBE_R + 25);

      const lineColor = isHistoricalMode ? moodColor : '#ff2a85';

      stripSvg.innerHTML = `
        <defs>
          <linearGradient id="fadeLeft" x1="${lDotX}" y1="${lDotY}" x2="${chatLeft}" y2="${leftShelfY}" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="${lineColor}" stop-opacity="1" />
            <stop offset="100%" stop-color="${lineColor}" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path d="M ${lDotX} ${lDotY} L ${shelfEndX} ${leftShelfY} L ${chatLeft} ${leftShelfY}" fill="none" stroke="url(#fadeLeft)" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="${lDotX}" cy="${lDotY}" r="3.5" fill="${lineColor}" />
      `;

      newsLabel.style.left = chatLeft + 'px'; 
      newsLabel.style.top = (leftShelfY - 30) + 'px';
      newsChat.style.left = chatLeft + 'px'; 
      newsChat.style.top = (leftShelfY + 30) + 'px';
    };

    window.addEventListener('resize', positionPanels);
    const timerId = window.setTimeout(positionPanels, 100);
    
    return () => {
      window.removeEventListener('resize', positionPanels);
      window.clearTimeout(timerId);
    };
  }, [isHistoricalMode, moodColor]);

  return (
    <>
      <svg id="news-strip-svg" ref={stripSvgRef}></svg>
      <div id="news-label" ref={newsLabelRef}>
        <div className="news-label-title">
          {isHistoricalMode ? `${eraIcon} ${eraTitle || t('archiveMode', lang)}` : t('hotInIt', lang)}
        </div>
        <div className="news-label-sub">
          {isHistoricalMode ? `${t('archiveMode', lang)} • ${currentYear}` : t('liveFeed', lang)}
        </div>
      </div>

      <div
        id="news-chat"
        ref={newsChatRef}
        style={
          isHistoricalMode
            ? {
                borderColor: `${moodColor}50`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${moodColor}25`,
              }
            : undefined
        }
      >
        {/* Chat Header */}
        <div className="chat-header">
          <div
            className="chat-header-dot"
            style={
              isHistoricalMode
                ? {
                    background: moodColor,
                    boxShadow: `0 0 8px ${moodColor}`,
                  }
                : undefined
            }
          />
          <div className="chat-header-title">
            {isHistoricalMode ? `${t('archiveMode', lang)} (${currentYear})` : 'IT Feed'}
          </div>
          <div className="chat-header-sub" id="chat-timer">
            {isHistoricalMode ? 'archive' : isLoadingNews ? t('loading', lang) : 'live'}
          </div>
        </div>

        {/* Historical Notice & Quick Return Button */}
        {isHistoricalMode && (
          <div className="mx-3 mt-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-white/70 flex items-center gap-1">
                <Clock size={12} style={{ color: moodColor }} />
                {t('archiveNotice', lang)}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => setCurrentYear(2026)}
                className="flex-1 py-1 px-2.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <RotateCcw size={12} />
                {t('returnToPresent', lang)}
              </button>
              <button
                onClick={() => setIsDossierOpen(true)}
                className="py-1 px-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                title={t('eraDossier', lang)}
              >
                <BookOpen size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="chat-messages" id="chat-messages">
          <AnimatePresence>
            {/* If in Historical Archive mode */}
            {isHistoricalMode ? (
              chronicleItems.length === 0 ? (
                <div className="chat-msg">
                  <div className="chat-bubble">
                    {t('archiveNotice', lang)} ({currentYear})
                  </div>
                  <div className="chat-meta">Chronicle · {currentYear}</div>
                </div>
              ) : (
                chronicleItems.map((item, index) => {
                  const headline = lang === 'da' ? item.headline_da || item.headline : item.headline;
                  const snippet = lang === 'da' ? item.snippet_da || item.snippet : item.snippet;
                  return (
                    <motion.div
                      key={`${item.year}-${index}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setIsDossierOpen(true)}
                      className="chat-msg cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <div className="chat-bubble" style={{ borderLeft: `3px solid ${moodColor}` }}>
                        <div className="font-semibold text-white/95 text-xs mb-1">{headline}</div>
                        <div className="text-[11px] text-white/70 leading-relaxed">{snippet}</div>
                      </div>
                      <div className="chat-meta flex items-center justify-between">
                        <span>{item.tag} · {item.year}</span>
                        <span className="text-[10px] text-cyan-400 font-mono">Dossier →</span>
                      </div>
                    </motion.div>
                  );
                })
              )
            ) : (
              /* Live Real-time News mode */
              <>
                {news.length === 0 && !isLoadingNews && (
                  <div className="chat-msg">
                    <div className="chat-bubble">Waiting for live news update...</div>
                    <div className="chat-meta">System · just now</div>
                  </div>
                )}
                {isLoadingNews && news.length === 0 && (
                  <div className="chat-msg">
                    <div className="chat-bubble">Loading data...</div>
                    <div className="chat-meta">System · just now</div>
                  </div>
                )}
                {news.map((item, index) => (
                  <motion.a
                    key={item.id || index}
                    href={item.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="chat-msg"
                  >
                    <div className="chat-bubble">{item.title}</div>
                    <div className="chat-meta">
                      {item.source || 'IT News'} · {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </div>
                  </motion.a>
                ))}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};
