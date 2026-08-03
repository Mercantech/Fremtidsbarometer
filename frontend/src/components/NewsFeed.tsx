import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

export const NewsFeed: React.FC = () => {
  const news = useStore((s) => s.news);
  const isLoadingNews = useStore((s) => s.isLoadingNews);
  
  const stripSvgRef = useRef<SVGSVGElement>(null);
  const newsChatRef = useRef<HTMLDivElement>(null);
  const newsLabelRef = useRef<HTMLDivElement>(null);
  
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

      stripSvg.innerHTML = `
        <defs>
          <linearGradient id="fadeLeft" x1="${lDotX}" y1="${lDotY}" x2="${chatLeft}" y2="${leftShelfY}" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ff2a85" stop-opacity="1" />
            <stop offset="100%" stop-color="#ff2a85" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path d="M ${lDotX} ${lDotY} L ${shelfEndX} ${leftShelfY} L ${chatLeft} ${leftShelfY}" fill="none" stroke="url(#fadeLeft)" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="${lDotX}" cy="${lDotY}" r="3.5" fill="#ff2a85" />
      `;

      newsLabel.style.left = chatLeft + 'px'; 
      newsLabel.style.top = (leftShelfY - 30) + 'px';
      newsChat.style.left = chatLeft + 'px'; 
      newsChat.style.top = (leftShelfY + 30) + 'px'; // increased from + 15 to + 30 for 5mm visual gap
    };

    window.addEventListener('resize', positionPanels);
    setTimeout(positionPanels, 100);
    
    return () => window.removeEventListener('resize', positionPanels);
  }, []);

  return (
    <>
      <svg id="news-strip-svg" ref={stripSvgRef}></svg>
      <div id="news-label" ref={newsLabelRef}>
        <div className="news-label-title">What's hot in IT right now</div>
        <div className="news-label-sub">live feed</div>
      </div>
      <div id="news-chat" ref={newsChatRef}>
        <div className="chat-header">
          <div className="chat-header-dot"></div>
          <div className="chat-header-title">IT Feed</div>
          <div className="chat-header-sub" id="chat-timer">{isLoadingNews ? 'loading...' : 'live'}</div>
        </div>
        <div className="chat-messages" id="chat-messages">
          <AnimatePresence>
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
              <motion.div
                key={item.id || index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="chat-msg"
              >
                <div className="chat-bubble">{item.title}</div>
                <div className="chat-meta">
                  {item.source || 'IT News'} · {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};
