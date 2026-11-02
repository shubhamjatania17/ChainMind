import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Search, MapPin, X, Check, Loader2, Navigation, Compass } from 'lucide-react';
import { searchNominatim, getCoordinatesForCity } from '../utils/geoUtils';

export default function LocationMapPickerModal({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  cityName,
  nodeName,
  onSave
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Fallback initial coordinates
  const fallbackCoords = getCoordinatesForCity(cityName);
  const startLat = initialLat != null ? parseFloat(initialLat) : fallbackCoords.lat;
  const startLng = initialLng != null ? parseFloat(initialLng) : fallbackCoords.lng;

  const [selectedCoords, setSelectedCoords] = useState({ lat: startLat, lng: startLng });
  const [selectedAddress, setSelectedAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState(cityName || '');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Custom marker pin element
  const createPinIcon = () => {
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-full cursor-grab active:cursor-grabbing">
          <div class="absolute -top-1 w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
          <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 border-2 border-white shadow-2xl flex items-center justify-center text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div class="w-2 h-2 bg-blue-500 rounded-full transform translate-y-1 shadow-md"></div>
        </div>
      `,
      className: 'custom-pin-marker',
      iconSize: [40, 48],
      iconAnchor: [20, 48]
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Small delay to ensure modal DOM is mounted and sized properly
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapContainerRef.current, {
        center: [selectedCoords.lat, selectedCoords.lng],
        zoom: 13,
        zoomControl: true
      });

      // CartoDB Dark Matter tile layer (100% Free, matches ChainMind dark aesthetics)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Add draggable pin
      const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
        icon: createPinIcon(),
        draggable: true
      }).addTo(map);

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        setSelectedCoords({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) });
      });

      // Click anywhere to position pin
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setSelectedCoords({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) });
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Ensure Leaflet resizes correctly within modal
      map.invalidateSize();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    try {
      const results = await searchNominatim(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('No locations found. Try searching with city name or landmark.');
      }
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    setSelectedCoords({ lat: result.lat, lng: result.lng });
    setSelectedAddress(result.displayName);
    setSearchResults([]);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([result.lat, result.lng], 14, { duration: 1.2 });
      markerRef.current.setLatLng([result.lat, result.lng]);
    }
  };

  const handleResetToCityCenter = () => {
    const coords = getCoordinatesForCity(cityName);
    setSelectedCoords({ lat: coords.lat, lng: coords.lng });
    setSelectedAddress(coords.label || cityName);
    setSearchResults([]);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 13, { duration: 1 });
      markerRef.current.setLatLng([coords.lat, coords.lng]);
    }
  };

  const handleConfirm = () => {
    onSave({
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      address: selectedAddress || `${cityName} Facility`
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display">
                Pin Location: {nodeName || 'Warehouse Node'}
              </h3>
              <p className="text-xs text-slate-400">
                City: <span className="text-blue-400 font-semibold">{cityName}</span> • Search or click map to pinpoint the facility.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar Row */}
        <div className="p-4 border-b border-white/5 bg-slate-900/60 relative z-20">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exact street address, industrial zone, city..."
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center space-x-1.5 shrink-0 cursor-pointer"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
              <span>Search</span>
            </button>
            <button
              type="button"
              onClick={handleResetToCityCenter}
              className="px-3 py-2.5 border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center space-x-1 cursor-pointer"
              title="Reset pin to City Center"
            >
              <Compass className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">City Center</span>
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-full mt-1 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto z-30">
              {searchResults.map((item) => (
                <button
                  key={item.placeId}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full px-4 py-2.5 text-left text-xs text-slate-200 hover:bg-blue-600/20 hover:text-white border-b border-white/5 last:border-b-0 flex items-start space-x-2 transition-colors cursor-pointer"
                >
                  <MapPin className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{item.displayName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchError && (
            <p className="text-red-400 text-xs mt-2 pl-1 font-medium">{searchError}</p>
          )}
        </div>

        {/* Leaflet Map Canvas */}
        <div className="relative flex-1 min-h-[340px] w-full bg-slate-950">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
          
          <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[11px] text-slate-300 pointer-events-none shadow-lg">
            Tip: Click anywhere or drag the pin to position the warehouse.
          </div>
        </div>

        {/* Footer with Selected Coordinates & Action Buttons */}
        <div className="p-4 border-t border-white/10 bg-slate-900/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-300 flex items-center space-x-2 self-start sm:self-auto">
            <span className="text-slate-500 font-bold uppercase text-[10px]">Pinned Coords:</span>
            <span className="font-mono bg-white/5 px-2 py-1 rounded-md text-blue-400 font-semibold border border-white/5">
              {selectedCoords.lat.toFixed(4)}° N, {selectedCoords.lng.toFixed(4)}° E
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Apply Mapped Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
