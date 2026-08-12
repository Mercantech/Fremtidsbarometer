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
      activeFilters: ['job', 'salary', 'hype'],

      isLoadingNews: false,

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
        set({ isLoadingNews: true });

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

        // If no API data yet, generate realistic fallback events to populate the planet
        if (jobsData.length === 0) {
          jobsData.push(
            { id: 'm1', title: 'Senior Rust Engineer', company: 'Mercantech', city: 'Copenhagen', source: 'teamtailor', url: '#', created_at: new Date().toISOString() },
            { id: 'm2', title: 'Go Developer (Backend)', company: 'Fintech Startup', city: 'London', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm3', title: 'AI Researcher', company: 'OpenAI', city: 'San Francisco', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm4', title: 'Fullstack TS', company: 'Spotify', city: 'Stockholm', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm5', title: 'DevOps Engineer', company: 'Amazon', city: 'New York', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm6', title: 'Python Backend Lead', company: 'Delivery Hero', city: 'Berlin', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm7', title: 'Solidity Dev', company: 'Crypto Labs', city: 'Amsterdam', source: 'teamtailor', url: '#', created_at: new Date().toISOString() },
            { id: 'm8', title: 'Machine Learning Eng', company: 'DeepMind', city: 'London', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm9', title: 'iOS Architect', company: 'Apple', city: 'Munich', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm10', title: 'Security Engineer', company: 'Datadog', city: 'Paris', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm11', title: 'C++ Systems Dev', company: 'Trading Firm', city: 'Chicago', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm12', title: 'React Native Expert', company: 'Grab', city: 'Singapore', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm13', title: 'Game Engine Dev', company: 'Epic Games', city: 'Tokyo', source: 'teamtailor', url: '#', created_at: new Date().toISOString() },
            { id: 'm14', title: 'Data Scientist', company: 'Zalando', city: 'Berlin', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm15', title: 'Cloud Architect', company: 'Microsoft', city: 'Dublin', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            // Extra global items to make map look less sparse
            { id: 'm16', title: 'Frontend Lead', company: 'Nubank', city: 'Sao Paulo', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm17', title: 'Mobile Engineer', company: 'Naspers', city: 'Cape Town', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm18', title: 'Backend Scala Dev', company: 'Atlassian', city: 'Sydney', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm19', title: 'Platform Engineer', company: 'Shopify', city: 'Toronto', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm20', title: 'UI/UX Designer', company: 'Careem', city: 'Dubai', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm21', title: 'Data Engineer', company: 'Flipkart', city: 'Mumbai', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm22', title: 'Embedded Systems C', company: 'Samsung', city: 'Seoul', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm23', title: 'Blockchain Engineer', company: 'Andela', city: 'Lagos', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm24', title: 'Security Analyst', company: 'MercadoLibre', city: 'Buenos Aires', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm25', title: 'Fullstack Go', company: 'Canva', city: 'Melbourne', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm26', title: 'Senior AI Engineer', company: 'Anthropic', city: 'Seattle', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm27', title: 'Rust Core Dev', company: 'Mozilla', city: 'Paris', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm28', title: 'Infrastructure SRE', company: 'Spotify', city: 'Gothenburg', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm29', title: 'Go Microservices', company: 'N26', city: 'Vienna', source: 'teamtailor', url: '#', created_at: new Date().toISOString() },
            { id: 'm30', title: 'Data Engineer', company: 'Stripe', city: 'Dublin', source: 'linkedin', url: '#', created_at: new Date().toISOString() },
            { id: 'm31', title: 'Frontend Vue Lead', company: 'GitLab', city: 'Amsterdam', source: 'linkedin', url: '#', created_at: new Date().toISOString() }
          );
        }

        if (hypeData.length === 0) {
          hypeData.push(
            { id: 'h1', topic: 'Agentic AI', summary: 'Autonomous AI agents writing code', score: 98, source: 'twitter', created_at: new Date().toISOString() },
            { id: 'h2', topic: 'WebAssembly', summary: 'Running complex apps in browser', score: 85, source: 'hackernews', created_at: new Date().toISOString() },
            { id: 'h3', topic: 'Quantum Computing', summary: 'IBM announces new qubits record', score: 72, source: 'reddit', created_at: new Date().toISOString() },
            { id: 'h4', topic: 'Post-Quantum Crypto', summary: 'NIST standardizes new algorithms', score: 88, source: 'hackernews', created_at: new Date().toISOString() },
            { id: 'h5', topic: 'Spatial Computing', summary: 'VisionOS updates drive adoption', score: 91, source: 'twitter', created_at: new Date().toISOString() },
            { id: 'h6', topic: 'Zig Language', summary: 'C alternative gaining massive traction', score: 78, source: 'reddit', created_at: new Date().toISOString() },
            { id: 'h7', topic: 'SolidJS', summary: 'Signal-based reactivity taking over', score: 82, source: 'twitter', created_at: new Date().toISOString() }
          );
        }

        if (salaryData.length === 0) {
          salaryData.push(
            { id: 's1', role: 'Software Engineer', technology: 'Go', median: 65000, currency: 'DKK', source: 'prosa', country: 'DK', created_at: new Date().toISOString() },
            { id: 's2', role: 'Frontend Developer', technology: 'React', median: 55000, currency: 'DKK', source: 'prosa', country: 'DK', created_at: new Date().toISOString() },
            { id: 's3', role: 'Data Engineer', technology: 'Python', median: 68000, currency: 'DKK', source: 'prosa', country: 'DK', created_at: new Date().toISOString() },
            { id: 's4', role: 'DevOps', technology: 'Kubernetes', median: 72000, currency: 'DKK', source: 'prosa', country: 'DK', created_at: new Date().toISOString() },
            { id: 's5', role: 'Mobile Dev', technology: 'Swift', median: 58000, currency: 'DKK', source: 'prosa', country: 'DK', created_at: new Date().toISOString() }
          );
        }

        // Build live topics from real backend data (or fallbacks) with geo-accurate coordinates
        const newLiveTopics: LiveTopic[] = [];
        let idCounter = 0;

        // Map jobs to live topics
        jobsData.forEach(j => {
          const coords = resolveCoordinates(j.source === 'teamtailor' ? 'DK' : undefined, j.city);
          newLiveTopics.push({
            id: `job-${idCounter++}`,
            country: j.source === 'teamtailor' ? 'DK' : 'EU',
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
          const coords = resolveCoordinates('DK');
          newLiveTopics.push({
            id: `salary-${idCounter++}`,
            country: 'DK',
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
          isLoadingNews: false
        });
      }
    }),
    {
      name: 'fb-storage',
      partialize: (state) => ({ viewMode: state.viewMode, lang: state.lang })
    }
  )
);
