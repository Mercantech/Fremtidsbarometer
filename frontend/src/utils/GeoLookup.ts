/**
 * GeoLookup — City-level geocoding for tech hub cities worldwide.
 * Used to place live topic markers at geographically accurate positions
 * on both the 3D globe and 2D Leaflet map.
 */

interface GeoPoint {
  lat: number;
  lng: number;
}

// ~80 major tech hub cities with precise coordinates
const CITY_COORDS: Record<string, GeoPoint> = {
  // North America
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

  // Europe
  'London': { lat: 51.51, lng: -0.13 },
  'Berlin': { lat: 52.52, lng: 13.41 },
  'Munich': { lat: 48.14, lng: 11.58 },
  'Hamburg': { lat: 53.55, lng: 9.99 },
  'Paris': { lat: 48.86, lng: 2.35 },
  'Amsterdam': { lat: 52.37, lng: 4.90 },
  'Stockholm': { lat: 59.33, lng: 18.07 },
  'Copenhagen': { lat: 55.68, lng: 12.57 },
  'Aarhus': { lat: 56.16, lng: 10.20 },
  'Odense': { lat: 55.40, lng: 10.39 },
  'Oslo': { lat: 59.91, lng: 10.75 },
  'Helsinki': { lat: 60.17, lng: 24.94 },
  'Dublin': { lat: 53.35, lng: -6.26 },
  'Zurich': { lat: 47.38, lng: 8.54 },
  'Barcelona': { lat: 41.39, lng: 2.17 },
  'Madrid': { lat: 40.42, lng: -3.70 },
  'Lisbon': { lat: 38.72, lng: -9.14 },
  'Milan': { lat: 45.46, lng: 9.19 },
  'Warsaw': { lat: 52.23, lng: 21.01 },
  'Prague': { lat: 50.08, lng: 14.44 },
  'Vienna': { lat: 48.21, lng: 16.37 },
  'Tallinn': { lat: 59.44, lng: 24.75 },
  'Bucharest': { lat: 44.43, lng: 26.10 },
  'Kyiv': { lat: 50.45, lng: 30.52 },

  // Asia
  'Tokyo': { lat: 35.68, lng: 139.69 },
  'Osaka': { lat: 34.69, lng: 135.50 },
  'Seoul': { lat: 37.57, lng: 126.98 },
  'Beijing': { lat: 39.90, lng: 116.40 },
  'Shanghai': { lat: 31.23, lng: 121.47 },
  'Shenzhen': { lat: 22.54, lng: 114.06 },
  'Hangzhou': { lat: 30.27, lng: 120.15 },
  'Singapore': { lat: 1.35, lng: 103.82 },
  'Bangalore': { lat: 12.97, lng: 77.59 },
  'Hyderabad': { lat: 17.39, lng: 78.49 },
  'Mumbai': { lat: 19.08, lng: 72.88 },
  'Delhi': { lat: 28.61, lng: 77.21 },
  'Pune': { lat: 18.52, lng: 73.86 },
  'Jakarta': { lat: -6.21, lng: 106.85 },
  'Bangkok': { lat: 13.76, lng: 100.50 },
  'Ho Chi Minh City': { lat: 10.82, lng: 106.63 },
  'Taipei': { lat: 25.03, lng: 121.57 },
  'Hong Kong': { lat: 22.32, lng: 114.17 },
  'Tel Aviv': { lat: 32.09, lng: 34.78 },
  'Dubai': { lat: 25.20, lng: 55.27 },

  // Oceania
  'Sydney': { lat: -33.87, lng: 151.21 },
  'Melbourne': { lat: -37.81, lng: 144.96 },
  'Auckland': { lat: -36.85, lng: 174.76 },

  // South America
  'São Paulo': { lat: -23.55, lng: -46.63 },
  'Buenos Aires': { lat: -34.60, lng: -58.38 },
  'Bogotá': { lat: 4.71, lng: -74.07 },
  'Santiago': { lat: -33.45, lng: -70.67 },
  'Lima': { lat: -12.05, lng: -77.04 },

  // Africa
  'Cape Town': { lat: -33.93, lng: 18.42 },
  'Nairobi': { lat: -1.29, lng: 36.82 },
  'Lagos': { lat: 6.52, lng: 3.38 },
  'Cairo': { lat: 30.04, lng: 31.24 },
};

