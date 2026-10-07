import React from 'react';
import { useStore } from '../store/useStore';
import { X, TrendingUp, Briefcase, DollarSign, Building2, MapPin, ExternalLink, Globe } from 'lucide-react';

export const TopicDetailsModal: React.FC = () => {
  const selectedTopic = useStore((s) => s.selectedTopic);
  const setSelectedTopic = useStore((s) => s.setSelectedTopic);
  const allJobs = useStore((s) => s.jobs);
  const allSalaries = useStore((s) => s.salary);

  if (!selectedTopic) return null;

  const targetCountry = selectedTopic.country || 'DK';

  // Country-level aggregated data
  const countryJobs = allJobs.filter(
    (j) => (j.country || 'DK').toUpperCase() === targetCountry.toUpperCase()
  );

  const countrySalaries = allSalaries.filter(
    (s) => (s.country || 'DK').toUpperCase() === targetCountry.toUpperCase()
  );

  // Calculate median benchmark for this country if available
  const medianValues = countrySalaries.map((s) => s.median).filter((v): v is number => typeof v === 'number');
  const avgMedianSalary = medianValues.length > 0
    ? Math.round(medianValues.reduce((a, b) => a + b, 0) / medianValues.length)
    : selectedTopic.meta?.medianSalary || null;

  // Extract hiring companies in this country
  const hiringCompanies = Array.from(
    new Set(countryJobs.map((j) => j.company).filter((c): c is string => Boolean(c)))
  ).slice(0, 5);

  const Icon = selectedTopic.type === 'job' 
    ? Briefcase 
    : selectedTopic.type === 'salary' 
      ? DollarSign 
      : TrendingUp;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => setSelectedTopic(null)}
      />
      
      {/* Modal Card */}
      <div 
        className="relative bg-[#f8f6f1] w-full max-w-lg rounded-3xl shadow-2xl border-2 border-[#111] overflow-hidden flex flex-col max-h-[90vh]"
        style={{ animation: 'msgIn 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#111]/10 bg-white/70">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md flex-shrink-0"
              style={{ backgroundColor: selectedTopic.color }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 uppercase tracking-wider text-base flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {targetCountry}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                  {selectedTopic.type}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Regional Tech Horizon & Market Overview
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setSelectedTopic(null)}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Main Focus Header */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              Active Focus
            </span>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              {selectedTopic.topic}
            </h2>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Median Salary Benchmark */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                <span>Median Tech Salary</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {avgMedianSalary ? `$${avgMedianSalary.toLocaleString()} USD` : 'Data in Progress'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                {countrySalaries.length > 0 ? `${countrySalaries.length} benchmark sources` : 'Global remote normalized'}
              </div>
            </div>

            {/* Active Jobs in Region */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                <Briefcase className="w-3.5 h-3.5 text-sky-500" />
                <span>Open Vacancies</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {countryJobs.length > 0 ? `${countryJobs.length} active roles` : 'Growing Market'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                Verified ATS postings in {targetCountry}
              </div>
            </div>
          </div>

          {/* Hiring Companies in Region */}
          {hiringCompanies.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Companies Hiring in {targetCountry}:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hiringCompanies.map((company, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {company}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Item Context */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Topic Details & Source Signal
            </span>
            <p className="text-slate-700 whitespace-pre-wrap text-xs leading-relaxed font-medium">
              {selectedTopic.details}
            </p>
            {selectedTopic.meta?.url && (
              <a
                href={selectedTopic.meta.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
              >
                <span>View Original Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#111]/10 bg-white/50 flex justify-between items-center text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            Fremtidsbarometer Market Intelligence
          </span>
          <button
            onClick={() => setSelectedTopic(null)}
            className="px-4 py-1.5 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
