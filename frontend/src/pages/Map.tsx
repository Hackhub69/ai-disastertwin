import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle, Package, RefreshCw, Filter, Layers,
  MapPin, Shield, Search, ArrowRight, Eye, EyeOff, Radio,
  Compass, Globe, Check, Target, Crosshair, Radar, Activity,
  Zap, Flame, Waves, Wind, Thermometer, ChevronRight, X, Loader2
} from 'lucide-react';
import { getIncidents, getResources } from '../services/api';
import type { Incident, Resource } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import IncidentPriorityBadge from '../components/IncidentPriorityBadge';
import DemoBadge from '../components/DemoBadge';
import IncidentDetailDrawer from '../components/IncidentDetailDrawer';
import { useNavigate } from 'react-router-dom';

// Fix default Leaflet icon URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#10b981',
};

const HAZARD_EMOJIS: Record<string, string> = {
  flood: '🌊',
  fire: '🔥',
  wildfire: '🔥',
  cyclone: '🌪️',
  storm: '🌪️',
  heatwave: '🌡️',
  earthquake: '🏚️',
  landslide: '⛰️',
  chemical: '☣️',
  industrial: '⚠️',
};

const RESOURCE_EMOJIS: Record<string, string> = {
  ambulance: '🚑',
  medical: '🚑',
  boat: '🚤',
  rescue: '🚤',
  fire: '🚒',
  firetruck: '🚒',
  drone: '🚁',
  helicopter: '🚁',
  ndrf: '🛡️',
  sdrf: '🛡️',
  team: '👥',
  shelter: '⛺',
  supply: '📦',
};

