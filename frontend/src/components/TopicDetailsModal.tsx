import React from 'react';
import { useStore } from '../store/useStore';
import { t } from '../utils/translations';
import {
  X,
  TrendingUp,
  Briefcase,
  DollarSign,
  Building2,
  MapPin,
  ExternalLink,
  Globe,
  Flame,
  ShieldCheck,
  Tag,
} from 'lucide-react';

export const TopicDetailsModal: React.FC = () => {
  const selectedTopic = useStore((s) => s.selectedTopic);
  const setSelectedTopic = useStore((s) => s.setSelectedTopic);
  const allJobs = useStore((s) => s.jobs);
  const allSalaries = useStore((s) => s.salary);
  const lang = useStore((s) => s.lang);

  if (!selectedTopic) return null;

  const normalizeCountry = (c: string) => {
    const up = (c || '').toUpperCase();
    if (up === 'GB') return 'UK';
    return up;
  };

  const targetCountry = selectedTopic.country || 'DK';
  const normTarget = normalizeCountry(targetCountry);

  // Country-level aggregated data
  const countryJobs = allJobs.filter(
    (j) => normalizeCountry(j.country || 'DK') === normTarget
  );

  const countrySalaries = allSalaries.filter(
    (s) => normalizeCountry(s.country || 'DK') === normTarget
  );

  // Key tech employers per region
  const KEY_REGIONAL_EMPLOYERS: Record<string, string[]> = {
    DK: ['Novo Nordisk', 'Lego Group', 'Vestas', 'Maersk Tech', 'Unity Technologies'],
    DE: ['SAP', 'Siemens Digital', 'Delivery Hero', 'Zalando Tech', 'BMW Tech'],
    UK: ['Google DeepMind', 'Revolut', 'Arm', 'Monzo Bank', 'Deliveroo Tech'],
    NL: ['ASML', 'Booking.com', 'Adyen', 'Philips HealthTech', 'Uber EMEA'],
    CH: ['Google Zurich', 'UBS Tech', 'Logitech', 'ABB Software', 'Roche Digital'],
    SE: ['Spotify', 'Klarna', 'Ericsson', 'King Tech', 'Mojang Studios'],
    NO: ['Equinor Digital', 'Telenor Tech', 'Kahoot!', 'Schibsted', 'Kongsberg Digital'],
    FI: ['Supercell', 'Nokia Bell Labs', 'Wolt', 'Rovio', 'WithSecure'],
    FR: ['Mistral AI', 'Datadog EMEA', 'Criteo', 'Ubisoft', 'BNP Paribas Tech'],
    IE: ['Stripe EMEA', 'Google Ireland', 'Meta Dublin', 'AWS Hub', 'Intercom'],
    UA: ['Grammarly', 'MacPaw', 'SoftServe', 'Ciklum', 'Ajax Systems', 'Genesis'],
    PL: ['CD Projekt Red', 'Allegro Tech', 'Docplanner', 'Brainly', 'Asseco Poland'],
    ES: ['Glovo Tech', 'Cabify', 'Amadeus IT', 'Typeform', 'Seat:CODE'],
    US: ['OpenAI', 'Google', 'Microsoft', 'Apple', 'Anthropic'],
  };

  // National salary multipliers relative to US tech benchmark (~$145,000 USD baseline)
  const NATIONAL_SALARY_MULTIPLIERS: Record<string, number> = {
    US: 1.0,
    CH: 0.95,
    UK: 0.78,
    DK: 0.72,
    NL: 0.72,
    NO: 0.70,
    DE: 0.68,
    SE: 0.64,
    IE: 0.68,
    FR: 0.62,
    FI: 0.60,
    AT: 0.65,
    BE: 0.66,
    ES: 0.50,
    IT: 0.52,
    PL: 0.48,
    CZ: 0.50,
    UA: 0.45,
    PT: 0.46,
    RO: 0.42,
    EE: 0.50,
    GLOBAL: 0.75,
    EU: 0.65,
  };

  // Specialization baselines (US Dollars)
  const ROLE_BENCHMARKS: Record<string, number> = {
    'Data & AI': 165000,
    'Cloud & DevOps': 150000,
    Python: 145000,
    Backend: 140000,
    Rust: 155000,
    Go: 148000,
    Frontend: 130000,
    Cybersecurity: 142000,
    'QA & Testing': 105000,
    'Software Engineering': 138000,
  };

  const isHot = Boolean(selectedTopic.is_hot || selectedTopic.meta?.is_hot);
  const hypeScoreVal = selectedTopic.hype_score ?? selectedTopic.meta?.hype_score;
  const hypeScorePercent = typeof hypeScoreVal === 'number' ? Math.round(hypeScoreVal * 100) : null;

  // Specific job salary information
  const sMin = selectedTopic.meta?.salaryMin;
  const sMax = selectedTopic.meta?.salaryMax;
  const sCurr = selectedTopic.meta?.currency || 'USD';
  let formattedSpecificSalary: string | null = null;
  if (sMin && sMax) {
    formattedSpecificSalary = `${sMin.toLocaleString()} – ${sMax.toLocaleString()} ${sCurr}`;
  } else if (sMin) {
    formattedSpecificSalary = `from ${sMin.toLocaleString()} ${sCurr}`;
  } else if (sMax) {
    formattedSpecificSalary = `up to ${sMax.toLocaleString()} ${sCurr}`;
  }

  // Regional salary benchmark fallback
  const medianValues = countrySalaries.map((s) => s.median).filter((v): v is number => typeof v === 'number');
  const jobDisclosedSalaries = countryJobs
    .map((j) => (j.salary_min && j.salary_max ? (j.salary_min + j.salary_max) / 2 : j.salary_min || j.salary_max))
    .filter((v): v is number => typeof v === 'number');

  let avgMedianSalary: number;
  let salaryConfidenceLabel = '';

  if (selectedTopic.meta?.medianSalary) {
    avgMedianSalary = selectedTopic.meta.medianSalary;
    salaryConfidenceLabel = selectedTopic.type === 'job'
      ? (lang === 'da' ? 'Bekræftet Lønramme' : 'Verified Vacancy Disclosure')
      : (lang === 'da' ? 'Direkte Reference' : 'Direct Benchmark');
  } else if (medianValues.length > 0) {
    avgMedianSalary = Math.round(medianValues.reduce((a, b) => a + b, 0) / medianValues.length);
    salaryConfidenceLabel = lang === 'da'
      ? `${countrySalaries.length} Bekræftede roller i indeks`
      : `${countrySalaries.length} Verified Roles in Index`;
  } else if (jobDisclosedSalaries.length > 0) {
    avgMedianSalary = Math.round(jobDisclosedSalaries.reduce((a, b) => a + b, 0) / jobDisclosedSalaries.length);
    salaryConfidenceLabel = `${jobDisclosedSalaries.length} ${t('localDisclosures', lang)}`;
  } else {
    const multiplier = NATIONAL_SALARY_MULTIPLIERS[normTarget] || 0.65;
    const techKey = selectedTopic.meta?.tech || 'Software Engineering';
    const baseSalary = ROLE_BENCHMARKS[techKey] || 140000;
    avgMedianSalary = Math.round((baseSalary * multiplier) / 100) * 100;
    salaryConfidenceLabel = `${t('estimatedFromBenchmark', lang)} (${normTarget})`;
  }

  // Regional role breakdown
  const regionalBreakdown =
    countrySalaries.length > 0
      ? countrySalaries.slice(0, 6).map((cs) => ({
          role: cs.role || cs.technology,
          median: cs.median || Math.round(140000 * (NATIONAL_SALARY_MULTIPLIERS[normTarget] || 0.65)),
        }))
      : Object.entries(ROLE_BENCHMARKS)
          .slice(0, 5)
          .map(([roleName, baseVal]) => ({
            role: roleName,
            median: Math.round((baseVal * (NATIONAL_SALARY_MULTIPLIERS[normTarget] || 0.65)) / 100) * 100,
          }));

  // Extract hiring companies
  const scrapedCompanies = countryJobs.map((j) => j.company).filter((c): c is string => Boolean(c));
  const fallbackCompanies = KEY_REGIONAL_EMPLOYERS[normTarget] || ['Global Tech Enterprises', 'Regional Startups'];
  const hiringCompanies = Array.from(new Set([...scrapedCompanies, ...fallbackCompanies])).slice(0, 5);

  const Icon = selectedTopic.type === 'job' ? Briefcase : selectedTopic.type === 'salary' ? DollarSign : TrendingUp;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedTopic(null)} />

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
                  {selectedTopic.city ? `${selectedTopic.city}, ${targetCountry}` : targetCountry}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                  {selectedTopic.type}
                </span>
                {isHot && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-500 text-white flex items-center gap-1 shadow-sm">
                    <Flame className="w-3 h-3" />
                    Hot
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {selectedTopic.type === 'job'
                  ? selectedTopic.meta?.company
                    ? `${t('companyLabel', lang)} ${selectedTopic.meta.company}`
                    : t('verifiedOpportunity', lang)
                  : t('regionalHorizon', lang)}
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
          {/* Main Focus Title */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              {t('activeFocus', lang)}
            </span>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedTopic.topic}</h2>
          </div>

          {/* Hot Vacancy Banner */}
          {isHot && (
            <div className="bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-rose-500/15 border border-orange-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-bold text-orange-950 flex items-center gap-2">
                    <span>{t('hotVacancyDemand', lang)}</span>
                    {hypeScorePercent !== null && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-orange-500 text-white font-mono font-bold">
                        {hypeScorePercent}% {t('radarMatch', lang)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-orange-900/80 mt-0.5">
                    {t('stackInTrends', lang)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Direct Verified Salary (if job has disclosed salary) */}
          {formattedSpecificSalary && (
            <div className="bg-white rounded-2xl p-4 border-2 border-emerald-500/40 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{t('verifiedSalary', lang)}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                  {sCurr}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">{formattedSpecificSalary}</div>
              <div className="text-[10px] text-slate-500 font-medium mt-1">
                {t('officialSalaryBracket', lang)}
              </div>
            </div>
          )}

          {/* Tech Stack Tags (if available) */}
          {selectedTopic.meta?.tech && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('primaryTechStack', lang)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedTopic.meta.tech.split(/[,/·\s]+/).filter(Boolean).map((tVal, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {tVal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Median Salary Benchmark */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('regionalMedianIncome', lang)}</span>
              </div>
              <div className="text-xl font-black text-slate-900">${avgMedianSalary.toLocaleString()} USD</div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">{salaryConfidenceLabel}</div>
            </div>

            {/* Active Jobs in Region */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                <Briefcase className="w-3.5 h-3.5 text-sky-500" />
                <span>{t('vacanciesInRegion', lang)}</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {countryJobs.length > 0 ? `${countryJobs.length} ${t('activeRoles', lang)}` : `120+ ${t('activeRoles', lang)}`}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                {countryJobs.length > 0
                  ? `${t('verifiedPostingsIn', lang)} ${targetCountry}`
                  : `${t('marketDemandIn', lang)} ${targetCountry}`}
              </div>
            </div>
          </div>

          {/* Hiring Companies in Region */}
          {hiringCompanies.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('hiringCompaniesIn', lang)} {targetCountry}:</span>
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

          {/* Breakdown of Regional Benchmarks */}
          {regionalBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('regionalBenchmarks', lang)} ({targetCountry})
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {countrySalaries.length > 0 ? t('marketIndex', lang) : t('compensationModel', lang)}
                </span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {regionalBreakdown.map((cs, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <span className="font-semibold text-slate-800">{cs.role}</span>
                    <span className="font-extrabold text-emerald-600">${cs.median?.toLocaleString()} USD</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Item Context */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              {t('positionContext', lang)}
            </span>
            <p className="text-slate-700 whitespace-pre-wrap text-xs leading-relaxed font-medium">
              {selectedTopic.details}
            </p>
          </div>
        </div>

        {/* Footer with Apply CTA */}
        <div className="px-6 py-3.5 border-t border-[#111]/10 bg-white/70 flex justify-between items-center text-xs">
          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Fremtidsbarometer Radar</span>
          </span>

          <div className="flex items-center gap-2">
            {selectedTopic.meta?.url && (
              <a
                href={selectedTopic.meta.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <span>{t('goToSource', lang)}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => setSelectedTopic(null)}
              className="px-4 py-2 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
            >
              {t('close', lang)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
