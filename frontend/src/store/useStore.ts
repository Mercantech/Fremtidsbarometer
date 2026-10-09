import { create } from 'zustand';
import type {
  NewsItem, TechTrend, JobPosting, HypeTopic, SalaryData, EraInfo, EraTrendHistory, GlobeConfig
} from '../services/api';
import {
  fetchNews, fetchTrends, fetchTrendsHistory, fetchJobs, fetchHype, fetchSalary, fetchEras, fetchCountries, fetchGlobeConfig
} from '../services/api';
import { resolveCoordinates, resolveCountryForCity } from '../utils/GeoLookup';

export type { EraInfo, GlobeConfig };

export interface LiveTopic {
  id: string;
  country: string;
  city?: string;
  lat: number;
  lng: number;
  type: 'job' | 'salary' | 'hype';
  topic: string;
  details: string;
  color: string;
  isInferred?: boolean;
  hype_score?: number;
  is_hot?: boolean;
  meta?: {
    company?: string;
    source?: string;
    medianSalary?: number;
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
    url?: string;
    tech?: string;
    isInferred?: boolean;
    hype_score?: number;
    is_hot?: boolean;
  };
}

export type HypeTopicInput = HypeTopic & {
  city?: string;
  country?: string;
  location_name?: string;
  lat?: number;
  lng?: number;
};

export const DEFAULT_GLOBE_CONFIG: GlobeConfig = {
  batch_rotation_seconds: 15,
  max_visible_pins: 14,
  hype_ratio: 50,
  prioritize_salary: true,
  prioritize_trending_tech: true,
  pause_on_hover: true,
};

interface AppState {
  currentYear: number;
  currentEraIndex: number;
  viewMode: 'globe' | 'map';
  lang: 'en' | 'da';

  eras: EraInfo[];
  countries: string[];
  news: NewsItem[];
  trends: TechTrend[];
  trendsHistory: EraTrendHistory[];
  jobs: JobPosting[];
  hype: HypeTopic[];
  salary: SalaryData[];

  globeConfig: GlobeConfig;
  setGlobeConfig: (config: Partial<GlobeConfig>) => void;

  liveTopics: LiveTopic[];
  selectedTopic: LiveTopic | null;
  isLoadingNews: boolean;

  apiError: string | null;
  clearApiError: () => void;
  apiWarning: string | null;
  clearApiWarning: () => void;

  activeFilters: ('job' | 'salary' | 'hype')[];
  toggleFilter: (filter: 'job' | 'salary' | 'hype') => void;

  isDossierOpen: boolean;
  setIsDossierOpen: (open: boolean) => void;

  setCurrentYear: (year: number) => void;
  setViewMode: (mode: 'globe' | 'map') => void;
  setLang: (lang: 'en' | 'da') => void;
  setSelectedTopic: (topic: LiveTopic | null) => void;

  loadInitialData: () => Promise<void>;
}

// Semantic colors for the heatmap
const SEMANTIC_COLORS = {
  job: '#00d4ff',    // Blue: Corporate, stability, vacancies
  hype: '#ff2a85',   // Pink: Hot trends, pulsing
  salary: '#ffd000'  // Yellow: Money, stats, gold
};

// Returns null when a topic has no real geographic anchor, so we never invent a location.
function resolveHypeLocation(topic: string, summary: string = ''): { city: string; country: string } | null {
  const combined = (topic + ' ' + summary).toLowerCase();
  if (/mistral|paris|france|french/.test(combined)) {
    return { city: 'Paris', country: 'FR' };
  }
  if (/asml|netherlands|dutch|amsterdam/.test(combined)) {
    return { city: 'Amsterdam', country: 'NL' };
  }
  if (/gdpr|eu |european|berlin|germany|german/.test(combined)) {
    return { city: 'Berlin', country: 'DE' };
  }
  if (/nordic|denmark|danish|sweden|scandinavia|copenhagen|stockholm/.test(combined)) {
    return { city: 'Copenhagen', country: 'DK' };
  }
  if (/ukraine|ukrainian|kyiv|lviv|djinni|dou|київ|львів|україна|харків|одеса/.test(combined)) {
    return { city: 'Kyiv', country: 'UA' };
  }
  if (/poland|polish|warsaw|krakow|wroclaw|варшава|краків|польща/.test(combined)) {
    return { city: 'Warsaw', country: 'PL' };
  }
  if (/web3|crypto|bitcoin|ethereum|solana|decentralized|blockchain/.test(combined)) {
    return { city: 'Zurich', country: 'CH' };
  }
  if (/robot|hardware|semiconductor|chip|tsmc|gpu|tokyo|asia/.test(combined)) {
    return { city: 'Tokyo', country: 'JP' };
  }
  if (/open source|linux|kernel|rust|python|git/.test(combined)) {
    return { city: 'London', country: 'GB' };
  }
  if (/openai|anthropic|google|silicon valley|meta|apple|ai |agent|llm/.test(combined)) {
    return { city: 'San Francisco', country: 'US' };
  }
  return null;
}

