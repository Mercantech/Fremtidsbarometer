import { create } from 'zustand';
import type { 
  NewsItem, TechTrend, JobPosting, HypeTopic, SalaryData 
} from '../services/api';
import { 
  fetchNews, fetchTrends, fetchJobs, fetchHype, fetchSalary 
} from '../services/api';

export interface EraInfo {
  year: number;
  title: string;
  subtitle: string;
  stats: {
    roles: [string, string][];
    stack: [string, string][];
    hypeTopic: string;
    hypeDesc: string;
  };
}

export const ERAS: EraInfo[] = [
  {
    year: 1995,
    title: 'Web 1.0 Dawn',
    subtitle: 'Commercial web boom & basic CGI scripts',
    stats: {
      roles: [['Webmaster', 'HIGH'], ['Sysadmin', '$50k/YR'], ['C++ Dev', 'CORE']],
      stack: [['HTML/CGI', 'NEW'], ['Perl', 'BACKEND'], ['C/C++', 'SYSTEM']],
      hypeTopic: 'Dot-Com Boom',
      hypeDesc: 'Creation of the first commercial websites. The internet becomes accessible to the masses. Everyone wants their own website.'
    }
  },
  {
    year: 2008,
    title: 'Mobile & Cloud Era',
    subtitle: 'App Store launch & AWS Cloud standardization',
    stats: {
      roles: [['iOS/Android Dev', 'HOT'], ['Fullstack', '$90k/YR'], ['Scrum Master', 'TREND']],
      stack: [['Objective-C', 'MOBILE'], ['Java', 'ENTERPRISE'], ['Ruby on Rails', 'STARTUPS']],
      hypeTopic: 'App Economy',
      hypeDesc: 'Mobile applications change the market. The launch of AWS makes cloud infrastructure the standard.'
    }
  },
  {
    year: 2018,
    title: 'Cloud Native & Crypto',
    subtitle: 'Kubernetes orchestration & Microservices',
    stats: {
      roles: [['DevOps/SRE', 'CRITICAL'], ['Data Scientist', 'SEXY'], ['Web3 Dev', 'NICHE']],
      stack: [['Go/Docker', 'INFRA'], ['Python', 'DATA'], ['React/Vue', 'FRONTEND']],
      hypeTopic: 'Blockchain & Microservices',
      hypeDesc: 'Decentralization, smart contracts, and the enterprise transition to microservice architecture.'
    }
  },
  {
    year: 2026,
    title: 'AI Agents Era',
    subtitle: 'Autonomous LLMs, System Logic & Agentic Workflows',
    stats: {
      roles: [['Backend (Go/C#)', 'HIGH DEMAND'], ['AI Integrator', '$130k/YR'], ['DevOps Arch.', 'CORE']],
      stack: [['Python', 'AI CORE'], ['Go', 'MICROSERVICES'], ['TypeScript', 'WEB STD']],
      hypeTopic: 'AI Agents: System Logic',
      hypeDesc: 'Autonomous architecture design. The transition from simple code string generation to systemic refactoring.'
    }
  }
];

export interface LiveTopic {
  id: string;
  country: string;
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
  
  news: NewsItem[];
  trends: TechTrend[];
  jobs: JobPosting[];
  hype: HypeTopic[];
  salary: SalaryData[];
  
  liveTopics: LiveTopic[];
  selectedTopic: LiveTopic | null;
  
  isLoadingNews: boolean;
  
  setCurrentYear: (year: number) => void;
  setViewMode: (mode: 'globe' | 'map') => void;
  setLang: (lang: 'en' | 'da') => void;
  setSelectedTopic: (topic: LiveTopic | null) => void;
  
  loadInitialData: () => Promise<void>;
}

const GLOBAL_GEO_POINTS = [
  { country: 'USA', lat: 38, lng: -97 },
  { country: 'UK', lat: 51, lng: -1 },
  { country: 'Japan', lat: 36, lng: 138 },
  { country: 'Denmark', lat: 56, lng: 10 },
  { country: 'India', lat: 20, lng: 77 },
  { country: 'Germany', lat: 51, lng: 10 },
  { country: 'Singapore', lat: 1, lng: 103 },
  { country: 'Canada', lat: 56, lng: -96 },
  { country: 'Sweden', lat: 62, lng: 16 },
  { country: 'Brazil', lat: -14, lng: -51 },
  { country: 'Australia', lat: -25, lng: 133 },
  { country: 'South Africa', lat: -30, lng: 22 },
  { country: 'China', lat: 35, lng: 104 },
  { country: 'France', lat: 46, lng: 2 }
];

