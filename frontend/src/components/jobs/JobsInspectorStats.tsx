import React from 'react';
import { Briefcase, MapPin, DollarSign, Building } from 'lucide-react';
import type { AdminJobsStats } from '../../services/adminApi';

interface JobsInspectorStatsProps {
  stats: AdminJobsStats | null;
}

export const JobsInspectorStats: React.FC<JobsInspectorStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-5 rounded-2xl bg-[#14121a] border border-white/10 space-y-1">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Total Vacancies</span>
          <Briefcase className="w-4 h-4 text-slate-500" />
        </div>
        <div className="text-2xl font-black text-white font-mono">
          {stats ? stats.total_jobs.toLocaleString() : '—'}
        </div>
        <p className="text-[11px] text-slate-500">Global IT sources & Jobindex DK</p>
      </div>

      <div className="p-5 rounded-2xl bg-[#14121a] border border-cyan-500/20 space-y-1">
        <div className="flex items-center justify-between text-cyan-300 text-xs font-semibold">
          <span>🇩🇰 Danish Tech Jobs</span>
          <MapPin className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-2xl font-black text-cyan-400 font-mono">
          {stats ? stats.danish_jobs.toLocaleString() : '—'}
        </div>
        <p className="text-[11px] text-slate-400">Viborg, Aarhus, Copenhagen, etc.</p>
      </div>

      <div className="p-5 rounded-2xl bg-[#14121a] border border-emerald-500/20 space-y-1">
        <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold">
          <span>Transparent Salary</span>
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-black text-emerald-400 font-mono">
          {stats ? stats.salary_disclosed_count.toLocaleString() : '—'}
        </div>
        <p className="text-[11px] text-slate-400">Disclosed compensation brackets</p>
      </div>

      <div className="p-5 rounded-2xl bg-[#14121a] border border-amber-500/20 space-y-1">
        <div className="flex items-center justify-between text-amber-300 text-xs font-semibold">
          <span>Key Hubs in DK</span>
          <Building className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xs text-slate-300 font-mono pt-1">
          {stats && stats.top_cities.length > 0
            ? stats.top_cities.slice(0, 3).map((c) => `${c.city} (${c.count})`).join(', ')
            : 'Indexed across Denmark'}
        </div>
        <p className="text-[11px] text-slate-500">Viborg & Central Denmark Region</p>
      </div>
    </div>
  );
};