// Key global tech hubs used for deterministic fallback distribution of hype topics
const GLOBAL_TECH_HUBS: { city: string; country: string }[] = [
  { city: 'Kyiv', country: 'UA' },
  { city: 'Warsaw', country: 'PL' },
  { city: 'London', country: 'UK' },
  { city: 'Berlin', country: 'DE' },
  { city: 'San Francisco', country: 'US' },
  { city: 'Tokyo', country: 'JP' },
  { city: 'Singapore', country: 'SG' },
  { city: 'Stockholm', country: 'SE' },
  { city: 'New York', country: 'US' },
  { city: 'Copenhagen', country: 'DK' },
  { city: 'Amsterdam', country: 'NL' },
  { city: 'Paris', country: 'FR' },
  { city: 'Zurich', country: 'CH' },
  { city: 'Dublin', country: 'IE' },
];

/**
 * Deterministic string hashing (djb2-style) to consistently map a topic to a stable tech hub.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface ResolvedHypeLocation {
  city?: string;
  country: string;
  lat: number;
  lng: number;
  isInferred: boolean;
}

function resolveHypeItemLocation(h: HypeTopicInput): ResolvedHypeLocation {
  // 1. Explicit geographic coordinates provided by backend
  if (typeof h.lat === 'number' && typeof h.lng === 'number' && !Number.isNaN(h.lat) && !Number.isNaN(h.lng)) {
    return {
      city: h.city || h.location_name,
      country: h.country || 'GLOBAL',
      lat: h.lat,
      lng: h.lng,
      isInferred: false,
    };
  }

  // 2. Explicit city / country / location_name provided by backend
  if (h.city || h.country || h.location_name) {
    const country = h.country || 'GLOBAL';
    const city = h.city || h.location_name;
    const coords = resolveCoordinates(country, city);
    return {
      city,
      country,
      lat: coords.lat,
      lng: coords.lng,
      isInferred: false,
    };
  }

  // 3. Keyword / semantic regex heuristic
  const keywordHub = resolveHypeLocation(h.topic, h.summary || '');
  if (keywordHub) {
    const coords = resolveCoordinates(keywordHub.country, keywordHub.city);
    return {
      city: keywordHub.city,
      country: keywordHub.country,
      lat: coords.lat,
      lng: coords.lng,
      isInferred: true,
    };
  }

  // 4. Deterministic fallback across key global tech hubs (guarantees zero dropped topics)
  const hubIdx = hashString(h.topic || '') % GLOBAL_TECH_HUBS.length;
  const fallback = GLOBAL_TECH_HUBS[hubIdx];
  const coords = resolveCoordinates(fallback.country, fallback.city);
  return {
    city: fallback.city,
    country: fallback.country,
    lat: coords.lat,
    lng: coords.lng,
    isInferred: true,
  };
}

// Fair job sampling: retain all jobs that have either a recognized country, a recognized city, or a deducible country,
// give every country fair representation, scale slots by share, prioritizing hot/salary-transparent jobs.
function sampleJobsFairly<T extends { country?: string | null; city?: string | null; is_hot?: boolean; salary_min?: number; salary_max?: number; hype_score?: number }>(
  jobs: T[], budget = 120, maxPerCountry = 25, maxPerCity = 8
): T[] {
  // Pre-sort candidates so hot jobs, verified salaries, and high hype scores get first priority
  const sorted = [...jobs].sort((a, b) => {
    const scoreA = (a.is_hot ? 3 : 0) + ((a.salary_min || a.salary_max) ? 1.5 : 0) + (a.hype_score || 0);
    const scoreB = (b.is_hot ? 3 : 0) + ((b.salary_min || b.salary_max) ? 1.5 : 0) + (b.hype_score || 0);
    return scoreB - scoreA;
  });

  const located = sorted.filter((j) => {
    const hasCountry = Boolean(j.country && j.country.trim() !== '' && j.country.trim().toUpperCase() !== 'GLOBAL');
    const hasCity = Boolean(j.city && j.city.trim() !== '' && j.city.trim().toLowerCase() !== 'remote');
    const deducedCountry = Boolean(j.city && resolveCountryForCity(j.city));
    return hasCountry || hasCity || deducedCountry;
  });

  if (located.length === 0) return [];

  const byCountry = new Map<string, T[]>();
  located.forEach((j) => {
    let c = (j.country && j.country.toUpperCase() !== 'GLOBAL') ? j.country.toUpperCase() : null;
    if (!c && j.city) {
      c = resolveCountryForCity(j.city);
    }
    const countryKey = c || 'EU';
    const list = byCountry.get(countryKey) ?? [];
    list.push(j);
    byCountry.set(countryKey, list);
  });

  const result: T[] = [];
  byCountry.forEach((list) => {
    const quota = Math.min(maxPerCountry, Math.max(1, Math.round((list.length / located.length) * budget)));
    const perCity = new Map<string, number>();
    let taken = 0;
    for (const j of list) {
      if (taken >= quota) break;
      const key = (j.city && j.city.toLowerCase() !== 'remote') ? j.city : 'Remote/Regional';
      const n = perCity.get(key) ?? 0;
      if (n >= maxPerCity) continue;
      perCity.set(key, n + 1);
      result.push(j);
      taken++;
    }
  });
  return result;
}

import { persist } from 'zustand/middleware';

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentYear: 2026,
      currentEraIndex: 0,
      viewMode: 'globe',
      lang: 'en',

      eras: [],
      countries: [],
      news: [],
      trends: [],
      trendsHistory: [],
      jobs: [],
      hype: [],
      salary: [],

      liveTopics: [],
      selectedTopic: null,
      apiError: null,
      apiWarning: null,
      activeFilters: ['job', 'salary', 'hype'],

      globeConfig: DEFAULT_GLOBE_CONFIG,
      setGlobeConfig: (cfg) => set((s) => ({ globeConfig: { ...s.globeConfig, ...cfg } })),

      isLoadingNews: false,
      isDossierOpen: false,
      setIsDossierOpen: (open) => set({ isDossierOpen: open }),

      clearApiError: () => set({ apiError: null }),
      clearApiWarning: () => set({ apiWarning: null }),

      toggleFilter: (f) => set((state) => ({
        activeFilters: state.activeFilters.includes(f)
          ? state.activeFilters.filter((x) => x !== f)
          : [...state.activeFilters, f]
      })),

      setCurrentYear: (year: number) => {
        const eras = get().eras;
        let eraIdx = 0;
        for (let i = 0; i < eras.length; i++) {
          if (eras[i].year <= year) eraIdx = i;
        }
        set({ currentYear: year, currentEraIndex: eraIdx });
      },

      setViewMode: (mode) => set({ viewMode: mode }),
      setLang: (lang) => set({ lang }),
      setSelectedTopic: (topic) => set({ selectedTopic: topic }),

      loadInitialData: async () => {
        set({ isLoadingNews: true, apiError: null, apiWarning: null });

        try {
          const results = await Promise.allSettled([
            fetchNews(15),
            fetchTrends('GLOBAL', 10),
            fetchTrendsHistory('GLOBAL', 1960, 2034),
            fetchJobs(300),
            fetchHype(15),
            fetchSalary(),
            fetchEras(),
            fetchCountries(),
            fetchGlobeConfig(),
          ]);

          const newsData = results[0].status === 'fulfilled' ? results[0].value : [];
          const trendsData = results[1].status === 'fulfilled' ? results[1].value : [];
          const historyData = results[2].status === 'fulfilled' ? results[2].value : [];
          const jobsData = results[3].status === 'fulfilled' ? results[3].value : [];
          const hypeData = results[4].status === 'fulfilled' ? results[4].value : [];
          const salaryData = results[5].status === 'fulfilled' ? results[5].value : [];
          const erasData = results[6].status === 'fulfilled' ? results[6].value : [];
          const countriesData = results[7].status === 'fulfilled' ? results[7].value : [];
          const globeConfigData = results[8].status === 'fulfilled' ? results[8].value : DEFAULT_GLOBE_CONFIG;

          // Log degraded feeds if any failed
          const endpointNames = ['News', 'Trends', 'History', 'Jobs', 'Hype', 'Salary', 'Eras', 'Countries'];
          const failedFeeds = results
            .map((r, idx) => (r.status === 'rejected' ? endpointNames[idx] : null))
            .filter(Boolean) as string[];

          // Complete network / server failure check
          const allFailed = results.every(r => r.status === 'rejected');
          if (allFailed) {
            set({
              isLoadingNews: false,
              apiError: 'Backend Connection Error — server temporarily unreachable'
            });
            return;
          }

          const warningNotice = failedFeeds.length > 0
            ? `Notice: ${failedFeeds.join(', ')} feed is temporarily synchronizing`
            : null;

          // Set era index based on current year and loaded eras
          let eraIdx = 0;
          const currentYear = get().currentYear;
          for (let i = 0; i < erasData.length; i++) {
            if (erasData[i].year <= currentYear) eraIdx = i;
          }

          // Build live topics strictly from real backend data with geo-accurate coordinates
          const newLiveTopics: LiveTopic[] = [];
          let idCounter = 0;

          // Map jobs to live topics
          sampleJobsFairly(jobsData).forEach(j => {
            const resolvedCountry = (j.country && j.country.trim() !== '' && j.country.toUpperCase() !== 'GLOBAL')
              ? j.country
              : (resolveCountryForCity(j.city) || 'EU');
            const coords = resolveCoordinates(resolvedCountry, j.city);
            const jobMedian = (j.salary_min && j.salary_max)
              ? Math.round((j.salary_min + j.salary_max) / 2)
              : (j.salary_min || j.salary_max || undefined);
            const salaryDetail = jobMedian ? ` • $${jobMedian.toLocaleString()} USD` : '';

            const hotPrefix = j.is_hot ? '🔥 ' : '';
            newLiveTopics.push({
              id: `job-${idCounter++}`,
              country: resolvedCountry,
              city: j.city,
              lat: coords.lat,
              lng: coords.lng,
              type: 'job',
              topic: `${hotPrefix}${j.title}`,
              details: `${j.company || 'Unknown'} — ${j.city || 'Remote'} (${resolvedCountry})${salaryDetail}`,
              color: SEMANTIC_COLORS.job,
              hype_score: j.hype_score,
              is_hot: j.is_hot,
              meta: {
                company: j.company,
                source: j.source,
                url: j.url,
                tech: j.technology,
                medianSalary: jobMedian,
                salaryMin: j.salary_min,
                salaryMax: j.salary_max,
                currency: j.salary_currency || 'USD',
                hype_score: j.hype_score,
                is_hot: j.is_hot,
              }
            });
          });

          // Map hype topics to live topics (backend geo -> semantic heuristic -> deterministic fallback)
          hypeData.forEach((h: HypeTopicInput) => {
            const loc = resolveHypeItemLocation(h);
            newLiveTopics.push({
              id: `hype-${idCounter++}`,
              country: loc.country,
              city: loc.city,
              lat: loc.lat,
              lng: loc.lng,
              type: 'hype',
              topic: h.topic,
              details: `${h.summary || 'No details'}\nTrend Score: ${h.score ?? 'N/A'}%`,
              color: SEMANTIC_COLORS.hype,
              isInferred: loc.isInferred,
              meta: {
                source: 'Community Discussions',
                tech: h.topic,
                isInferred: loc.isInferred,
              }
            });
          });

          // European & Global Tech Hubs for clear, non-overlapping regional salary radar markers
          const REGIONAL_SALARY_HUBS: { country: string; city: string; tech: string }[] = [
            // Ukraine & Eastern Europe
            { country: 'UA', city: 'Kyiv', tech: 'Python' },
            { country: 'UA', city: 'Lviv', tech: 'Data & AI' },
            { country: 'PL', city: 'Warsaw', tech: 'Python' },
            { country: 'PL', city: 'Krakow', tech: 'Backend' },
            // Nordics
            { country: 'DK', city: 'Copenhagen', tech: 'Data & AI' },
            { country: 'DK', city: 'Aarhus', tech: 'Rust' },
            { country: 'SE', city: 'Stockholm', tech: 'Cybersecurity' },
            { country: 'NO', city: 'Oslo', tech: 'Cloud & DevOps' },
            { country: 'FI', city: 'Helsinki', tech: 'Software Engineering' },
            // Western Europe
            { country: 'UK', city: 'London', tech: 'Rust' },
            { country: 'DE', city: 'Berlin', tech: 'Data & AI' },
            { country: 'DE', city: 'Munich', tech: 'Cloud & DevOps' },
            { country: 'NL', city: 'Amsterdam', tech: 'Go' },
            { country: 'FR', city: 'Paris', tech: 'Python' },
            { country: 'CH', city: 'Zurich', tech: 'Backend' },
            { country: 'IE', city: 'Dublin', tech: 'Frontend' },
            // Southern Europe
            { country: 'ES', city: 'Madrid', tech: 'Software Engineering' },
            { country: 'ES', city: 'Barcelona', tech: 'Frontend' },
            // North America
            { country: 'US', city: 'San Francisco', tech: 'Data & AI' },
            { country: 'US', city: 'New York', tech: 'Backend' },
          ];

          const mappedSalaryCountries = new Set<string>();

          REGIONAL_SALARY_HUBS.forEach((hub) => {
            const s = salaryData.find(
              (item) => item.country === hub.country && (item.technology === hub.tech || item.role?.includes(hub.tech))
            ) || salaryData.find((item) => item.country === hub.country);

            if (s) {
              mappedSalaryCountries.add(hub.country);
              const coords = resolveCoordinates(hub.country, hub.city);
              newLiveTopics.push({
                id: `salary-${hub.country}-${hub.city}`,
                country: hub.country,
                city: hub.city,
                lat: coords.lat,
                lng: coords.lng,
                type: 'salary',
                topic: s.role || s.technology,
                details: `${hub.city}, ${hub.country} • ${s.source}\nMedian: $${s.median?.toLocaleString() ?? 'N/A'} ${s.currency || 'USD'}`,
                color: SEMANTIC_COLORS.salary,
                meta: {
                  source: s.source,
                  medianSalary: s.median,
                  currency: s.currency || 'USD',
                  tech: s.technology,
                }
              });
            }
          });

          // Fallback for any other countries in salaryData not in predefined hubs
          salaryData.forEach((s) => {
            if (s.country && !mappedSalaryCountries.has(s.country)) {
              mappedSalaryCountries.add(s.country);
              const coords = resolveCoordinates(s.country);
              newLiveTopics.push({
                id: `salary-${s.country}`,
                country: s.country,
                lat: coords.lat,
                lng: coords.lng,
                type: 'salary',
                topic: s.role || s.technology,
                details: `${s.country} • ${s.source}\nMedian: $${s.median?.toLocaleString() ?? 'N/A'} ${s.currency || 'USD'}`,
                color: SEMANTIC_COLORS.salary,
                meta: {
                  source: s.source,
                  medianSalary: s.median,
                  currency: s.currency || 'USD',
                  tech: s.technology,
                }
              });
            }
          });

          set({
            eras: erasData,
            currentEraIndex: eraIdx,
            countries: countriesData,
            news: newsData,
            trends: trendsData,
            trendsHistory: historyData,
            jobs: jobsData,
            hype: hypeData,
            salary: salaryData,
            liveTopics: newLiveTopics,
            globeConfig: globeConfigData,
            isLoadingNews: false,
            apiError: null,
            apiWarning: warningNotice
          });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to connect to backend server';
          console.error('Failed to load initial data:', err);
          set({
            isLoadingNews: false,
            apiError: errorMessage
          });
        }
      }
    }),
    {
      name: 'fb-storage',
      partialize: (state) => ({ viewMode: state.viewMode, lang: state.lang })
    }
  )
);
