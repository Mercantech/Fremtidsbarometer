import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { fetchSalary, type SalaryData } from '../../services/api';
import { t } from '../../utils/translations';

export const CompareTab: React.FC = () => {
  const storeCountries = useStore((s) => s.countries);
  const lang = useStore((s) => s.lang);

  const availableCountries = storeCountries.length > 0 
    ? storeCountries.filter(c => c !== 'GLOBAL') 
    : ['DK', 'US', 'DE', 'SE', 'NO'];

  const [leftCountry, setLeftCountry] = useState(availableCountries[0] || 'DK');
  const [rightCountry, setRightCountry] = useState(availableCountries[1] || availableCountries[0] || 'US');
  const [leftData, setLeftData] = useState<SalaryData[]>([]);
  const [rightData, setRightData] = useState<SalaryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadComparison = async () => {
      setIsLoading(true);
      try {
        const [lData, rData] = await Promise.all([
          fetchSalary(leftCountry).catch(() => []),
          fetchSalary(rightCountry).catch(() => []),
        ]);
        if (isMounted) {
          setLeftData(lData);
          setRightData(rData);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadComparison();
    return () => {
      isMounted = false;
    };
  }, [leftCountry, rightCountry]);

  // Build comparison rows by unique technology name
  const allTechs = Array.from(new Set([
    ...leftData.map(d => d.technology),
    ...rightData.map(d => d.technology)
  ]));

  return (
    <div className="rp-block rp-tab-content active" key="tab-compare">
      {/* Country Selectors */}
      <div className="vs-container">
        <select
          className="vs-select"
          value={leftCountry}
          onChange={(e) => setLeftCountry(e.target.value)}
        >
          {availableCountries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="vs-divider">VS</span>
        <select
          className="vs-select"
          value={rightCountry}
          onChange={(e) => setRightCountry(e.target.value)}
        >
          {availableCountries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Comparison Table */}
      {isLoading ? (
        <div className="text-center py-6 text-xs text-slate-400 animate-pulse">
          {t('loading', lang)}
        </div>
      ) : allTechs.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400">
          {t('noData', lang)}
        </div>
      ) : (
        <div className="vs-table">
          <div className="vs-row vs-header">
            <span>Tech</span>
            <span>{leftCountry}</span>
            <span>{rightCountry}</span>
          </div>
          {allTechs.map(tech => {
            const lRow = leftData.find(d => d.technology === tech);
            const rRow = rightData.find(d => d.technology === tech);
            const lMed = lRow?.median ? `$${Math.round(lRow.median / 1000)}k` : '—';
            const rMed = rRow?.median ? `$${Math.round(rRow.median / 1000)}k` : '—';
            
            const diffClass = lRow?.median && rRow?.median
              ? lRow.median > rRow.median ? 'higher-left' : lRow.median < rRow.median ? 'higher-right' : ''
              : '';

            return (
              <div key={tech} className={`vs-row ${diffClass}`}>
                <span className="vs-tech" title={tech}>{tech}</span>
                <span className="vs-val vs-val-left">{lMed}</span>
                <span className="vs-val vs-val-right">{rMed}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
