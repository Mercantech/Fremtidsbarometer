import React from 'react';
import { Link } from 'react-router-dom';
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

      {/* Action Controls */}
      <div className="flex items-center space-x-4">
        <Link
          to="/admin"
          className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-white/80 hover:bg-white hover:text-slate-900 border border-slate-200 shadow-sm backdrop-blur-md transition-all flex items-center gap-1.5"
          title="Open Administration Panel"
        >
          <span>⚙️</span>
          <span>{t('admin', lang)}</span>
        </Link>
      </div>
    </header>
  );
};
