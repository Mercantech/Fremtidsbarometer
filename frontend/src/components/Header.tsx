import React from 'react';
import { useStore } from '../store/useStore';
import { t } from '../utils/translations';

export const Header: React.FC = () => {
  const lang = useStore((s) => s.lang);

  return (
    <header className="w-full h-20 px-[40px] flex items-center justify-between z-30 pointer-events-auto absolute top-0 left-0">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Fremtidsbarometer
          </h1>
          <p className="text-xs text-slate-500 font-medium">{t('appSubtitle', lang)}</p>
        </div>
      </div>
    </header>
  );
};
