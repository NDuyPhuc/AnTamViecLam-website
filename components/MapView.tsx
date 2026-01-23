
import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import type { Job } from '../types';
import { parseLocationString, formatDuration } from '../utils/formatters';
import MyLocationIcon from './icons/MyLocationIcon';
import MapPinIcon from './icons/MapPinIcon';
import ArrowTopRightOnSquareIcon from './icons/ArrowTopRightOnSquareIcon';
import ClockIcon from './icons/ClockIcon';
import XIcon from './icons/XIcon';
import { useTranslation } from 'react-i18next';

interface MapViewProps {
  jobs: Job[];
  onJobSelect: (job: Job) => void;
  focusedJobId: string | null;
  onFocusComplete: () => void;
  userLocation: { lat: number; lng: number } | null;
}

interface RouteInfo {
    distance: number; // meters
    duration: number; // seconds
}

// Thẻ nổi hiển thị thông tin đường đi
const RouteInfoCard: React.FC<{
    job: Job;
    routeInfo: RouteInfo;
    onClose: () => void;
    userLocation?: { lat: number; lng: number } | null;
}> = ({ job, routeInfo, onClose, userLocation }) => {
    const { t } = useTranslation();
    const jobCoords = parseLocationString(job.location);

    const handleOpenGoogleMaps = () => {
        if (!jobCoords) return;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${jobCoords.lat},${jobCoords.lng}${userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : ''}&travelmode=driving`;
        window.open(url, '_blank');
    };

    return (
        <div className="absolute bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-white rounded-2xl shadow-2xl p-5 z-[1000] animate-slide-up border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {t('map.travel_time')}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-extrabold text-gray-900">{formatDuration(routeInfo.duration)}</h2>
                        <span className="text-sm text-gray-500 font-medium">({(routeInfo.distance / 1000).toFixed(1)} km)</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1 font-medium">{job.title}</p>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    title={t('common.close')}
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            <button 
                onClick={handleOpenGoogleMaps}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
                <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                {t('map.open_google_maps')}
            </button>
        </div>
    );
};

const PopupContent: React.FC<{ 
    job: Job; 
    onJobSelect: (job: Job) => void;
}> = ({ job, onJobSelect }) => {
    const { t } = useTranslation();
    return (
        <div className="p-1 font-sans min-w-[200px]">
            <h4 className="font-bold text-sm text-gray-900 line-clamp-2 mb-1">{job.title}</h4>
            <p className="text-xs text-gray-600 mb-2">{job.employerName}</p>
            <button 
                onClick={() => onJobSelect(job)} 
                className="w-full bg-gray-100 text-gray-700 text-xs font-bold py-2 px-2 rounded hover:bg-gray-200 transition-colors"
            >
                {t('map.view_details')}
            </button>
        </div>
    );
};

const MapView: React.FC<MapViewProps> = ({ jobs, onJobSelect, focusedJobId, onFocusComplete, userLocation }) => {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapDataRef = useRef<{
    map: any | null; // L.Map
    markers: { [id: string]: any }; // L.Marker
    userMarker: any | null; // L.Marker
    routeLayerOutline: any | null; // L.GeoJSON
    routeLayerFill: any | null; // L.GeoJSON
    popupRoots: Map<string, ReactDOM.Root>; // ReactDOM roots
  }>({ map: null, markers: {}, userMarker: null, routeLayerOutline: null, routeLayerFill: null, popupRoots: new Map() });

  const [activeRoute, setActiveRoute] = useState<{ jobId: string, info: RouteInfo } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (mapDataRef.current.map || !mapContainerRef.current) return;
    
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([16.0544, 108.2022], 6);
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 13);
    } 

    mapDataRef.current.map = map;

    setTimeout(() => {
        if (mapDataRef.current.map) mapDataRef.current.map.invalidateSize();
    }, 400);

    return () => {
      mapDataRef.current.popupRoots.forEach(root => root.unmount());
      mapDataRef.current.popupRoots.clear();
      if (mapDataRef.current.map) {
        mapDataRef.current.map.remove();
        mapDataRef.current.map = null;
      }
    };
  }, []); 

  // Handle User Location Marker
  useEffect(() => {
      const L = (window as any).L;
      const { map } = mapDataRef.current;
      if (!map || !L) return;

      if (mapDataRef.current.userMarker) {
          mapDataRef.current.userMarker.remove();
          mapDataRef.current.userMarker = null;
      }
      
      if (userLocation) {
          const userLocationIcon = L.divIcon({
              html: `<div class="user-location-marker"></div>`,
              className: '',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
          });

          const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userLocationIcon })
              .addTo(map)
              .bindTooltip(t('map.your_location'));

          mapDataRef.current.userMarker = marker;
          
          // Initial fly to user if no focus
          if (!focusedJobId && !activeRoute) {
             map.flyTo([userLocation.lat, userLocation.lng], 13);
          }
      }
  }, [userLocation, t]);

  // Handle Routing Logic
  const calculateRoute = async (job: Job) => {
      if (!userLocation) return;
      
      const jobCoords = parseLocationString(job.location);
      if (!jobCoords) return;

      const L = (window as any).L;
      const { map } = mapDataRef.current;

      try {
          // Clear previous route
          if (mapDataRef.current.routeLayerOutline) map.removeLayer(mapDataRef.current.routeLayerOutline);
          if (mapDataRef.current.routeLayerFill) map.removeLayer(mapDataRef.current.routeLayerFill);

          const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${jobCoords.lng},${jobCoords.lat}?overview=full&geometries=geojson`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              
              // Draw Outline (White)
              const outline = L.geoJSON(route.geometry, {
                  style: { color: '#ffffff', weight: 8, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }
              }).addTo(map);

              // Draw Fill (Indigo)
              const fill = L.geoJSON(route.geometry, {
                  style: { color: '#4f46e5', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }
              }).addTo(map);
              
              mapDataRef.current.routeLayerOutline = outline;
              mapDataRef.current.routeLayerFill = fill;
              
              // Fit bounds with padding at bottom for the card
              map.fitBounds(outline.getBounds(), { 
                  paddingBottomRight: [0, 200], 
                  paddingTopLeft: [50, 50],
                  maxZoom: 16,
                  animate: true
              });

              setActiveRoute({
                  jobId: job.id,
                  info: {
                      distance: route.distance,
                      duration: route.duration
                  }
              });
          }
      } catch (error) {
          console.error("Routing error:", error);
          map.flyTo([jobCoords.lat, jobCoords.lng], 16);
      }
  };

  const clearRoute = () => {
      const { map } = mapDataRef.current;
      if (mapDataRef.current.routeLayerOutline) map.removeLayer(mapDataRef.current.routeLayerOutline);
      if (mapDataRef.current.routeLayerFill) map.removeLayer(mapDataRef.current.routeLayerFill);
      setActiveRoute(null);
      if (userLocation) {
          map.flyTo([userLocation.lat, userLocation.lng], 14);
      }
  };

  // Handle Job Markers
  useEffect(() => {
    const L = (window as any).L;
    const { map } = mapDataRef.current;
    if (!map || !L) return;

    // Cleanup old markers/popups
    mapDataRef.current.popupRoots.forEach(root => root.unmount());
    mapDataRef.current.popupRoots.clear();
    Object.values(mapDataRef.current.markers).forEach((marker: any) => marker.remove());
    mapDataRef.current.markers = {};

    if (jobs.length === 0) return;

    jobs.forEach(job => {
      const coords = parseLocationString(job.location);
      if (!coords) return; 

      const popupNode = document.createElement('div');
      const root = ReactDOM.createRoot(popupNode);
      root.render(<PopupContent job={job} onJobSelect={onJobSelect} />);
      mapDataRef.current.popupRoots.set(job.id, root);

      const marker = L.marker([coords.lat, coords.lng])
          .addTo(map)
          .bindPopup(popupNode, { minWidth: 200 });
          
      mapDataRef.current.markers[job.id] = marker;
    });
  }, [jobs, onJobSelect]);

  // Handle Focus from List/Modal
  useEffect(() => {
    const { map, markers } = mapDataRef.current;
    if (!map || !focusedJobId) return;
    
    const job = jobs.find(j => j.id === focusedJobId);
    const marker = markers[focusedJobId];

    if (job) {
        if (userLocation) {
            // Trigger Routing immediately
            calculateRoute(job);
        } else {
            // Fallback: Just fly to job
            if (marker) {
                map.flyTo(marker.getLatLng(), 16);
                marker.openPopup();
            }
        }
    }
    onFocusComplete();
  }, [focusedJobId, jobs, userLocation]);

  const activeJob = activeRoute ? jobs.find(j => j.id === activeRoute.jobId) : null;

  return (
    <div className="relative group">
      <div ref={mapContainerRef} className="w-full h-[600px] rounded-2xl shadow-inner border border-gray-200 z-0 overflow-hidden" />
      
      {/* Route Info Card */}
      {activeRoute && activeJob && (
          <RouteInfoCard 
            job={activeJob}
            routeInfo={activeRoute.info}
            onClose={clearRoute}
            userLocation={userLocation}
          />
      )}

      {userLocation && (
          <button
            onClick={() => {
                const { map } = mapDataRef.current;
                if (map) map.flyTo([userLocation.lat, userLocation.lng], 15);
            }}
            className="absolute bottom-6 right-4 md:right-6 z-[900] bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-all text-gray-700"
            title={t('map.your_location')}
          >
            <MyLocationIcon className="w-6 h-6" />
          </button>
      )}

      <style>{`
          .user-location-marker {
              width: 24px;
              height: 24px;
              background-color: #3b82f6;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
              position: relative;
          }
          .user-location-marker::after {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background-color: rgba(59, 130, 246, 0.2);
              transform: translate(-50%, -50%);
              animation: pulse 2s infinite;
          }
          @keyframes pulse {
              0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
              100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
          }
          @keyframes slide-up {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up {
              animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
      `}</style>
    </div>
  );
};

export default MapView;
