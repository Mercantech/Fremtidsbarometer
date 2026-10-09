/**
 * GeoLookup — City-level geocoding for tech hub cities worldwide.
 * Used to place live topic markers at geographically accurate positions
 * on both the 3D globe and 2D Leaflet map.
 * Supports Ukrainian, European, and global cities in English and Cyrillic.
 */

interface GeoPoint {
  lat: number;
  lng: number;
}

// Tech hub cities with precise coordinates (English and Cyrillic aliases)
const CITY_COORDS: Record<string, GeoPoint> = {
  // ── Ukraine ──
  'Kyiv': { lat: 50.4501, lng: 30.5234 },
  'Київ': { lat: 50.4501, lng: 30.5234 },
  'Киев': { lat: 50.4501, lng: 30.5234 },
  'Lviv': { lat: 49.8397, lng: 24.0297 },
  'Львів': { lat: 49.8397, lng: 24.0297 },
  'Львов': { lat: 49.8397, lng: 24.0297 },
  'Kharkiv': { lat: 49.9935, lng: 36.2304 },
  'Харків': { lat: 49.9935, lng: 36.2304 },
  'Харьков': { lat: 49.9935, lng: 36.2304 },
  'Odesa': { lat: 46.4825, lng: 30.7233 },
  'Одеса': { lat: 46.4825, lng: 30.7233 },
  'Одесса': { lat: 46.4825, lng: 30.7233 },
  'Dnipro': { lat: 48.4647, lng: 35.0462 },
  'Дніпро': { lat: 48.4647, lng: 35.0462 },
  'Днепр': { lat: 48.4647, lng: 35.0462 },
  'Zaporizhzhia': { lat: 47.8388, lng: 35.1396 },
  'Запоріжжя': { lat: 47.8388, lng: 35.1396 },
  'Vinnytsia': { lat: 49.2331, lng: 28.4682 },
  'Вінниця': { lat: 49.2331, lng: 28.4682 },
  'Poltava': { lat: 49.5883, lng: 34.5514 },
  'Полтава': { lat: 49.5883, lng: 34.5514 },
  'Chernihiv': { lat: 51.4982, lng: 31.2893 },
  'Чернігів': { lat: 51.4982, lng: 31.2893 },
  'Cherkasy': { lat: 49.4444, lng: 32.0598 },
  'Черкаси': { lat: 49.4444, lng: 32.0598 },
  'Ivano-Frankivsk': { lat: 48.9226, lng: 24.7111 },
  'Івано-Франківськ': { lat: 48.9226, lng: 24.7111 },
  'Uzhhorod': { lat: 48.6208, lng: 22.2879 },
  'Ужгород': { lat: 48.6208, lng: 22.2879 },
  'Ternopil': { lat: 49.5535, lng: 25.5948 },
  'Тернопіль': { lat: 49.5535, lng: 25.5948 },
  'Lutsk': { lat: 50.7472, lng: 25.3254 },
  'Луцьк': { lat: 50.7472, lng: 25.3254 },
  'Rivne': { lat: 50.6199, lng: 26.2516 },
  'Рівне': { lat: 50.6199, lng: 26.2516 },
  'Mykolaiv': { lat: 46.9750, lng: 31.9946 },
  'Миколаїв': { lat: 46.9750, lng: 31.9946 },
  'Zhytomyr': { lat: 50.2547, lng: 28.6587 },
  'Житомир': { lat: 50.2547, lng: 28.6587 },
  'Chernivtsi': { lat: 48.2921, lng: 25.9358 },
  'Чернівці': { lat: 48.2921, lng: 25.9358 },
  'Khmelnytskyi': { lat: 49.4230, lng: 26.9871 },
  'Хмельницький': { lat: 49.4230, lng: 26.9871 },
  'Sumy': { lat: 50.9077, lng: 34.7981 },
  'Суми': { lat: 50.9077, lng: 34.7981 },
  'Kryvyi Rih': { lat: 47.9105, lng: 33.3918 },
  'Кривий Ріг': { lat: 47.9105, lng: 33.3918 },

  // ── Poland ──
  'Warsaw': { lat: 52.23, lng: 21.01 },
  'Warszawa': { lat: 52.23, lng: 21.01 },
  'Варшава': { lat: 52.23, lng: 21.01 },
  'Krakow': { lat: 50.06, lng: 19.94 },
  'Kraków': { lat: 50.06, lng: 19.94 },
  'Краків': { lat: 50.06, lng: 19.94 },
  'Краков': { lat: 50.06, lng: 19.94 },
  'Wroclaw': { lat: 51.11, lng: 17.04 },
  'Wrocław': { lat: 51.11, lng: 17.04 },
  'Вроцлав': { lat: 51.11, lng: 17.04 },
  'Gdansk': { lat: 54.35, lng: 18.65 },
  'Gdańsk': { lat: 54.35, lng: 18.65 },
  'Гданськ': { lat: 54.35, lng: 18.65 },
  'Poznan': { lat: 52.41, lng: 16.93 },
  'Poznań': { lat: 52.41, lng: 16.93 },
  'Познань': { lat: 52.41, lng: 16.93 },
  'Lodz': { lat: 51.76, lng: 19.46 },
  'Łódź': { lat: 51.76, lng: 19.46 },
  'Лодзь': { lat: 51.76, lng: 19.46 },
  'Katowice': { lat: 50.26, lng: 19.02 },
  'Катовіце': { lat: 50.26, lng: 19.02 },

  // ── Germany ──
  'Berlin': { lat: 52.52, lng: 13.41 },
  'Берлін': { lat: 52.52, lng: 13.41 },
  'Берлин': { lat: 52.52, lng: 13.41 },
  'Munich': { lat: 48.14, lng: 11.58 },
  'München': { lat: 48.14, lng: 11.58 },
  'Мюнхен': { lat: 48.14, lng: 11.58 },
  'Hamburg': { lat: 53.55, lng: 9.99 },
  'Гамбург': { lat: 53.55, lng: 9.99 },
  'Frankfurt': { lat: 50.11, lng: 8.68 },
  'Франкфурт': { lat: 50.11, lng: 8.68 },
  'Cologne': { lat: 50.94, lng: 6.96 },
  'Köln': { lat: 50.94, lng: 6.96 },
  'Кельн': { lat: 50.94, lng: 6.96 },
  'Stuttgart': { lat: 48.78, lng: 9.18 },
  'Штутгарт': { lat: 48.78, lng: 9.18 },
  'Dusseldorf': { lat: 51.23, lng: 6.77 },
  'Düsseldorf': { lat: 51.23, lng: 6.77 },
  'Дюссельдорф': { lat: 51.23, lng: 6.77 },

  // ── Denmark & Nordics ──
  'Copenhagen': { lat: 55.68, lng: 12.57 },
  'København': { lat: 55.68, lng: 12.57 },
  'Копенгаген': { lat: 55.68, lng: 12.57 },
  'Aarhus': { lat: 56.16, lng: 10.20 },
  'Århus': { lat: 56.16, lng: 10.20 },
  'Odense': { lat: 55.40, lng: 10.39 },
  'Aalborg': { lat: 57.05, lng: 9.92 },
  'Silkeborg': { lat: 56.17, lng: 9.55 },
  'Fredericia': { lat: 55.56, lng: 9.75 },
  'Viborg': { lat: 56.45, lng: 9.40 },
  'Vejle': { lat: 55.71, lng: 9.53 },
  'Kolding': { lat: 55.49, lng: 9.47 },
  'Horsens': { lat: 55.86, lng: 9.85 },
  'Herning': { lat: 56.14, lng: 8.97 },
  'Ballerup': { lat: 55.73, lng: 12.36 },
  'Taastrup': { lat: 55.65, lng: 12.30 },
  'Esbjerg': { lat: 55.47, lng: 8.45 },
  'Roskilde': { lat: 55.64, lng: 12.08 },
  'Stockholm': { lat: 59.33, lng: 18.07 },
  'Стокгольм': { lat: 59.33, lng: 18.07 },
  'Gothenburg': { lat: 57.71, lng: 11.97 },
  'Göteborg': { lat: 57.71, lng: 11.97 },
  'Malmö': { lat: 55.60, lng: 13.00 },
  'Umeå': { lat: 63.83, lng: 20.26 },
  'Oslo': { lat: 59.91, lng: 10.75 },
  'Осло': { lat: 59.91, lng: 10.75 },
  'Bergen': { lat: 60.39, lng: 5.32 },
  'Trondheim': { lat: 63.43, lng: 10.40 },
  'Helsinki': { lat: 60.17, lng: 24.94 },
  'Гельсінкі': { lat: 60.17, lng: 24.94 },
  'Хельсинки': { lat: 60.17, lng: 24.94 },
  'Tampere': { lat: 61.50, lng: 23.76 },
  'Espoo': { lat: 60.21, lng: 24.66 },

  // ── Western & Central Europe ──
  'London': { lat: 51.51, lng: -0.13 },
  'Лондон': { lat: 51.51, lng: -0.13 },
  'Manchester': { lat: 53.48, lng: -2.24 },
  'Edinburgh': { lat: 55.95, lng: -3.19 },
  'Dublin': { lat: 53.35, lng: -6.26 },
  'Дублін': { lat: 53.35, lng: -6.26 },
  'Amsterdam': { lat: 52.37, lng: 4.90 },
  'Амстердам': { lat: 52.37, lng: 4.90 },
  'Rotterdam': { lat: 51.92, lng: 4.48 },
  'Utrecht': { lat: 52.09, lng: 5.12 },
  'Eindhoven': { lat: 51.44, lng: 5.48 },
  'The Hague': { lat: 52.08, lng: 4.31 },
  'Paris': { lat: 48.86, lng: 2.35 },
  'Париж': { lat: 48.86, lng: 2.35 },
  'Lyon': { lat: 45.76, lng: 4.84 },
  'Zurich': { lat: 47.38, lng: 8.54 },
  'Zürich': { lat: 47.38, lng: 8.54 },
  'Цюрих': { lat: 47.38, lng: 8.54 },
  'Geneva': { lat: 46.20, lng: 6.14 },
  'Genève': { lat: 46.20, lng: 6.14 },
  'Женева': { lat: 46.20, lng: 6.14 },
  'Vienna': { lat: 48.21, lng: 16.37 },
  'Wien': { lat: 48.21, lng: 16.37 },
  'Відень': { lat: 48.21, lng: 16.37 },
  'Вена': { lat: 48.21, lng: 16.37 },
  'Brussels': { lat: 50.85, lng: 4.35 },
  'Брюссель': { lat: 50.85, lng: 4.35 },
  'Antwerp': { lat: 51.22, lng: 4.40 },
  'Prague': { lat: 50.08, lng: 14.44 },
  'Praha': { lat: 50.08, lng: 14.44 },
  'Прага': { lat: 50.08, lng: 14.44 },
  'Brno': { lat: 49.20, lng: 16.61 },
  'Bratislava': { lat: 48.15, lng: 17.11 },
  'Братислава': { lat: 48.15, lng: 17.11 },
  'Budapest': { lat: 47.50, lng: 19.04 },
  'Будапешт': { lat: 47.50, lng: 19.04 },
  'Bucharest': { lat: 44.43, lng: 26.10 },
  'București': { lat: 44.43, lng: 26.10 },
  'Бухарест': { lat: 44.43, lng: 26.10 },
  'Cluj-Napoca': { lat: 46.77, lng: 23.62 },
  'Sofia': { lat: 42.70, lng: 23.32 },
  'Софія': { lat: 42.70, lng: 23.32 },
  'Tallinn': { lat: 59.44, lng: 24.75 },
  'Таллінн': { lat: 59.44, lng: 24.75 },
  'Riga': { lat: 56.95, lng: 24.11 },
  'Рига': { lat: 56.95, lng: 24.11 },
  'Vilnius': { lat: 54.69, lng: 25.28 },
  'Вільнюс': { lat: 54.69, lng: 25.28 },

  // ── Southern Europe ──
  'Madrid': { lat: 40.42, lng: -3.70 },
  'Мадрид': { lat: 40.42, lng: -3.70 },
  'Barcelona': { lat: 41.39, lng: 2.17 },
  'Барселона': { lat: 41.39, lng: 2.17 },
  'Valencia': { lat: 39.47, lng: -0.38 },
  'Lisbon': { lat: 38.72, lng: -9.14 },
  'Lisboa': { lat: 38.72, lng: -9.14 },
  'Лісабон': { lat: 38.72, lng: -9.14 },
  'Porto': { lat: 41.16, lng: -8.63 },
  'Milan': { lat: 45.46, lng: 9.19 },
  'Milano': { lat: 45.46, lng: 9.19 },
  'Мілан': { lat: 45.46, lng: 9.19 },
  'Rome': { lat: 41.90, lng: 12.50 },
  'Roma': { lat: 41.90, lng: 12.50 },
  'Рим': { lat: 41.90, lng: 12.50 },
  'Athens': { lat: 37.98, lng: 23.73 },
  'Афіни': { lat: 37.98, lng: 23.73 },
  'Limassol': { lat: 34.68, lng: 33.04 },

  // ── North America ──
  'San Francisco': { lat: 37.77, lng: -122.42 },
  'San Jose': { lat: 37.34, lng: -121.89 },
  'Cupertino': { lat: 37.32, lng: -122.03 },
  'Mountain View': { lat: 37.39, lng: -122.08 },
  'Palo Alto': { lat: 37.44, lng: -122.14 },
  'Seattle': { lat: 47.61, lng: -122.33 },
  'New York': { lat: 40.71, lng: -74.01 },
  'Austin': { lat: 30.27, lng: -97.74 },
  'Boston': { lat: 42.36, lng: -71.06 },
  'Chicago': { lat: 41.88, lng: -87.63 },
  'Los Angeles': { lat: 34.05, lng: -118.24 },
  'Denver': { lat: 39.74, lng: -104.99 },
  'Atlanta': { lat: 33.75, lng: -84.39 },
  'Washington': { lat: 38.91, lng: -77.04 },
  'Toronto': { lat: 43.65, lng: -79.38 },
  'Vancouver': { lat: 49.28, lng: -123.12 },
  'Montreal': { lat: 45.50, lng: -73.57 },
  'Mexico City': { lat: 19.43, lng: -99.13 },

  // ── Asia & Global ──
  'Tokyo': { lat: 35.68, lng: 139.69 },
  'Seoul': { lat: 37.57, lng: 126.98 },
  'Singapore': { lat: 1.35, lng: 103.82 },
  'Bangalore': { lat: 12.97, lng: 77.59 },
  'Hyderabad': { lat: 17.39, lng: 78.49 },
  'Tel Aviv': { lat: 32.09, lng: 34.78 },
  'Dubai': { lat: 25.20, lng: 55.27 },
  'Sydney': { lat: -33.87, lng: 151.21 },
  'Melbourne': { lat: -37.81, lng: 144.96 },
};