const POPULAR_LOCATIONS: Record<string, { coords: [number, number]; label: string }> = {
  'vasai-virar': { coords: [19.4210, 72.8197], label: 'Vasai-Virar, Maharashtra' },
  'vasai virar': { coords: [19.4210, 72.8197], label: 'Vasai-Virar, Maharashtra' },
  'vasai': { coords: [19.3800, 72.8300], label: 'Vasai, Maharashtra' },
  'virar': { coords: [19.4700, 72.8100], label: 'Virar, Maharashtra' },
  'mumbai': { coords: [19.0760, 72.8777], label: 'Mumbai, Maharashtra' },
  'andheri': { coords: [19.1136, 72.8697], label: 'Andheri, Mumbai' },
  'bandra': { coords: [19.0596, 72.8295], label: 'Bandra, Mumbai' },
  'colaba': { coords: [18.9067, 72.8147], label: 'Colaba, Mumbai' },
  'dadar': { coords: [19.0178, 72.8478], label: 'Dadar, Mumbai' },
  'borivali': { coords: [19.2288, 72.8541], label: 'Borivali, Mumbai' },
  'thane': { coords: [19.2183, 72.9781], label: 'Thane, Maharashtra' },
  'navi mumbai': { coords: [19.0330, 73.0297], label: 'Navi Mumbai, Maharashtra' },
  'pune': { coords: [18.5204, 73.8567], label: 'Pune, Maharashtra' },
  'nashik': { coords: [19.9975, 73.7898], label: 'Nashik, Maharashtra' },
  'nagpur': { coords: [21.1458, 79.0882], label: 'Nagpur, Maharashtra' },
  'aurangabad': { coords: [19.8762, 75.3433], label: 'Chhatrapati Sambhajinagar (Aurangabad)' },
  'solapur': { coords: [17.6599, 75.9064], label: 'Solapur, Maharashtra' },
  'delhi': { coords: [28.6139, 77.2090], label: 'Delhi / NCR' },
  'new delhi': { coords: [28.6139, 77.2090], label: 'New Delhi, National Capital Territory' },
  'connaught place': { coords: [28.6315, 77.2167], label: 'Connaught Place, New Delhi' },
  'noida': { coords: [28.5355, 77.3910], label: 'Noida, Uttar Pradesh' },
  'gurgaon': { coords: [28.4595, 77.0266], label: 'Gurugram, Haryana' },
  'gurugram': { coords: [28.4595, 77.0266], label: 'Gurugram, Haryana' },
  'faridabad': { coords: [28.4089, 77.3178], label: 'Faridabad, Haryana' },
  'ghaziabad': { coords: [28.6692, 77.4538], label: 'Ghaziabad, Uttar Pradesh' },
  'bangalore': { coords: [12.9716, 77.5946], label: 'Bengaluru, Karnataka' },
  'bengaluru': { coords: [12.9716, 77.5946], label: 'Bengaluru, Karnataka' },
  'whitefield': { coords: [12.9698, 77.7500], label: 'Whitefield, Bengaluru' },
  'koramangala': { coords: [12.9352, 77.6245], label: 'Koramangala, Bengaluru' },
  'chennai': { coords: [13.0827, 80.2707], label: 'Chennai, Tamil Nadu' },
  't nagar': { coords: [13.0418, 80.2341], label: 'T. Nagar, Chennai' },
  'coimbatore': { coords: [11.0168, 76.9558], label: 'Coimbatore, Tamil Nadu' },
  'hyderabad': { coords: [17.3850, 78.4867], label: 'Hyderabad, Telangana' },
  'ahmedabad': { coords: [23.0225, 72.5714], label: 'Ahmedabad, Gujarat' },
  'surat': { coords: [21.1702, 72.8311], label: 'Surat, Gujarat' },
  'vadodara': { coords: [22.3072, 73.1812], label: 'Vadodara, Gujarat' },
  'rajkot': { coords: [22.3039, 70.8022], label: 'Rajkot, Gujarat' },
  'kolkata': { coords: [22.5726, 88.3639], label: 'Kolkata, West Bengal' },
  'jaipur': { coords: [26.9124, 75.7873], label: 'Jaipur, Rajasthan' },
  'lucknow': { coords: [26.8467, 80.9462], label: 'Lucknow, Uttar Pradesh' },
  'kanpur': { coords: [26.4499, 80.3319], label: 'Kanpur, Uttar Pradesh' },
  'varanasi': { coords: [25.3176, 82.9739], label: 'Varanasi, Uttar Pradesh' },
  'patna': { coords: [25.5941, 85.1376], label: 'Patna, Bihar' },
  'bhopal': { coords: [23.2599, 77.4126], label: 'Bhopal, Madhya Pradesh' },
  'indore': { coords: [22.7196, 75.8577], label: 'Indore, Madhya Pradesh' },
  'visakhapatnam': { coords: [17.6868, 83.2185], label: 'Visakhapatnam, Andhra Pradesh' },
  'vijayawada': { coords: [16.5062, 80.6480], label: 'Vijayawada, Andhra Pradesh' },
  'chandigarh': { coords: [30.7333, 76.7794], label: 'Chandigarh' },
  'kochi': { coords: [9.9312, 76.2673], label: 'Kochi, Kerala' },
  'thiruvananthapuram': { coords: [8.5241, 76.9366], label: 'Thiruvananthapuram, Kerala' },
  'goa': { coords: [15.2993, 74.1240], label: 'Goa' },
  'panaji': { coords: [15.4909, 73.8278], label: 'Panaji, Goa' },
  'guwahati': { coords: [26.1445, 91.7362], label: 'Guwahati, Assam' },
  'bhubaneswar': { coords: [20.2961, 85.8245], label: 'Bhubaneswar, Odisha' },
  'dehradun': { coords: [30.3165, 78.0322], label: 'Dehradun, Uttarakhand' },
  'shimla': { coords: [31.1048, 77.1734], label: 'Shimla, Himachal Pradesh' },
  'srinagar': { coords: [34.0837, 74.7973], label: 'Srinagar, Jammu & Kashmir' },
  'ranchi': { coords: [23.3441, 85.3096], label: 'Ranchi, Jharkhand' },
  'raipur': { coords: [21.2514, 81.6296], label: 'Raipur, Chhattisgarh' },
  'amritsar': { coords: [31.6340, 74.8723], label: 'Amritsar, Punjab' },
  'ludhiana': { coords: [30.9010, 75.8573], label: 'Ludhiana, Punjab' },
  'jabalpur': { coords: [23.1815, 79.9864], label: 'Jabalpur, Madhya Pradesh' },
  'gwalior': { coords: [26.2183, 78.1828], label: 'Gwalior, Madhya Pradesh' },
  'jodhpur': { coords: [26.2389, 73.0243], label: 'Jodhpur, Rajasthan' },
  'madurai': { coords: [9.9252, 78.1198], label: 'Madurai, Tamil Nadu' },
  'tiruchirappalli': { coords: [10.7905, 78.7047], label: 'Tiruchirappalli, Tamil Nadu' },
};

