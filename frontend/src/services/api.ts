import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      console.error('CORS or Network Error detected. Backend might be unreachable or blocking origins.', error);
    } else {
      console.error(`API Error [${error.response?.status}]:`, error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

export interface NewsItem {
  id: string;
  title: string;
  url?: string;
  source?: string;
  country?: string;
  score: number;
  tags?: string[];
  ai_summary?: string;
  created_at: string;
}

export interface TechTrend {
  technology: string;
  popularity: number;
  mentions: number;
  date: string;
}

export interface JobPosting {
  id: number;
  title: string;
  company?: string;
  url?: string;
  source?: string;
  country?: string;
  city?: string;
  technology?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  match_score?: number;
  match_reason?: string;
  date?: string;
  hype_score?: number;
  is_hot?: boolean;
}

export interface HypeTopic {
  topic: string;
  score?: number;
  direction?: string;
  summary?: string;
  sources?: string[];
  date: string;
}

export interface SalaryData {
  technology: string;
  country?: string;
  median?: number;
  p25?: number;
  p75?: number;
  currency?: string;
  role?: string;
  source: string;
  date: string;
}

export interface EraTrendHistory {
  year: number;
  data: {
    technology: string;
    popularity: number;
    mentions: number;
  }[];
}

export const fetchNews = async (limit = 15): Promise<NewsItem[]> => {
  try {
    const res = await api.get<NewsItem[]>(`/api/news?limit=${limit}`);
    return res.data;
  } catch (error) {
    console.error('Failed to fetch news', error);
    throw error;
  }
};

export const fetchTrends = async (country = 'GLOBAL', limit = 10): Promise<TechTrend[]> => {
  try {
    const res = await api.get<TechTrend[]>(`/api/trends?country=${country}&limit=${limit}`);
    return res.data;
  } catch (error) {
    console.error('Failed to fetch trends', error);
    throw error;
  }
};

export const fetchTrendsHistory = async (
  country = 'GLOBAL',
  startYear = 1960,
  endYear = 2034
): Promise<EraTrendHistory[]> => {
  try {
    const res = await api.get<EraTrendHistory[]>(
      `/api/trends/history?country=${country}&start_year=${startYear}&end_year=${endYear}`
    );
    return res.data;
  } catch (error) {
    console.error('Failed to fetch trends history', error);
    throw error;
  }
};

export const fetchJobs = async (limit = 10): Promise<JobPosting[]> => {
  try {
    const res = await api.get<JobPosting[]>(`/api/jobs?limit=${limit}`);
    return res.data;
  } catch (error) {
    console.error('Failed to fetch jobs', error);
    throw error;
  }
};

export const fetchHype = async (limit = 5): Promise<HypeTopic[]> => {
  try {
    const res = await api.get<HypeTopic[]>(`/api/hype?limit=${limit}`);
    return res.data;
  } catch (error) {
    console.error('Failed to fetch hype', error);
    throw error;
  }
};

export const fetchSalary = async (country?: string): Promise<SalaryData[]> => {
  try {
    const url = country ? `/api/salary?country=${country}` : '/api/salary';
    const res = await api.get<SalaryData[]>(url);
    return res.data;
  } catch (error) {
    console.error('Failed to fetch salary', error);
    throw error;
  }
};

export interface EraMilestone {
  year?: number;
  title: string;
  title_da?: string;
  desc: string;
  desc_da?: string;
}

export interface EraChronicleItem {
  year: number;
  headline: string;
  headline_da?: string;
  snippet: string;
  snippet_da?: string;
  tag: string;
}

export interface EraInfo {
  id: number;
  year: number;
  title: string;
  title_da?: string;
  subtitle?: string;
  subtitle_da?: string;
  stats?: {
    title_da?: string;
    subtitle_da?: string;
    tagline?: string;
    tagline_da?: string;
    icon?: string;
    moodColor?: string;
    roles?: string[][];
    stack?: string[][];
    hypeTopic?: string;
    hypeTopic_da?: string;
    hypeDesc?: string;
    hypeDesc_da?: string;
    milestones?: EraMilestone[];
    chronicle?: EraChronicleItem[];
    [key: string]: unknown;
  };
}

export const fetchEras = async (): Promise<EraInfo[]> => {
  try {
    const res = await api.get<EraInfo[]>('/api/eras');
    return res.data;
  } catch (error) {
    console.error('Failed to fetch eras', error);
    throw error;
  }
};

export const fetchCountries = async (): Promise<string[]> => {
  try {
    const res = await api.get<string[]>('/api/countries');
    return res.data;
  } catch (error) {
    console.error('Failed to fetch countries', error);
    throw error;
  }
};

export interface GlobeConfig {
  batch_rotation_seconds: number;
  max_visible_pins: number;
  hype_ratio: number;
  prioritize_salary: boolean;
  prioritize_trending_tech: boolean;
  pause_on_hover: boolean;
}

export const fetchGlobeConfig = async (): Promise<GlobeConfig> => {
  try {
    const res = await api.get<GlobeConfig>('/api/globe/config');
    return res.data;
  } catch (error) {
    console.warn('Failed to fetch globe config, fallback to default', error);
    return {
      batch_rotation_seconds: 15,
      max_visible_pins: 14,
      hype_ratio: 50,
      prioritize_salary: true,
      prioritize_trending_tech: true,
      pause_on_hover: true,
    };
  }
};