// Country centroids — fallback when city is unknown or Remote
const COUNTRY_CENTROIDS: Record<string, GeoPoint> = {
  // Ukraine
  'UA': { lat: 48.38, lng: 31.17 },
  'Ukraine': { lat: 48.38, lng: 31.17 },
  'Україна': { lat: 48.38, lng: 31.17 },
  'Украина': { lat: 48.38, lng: 31.17 },

  // Poland
  'PL': { lat: 52.2, lng: 21.0 },
  'Poland': { lat: 52.2, lng: 21.0 },
  'Polska': { lat: 52.2, lng: 21.0 },
  'Польща': { lat: 52.2, lng: 21.0 },
  'Польша': { lat: 52.2, lng: 21.0 },

  // Germany
  'DE': { lat: 51.0, lng: 10.0 },
  'Germany': { lat: 51.0, lng: 10.0 },
  'Deutschland': { lat: 51.0, lng: 10.0 },
  'Німеччина': { lat: 51.0, lng: 10.0 },
  'Германия': { lat: 51.0, lng: 10.0 },

  // Nordics
  'DK': { lat: 55.7, lng: 12.6 },
  'Denmark': { lat: 55.7, lng: 12.6 },
  'Danmark': { lat: 55.7, lng: 12.6 },
  'Данія': { lat: 55.7, lng: 12.6 },
  'SE': { lat: 62.0, lng: 16.0 },
  'Sweden': { lat: 62.0, lng: 16.0 },
  'Sverige': { lat: 62.0, lng: 16.0 },
  'Швеція': { lat: 62.0, lng: 16.0 },
  'NO': { lat: 59.9, lng: 10.8 },
  'Norway': { lat: 59.9, lng: 10.8 },
  'Norge': { lat: 59.9, lng: 10.8 },
  'Норвегія': { lat: 59.9, lng: 10.8 },
  'FI': { lat: 60.2, lng: 24.9 },
  'Finland': { lat: 60.2, lng: 24.9 },
  'Suomi': { lat: 60.2, lng: 24.9 },
  'Фінляндія': { lat: 60.2, lng: 24.9 },

  // United Kingdom & Ireland
  'UK': { lat: 51.5, lng: -1.0 },
  'GB': { lat: 51.5, lng: -1.0 },
  'United Kingdom': { lat: 51.5, lng: -1.0 },
  'Britain': { lat: 51.5, lng: -1.0 },
  'IE': { lat: 53.4, lng: -6.3 },
  'Ireland': { lat: 53.4, lng: -6.3 },
  'Ірландія': { lat: 53.4, lng: -6.3 },

  // Western Europe
  'FR': { lat: 46.0, lng: 2.0 },
  'France': { lat: 46.0, lng: 2.0 },
  'Франція': { lat: 46.0, lng: 2.0 },
  'NL': { lat: 52.4, lng: 4.9 },
  'Netherlands': { lat: 52.4, lng: 4.9 },
  'Holland': { lat: 52.4, lng: 4.9 },
  'Нідерланди': { lat: 52.4, lng: 4.9 },
  'BE': { lat: 50.8, lng: 4.4 },
  'Belgium': { lat: 50.8, lng: 4.4 },
  'Бельгія': { lat: 50.8, lng: 4.4 },
  'CH': { lat: 47.4, lng: 8.5 },
  'Switzerland': { lat: 47.4, lng: 8.5 },
  'Швейцарія': { lat: 47.4, lng: 8.5 },
  'AT': { lat: 47.5, lng: 14.5 },
  'Austria': { lat: 47.5, lng: 14.5 },
  'Австрія': { lat: 47.5, lng: 14.5 },

  // Southern & Eastern Europe
  'ES': { lat: 40.4, lng: -3.7 },
  'Spain': { lat: 40.4, lng: -3.7 },
  'España': { lat: 40.4, lng: -3.7 },
  'Іспанія': { lat: 40.4, lng: -3.7 },
  'PT': { lat: 38.7, lng: -9.1 },
  'Portugal': { lat: 38.7, lng: -9.1 },
  'Португалія': { lat: 38.7, lng: -9.1 },
  'IT': { lat: 45.5, lng: 9.2 },
  'Italy': { lat: 45.5, lng: 9.2 },
  'Італія': { lat: 45.5, lng: 9.2 },
  'CZ': { lat: 49.8, lng: 15.5 },
  'Czech Republic': { lat: 49.8, lng: 15.5 },
  'Czechia': { lat: 49.8, lng: 15.5 },
  'Чехія': { lat: 49.8, lng: 15.5 },
  'SK': { lat: 48.7, lng: 19.7 },
  'Slovakia': { lat: 48.7, lng: 19.7 },
  'Словаччина': { lat: 48.7, lng: 19.7 },
  'HU': { lat: 47.2, lng: 19.5 },
  'Hungary': { lat: 47.2, lng: 19.5 },
  'Угорщина': { lat: 47.2, lng: 19.5 },
  'RO': { lat: 45.9, lng: 24.9 },
  'Romania': { lat: 45.9, lng: 24.9 },
  'Румунія': { lat: 45.9, lng: 24.9 },
  'BG': { lat: 42.7, lng: 25.5 },
  'Bulgaria': { lat: 42.7, lng: 25.5 },
  'Болгарія': { lat: 42.7, lng: 25.5 },
  'EE': { lat: 58.6, lng: 25.0 },
  'Estonia': { lat: 58.6, lng: 25.0 },
  'Естонія': { lat: 58.6, lng: 25.0 },
  'LV': { lat: 56.9, lng: 24.6 },
  'Latvia': { lat: 56.9, lng: 24.6 },
  'Латвія': { lat: 56.9, lng: 24.6 },
  'LT': { lat: 55.2, lng: 23.9 },
  'Lithuania': { lat: 55.2, lng: 23.9 },
  'Литва': { lat: 55.2, lng: 23.9 },
  'GR': { lat: 39.0, lng: 22.0 },
  'Greece': { lat: 39.0, lng: 22.0 },
  'Греція': { lat: 39.0, lng: 22.0 },
  'CY': { lat: 35.1, lng: 33.4 },
  'Cyprus': { lat: 35.1, lng: 33.4 },
  'Кіпр': { lat: 35.1, lng: 33.4 },

  // Global / North America
  'US': { lat: 38.0, lng: -97.0 },
  'USA': { lat: 38.0, lng: -97.0 },
  'CA': { lat: 56.0, lng: -96.0 },
  'Canada': { lat: 56.0, lng: -96.0 },
  'JP': { lat: 36.0, lng: 138.0 },
  'Japan': { lat: 36.0, lng: 138.0 },
  'IN': { lat: 20.0, lng: 77.0 },
  'India': { lat: 20.0, lng: 77.0 },
  'SG': { lat: 1.35, lng: 103.82 },
  'Singapore': { lat: 1.35, lng: 103.82 },
  'AU': { lat: -25.0, lng: 133.0 },
  'Australia': { lat: -25.0, lng: 133.0 },
  'BR': { lat: -14.0, lng: -51.0 },
  'Brazil': { lat: -14.0, lng: -51.0 },
  'IL': { lat: 32.1, lng: 34.8 },
  'Israel': { lat: 32.1, lng: 34.8 },
  'EU': { lat: 50.1, lng: 9.0 },
  'DK/EU': { lat: 55.7, lng: 12.6 },
  'GLOBAL': { lat: 50.0, lng: 15.0 }, // European heart centroid fallback instead of Africa
};

