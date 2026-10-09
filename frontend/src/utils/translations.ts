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
  returnToPresent: string;
  archiveMode: string;
  archiveNotice: string;
  eraDossier: string;
  closeDossier: string;
  playTour: string;
  pauseTour: string;
  keyMilestones: string;
  hardwareMedia: string;
  leadingTech: string;
  yearIndicator: string;
  prevYear: string;
  nextYear: string;
  activeFocus: string;
  hotVacancyDemand: string;
  radarMatch: string;
  stackInTrends: string;
  verifiedSalary: string;
  officialSalaryBracket: string;
  primaryTechStack: string;
  regionalMedianIncome: string;
  vacanciesInRegion: string;
  activeRoles: string;
  verifiedPostingsIn: string;
  marketDemandIn: string;
  hiringCompaniesIn: string;
  regionalBenchmarks: string;
  marketIndex: string;
  compensationModel: string;
  positionContext: string;
  goToSource: string;
  companyLabel: string;
  verifiedOpportunity: string;
  regionalHorizon: string;
  localDisclosures: string;
  estimatedFromBenchmark: string;
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
    returnToPresent: 'Back to Present (2026)',
    archiveMode: 'Chronicle Archive',
    archiveNotice: 'Viewing historical breakthroughs & news from this era',
    eraDossier: 'Era Dossier',
    closeDossier: 'Close Dossier',
    playTour: 'Auto-Play Timeline',
    pauseTour: 'Pause',
    keyMilestones: 'Key Breakthroughs',
    hardwareMedia: 'Hardware & Media',
    leadingTech: 'Top Stack',
    yearIndicator: 'Year',
    prevYear: 'Previous Year',
    nextYear: 'Next Year',
    activeFocus: 'Active Focus',
    hotVacancyDemand: 'High-Demand Global Vacancy',
    radarMatch: 'Radar Match',
    stackInTrends: 'Stack matches active tech trends (AI, Agents, Rust, Cloud).',
    verifiedSalary: 'Verified Vacancy Compensation',
    officialSalaryBracket: 'Official compensation bracket stated by the employer in primary listing',
    primaryTechStack: 'Primary Technology Stack:',
    regionalMedianIncome: 'Regional Median Compensation',
    vacanciesInRegion: 'Vacancies in Region',
    activeRoles: 'active roles',
    verifiedPostingsIn: 'Verified postings in',
    marketDemandIn: 'Market demand in',
    hiringCompaniesIn: 'Active tech employers in region',
    regionalBenchmarks: 'Regional Role Benchmarks',
    marketIndex: 'Market Index',
    compensationModel: 'Compensation Model',
    positionContext: 'Position Context & Description',
    goToSource: 'Open Source Listing',
    companyLabel: 'Company:',
    verifiedOpportunity: 'Verified Opportunity',
    regionalHorizon: 'Regional Tech Horizon & Market Overview',
    localDisclosures: 'Local Vacancy Disclosures',
    estimatedFromBenchmark: 'Estimated from regional economic baseline',
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
    returnToPresent: 'Tilbage til nutiden (2026)',
    archiveMode: 'Historisk Arkiv',
    archiveNotice: 'Viser historiske gennembrud og nyheder fra denne æra',
    eraDossier: 'Tidsalder Akt',
    closeDossier: 'Luk Akt',
    playTour: 'Afspil Tidsrejse',
    pauseTour: 'Pause',
    keyMilestones: 'Vigtigste Gennembrud',
    hardwareMedia: 'Hardware & Medier',
    leadingTech: 'Top Teknologi',
    yearIndicator: 'År',
    prevYear: 'Forrige År',
    nextYear: 'Næste År',
    activeFocus: 'Aktivt Fokus',
    hotVacancyDemand: 'Højefterspurgt Global Stilling',
    radarMatch: 'Radar Match',
    stackInTrends: 'Stak matcher aktive teknologitendenser (AI, Agenter, Rust, Cloud).',
    verifiedSalary: 'Bekræftet Lønramme for Stilling',
    officialSalaryBracket: 'Officiel lønramme oplyst af arbejdsgiveren i det primære opslag',
    primaryTechStack: 'Primær Teknologistak:',
    regionalMedianIncome: 'Regional Medianløn',
    vacanciesInRegion: 'Stillinger i Regionen',
    activeRoles: 'aktive roller',
    verifiedPostingsIn: 'Bekræftede opslag i',
    marketDemandIn: 'Efterspørgsel i',
    hiringCompaniesIn: 'Aktive IT-arbejdsgivere i region',
    regionalBenchmarks: 'Regionale Lønreferencer efter Rolle',
    marketIndex: 'Markedsindeks',
    compensationModel: 'Lønmodel',
    positionContext: 'Stillingskontekst & Beskrivelse',
    goToSource: 'Gå til Kilde',
    companyLabel: 'Virksomhed:',
    verifiedOpportunity: 'Bekræftet Mulighed',
    regionalHorizon: 'Regionalt IT-horisont & Markedsoverblik',
    localDisclosures: 'Lokale Lønoplysninger',
    estimatedFromBenchmark: 'Estimeret ud fra regionalt markedsindeks',
  },
};

export type TranslationKey = keyof TranslationDict;

export const t = (key: TranslationKey, lang: 'en' | 'da' = 'en'): string => {
  return translations[lang]?.[key] || translations.en[key] || key;
};
