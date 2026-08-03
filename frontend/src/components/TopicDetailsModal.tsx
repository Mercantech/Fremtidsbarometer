import React from 'react';
import { useStore } from '../store/useStore';
import { X, TrendingUp, Briefcase, DollarSign } from 'lucide-react';

export const TopicDetailsModal: React.FC = () => {
  const selectedTopic = useStore((s) => s.selectedTopic);
  const setSelectedTopic = useStore((s) => s.setSelectedTopic);

  if (!selectedTopic) return null;

  const Icon = selectedTopic.type === 'job' 
    ? Briefcase 
    : selectedTopic.type === 'salary' 
      ? DollarSign 
      : TrendingUp;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => setSelectedTopic(null)}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-[#f8f6f1] w-full max-w-md rounded-3xl shadow-2xl border-2 border-[#111] overflow-hidden"
        style={{ animation: 'msgIn 0.3s ease-out' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#111]/10 bg-white/50">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: selectedTopic.color }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 uppercase tracking-wide text-sm">
                {selectedTopic.country}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {selectedTopic.type.toUpperCase()} DATA
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setSelectedTopic(null)}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <h2 className="text-2xl font-black text-slate-900 mb-4 leading-tight">
            {selectedTopic.topic}
          </h2>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-inner">
            <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
              {selectedTopic.details}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
