import React from 'react';
import { useStore } from '../store/useStore';
import { Languages } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);

  return (
    <div 
      className="absolute z-40 flex items-center space-x-1 bg-[#111] p-1 rounded-[20px] shadow-[0_16px_32px_rgba(0,0,0,0.3)]" 
      style={{ bottom: '40px', left: '40px' }}
    >
      <div className="pl-2.5 pr-1.5 flex items-center justify-center border-r border-white/20">
        <Languages className="w-3.5 h-3.5 text-white/50" />
      </div>
      
      <button
        onClick={() => setLang('en')}
        className={`px-3 py-1.5 rounded-[16px] font-black text-xs tracking-wider transition-all ${
          lang === 'en' 
            ? 'bg-[#ffd000] text-[#111] shadow-[0_0_10px_rgba(255,208,0,0.5)]' 
            : 'text-white hover:bg-white/10'
        }`}
      >
        EN
      </button>

      <button
        onClick={() => setLang('da')}
        className={`px-3 py-1.5 rounded-[16px] font-black text-xs tracking-wider transition-all ${
          lang === 'da' 
            ? 'bg-[#ffd000] text-[#111] shadow-[0_0_10px_rgba(255,208,0,0.5)]' 
            : 'text-white hover:bg-white/10'
        }`}
      >
        DA
      </button>
    </div>
  );
};