// City-to-Country ISO code lookup (supports English and Cyrillic aliases)
export const CITY_TO_COUNTRY: Record<string, string> = {
  // Ukraine
  'Kyiv': 'UA', 'Київ': 'UA', 'Киев': 'UA',
  'Lviv': 'UA', 'Львів': 'UA', 'Львов': 'UA',
  'Kharkiv': 'UA', 'Харків': 'UA', 'Харьков': 'UA',
  'Odesa': 'UA', 'Одеса': 'UA', 'Одесса': 'UA',
  'Dnipro': 'UA', 'Дніпро': 'UA', 'Днепр': 'UA',
  'Zaporizhzhia': 'UA', 'Запоріжжя': 'UA',
  'Vinnytsia': 'UA', 'Вінниця': 'UA',
  'Poltava': 'UA', 'Полтава': 'UA',
  'Chernihiv': 'UA', 'Чернігів': 'UA',
  'Cherkasy': 'UA', 'Черкаси': 'UA',
  'Ivano-Frankivsk': 'UA', 'Івано-Франківськ': 'UA',
  'Uzhhorod': 'UA', 'Ужгород': 'UA',
  'Ternopil': 'UA', 'Тернопіль': 'UA',
  'Lutsk': 'UA', 'Луцьк': 'UA',
  'Rivne': 'UA', 'Рівне': 'UA',
  'Mykolaiv': 'UA', 'Миколаїв': 'UA',
  'Zhytomyr': 'UA', 'Житомир': 'UA',
  'Chernivtsi': 'UA', 'Чернівці': 'UA',
  'Khmelnytskyi': 'UA', 'Хмельницький': 'UA',
  'Sumy': 'UA', 'Суми': 'UA',
  'Kryvyi Rih': 'UA', 'Кривий Ріг': 'UA',

  // Poland
  'Warsaw': 'PL', 'Warszawa': 'PL', 'Варшава': 'PL',
  'Krakow': 'PL', 'Kraków': 'PL', 'Краків': 'PL', 'Краков': 'PL',
  'Wroclaw': 'PL', 'Wrocław': 'PL', 'Вроцлав': 'PL',
  'Gdansk': 'PL', 'Gdańsk': 'PL', 'Гданськ': 'PL',
  'Poznan': 'PL', 'Poznań': 'PL', 'Познань': 'PL',
  'Lodz': 'PL', 'Łódź': 'PL', 'Лодзь': 'PL',
  'Katowice': 'PL', 'Катовіце': 'PL',

  // Germany
  'Berlin': 'DE', 'Берлін': 'DE', 'Берлин': 'DE',
  'Munich': 'DE', 'München': 'DE', 'Мюнхен': 'DE',
  'Hamburg': 'DE', 'Гамбург': 'DE',
  'Frankfurt': 'DE', 'Франкфурт': 'DE',
  'Cologne': 'DE', 'Köln': 'DE', 'Кельн': 'DE',
  'Stuttgart': 'DE', 'Штутгарт': 'DE',
  'Dusseldorf': 'DE', 'Düsseldorf': 'DE', 'Дюссельдорф': 'DE',

  // Denmark
  'Copenhagen': 'DK', 'København': 'DK', 'Копенгаген': 'DK',
  'Aarhus': 'DK', 'Århus': 'DK', 'Odense': 'DK', 'Aalborg': 'DK',
  'Silkeborg': 'DK', 'Fredericia': 'DK', 'Viborg': 'DK', 'Vejle': 'DK',
  'Kolding': 'DK', 'Horsens': 'DK', 'Herning': 'DK', 'Ballerup': 'DK',
  'Taastrup': 'DK', 'Esbjerg': 'DK', 'Roskilde': 'DK',

  // Sweden, Norway, Finland
  'Stockholm': 'SE', 'Стокгольм': 'SE', 'Gothenburg': 'SE', 'Göteborg': 'SE',
  'Malmö': 'SE', 'Umeå': 'SE',
  'Oslo': 'NO', 'Осло': 'NO', 'Bergen': 'NO', 'Trondheim': 'NO',
  'Helsinki': 'FI', 'Гельсінкі': 'FI', 'Хельсинки': 'FI', 'Tampere': 'FI', 'Espoo': 'FI',

  // Western & Southern Europe
  'London': 'UK', 'Лондон': 'UK', 'Manchester': 'UK', 'Edinburgh': 'UK',
  'Dublin': 'IE', 'Дублін': 'IE', 'Cork': 'IE',
  'Amsterdam': 'NL', 'Амстердам': 'NL', 'Rotterdam': 'NL', 'Utrecht': 'NL', 'Eindhoven': 'NL', 'The Hague': 'NL',
  'Paris': 'FR', 'Париж': 'FR', 'Lyon': 'FR',
  'Zurich': 'CH', 'Zürich': 'CH', 'Цюрих': 'CH', 'Geneva': 'CH', 'Genève': 'CH', 'Женева': 'CH', 'Bern': 'CH',
  'Vienna': 'AT', 'Wien': 'AT', 'Відень': 'AT', 'Вена': 'AT', 'Graz': 'AT',
  'Brussels': 'BE', 'Брюссель': 'BE', 'Antwerp': 'BE',
  'Prague': 'CZ', 'Praha': 'CZ', 'Прага': 'CZ', 'Brno': 'CZ',
  'Bratislava': 'SK', 'Братислава': 'SK',
  'Budapest': 'HU', 'Будапешт': 'HU',
  'Bucharest': 'RO', 'București': 'RO', 'Бухарест': 'RO', 'Cluj-Napoca': 'RO',
  'Sofia': 'BG', 'Софія': 'BG',
  'Tallinn': 'EE', 'Таллінн': 'EE',
  'Riga': 'LV', 'Рига': 'LV',
  'Vilnius': 'LT', 'Вільнюс': 'LT',
  'Madrid': 'ES', 'Мадрид': 'ES', 'Barcelona': 'ES', 'Барселона': 'ES', 'Valencia': 'ES',
  'Lisbon': 'PT', 'Lisboa': 'PT', 'Лісабон': 'PT', 'Porto': 'PT',
  'Milan': 'IT', 'Milano': 'IT', 'Мілан': 'IT', 'Rome': 'IT', 'Roma': 'IT', 'Рим': 'IT',
  'Athens': 'GR', 'Афіни': 'GR', 'Limassol': 'CY',

  // Americas & Global
  'San Francisco': 'US', 'San Jose': 'US', 'Cupertino': 'US', 'Mountain View': 'US',
  'Palo Alto': 'US', 'Seattle': 'US', 'New York': 'US', 'Austin': 'US',
  'Boston': 'US', 'Chicago': 'US', 'Los Angeles': 'US', 'Denver': 'US',
  'Atlanta': 'US', 'Washington': 'US',
  'Toronto': 'CA', 'Vancouver': 'CA', 'Montreal': 'CA', 'Mexico City': 'MX',
  'Tokyo': 'JP', 'Seoul': 'KR', 'Singapore': 'SG', 'Bangalore': 'IN', 'Hyderabad': 'IN',
  'Tel Aviv': 'IL', 'Dubai': 'AE', 'Sydney': 'AU', 'Melbourne': 'AU',
};

