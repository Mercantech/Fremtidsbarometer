import React from 'react';
import { Link } from "react-router-dom";

export const Header: React.FC = () => {
  return (
    <header className="w-full h-20 px-[40px] flex items-center justify-between z-30 pointer-events-auto absolute top-0 left-0">
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Fremtidsbarometer
          </h1>
          <p className="text-xs text-slate-500 font-medium">Live Spatial IT Data Radar</p>
        </div>
        <div>
          <Link
          to="/login"
          className="
            px-[33px] py-[9px]
            rounded-lg
            bg-slate-800
            text-white
            text-base
            font-medium
            transition-all
            hover:bg-slate-700
            hover:scale-105
            active:scale-95
            ml-10
          "
        >
          Log-in
        </Link>
        </div>
      </div>
    </header>
  );
};
