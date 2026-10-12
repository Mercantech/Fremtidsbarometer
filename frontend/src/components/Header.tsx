import React from 'react';
import { useStore } from '../store/useStore';
import { t } from '../utils/translations';

export const Header: React.FC = () => {
  const lang = useStore((s) => s.lang);

  return (
    <header className="w-full h-16 sm:h-20 px-5 sm:px-[40px] flex items-center justify-between z-30 pointer-events-none absolute top-0 left-0">
      <div className="flex items-center space-x-4 pointer-events-auto">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800">
            Fremtidsbarometer
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium">{t('appSubtitle', lang)}</p>
        </div>
      </div>
    </header>
  );
};