/**
 * Resolves country ISO-2 code from city name (bidirectional city -> country deduction).
 */
export function resolveCountryForCity(city?: string | null): string | null {
  if (!city || city.trim().toLowerCase() === 'remote') return null;
  const normalized = city.trim();
  if (CITY_TO_COUNTRY[normalized]) {
    return CITY_TO_COUNTRY[normalized];
  }
  const lower = normalized.toLowerCase();
  for (const [key, val] of Object.entries(CITY_TO_COUNTRY)) {
    if (key.toLowerCase() === lower) {
      return val;
    }
  }
  return null;
}

/**
 * Resolves geographic coordinates for a data point.
 * Priority: exact/case-insensitive city match → deduced country centroid → regional fallback.
 * Adds subtle jitter to avoid overlapping markers.
 */
export function resolveCoordinates(country?: string, city?: string): GeoPoint {
  const jitter = (amount = 0.06) => (Math.random() - 0.5) * amount;

  // 1. Try city match first (if city is a genuine physical location and not 'Remote')
  if (city && city.trim().toLowerCase() !== 'remote') {
    const normalized = city.trim();
    if (CITY_COORDS[normalized]) {
      return {
        lat: CITY_COORDS[normalized].lat + jitter(0.05),
        lng: CITY_COORDS[normalized].lng + jitter(0.05),
      };
    }
    // Case-insensitive search
    const lowerCity = normalized.toLowerCase();
    for (const [key, val] of Object.entries(CITY_COORDS)) {
      if (key.toLowerCase() === lowerCity) {
        return { lat: val.lat + jitter(0.05), lng: val.lng + jitter(0.05) };
      }
    }
  }

  // 1b. If city didn't have exact coordinates in CITY_COORDS, deduce country from city
  let effectiveCountry = country;
  if ((!effectiveCountry || effectiveCountry.trim() === '' || effectiveCountry.toUpperCase() === 'GLOBAL') && city) {
    const deduced = resolveCountryForCity(city);
    if (deduced) effectiveCountry = deduced;
  }

  // 2. Fallback to country centroid (works for remote jobs within a specific country)
  if (effectiveCountry && effectiveCountry.trim().toUpperCase() !== 'GLOBAL') {
    const normalized = effectiveCountry.trim();
    if (COUNTRY_CENTROIDS[normalized]) {
      return {
        lat: COUNTRY_CENTROIDS[normalized].lat + jitter(0.4),
        lng: COUNTRY_CENTROIDS[normalized].lng + jitter(0.4),
      };
    }
    // Case-insensitive country search
    const lowerCountry = normalized.toLowerCase();
    for (const [key, val] of Object.entries(COUNTRY_CENTROIDS)) {
      if (key.toLowerCase() === lowerCountry) {
        return {
          lat: val.lat + jitter(0.4),
          lng: val.lng + jitter(0.4),
        };
      }
    }
  }

  // 3. Deterministic regional fallback: Central European centroid with subtle jitter
  const globalCentroid = COUNTRY_CENTROIDS['EU'] || { lat: 50.0, lng: 15.0 };
  return {
    lat: globalCentroid.lat + jitter(1.0),
    lng: globalCentroid.lng + jitter(1.5),
  };
}