function makeSearchBeaconIcon(label: string) {
  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; pointer-events: auto;">
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #0891b2;
        border: 2.5px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px rgba(6,182,212,0.9), 0 0 40px rgba(6,182,212,0.5);
        color: white;
        font-weight: bold;
        font-size: 15px;
      ">
        📍
      </div>
      <div style="
        margin-top: 4px;
        background: rgba(2, 6, 23, 0.95);
        border: 1.5px solid #06b6d4;
        padding: 3px 8px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 11px;
        font-weight: bold;
        color: #67e8f9;
        white-space: nowrap;
        box-shadow: 0 4px 14px rgba(0,0,0,0.85);
      ">
        ${label}
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-search-beacon',
    iconSize: [40, 60],
    iconAnchor: [20, 20],
  });
}

/**
 * Generates high-visibility tactical military-grade incident pins
 */
function makeIncidentIcon(incident: Incident, isSelected: boolean = false) {
  const normPriority = (incident.priority_level || 'medium').toLowerCase();
  const color = PRIORITY_COLORS[normPriority] || '#64748b';
  const isCritical = normPriority === 'critical';
  const typeKey = (incident.incident_type || '').toLowerCase();
  const emoji = HAZARD_EMOJIS[typeKey] || '⚠️';
  const score = incident.priority_score != null ? Math.round(incident.priority_score) : (isCritical ? 94 : 68);

  const html = `
    <div style="position: relative; width: 44px; height: 50px; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.7)); pointer-events: auto;">
      ${
        isCritical
          ? `<div style="position: absolute; top: -2px; width: 40px; height: 40px; border-radius: 9999px; background: rgba(239,68,68,0.45); animation: radar-pulse 2s infinite; pointer-events: none;"></div>`
          : ''
      }
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: #090d16;
        border: 2.5px solid ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 16px ${color}90, inset 0 0 8px ${color}33;
        z-index: 10;
        ${isSelected ? `transform: rotate(-45deg) scale(1.18); border-color: #38bdf8; box-shadow: 0 0 22px #38bdf8;` : ''}
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 16px;
          line-height: 1;
          display: block;
          pointer-events: none;
        ">${emoji}</span>
      </div>

      <!-- Priority Chip -->
      <div style="
        position: absolute;
        top: -6px;
        right: -4px;
        background: ${color};
        color: #050811;
        font-family: monospace;
        font-weight: 900;
        font-size: 9px;
        padding: 1px 4.5px;
        border-radius: 9999px;
        border: 1px solid rgba(255,255,255,0.7);
        box-shadow: 0 2px 4px rgba(0,0,0,0.6);
        z-index: 20;
        pointer-events: none;
      ">
        ${score}
      </div>

      <!-- Pointer Dot -->
      <div style="
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${color};
        margin-top: 1px;
        box-shadow: 0 0 6px ${color};
        pointer-events: none;
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: isCritical ? 'pulse-radar-critical' : '',
    iconSize: [44, 50],
    iconAnchor: [22, 48],
    popupAnchor: [0, -46],
  });
}

/**
 * Generates specialized tactical asset icons
 */
function makeResourceIcon(res: Resource) {
  const normType = (res.resource_type || '').toLowerCase();
  const matchedKey = Object.keys(RESOURCE_EMOJIS).find(k => normType.includes(k));
  const emoji = matchedKey ? RESOURCE_EMOJIS[matchedKey] : '🛡️';
  const statusColor = res.status === 'available' ? '#10b981' : res.status === 'deployed' ? '#f59e0b' : '#64748b';
  const shortCode = res.name ? res.name.substring(0, 8) : 'UNIT';

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.8)); pointer-events: auto;">
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 10px;
        background: #041d2f;
        border: 2px solid #0284c7;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 12px rgba(2,132,199,0.55);
        position: relative;
      ">
        <span style="font-size: 15px; line-height: 1; pointer-events: none;">${emoji}</span>
        <div style="
          position: absolute;
          top: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${statusColor};
          border: 1.5px solid #041d2f;
          box-shadow: 0 0 6px ${statusColor};
          pointer-events: none;
        "></div>
      </div>
      <div style="
        margin-top: 2px;
        background: rgba(8,14,28,0.9);
        color: #7dd3fc;
        font-family: monospace;
        font-size: 8px;
        font-weight: 700;
        padding: 0 4px;
        border-radius: 4px;
        border: 0.5px solid rgba(2,132,199,0.4);
        white-space: nowrap;
        pointer-events: none;
      ">
        ${shortCode}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [40, 44],
    iconAnchor: [20, 32],
    popupAnchor: [0, -32],
  });
}

