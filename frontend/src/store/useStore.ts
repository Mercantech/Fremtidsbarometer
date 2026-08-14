import { create } from 'zustand';
import type {
  NewsItem, TechTrend, JobPosting, HypeTopic, SalaryData, EraInfo
} from '../services/api';
import {
  fetchNews, fetchTrends, fetchJobs, fetchHype, fetchSalary, fetchEras, fetchCountries
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
          const [newsData, trendsData, jobsData, hypeData, salaryData, erasData, countriesData] = await Promise.all([
            fetchNews(15),
            fetchTrends('GLOBAL', 10),
            fetchJobs(20),
            fetchHype(5),
            fetchSalary('DK'),
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
          jobsData.forEach(j => {
            const coords = resolveCoordinates(j.source === 'teamtailor' ? 'DK' : (j.country || 'GLOBAL'), j.city);
            newLiveTopics.push({
              id: `job-${idCounter++}`,
              country: j.country || (j.source === 'teamtailor' ? 'DK' : 'GLOBAL'),
              city: j.city,
              lat: coords.lat,
              lng: coords.lng,
              type: 'job',
              topic: j.title,
              details: `${j.company || 'Unknown'} — ${j.city || 'Remote'}`,
              color: SEMANTIC_COLORS.job
            });
          });

          // Map hype topics to live topics (distributed across major tech hubs)
          hypeData.forEach(h => {
            const coords = resolveCoordinates('GLOBAL');
            newLiveTopics.push({
              id: `hype-${idCounter++}`,
              country: 'GLOBAL',
              lat: coords.lat,
              lng: coords.lng,
              type: 'hype',
              topic: h.topic,
              details: `${h.summary || 'No details'}\nTrend Score: ${h.score ?? 'N/A'}%`,
              color: SEMANTIC_COLORS.hype
            });
          });

          // Map salary data to live topics
          salaryData.forEach(s => {
            const coords = resolveCoordinates(s.country || 'DK');
            newLiveTopics.push({
              id: `salary-${idCounter++}`,
              country: s.country || 'DK',
              lat: coords.lat,
              lng: coords.lng,
              type: 'salary',
              topic: s.role || s.technology,
              details: `${s.source}\nMedian: ${s.median ?? 'N/A'} ${s.currency || 'DKK'}`,
              color: SEMANTIC_COLORS.salary
            });
          });

          set({
            eras: erasData,
            currentEraIndex: eraIdx,
            countries: countriesData,
            news: newsData,
            trends: trendsData,
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
