import { create } from 'zustand';
import type {
  NewsItem, TechTrend, JobPosting, HypeTopic, SalaryData, EraInfo, EraTrendHistory
} from '../services/api';
import {
  fetchNews, fetchTrends, fetchTrendsHistory, fetchJobs, fetchHype, fetchSalary, fetchEras, fetchCountries
} from '../services/api';
import { resolveCoordinates } from '../utils/GeoLookup';

export type { EraInfo };

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
  meta?: {
    company?: string;
    source?: string;
    medianSalary?: number;
    currency?: string;
    url?: string;
    tech?: string;
  };
}

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

  liveTopics: LiveTopic[];
  selectedTopic: LiveTopic | null;

  isLoadingNews: boolean;

  apiError: string | null;
  clearApiError: () => void;

  activeFilters: ('job' | 'salary' | 'hype')[];
  toggleFilter: (filter: 'job' | 'salary' | 'hype') => void;

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

// Fair job sampling: drop jobs without a real location, give every country at least one slot,
// scale slots by its real share of postings, and cap per country / per city to avoid clutter.
function sampleJobsFairly<T extends { country?: string | null; city?: string | null }>(
  jobs: T[], budget = 45, maxPerCountry = 8, maxPerCity = 3
): T[] {
  const located = jobs.filter((j) => j.country && j.country !== 'GLOBAL' && j.city && j.city !== 'Remote');
  const byCountry = new Map<string, T[]>();
  located.forEach((j) => {
    const list = byCountry.get(j.country as string) ?? [];
    list.push(j);
    byCountry.set(j.country as string, list);
  });

  const result: T[] = [];
  byCountry.forEach((list) => {
    const quota = Math.min(maxPerCountry, Math.max(1, Math.round((list.length / located.length) * budget)));
    const perCity = new Map<string, number>();
    let taken = 0;
    for (const j of list) {
      if (taken >= quota) break;
      const key = j.city as string;
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
      activeFilters: ['job', 'salary', 'hype'],

      isLoadingNews: false,

      clearApiError: () => set({ apiError: null }),

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
        set({ isLoadingNews: true, apiError: null });

        try {
          const [newsData, trendsData, historyData, jobsData, hypeData, salaryData, erasData, countriesData] = await Promise.all([
            fetchNews(15),
            fetchTrends('GLOBAL', 10),
            fetchTrendsHistory('GLOBAL', 1960, 2034),
            fetchJobs(300),
            fetchHype(15),
            fetchSalary(),
            fetchEras(),
            fetchCountries()
          ]);

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
            const country = j.country || 'DK';
            const coords = resolveCoordinates(country, j.city);
            newLiveTopics.push({
              id: `job-${idCounter++}`,
              country: country,
              city: j.city,
              lat: coords.lat,
              lng: coords.lng,
              type: 'job',
              topic: j.title,
              details: `${j.company || 'Unknown'} — ${j.city || 'Remote'} (${country})`,
              color: SEMANTIC_COLORS.job,
              meta: {
                company: j.company,
                source: j.source,
                url: j.url,
                tech: j.technology,
              }
            });
          });

          // Map hype topics to live topics (topic-aware regional tech hubs)
          hypeData.forEach((h) => {
            const hub = resolveHypeLocation(h.topic, h.summary || '');
            if (!hub) return;
            const coords = resolveCoordinates(hub.country, hub.city);
            newLiveTopics.push({
              id: `hype-${idCounter++}`,
              country: hub.country,
              city: hub.city,
              lat: coords.lat,
              lng: coords.lng,
              type: 'hype',
              topic: h.topic,
              details: `${h.summary || 'No details'}\nTrend Score: ${h.score ?? 'N/A'}%`,
              color: SEMANTIC_COLORS.hype,
              meta: {
                source: 'Community Discussions',
                tech: h.topic,
              }
            });
          });

          // European & Global Tech Hubs for clear, non-overlapping regional salary radar markers
          const REGIONAL_SALARY_HUBS: { country: string; city: string; tech: string }[] = [
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
            // Southern & Eastern Europe
            { country: 'PL', city: 'Warsaw', tech: 'Python' },
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
            isLoadingNews: false,
            apiError: null
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
