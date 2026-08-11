import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  city?: string;
  technology?: string;
  tags?: string[];
  match_score?: number;
  match_reason?: string;
  date?: string;
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
    return [];
  }
};

export const fetchTrends = async (country = 'GLOBAL', limit = 10): Promise<TechTrend[]> => {
  try {
    const res = await api.get<TechTrend[]>(`/api/trends?country=${country}&limit=${limit}`);
    return res.data;
  } catch (error) {
    console.error('Failed to fetch trends', error);
    return [];
  }
};

export const fetchJobs = async (limit = 10): Promise<JobPosting[]> => {
  try {
    const res = await api.get<JobPosting[]>(`/api/jobs?limit=${limit}`);
    return res.data;
  } catch (error) {
    console.error('Failed to fetch jobs', error);
    return [];
  }
};

export const fetchHype = async (limit = 5): Promise<HypeTopic[]> => {
  try {
    const res = await api.get<HypeTopic[]>(`/api/hype?limit=${limit}`);
    return res.data;
  } catch (error) {
    console.error('Failed to fetch hype', error);
    return [];
  }
};

export const fetchSalary = async (country = 'DK'): Promise<SalaryData[]> => {
  try {
    const res = await api.get<SalaryData[]>(`/api/salary?country=${country}`);
    return res.data;
  } catch (error) {
    console.error('Failed to fetch salary', error);
    return [];
  }
};

export interface EraInfo {
  id: number;
  year: number;
  title: string;
  subtitle?: string;
  stats?: {
    roles?: [string, string][];
    stack?: [string, string][];
    hypeTopic?: string;
    hypeDesc?: string;
    [key: string]: unknown; // Flexible for AI-generated fields
  };
}

export const fetchEras = async (): Promise<EraInfo[]> => {
  try {
    const res = await api.get<EraInfo[]>('/api/eras');
    return res.data;
  } catch (error) {
    console.error('Failed to fetch eras', error);
    return [];
  }
};

export const fetchCountries = async (): Promise<string[]> => {
  try {
    const res = await api.get<string[]>('/api/countries');
    return res.data;
  } catch (error) {
    console.error('Failed to fetch countries', error);
    return [];
  }
};