// Country centroids — fallback when city is unknown
const COUNTRY_CENTROIDS: Record<string, GeoPoint> = {
  'US': { lat: 38.0, lng: -97.0 },
  'USA': { lat: 38.0, lng: -97.0 },
  'UK': { lat: 51.5, lng: -1.0 },
  'GB': { lat: 51.5, lng: -1.0 },
  'JP': { lat: 36.0, lng: 138.0 },
  'Japan': { lat: 36.0, lng: 138.0 },
  'DK': { lat: 55.7, lng: 12.6 },
  'Denmark': { lat: 55.7, lng: 12.6 },
  'DK/EU': { lat: 55.7, lng: 12.6 },
  'IN': { lat: 20.0, lng: 77.0 },
  'India': { lat: 20.0, lng: 77.0 },
  'DE': { lat: 51.0, lng: 10.0 },
  'Germany': { lat: 51.0, lng: 10.0 },
  'SG': { lat: 1.35, lng: 103.82 },
  'Singapore': { lat: 1.35, lng: 103.82 },
  'CA': { lat: 56.0, lng: -96.0 },
  'Canada': { lat: 56.0, lng: -96.0 },
  'SE': { lat: 62.0, lng: 16.0 },
  'Sweden': { lat: 62.0, lng: 16.0 },
  'BR': { lat: -14.0, lng: -51.0 },
  'Brazil': { lat: -14.0, lng: -51.0 },
  'AU': { lat: -25.0, lng: 133.0 },
  'Australia': { lat: -25.0, lng: 133.0 },
  'ZA': { lat: -30.0, lng: 22.0 },
  'South Africa': { lat: -30.0, lng: 22.0 },
  'CN': { lat: 35.0, lng: 104.0 },
  'China': { lat: 35.0, lng: 104.0 },
  'FR': { lat: 46.0, lng: 2.0 },
  'France': { lat: 46.0, lng: 2.0 },
  'KR': { lat: 37.6, lng: 127.0 },
  'South Korea': { lat: 37.6, lng: 127.0 },
  'NL': { lat: 52.4, lng: 4.9 },
  'Netherlands': { lat: 52.4, lng: 4.9 },
  'NO': { lat: 59.9, lng: 10.8 },
  'Norway': { lat: 59.9, lng: 10.8 },
  'FI': { lat: 60.2, lng: 24.9 },
  'Finland': { lat: 60.2, lng: 24.9 },
  'IE': { lat: 53.4, lng: -6.3 },
  'Ireland': { lat: 53.4, lng: -6.3 },
  'CH': { lat: 47.4, lng: 8.5 },
  'Switzerland': { lat: 47.4, lng: 8.5 },
  'ES': { lat: 40.4, lng: -3.7 },
  'Spain': { lat: 40.4, lng: -3.7 },
  'PT': { lat: 38.7, lng: -9.1 },
  'Portugal': { lat: 38.7, lng: -9.1 },
  'IT': { lat: 45.5, lng: 9.2 },
  'Italy': { lat: 45.5, lng: 9.2 },
  'PL': { lat: 52.2, lng: 21.0 },
  'Poland': { lat: 52.2, lng: 21.0 },
  'IL': { lat: 32.1, lng: 34.8 },
  'Israel': { lat: 32.1, lng: 34.8 },
  'AE': { lat: 25.2, lng: 55.3 },
  'UAE': { lat: 25.2, lng: 55.3 },
  'EU': { lat: 50.1, lng: 9.0 },
  'GLOBAL': { lat: 20.0, lng: 0.0 },
};

/**
 * Resolves geographic coordinates for a data point.
 * Priority: exact city match → country centroid → random jittered global position.
 * Adds small jitter (±0.5°) to prevent markers from stacking on the exact same pixel.
 */
export function resolveCoordinates(country?: string, city?: string): GeoPoint {
  const jitter = () => (Math.random() - 0.5) * 1.0;

  // Try city match first
  if (city) {
    const normalized = city.trim();
    if (CITY_COORDS[normalized]) {
      return {
        lat: CITY_COORDS[normalized].lat + jitter(),
        lng: CITY_COORDS[normalized].lng + jitter(),
      };
    }
    // Try case-insensitive search
    const lowerCity = normalized.toLowerCase();
    for (const [key, val] of Object.entries(CITY_COORDS)) {
      if (key.toLowerCase() === lowerCity) {
        return { lat: val.lat + jitter(), lng: val.lng + jitter() };
      }
    }
  }

  // Fallback to country centroid
  if (country) {
    const normalized = country.trim();
    if (COUNTRY_CENTROIDS[normalized]) {
      return {
        lat: COUNTRY_CENTROIDS[normalized].lat + jitter() * 3,
        lng: COUNTRY_CENTROIDS[normalized].lng + jitter() * 3,
      };
    }
  }

  // Last resort: random position near a tech hub
  const allCities = Object.values(CITY_COORDS);
  const randomCity = allCities[Math.floor(Math.random() * allCities.length)];
  return {
    lat: randomCity.lat + jitter() * 2,
    lng: randomCity.lng + jitter() * 2,
  };
}