function calcImpactRadius(inc: Incident): number {
  const baseScore = inc.priority_score || (inc.severity * 18);
  const type = (inc.incident_type || '').toLowerCase();
  if (type.includes('cyclone') || type.includes('storm')) {
    return Math.max(12000, Math.min(40000, baseScore * 300));
  }
  if (type.includes('flood')) {
    // 2.5km to 8.5km realistic urban flood impact zone
    return Math.max(2500, Math.min(8500, baseScore * 90));
  }
  if (type.includes('heatwave')) {
    return Math.max(6000, Math.min(20000, baseScore * 180));
  }
  if (type.includes('fire') || type.includes('wildfire')) {
    return Math.max(1500, Math.min(6000, baseScore * 60));
  }
  return Math.max(2000, Math.min(7500, baseScore * 70));
}

function getPerimeterStyle(inc: Incident) {
  const type = (inc.incident_type || '').toLowerCase();
  const priority = (inc.priority_level || 'medium').toLowerCase();
  const isCritical = priority === 'critical';

  if (type.includes('flood')) {
    return {
      color: '#0891b2',
      fillColor: '#0369a1',
      fillOpacity: isCritical ? 0.08 : 0.04,
      weight: isCritical ? 1.8 : 1.2,
      dashArray: '6, 8',
    };
  }
  if (type.includes('fire') || type.includes('wildfire')) {
    return {
      color: '#ef4444',
      fillColor: '#dc2626',
      fillOpacity: isCritical ? 0.12 : 0.06,
      weight: isCritical ? 2 : 1.2,
      dashArray: '5, 5',
    };
  }
  if (type.includes('heatwave')) {
    return {
      color: '#f59e0b',
      fillColor: '#d97706',
      fillOpacity: isCritical ? 0.10 : 0.05,
      weight: 1.2,
      dashArray: '8, 8',
    };
  }
  if (type.includes('cyclone')) {
    return {
      color: '#a855f7',
      fillColor: '#7e22ce',
      fillOpacity: isCritical ? 0.12 : 0.06,
      weight: 1.8,
      dashArray: '4, 6',
    };
  }
  return {
    color: '#f97316',
    fillColor: '#ea580c',
    fillOpacity: isCritical ? 0.10 : 0.05,
    weight: 1.2,
    dashArray: '4, 6',
  };
}

/**
 * Helper to capture Leaflet map instance and hook events safely without render loops
 */
