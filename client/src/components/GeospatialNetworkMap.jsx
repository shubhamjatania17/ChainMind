import { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Network, MapPin, Eye, RefreshCw, Layers, ShieldAlert, Zap, Truck, ArrowRight, Clock } from 'lucide-react';
import { getCoordinatesForCity, calculateHaversineDistance, estimateTransitTimeHours } from '../utils/geoUtils';

export default function GeospatialNetworkMap({
  inventory,
  simTargetCity,
  onSelectTarget
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routesLayerRef = useRef(null);

  const [filterTier, setFilterTier] = useState('all'); // 'all' | 'factory' | 'regional_hub' | 'local_dc' | 'critical'
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapStyle, setMapStyle] = useState('dark'); // 'dark' | 'osm'
  const [selectedRoute, setSelectedRoute] = useState(null);

  // Compute node coordinates and transit corridors
  const { nodesWithCoords, corridors } = useMemo(() => {
    if (!inventory) return { nodesWithCoords: [], corridors: [] };

    const nodes = [];
    const routes = [];

    // Map each node with coordinates
    Object.entries(inventory).forEach(([name, node]) => {
      let lat = node.lat != null ? parseFloat(node.lat) : null;
      let lng = node.lng != null ? parseFloat(node.lng) : null;

      // Fallback to default dictionary if coordinates not explicitly saved yet
      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
        const fallback = getCoordinatesForCity(node.city || name);
        lat = fallback.lat;
        lng = fallback.lng;
      }

      nodes.push({
        key: name,
        ...node,
        lat,
        lng,
        isRisk: (node.type !== 'factory') && Number(node.stock) < 80
      });
    });

    // Build corridors between node and parent
    nodes.forEach((node) => {
      if (node.parent && inventory[node.parent]) {
        const parentNode = nodes.find(n => n.key === node.parent);
        if (parentNode && parentNode.lat != null && parentNode.lng != null && node.lat != null && node.lng != null) {
          const distanceKm = calculateHaversineDistance(parentNode.lat, parentNode.lng, node.lat, node.lng);
          const transitTime = estimateTransitTimeHours(distanceKm);
          routes.push({
            id: `${parentNode.key}->${node.key}`,
            source: parentNode,
            target: node,
            distanceKm,
            transitTime,
            isRisk: node.isRisk
          });
        }
      }
    });

    return { nodesWithCoords: nodes, corridors: routes };
  }, [inventory]);

  // Create customized HTML DivIcon for each storage location node
  const createMarkerIcon = (node, isTarget) => {
    const isFactory = node.type === 'factory';
    const isHub = node.type === 'regional_hub';
    const isRisk = node.isRisk;

    let bgClass = 'bg-purple-600 text-purple-100 border-purple-400 shadow-purple-500/30';
    let label = 'DC';

    if (isFactory) {
      bgClass = 'bg-blue-600 text-blue-100 border-blue-400 shadow-blue-500/40';
      label = 'T1';
    } else if (isHub) {
      bgClass = 'bg-indigo-600 text-indigo-100 border-indigo-400 shadow-indigo-500/40';
      label = 'T2';
    }

    if (isRisk) {
      bgClass = 'bg-red-600 text-red-100 border-red-400 shadow-red-500/50';
    }

    const ringEffect = isTarget
      ? 'ring-4 ring-blue-400 ring-offset-2 ring-offset-slate-950 scale-110 z-30'
      : '';

    const html = `
      <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 hover:scale-125 cursor-pointer">
        ${isRisk ? '<div class="absolute -inset-1.5 rounded-2xl bg-red-500/50 animate-ping"></div>' : ''}
        ${isTarget ? '<div class="absolute -inset-2 rounded-2xl bg-blue-500/40 animate-pulse"></div>' : ''}
        <div class="w-8 h-8 rounded-xl border shadow-xl flex items-center justify-center font-bold text-xs ${bgClass} ${ringEffect}">
          <span>${label}</span>
        </div>
        <div class="absolute -bottom-1 -right-1 px-1 py-0.2 bg-slate-900 border border-white/20 rounded text-[7px] font-extrabold text-white">
          ${isRisk ? '!' : '✓'}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-warehouse-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18]
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    // Default center (India/Global fallback)
    const initialCenter = nodesWithCoords.length > 0
      ? [nodesWithCoords[0].lat, nodesWithCoords[0].lng]
      : [22.5, 78.9];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 5,
      zoomControl: false,
      attributionControl: true
    });

    // Add zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Tile layer setup
    const tileUrl = mapStyle === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = mapStyle === 'dark'
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    L.tileLayer(tileUrl, {
      attribution,
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Layers for dynamic rendering
    routesLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapStyle]);

  // Update Markers & Routing Corridors
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !routesLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    routesLayerRef.current.clearLayers();

    // Filter nodes
    const filteredNodes = nodesWithCoords.filter((node) => {
      if (filterTier === 'critical') return node.isRisk;
      if (filterTier === 'factory') return node.type === 'factory';
      if (filterTier === 'regional_hub') return node.type === 'regional_hub';
      if (filterTier === 'local_dc') return node.type === 'local_dc' || !node.type;
      return true;
    });

    // Draw Routing Corridors
    if (showRoutes) {
      corridors.forEach((route) => {
        const isSelected = selectedRoute && selectedRoute.id === route.id;
        const color = route.isRisk ? '#ef4444' : isSelected ? '#3b82f6' : '#6366f1';
        const weight = isSelected ? 4 : 2.5;
        const dashArray = route.isRisk ? '4, 6' : '6, 8';

        const polyline = L.polyline([[route.source.lat, route.source.lng], [route.target.lat, route.target.lng]], {
          color,
          weight,
          dashArray,
          opacity: 0.85
        });

        // Popup & Tooltip for the Corridor
        polyline.bindTooltip(
          `<strong>${route.source.city}</strong> ➔ <strong>${route.target.city}</strong><br/>` +
          `Distance: <strong>${route.distanceKm} km</strong> • Transit: <strong>${route.transitTime}</strong>`,
          { sticky: true, className: 'leaflet-custom-tooltip' }
        );

        polyline.on('click', () => {
          setSelectedRoute(route);
        });

        polyline.addTo(routesLayerRef.current);
      });
    }

    // Draw Warehouse Markers
    const bounds = [];
    filteredNodes.forEach((node) => {
      const isTarget = node.key === simTargetCity;
      const marker = L.marker([node.lat, node.lng], {
        icon: createMarkerIcon(node, isTarget)
      });

      // Custom styled popup
      const stockFormatted = Number(node.stock).toLocaleString('en-US');
      const tierTitle = node.type === 'factory' ? 'Tier 1: Factory' : node.type === 'regional_hub' ? 'Tier 2: Regional Hub' : 'Tier 3: Local DC';
      const statusBadge = node.isRisk
        ? '<span class="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">Critical (< 80 units)</span>'
        : '<span class="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">Stable Stock</span>';

      const popupHtml = `
        <div class="p-1 min-w-[220px] font-sans text-slate-900">
          <div class="flex items-center justify-between pb-1 mb-2 border-b border-slate-200">
            <h4 class="font-extrabold text-base text-slate-900">${node.city || node.key}</h4>
            <span class="text-[10px] uppercase font-bold text-slate-500">${tierTitle}</span>
          </div>
          <p class="text-xs text-slate-600 mb-1">${node.displayName || 'Facility Node'}</p>
          <div class="my-2 flex items-baseline justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span class="text-xl font-extrabold text-slate-900">${stockFormatted} <span class="text-xs font-normal text-slate-500">units</span></span>
            <div>${statusBadge}</div>
          </div>
          ${node.parent ? `<p class="text-[11px] text-slate-500 mb-2">Supplied by: <strong class="text-indigo-600">${node.parent}</strong></p>` : ''}
          <button 
            id="btn-target-${encodeURIComponent(node.key)}" 
            class="w-full mt-2 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer text-center block"
          >
            Select for Demand Simulation
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'custom-leaflet-popup' });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-target-${encodeURIComponent(node.key)}`);
        if (btn) {
          btn.onclick = () => {
            if (onSelectTarget) onSelectTarget(node.key);
            marker.closePopup();
          };
        }
      });

      marker.addTo(markersLayerRef.current);
      bounds.push([node.lat, node.lng]);
    });

    // Auto-fit bounds if we have 2 or more nodes
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 7);
    }
  }, [nodesWithCoords, corridors, simTargetCity, filterTier, showRoutes, selectedRoute]);

  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map || nodesWithCoords.length === 0) return;

    const bounds = nodesWithCoords.map(n => [n.lat, n.lng]);
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 7);
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl shadow-xl border border-white/10 overflow-hidden relative mb-10 animate-in fade-in duration-200">
      {/* Top Header & Geospatial Control Bar */}
      <div className="p-4 sm:p-6 border-b border-white/10 bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl shadow-inner">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-bold text-white font-display">
                Global Geospatial Twin & Routing Network
              </h3>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {nodesWithCoords.length} storage facilities mapped • {corridors.length} active geographical transit corridors
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tier Filters */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 text-xs">
            <button
              onClick={() => setFilterTier('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${filterTier === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterTier('factory')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${filterTier === 'factory' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              T1
            </button>
            <button
              onClick={() => setFilterTier('regional_hub')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${filterTier === 'regional_hub' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              T2
            </button>
            <button
              onClick={() => setFilterTier('local_dc')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${filterTier === 'local_dc' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              T3
            </button>
            <button
              onClick={() => setFilterTier('critical')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center space-x-1 ${filterTier === 'critical' ? 'bg-red-600 text-white' : 'text-red-400 hover:text-white'}`}
              title="Show only facilities below safety stock threshold (< 80 units)"
            >
              <ShieldAlert className="h-3 w-3" />
              <span>Risk</span>
            </button>
          </div>

          {/* Toggle Corridors */}
          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              showRoutes ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
            title="Toggle Supply Transit Corridor Polylines"
          >
            <Truck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Corridors</span>
          </button>

          {/* Map Style Toggle */}
          <button
            onClick={() => setMapStyle(mapStyle === 'dark' ? 'osm' : 'dark')}
            className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
            title={`Switch to ${mapStyle === 'dark' ? 'Street' : 'Dark'} map`}
          >
            <Layers className="h-4 w-4" />
          </button>

          {/* Reset View Button */}
          <button
            onClick={handleFitBounds}
            className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer"
            title="Fit all warehouses on map"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full h-[400px] sm:h-[460px] bg-slate-950">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

        {/* Live Map Legend Floating Overlay */}
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-2xl flex flex-wrap items-center gap-3 text-[11px] text-slate-300 pointer-events-auto">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
            <span>T1: Factory</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></span>
            <span>T2: Hub</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"></span>
            <span>T3: Local DC</span>
          </div>
          <div className="flex items-center space-x-1.5 pl-2 border-l border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping mr-0.5"></span>
            <span className="text-red-400 font-bold">Critical Alert (&lt;80)</span>
          </div>
        </div>

        {/* Selected Route Info Drawer (if a corridor is selected) */}
        {selectedRoute && (
          <div className="absolute top-4 left-4 z-10 bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-indigo-500/30 shadow-2xl max-w-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                <Truck className="h-3 w-3" />
                <span>Transit Route Corridor</span>
              </span>
              <button onClick={() => setSelectedRoute(null)} className="text-slate-400 hover:text-white p-0.5">
                ✕
              </button>
            </div>
            <div className="flex items-center space-x-2 text-xs font-bold text-white mb-2">
              <span className="truncate">{selectedRoute.source.city}</span>
              <ArrowRight className="h-3 w-3 text-indigo-400 shrink-0" />
              <span className="truncate">{selectedRoute.target.city}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/5 p-2 rounded-xl">
              <div>
                <p className="text-slate-400 text-[9px] uppercase font-semibold">Distance</p>
                <p className="font-mono text-white font-bold">{selectedRoute.distanceKm} km</p>
              </div>
              <div>
                <p className="text-slate-400 text-[9px] uppercase font-semibold">Est. Transit</p>
                <p className="font-mono text-indigo-300 font-bold flex items-center gap-1">
                  <Clock className="h-3 w-3 inline" />
                  <span>{selectedRoute.transitTime}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transit Corridors Optimization Bar */}
      {corridors.length > 0 && showRoutes && (
        <div className="p-3 sm:px-6 bg-slate-950/70 border-t border-white/5 flex items-center overflow-x-auto gap-3 text-xs custom-scrollbar">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider shrink-0 flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-400" />
            <span>Active Corridors:</span>
          </span>
          {corridors.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedRoute(c)}
              className={`px-3 py-1.5 rounded-xl border shrink-0 flex items-center space-x-2 cursor-pointer transition-all ${
                selectedRoute && selectedRoute.id === c.id
                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                  : c.isRisk
                  ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="font-semibold">{c.source.city}</span>
              <ArrowRight className="h-3 w-3 text-slate-500" />
              <span className="font-semibold">{c.target.city}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5">
                {c.distanceKm} km • {c.transitTime}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
