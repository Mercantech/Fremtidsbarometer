import React from 'react';
import { useStore } from '../store/useStore';
import { Sparkles, Languages } from 'lucide-react';

export const Header: React.FC = () => {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);

  return (
    <header className="w-full h-20 px-[40px] flex items-center justify-between z-30 pointer-events-auto absolute top-0 left-0">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Fremtidsbarometer
          </h1>
          <p className="text-xs text-slate-500 font-medium">Live Spatial IT Data Radar</p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-4">
        {/* Language Switcher moved to LanguageSwitcher.tsx */}
      </div>
    </header>
  );
};