function MapBridge({
  targetPoint,
  initialBounds,
  onTelemetryUpdate,
  onMapReady,
}: {
  targetPoint: [number, number] | null;
  initialBounds: [number, number][] | null;
  onTelemetryUpdate: (lat: number, lng: number, zoom: number) => void;
  onMapReady: (map: L.Map) => void;
}) {
  const map = useMap();
  const hasFittedRef = useRef(false);
  const onTelemetryRef = useRef(onTelemetryUpdate);

  useEffect(() => {
    onTelemetryRef.current = onTelemetryUpdate;
  });

  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t1);
  }, [map]);

  useEffect(() => {
    const handleEnd = () => {
      try {
        const center = map.getCenter();
        if (center && onTelemetryRef.current) {
          onTelemetryRef.current(center.lat, center.lng, map.getZoom());
        }
      } catch {
        // safe guard
      }
    };

    map.on('moveend', handleEnd);
    map.on('zoomend', handleEnd);
    return () => {
      map.off('moveend', handleEnd);
      map.off('zoomend', handleEnd);
    };
  }, [map]);

  useEffect(() => {
    if (initialBounds && initialBounds.length > 0 && !hasFittedRef.current) {
      hasFittedRef.current = true;
      try {
        map.fitBounds(L.latLngBounds(initialBounds), { padding: [50, 50], maxZoom: 12 });
      } catch (err) {
        console.warn('Could not fit bounds on map:', err);
      }
    }
  }, [initialBounds, map]);

  useEffect(() => {
    if (targetPoint) {
      map.flyTo(targetPoint, 12, { duration: 1.2 });
    }
  }, [targetPoint, map]);

  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<{ label: string; coords: [number, number] } | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showResources, setShowResources] = useState(true);
  const [showPerimeters, setShowPerimeters] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [drawerIncident, setDrawerIncident] = useState<Incident | null>(null);
  const [targetPoint, setTargetPoint] = useState<[number, number] | null>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Map Tile Style: 'dark' (Esri Dark Canvas), 'satellite' (Esri World Imagery), 'street' (OSM)
  const [tileMode, setTileMode] = useState<'dark' | 'satellite' | 'street'>('dark');

  // Map instance reference
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // Telemetry HUD state
  const [telemetry, setTelemetry] = useState({ lat: 20.5937, lng: 78.9629, zoom: 5 });

  const handleTelemetryUpdate = useCallback((lat: number, lng: number, zoom: number) => {
    setTelemetry(prev => {
      if (Math.abs(prev.lat - lat) < 0.001 && Math.abs(prev.lng - lng) < 0.001 && prev.zoom === zoom) {
        return prev;
      }
      return { lat, lng, zoom };
    });
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [incData, resData] = await Promise.all([
        getIncidents({ page_size: 100 }),
        getResources({ page_size: 100 }),
      ]);
      setIncidents(incData.items || []);
      setResources(resData.items || []);
    } catch (e) {
      console.error('Failed to load map incidents or resources:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const validIncidents = incidents.filter(
    i => Number.isFinite(i.latitude) && Number.isFinite(i.longitude)
  );

  const validResources = resources.filter(
    r => Number.isFinite(r.latitude) && Number.isFinite(r.longitude)
  );

  const searchSuggestions = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 2) return [];

    const results: Array<{ id: string; name: string; type: 'location' | 'incident' | 'resource'; coords: [number, number]; desc?: string }> = [];

    // 1. Locations from offline dictionary
    for (const [key, loc] of Object.entries(POPULAR_LOCATIONS)) {
      if (key.includes(q) || loc.label.toLowerCase().includes(q)) {
        results.push({
          id: `loc-${key}`,
          name: loc.label,
          type: 'location',
          coords: loc.coords,
        });
        if (results.length >= 4) break;
      }
    }

    // 2. Matching Incidents
    for (const inc of validIncidents) {
      if (inc.title.toLowerCase().includes(q) || (inc.address && inc.address.toLowerCase().includes(q))) {
        results.push({
          id: `inc-${inc.id}`,
          name: inc.title,
          type: 'incident',
          coords: [inc.latitude, inc.longitude],
          desc: inc.address || inc.incident_type,
        });
        if (results.length >= 7) break;
      }
    }

    // 3. Matching Resources
    for (const res of validResources) {
      if (res.name.toLowerCase().includes(q) || (res.address && res.address.toLowerCase().includes(q))) {
        results.push({
          id: `res-${res.id}`,
          name: res.name,
          type: 'resource',
          coords: [res.latitude, res.longitude],
          desc: res.resource_type,
        });
        if (results.length >= 9) break;
      }
    }

    return results;
  }, [searchTerm, validIncidents, validResources]);

  const handleExecuteSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchTerm).trim().toLowerCase();
    if (!q) return;

    setShowSuggestions(false);
    setDrawerIncident(null); // Keep map view completely unobstructed on search
    setIsSearching(true);

    // 1. Check popular offline locations dictionary first (instant city navigation, 0ms)
    const directKey = Object.keys(POPULAR_LOCATIONS).find(k => k === q || q.includes(k) || k.includes(q));
    if (directKey) {
      const loc = POPULAR_LOCATIONS[directKey];
      setTargetPoint(loc.coords);
      setSearchedLocation({ label: loc.label, coords: loc.coords });
      if (mapInstance) {
        mapInstance.flyTo(loc.coords, 12, { duration: 1.2 });
      }
      setIsSearching(false);
      return;
    }

    // 2. Check if matching loaded incident title or address
    const matchedInc = validIncidents.find(
      i => i.title.toLowerCase().includes(q) || (i.address && i.address.toLowerCase().includes(q))
    );
    if (matchedInc) {
      setTargetPoint([matchedInc.latitude, matchedInc.longitude]);
      setSelectedIncident(matchedInc);
      setSearchedLocation({
        label: matchedInc.title,
        coords: [matchedInc.latitude, matchedInc.longitude],
      });
      if (mapInstance) {
        mapInstance.flyTo([matchedInc.latitude, matchedInc.longitude], 13, { duration: 1.2 });
      }
      setIsSearching(false);
      return;
    }

    // 3. Check if matching loaded resource
    const matchedRes = validResources.find(
      r => r.name.toLowerCase().includes(q) || (r.address && r.address.toLowerCase().includes(q))
    );
    if (matchedRes) {
      setTargetPoint([matchedRes.latitude, matchedRes.longitude]);
      setSearchedLocation({
        label: matchedRes.name,
        coords: [matchedRes.latitude, matchedRes.longitude],
      });
      if (mapInstance) {
        mapInstance.flyTo([matchedRes.latitude, matchedRes.longitude], 13, { duration: 1.2 });
      }
      setIsSearching(false);
      return;
    }

    // 4. Online OpenStreetMap Geocoding (Nominatim — 100% Free, Zero API Keys)
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          const label = data[0].display_name.split(',').slice(0, 3).join(',');
          setTargetPoint([lat, lon]);
          setSearchedLocation({ label: label || q, coords: [lat, lon] });
          if (mapInstance) {
            mapInstance.flyTo([lat, lon], 12, { duration: 1.2 });
          }
          setIsSearching(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Geocoding network error:', err);
    }

    setIsSearching(false);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchedLocation(null);
    setShowSuggestions(false);
  };

  const filteredIncidents = validIncidents.filter((i) => {
    if (filterType !== 'all' && i.incident_type !== filterType) return false;
    if (filterPriority !== 'all' && i.priority_level !== filterPriority) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      const hasDirectMatch = validIncidents.some(
        inc => inc.title.toLowerCase().includes(q) || (inc.address && inc.address.toLowerCase().includes(q))
      );
      if (hasDirectMatch) {
        return i.title.toLowerCase().includes(q) || (i.address && i.address.toLowerCase().includes(q));
      }
    }
    return true;
  });

  const allPoints: [number, number][] = React.useMemo(() => [
    ...filteredIncidents.map(i => [i.latitude, i.longitude] as [number, number]),
    ...(showResources ? validResources.map(r => [r.latitude, r.longitude] as [number, number]) : []),
  ], [filteredIncidents, validResources, showResources]);

  const handleFitAll = useCallback(() => {
    if (!mapInstance) return;
    if (allPoints.length > 0) {
      try {
        mapInstance.fitBounds(L.latLngBounds(allPoints), { padding: [60, 60], maxZoom: 13 });
      } catch (err) {
        console.warn('Fit error:', err);
      }
    } else {
      mapInstance.setView([20.5937, 78.9629], 5);
    }
  }, [mapInstance, allPoints]);

  const criticalCount = filteredIncidents.filter(i => i.priority_level === 'critical').length;
  const highCount = filteredIncidents.filter(i => i.priority_level === 'high').length;

  return (
    <div className="relative h-[calc(100vh-6.5rem)] w-full flex flex-col overflow-hidden bg-slate-950">
      {/* Top Floating Filter & Controls Deck */}
      <div className="absolute top-4 left-4 right-4 z-[990] pointer-events-none flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search & Filters */}
        <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl flex-wrap">
          {/* Enhanced Search with Dropdown Autocomplete & Instant Pan */}
          <div ref={searchContainerRef} className="relative">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-700/60 text-xs focus-within:border-cyan-500/60 transition-colors">
              <button
                type="button"
                onClick={() => handleExecuteSearch()}
                className="text-cyan-400 hover:text-cyan-300 transition-colors shrink-0"
                title="Search location or incident (Enter)"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Search className="w-3.5 h-3.5" />}
              </button>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteSearch();
                  }
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                placeholder="Search sector, city (e.g. Vasai-Virar)..."
                className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-28 sm:w-44 text-xs"
              />
              {(searchTerm || searchedLocation) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-0.5 rounded text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Floating Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1.5 w-64 sm:w-80 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden z-[1000] p-1 space-y-0.5">
                <div className="text-[10px] font-mono text-slate-500 px-2.5 py-1 uppercase tracking-wider border-b border-slate-800/80 flex items-center justify-between">
                  <span>Locations &amp; Incidents</span>
                  <span className="text-[9px] text-cyan-400 font-bold">Press Enter ↵</span>
                </div>
                {searchSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSearchTerm(item.name);
                      handleExecuteSearch(item.name);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 text-xs flex items-center justify-between gap-2 group transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-xs">
                        {item.type === 'location' ? '📍' : item.type === 'incident' ? '⚠️' : '🛡️'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-white group-hover:text-cyan-300 truncate">
                          {item.name}
                        </div>
                        {item.desc && (
                          <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 opacity-0 group-hover:opacity-100 shrink-0">
                      Fly →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs bg-slate-900 border border-slate-700/60 rounded-xl px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-slate-900 border border-slate-700/60 rounded-xl px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500 font-medium capitalize cursor-pointer"
          >
            <option value="all">All Hazards</option>
            <option value="flood">Flood 🌊</option>
            <option value="fire">Fire 🔥</option>
            <option value="heatwave">Heatwave 🌡️</option>
            <option value="cyclone">Cyclone 🌪️</option>
            <option value="earthquake">Earthquake 🏚️</option>
          </select>

          {/* Toggle Resources */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowResources(prev => !prev);
            }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
              showResources
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'bg-slate-900 text-slate-400 border-slate-700/60'
            }`}
            title="Toggle rescue units and response equipment"
          >
            {showResources ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
            <span>Assets ({validResources.length})</span>
          </button>

          {/* Toggle Hazard Threat Perimeters */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPerimeters(prev => !prev);
            }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
              showPerimeters
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-slate-900 text-slate-400 border-slate-700/60'
            }`}
            title="Toggle hazard impact radii"
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Perimeters</span>
          </button>

          {/* Tile Layer Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTileMode(prev => {
                if (prev === 'dark') return 'satellite';
                if (prev === 'satellite') return 'street';
                return 'dark';
              });
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 transition-all cursor-pointer select-none active:scale-95"
            title="Click to cycle: Tactical Dark -> Satellite Hybrid -> Street Map"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="capitalize font-mono font-bold">
              {tileMode === 'dark' ? '🌌 Tactical Dark' : tileMode === 'satellite' ? '🛰️ Satellite Hybrid' : '🗺️ Street Map'}
            </span>
          </button>
        </div>

        {/* Legend, Fit All & Refresh */}
        <div className="pointer-events-auto flex items-center gap-2 self-end md:self-auto flex-wrap">
          <div className="hidden lg:flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] text-slate-300 backdrop-blur-md shadow-xl">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" /> Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Medium
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-md bg-cyan-500" /> Unit
            </span>
          </div>

          {/* Fit All Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFitAll();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-semibold shadow-lg backdrop-blur-md transition-all cursor-pointer active:scale-95 select-none"
            title="Fit map viewport to all markers"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fit All</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              loadData();
            }}
            className="p-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white shadow-lg backdrop-blur-md transition-all cursor-pointer select-none active:scale-95"
            title="Refresh map telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Leaflet Map View */}
      <div className={`flex-1 w-full h-full relative${tileMode === 'street' ? ' map-street-mode' : ''}`} style={{ minHeight: '400px' }}>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          scrollWheelZoom={true}
          className="w-full h-full bg-[#060911]"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Tactical Dark Mode (Esri Dark Canvas + Reference Labels) - 100% Free, Zero Keys */}
          {tileMode === 'dark' && (
            <>
              <TileLayer
                key="esri-dark-base"
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                maxZoom={16}
              />
              <TileLayer
                key="esri-dark-ref"
                url="https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                maxZoom={16}
              />
            </>
          )}

          {/* Satellite Hybrid (Esri World Imagery + Labels) - 100% Free, Zero Keys */}
          {tileMode === 'satellite' && (
            <>
              <TileLayer
                key="esri-sat-base"
                attribution='&copy; Esri &copy; Maxar'
                url="https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={18}
              />
              <TileLayer
                key="esri-sat-ref"
                url="https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={18}
              />
            </>
          )}

          {/* Street Map (OpenStreetMap) — blue-dimmed */}
          {tileMode === 'street' && (
            <TileLayer
              key="osm-street"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              className="osm-street-dimmed"
            />
          )}

          <MapBridge
            targetPoint={targetPoint}
            initialBounds={allPoints.length > 0 ? allPoints : null}
            onTelemetryUpdate={handleTelemetryUpdate}
            onMapReady={setMapInstance}
          />

          {/* Searched Location Beacon Marker */}
          {searchedLocation && (
            <Marker
              position={searchedLocation.coords}
              icon={makeSearchBeaconIcon(searchedLocation.label)}
            >
              <Popup className="tactical-popup">
                <div className="p-2 text-slate-100 text-xs space-y-1.5 font-sans min-w-[180px]">
                  <div className="font-bold text-cyan-400 flex items-center justify-between border-b border-slate-800 pb-1 font-mono text-[11px]">
                    <span>📍 NAVIGATED SECTOR</span>
                    <span className="text-emerald-400 font-bold">ACQUIRED</span>
                  </div>
                  <p className="font-bold text-white text-xs">{searchedLocation.label}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {searchedLocation.coords[0].toFixed(4)}°N, {searchedLocation.coords[1].toFixed(4)}°E
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Hazard Threat Perimeters (Non-interactive so they never block marker clicks) */}
          {showPerimeters &&
            filteredIncidents.map((inc) => (
              <Circle
                key={`circle-${inc.id}`}
                center={[inc.latitude, inc.longitude]}
                radius={calcImpactRadius(inc)}
                pathOptions={{
                  ...getPerimeterStyle(inc),
                  interactive: false,
                }}
              />
            ))}

          {/* Incident Markers */}
          {filteredIncidents.map((inc) => (
            <Marker
              key={inc.id}
              position={[inc.latitude, inc.longitude]}
              icon={makeIncidentIcon(inc, selectedIncident?.id === inc.id)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  setSelectedIncident(inc);
                  setTargetPoint([inc.latitude, inc.longitude]);
                },
              }}
            >
              <Popup className="tactical-popup">
                <div className="p-2 min-w-[220px] space-y-2 text-slate-100 font-sans">
                  <div className="flex items-center justify-between gap-1 font-bold text-xs uppercase border-b border-slate-800 pb-1.5">
                    <span className="text-cyan-400 flex items-center gap-1 font-mono">
                      {HAZARD_EMOJIS[inc.incident_type?.toLowerCase()] || '⚠️'} {inc.incident_type}
                    </span>
                    <span className="font-mono bg-red-950/80 text-red-300 border border-red-800/60 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      Sev {inc.severity}/5
                    </span>
                  </div>

                  <h4 className="text-xs font-bold leading-tight text-white">{inc.title}</h4>
                  <p className="text-[11px] text-slate-300 line-clamp-2">{inc.address}</p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                    <span>Priority: <strong className="text-cyan-400 font-bold">{inc.priority_score != null ? inc.priority_score.toFixed(1) : '—'}</strong></span>
                    <span className="uppercase text-amber-400 font-bold">{inc.status}</span>
                  </div>

                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDrawerIncident(inc);
                    }}
                    className="w-full mt-2 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 cursor-pointer select-none"
                  >
                    <span>Inspect Incident Intelligence</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Resource Markers */}
          {showResources &&
            validResources.map((res) => (
              <Marker
                key={res.id}
                position={[res.latitude, res.longitude]}
                icon={makeResourceIcon(res)}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                  },
                }}
              >
                <Popup className="tactical-popup">
                  <div className="p-2 text-slate-100 text-xs space-y-1.5 font-sans min-w-[200px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                      <span className="font-bold text-cyan-400 uppercase tracking-wide font-mono">{res.resource_type}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                        res.status === 'available' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      }`}>
                        {res.status}
                      </span>
                    </div>
                    <p className="font-bold text-white text-xs">{res.name}</p>
                    <p className="text-[11px] text-slate-400">{res.address}</p>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Deployment Load:</span>
                      <span className="text-cyan-400 font-bold">{res.current_load} / {res.capacity} units</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {/* Tactical HUD Corner Crosshairs (pure visual, strictly non-blocking) */}
        <div className="pointer-events-none absolute inset-0 z-[10] p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start pointer-events-none">
            <div className="w-6 h-6 border-t-2 border-l-2 border-cyan-500/40 pointer-events-none" />
            <div className="w-6 h-6 border-t-2 border-r-2 border-cyan-500/40 pointer-events-none" />
          </div>
          <div className="flex justify-between items-end pointer-events-none">
            <div className="w-6 h-6 border-b-2 border-l-2 border-cyan-500/40 pointer-events-none" />
            <div className="w-6 h-6 border-b-2 border-r-2 border-cyan-500/40 pointer-events-none" />
          </div>
        </div>

        {/* Tactical Telemetry HUD Footer Bar */}
        <div className="absolute bottom-3 left-4 right-4 z-[990] pointer-events-none flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800 text-[10px] font-mono text-slate-300 backdrop-blur-md shadow-2xl select-none">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Radar className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              TELEMETRY:
            </span>
            <span>LAT: <strong className="text-white">{telemetry.lat.toFixed(4)}°N</strong></span>
            <span className="text-slate-600">|</span>
            <span>LON: <strong className="text-white">{telemetry.lng.toFixed(4)}°E</strong></span>
            <span className="text-slate-600">|</span>
            <span>ZOOM: <strong className="text-white">{telemetry.zoom}x</strong></span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline text-emerald-400 font-bold">GRID: WGS84 GEO-INDEX</span>
          </div>

          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800 text-[10px] font-mono text-slate-300 backdrop-blur-md shadow-2xl select-none">
            <span className="text-red-400 font-bold">🔴 {criticalCount} CRIT</span>
            <span className="text-slate-600">|</span>
            <span className="text-orange-400 font-bold">🟠 {highCount} HIGH</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400 font-bold">🛡️ {validResources.length} ASSETS READY</span>
          </div>
        </div>
      </div>

      {/* Selected Incident Telemetry Drawer (Non-blocking: no dark backdrop overlay) */}
      <IncidentDetailDrawer
        incident={drawerIncident}
        onClose={() => setDrawerIncident(null)}
        backdrop={false}
      />
    </div>
  );
}
