// 100% Free Geospatial Utilities for ChainMind Digital Twin
// Powered by Leaflet.js, OpenStreetMap Nominatim Geocoding, and Haversine Routing calculations

export const DEFAULT_CITY_COORDINATES = {
  // India Major Logistics Hubs
  delhi: { lat: 28.6139, lng: 77.2090, label: 'Delhi, National Capital Region' },
  mumbai: { lat: 19.0760, lng: 72.8777, label: 'Mumbai, Maharashtra' },
  pune: { lat: 18.5204, lng: 73.8567, label: 'Pune, Maharashtra' },
  bengaluru: { lat: 12.9716, lng: 77.5946, label: 'Bengaluru, Karnataka' },
  bangalore: { lat: 12.9716, lng: 77.5946, label: 'Bengaluru, Karnataka' },
  chennai: { lat: 13.0827, lng: 80.2707, label: 'Chennai, Tamil Nadu' },
  hyderabad: { lat: 17.3850, lng: 78.4867, label: 'Hyderabad, Telangana' },
  kolkata: { lat: 22.5726, lng: 88.3639, label: 'Kolkata, West Bengal' },
  ahmedabad: { lat: 23.0225, lng: 72.5714, label: 'Ahmedabad, Gujarat' },
  jaipur: { lat: 26.9124, lng: 75.7873, label: 'Jaipur, Rajasthan' },
  surat: { lat: 21.1702, lng: 72.8311, label: 'Surat, Gujarat' },
  lucknow: { lat: 26.8467, lng: 80.9462, label: 'Lucknow, Uttar Pradesh' },
  chandigarh: { lat: 30.7333, lng: 76.7794, label: 'Chandigarh' },
  indore: { lat: 22.7196, lng: 75.8577, label: 'Indore, Madhya Pradesh' },
  bhopal: { lat: 23.2599, lng: 77.4126, label: 'Bhopal, Madhya Pradesh' },
  nagpur: { lat: 21.1458, lng: 79.0882, label: 'Nagpur, Maharashtra' },
  kanpur: { lat: 26.4499, lng: 80.3319, label: 'Kanpur, Uttar Pradesh' },
  patna: { lat: 25.5941, lng: 85.1376, label: 'Patna, Bihar' },
  vadodara: { lat: 22.3072, lng: 73.1812, label: 'Vadodara, Gujarat' },
  coimbatore: { lat: 11.0168, lng: 76.9558, label: 'Coimbatore, Tamil Nadu' },
  kochi: { lat: 9.9312, lng: 76.2673, label: 'Kochi, Kerala' },
  guwahati: { lat: 26.1445, lng: 91.7362, label: 'Guwahati, Assam' },
  visakhapatnam: { lat: 17.6868, lng: 83.2185, label: 'Visakhapatnam, Andhra Pradesh' },

  // Global Key Logistics Gateways
  singapore: { lat: 1.3521, lng: 103.8198, label: 'Singapore Port' },
  dubai: { lat: 25.2048, lng: 55.2708, label: 'Dubai, UAE' },
  london: { lat: 51.5074, lng: -0.1278, label: 'London, UK' },
  frankfurt: { lat: 50.1109, lng: 8.6821, label: 'Frankfurt Hub, Germany' },
  rotterdam: { lat: 51.9244, lng: 4.4777, label: 'Rotterdam Port, Netherlands' },
  "new york": { lat: 40.7128, lng: -74.0060, label: 'New York, USA' },
  chicago: { lat: 41.8781, lng: -87.6298, label: 'Chicago Logistics Corridor, USA' },
  "los angeles": { lat: 34.0522, lng: -118.2437, label: 'Los Angeles Port, USA' },
  tokyo: { lat: 35.6762, lng: 139.6503, label: 'Tokyo, Japan' },
  shanghai: { lat: 31.2304, lng: 121.4737, label: 'Shanghai Port, China' }
};

/**
 * Resolves coordinates for a given city name.
 * Checks existing coordinates, dictionary lookup, or returns a fallback center.
 */
export function getCoordinatesForCity(cityName) {
  if (!cityName) return { lat: 20.5937, lng: 78.9629, label: 'Central Hub' };

  let clean = cityName.trim().toLowerCase();
  if (clean.includes('-')) {
    clean = clean.split('-')[0].trim();
  }

  if (DEFAULT_CITY_COORDINATES[clean]) {
    return { ...DEFAULT_CITY_COORDINATES[clean] };
  }

  // Check partial key match
  for (const [key, coords] of Object.entries(DEFAULT_CITY_COORDINATES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return { ...coords };
    }
  }

  // Fallback: Central coordinates
  return { lat: 20.5937, lng: 78.9629, label: cityName };
}

/**
 * Calculates great-circle geographical distance (in kilometers) between two coordinates
 * using the Haversine formula.
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  
  const R = 6371; // Earth's mean radius in km
  const toRad = (angle) => (angle * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Estimates driving transit time based on distance in kilometers.
 * Assumes freight commercial transport average speed of 65 km/h + handling buffers.
 */
export function estimateTransitTimeHours(distanceKm) {
  if (!distanceKm || distanceKm <= 0) return 'Immediate (Co-located)';
  
  const avgSpeedKmH = 65; // Commercial heavy freight highway speed
  const baseHours = distanceKm / avgSpeedKmH;
  // Add 1.5 hr loading/documentation buffer
  const totalHours = Math.round((baseHours + 1.5) * 10) / 10;
  
  if (totalHours < 24) {
    return `${totalHours} hrs`;
  }
  
  const days = Math.floor(totalHours / 24);
  const remHours = Math.round(totalHours % 24);
  return `${days}d ${remHours}h (~${totalHours} hrs)`;
}

/**
 * Queries OpenStreetMap Nominatim for free forward geocoding.
 * No API key, zero cost, open source.
 */
export async function searchNominatim(query) {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=5&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ChainMind-DigitalTwin-App/1.0 (https://chainmind.local)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim query failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.map((item) => ({
      placeId: item.place_id,
      displayName: item.display_name,
      name: item.name || item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      importance: item.importance
    }));
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
}
