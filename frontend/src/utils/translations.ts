export interface TranslationDict {
  appTitle: string;
  appSubtitle: string;
  timeTravel: string;
  marketStats: string;
  hypeRadar: string;
  compare: string;
  roles: string;
  stack: string;
  hotInIt: string;
  liveFeed: string;
  admin: string;
  liveRadar: string;
  loading: string;
  compareTitle: string;
  compareSubtitle: string;
  topTech: string;
  noData: string;
  medianSalary: string;
  viewDetails: string;
  close: string;
}

export const translations: Record<'en' | 'da', TranslationDict> = {
  en: {
    appTitle: 'Fremtidsbarometer',
    appSubtitle: 'Live Spatial IT Data Radar',
    timeTravel: 'Time Travel',
    marketStats: 'Market Stats',
    hypeRadar: 'Hype Radar',
    compare: 'Compare',
    roles: 'Roles',
    stack: 'Stack',
    hotInIt: "What's hot in IT right now",
    liveFeed: 'live feed',
    admin: 'Admin',
    liveRadar: 'Live Radar',
    loading: 'Loading...',
    compareTitle: 'Salary Benchmark',
    compareSubtitle: 'Compare developer salaries across regions',
    topTech: 'Leading Technologies',
    noData: 'No data available',
    medianSalary: 'Median Salary',
    viewDetails: 'View Details',
    close: 'Close',
  },
  da: {
    appTitle: 'Fremtidsbarometer',
    appSubtitle: 'Live Rumlig IT Data Radar',
    timeTravel: 'Tidsrejse',
    marketStats: 'Markedsstatistik',
    hypeRadar: 'Hype Radar',
    compare: 'Sammenlign',
    roles: 'Roller',
    stack: 'Teknologistak',
    hotInIt: 'Hvad rører sig i IT lige nu',
    liveFeed: 'live strøm',
    admin: 'Administration',
    liveRadar: 'Live Radar',
    loading: 'Indlæser...',
    compareTitle: 'Lønstatistik',
    compareSubtitle: 'Sammenlign IT-lønninger på tværs af regioner',
    topTech: 'Førende Teknologier',
    noData: 'Ingen data tilgængelig',
    medianSalary: 'Medianløn',
    viewDetails: 'Se detaljer',
    close: 'Luk',
  },
};

export type TranslationKey = keyof TranslationDict;

export const t = (key: TranslationKey, lang: 'en' | 'da' = 'en'): string => {
  return translations[lang]?.[key] || translations.en[key] || key;
};