export const useStore = create<AppState>((set) => ({
  currentYear: 2026,
  currentEraIndex: 3,
  viewMode: 'globe',
  lang: 'en',
  
  news: [],
  trends: [],
  jobs: [],
  hype: [],
  salary: [],
  
  liveTopics: [],
  selectedTopic: null,
  
  isLoadingNews: false,
  
  setCurrentYear: (year: number) => {
    let eraIdx = 0;
    for (let i = 0; i < ERAS.length; i++) {
      if (ERAS[i].year <= year) eraIdx = i;
    }
    set({ currentYear: year, currentEraIndex: eraIdx });
  },
  
  setViewMode: (mode) => set({ viewMode: mode }),
  setLang: (lang) => set({ lang }),
  setSelectedTopic: (topic) => set({ selectedTopic: topic }),
  
  loadInitialData: async () => {
    set({ isLoadingNews: true });
    
    const [newsData, trendsData, jobsData, hypeData, salaryData] = await Promise.all([
      fetchNews(15),
      fetchTrends('GLOBAL', 10),
      fetchJobs(10),
      fetchHype(5),
      fetchSalary('DK')
    ]);
    
    // Generate live topics by distributing real data over global geo points
    const newLiveTopics: LiveTopic[] = [];
    // Semantic colors for the heatmap
    const semanticColors = {
      job: '#00d4ff',    // Blue: Corporate, stability, vacancies
      hype: '#ff2a85',   // Pink: Hot trends, pulsing
      salary: '#ffd000'  // Yellow: Money, stats, gold
    };
    
    // Mix and match data
    let dataPool: any[] = [
      ...jobsData.map(j => ({ type: 'job', topic: j.title, details: `${j.company} - ${j.location}\nSalary: ${j.salary_range || 'Negotiable'}` })),
      ...hypeData.map(h => ({ type: 'hype', topic: h.topic, details: `${h.summary}\nTrend Score: ${h.score}%` })),
      ...salaryData.map(s => ({ type: 'salary', topic: s.role, details: `${s.experience_level}\nMedian: ${s.median_salary} ${s.currency}` }))
    ];
    
    // Fallback if backend is empty
    if (dataPool.length === 0) {
      dataPool = [
        { type: 'job', topic: 'AI Architect', details: 'Google - Remote\nSalary: $180k - $220k' },
        { type: 'hype', topic: 'Agentic Workflows', details: 'Autonomous systems replacing scripts.\nTrend Score: 98%' },
        { type: 'salary', topic: 'Go Developer', details: 'Senior Level\nMedian: $150k USD' },
        { type: 'job', topic: 'Rust Engineer', details: 'Stripe - London\nSalary: £120k' },
        { type: 'hype', topic: 'WebAssembly', details: 'Running heavy workloads in browser.\nTrend Score: 85%' },
        { type: 'salary', topic: 'React Specialist', details: 'Mid Level\nMedian: $110k USD' },
        { type: 'job', topic: 'DevOps Lead', details: 'AWS - Sydney\nSalary: $160k AUD' },
        { type: 'hype', topic: 'Spatial Computing', details: 'AR/VR interfaces becoming standard.\nTrend Score: 78%' },
        { type: 'salary', topic: 'Data Scientist', details: 'Senior Level\nMedian: $140k USD' },
        { type: 'job', topic: 'Security Researcher', details: 'Cloudflare - Singapore\nSalary: $150k SGD' },
        { type: 'hype', topic: 'Post-Quantum Crypto', details: 'Preparing for quantum computing threats.\nTrend Score: 92%' },
        { type: 'salary', topic: 'Blockchain Dev', details: 'Junior Level\nMedian: $90k USD' },
        { type: 'job', topic: 'UX/UI Designer', details: 'Apple - Cupertino\nSalary: $140k USD' },
        { type: 'hype', topic: 'Edge AI', details: 'Running models directly on devices.\nTrend Score: 88%' }
      ];
    }
    
    // Randomize pool
    dataPool.sort(() => Math.random() - 0.5);
    
    // Map to points
    GLOBAL_GEO_POINTS.forEach((pt, i) => {
      if (i < dataPool.length) {
        const item = dataPool[i];
        newLiveTopics.push({
          id: `live-${i}`,
          country: pt.country,
          lat: pt.lat,
          lng: pt.lng,
          type: item.type,
          topic: item.topic,
          details: item.details,
          color: semanticColors[item.type as keyof typeof semanticColors] || '#ffffff'
        });
      }
    });

    set({
      news: newsData,
      trends: trendsData,
      jobs: jobsData,
      hype: hypeData,
      salary: salaryData,
      liveTopics: newLiveTopics,
      isLoadingNews: false
    });
  }
}));
