
import React, { useRef, useEffect, memo } from 'react';
import ReactDOM from 'react-dom/client';
import type { Job } from '../types';
import { parseLocationString } from '../utils/formatters';
import MyLocationIcon from './icons/MyLocationIcon';

interface MapViewProps {
  jobs: Job[];
  onJobSelect: (job: Job) => void;
  focusedJobId: string | null;
  onFocusComplete: () => void;
  userLocation: { lat: number; lng: number } | null;
}

const PopupContent: React.FC<{ job: Job; onJobSelect: (job: Job) => void }> = ({ job, onJobSelect }) => (
    <div className="p-1 font-sans">
        <h4 className="font-bold text-sm text-gray-800">{job.title}</h4>
        <p className="text-xs text-gray-600 mb-1">{job.employerName}</p>
        <button 
            onClick={() => onJobSelect(job)} 
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
            Xem chi tiết
        </button>
    </div>
);

const MapView: React.FC<MapViewProps> = ({ jobs, onJobSelect, focusedJobId, onFocusComplete, userLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapDataRef = useRef<{
    map: any | null; // L.Map
    markers: { [id: string]: any }; // L.Marker
    userMarker: any | null; // L.Marker for user location
    popupRoots: any[]; // ReactDOM roots
  }>({ map: null, markers: {}, userMarker: null, popupRoots: [] });

  // Effect for initializing and destroying the map
  useEffect(() => {
    if (mapDataRef.current.map || !mapContainerRef.current) {
      return;
    }
    
    const L = (window as any).L;
    if (!L) {
        console.error("Thư viện Leaflet không tìm thấy. Vui lòng đảm bảo đã tải thư viện.");
        return;
    }

    // Initialize map & set a default view immediately to prevent errors
    const map = L.map(mapContainerRef.current).setView([16.0544, 108.2022], 6);
    map.options.scrollWheelZoom = true;

    // Add tile layer from OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Use the passed-in user location if available for a better default center.
    if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 13);
    } 
    // REMOVED: Internal navigator.geolocation call to prevent conflict with App.tsx Capacitor Plugin

    mapDataRef.current.map = map;

    // FIX: A short delay before invalidating size ensures that the map container
    // has been fully rendered and sized by the browser.
    setTimeout(() => {
        if (mapDataRef.current.map) {
            mapDataRef.current.map.invalidateSize();
        }
    }, 400);

    return () => {
      // Cleanup on component unmount
      mapDataRef.current.popupRoots.forEach(root => root.unmount());
      mapDataRef.current.popupRoots = [];
      if (mapDataRef.current.map) {
        mapDataRef.current.map.remove();
        mapDataRef.current.map = null;
      }
    };
  }, []); // Run once on mount

  // Effect to update map view when userLocation changes
  useEffect(() => {
      const { map } = mapDataRef.current;
      if (map && userLocation) {
          // If we just got the location, fly to it
          map.flyTo([userLocation.lat, userLocation.lng], 13);
      }
  }, [userLocation]);

  // Effect for updating markers when jobs list changes
  useEffect(() => {
    const L = (window as any).L;
    const { map } = mapDataRef.current;
    if (!map || !L) return;

    // 1. Cleanup previous job markers and popups
    mapDataRef.current.popupRoots.forEach(root => root.unmount());
    mapDataRef.current.popupRoots = [];
    Object.values(mapDataRef.current.markers).forEach((marker: any) => marker.remove());
    mapDataRef.current.markers = {};

    if (jobs.length === 0) return;

    const bounds = L.latLngBounds([]);

    // 2. Add new markers for each job
    jobs.forEach(job => {
      const coords = parseLocationString(job.location);
      if (!coords) return; 

      const popupNode = document.createElement('div');
      const root = ReactDOM.createRoot(popupNode);
      root.render(<PopupContent job={job} onJobSelect={onJobSelect} />);
      mapDataRef.current.popupRoots.push(root);

      const marker = L.marker([coords.lat, coords.lng])
          .addTo(map)
          .bindPopup(popupNode);
          
      mapDataRef.current.markers[job.id] = marker;
      bounds.extend([coords.lat, coords.lng]);
    });
    
    // 3. Adjust map view to show all markers
    if (bounds.isValid() && !focusedJobId) {
        if (userLocation) {
            // Also include user's location in the bounds for a comprehensive view
            bounds.extend([userLocation.lat, userLocation.lng]);
        }
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

  }, [jobs, onJobSelect, focusedJobId, userLocation]);

  // Effect for focusing on a specific job
  useEffect(() => {
    const { map, markers } = mapDataRef.current;
    if (!map || !focusedJobId || !markers[focusedJobId]) {
      return;
    }
    
    const marker = markers[focusedJobId];
    const job = jobs.find(j => j.id === focusedJobId);
    const coords = job ? parseLocationString(job.location) : null;

    if (coords) {
      map.flyTo([coords.lat, coords.lng], 15, {
          animate: true,
          duration: 1
      });
      
      setTimeout(() => {
          if (marker && typeof marker.openPopup === 'function') {
            marker.openPopup();
          }
      }, 800);
    }
    
    onFocusComplete();
  }, [focusedJobId, jobs, onFocusComplete]);

  // Effect for showing user's location
  useEffect(() => {
    const L = (window as any).L;
    const { map } = mapDataRef.current;
    if (!map || !L) return;

    // Remove old user marker if it exists
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
            .bindTooltip("Vị trí của bạn");

        mapDataRef.current.userMarker = marker;
    }
  }, [userLocation]);


  const handleCenterOnUser = () => {
    const { map } = mapDataRef.current;
    if (map && userLocation) {
        map.flyTo([userLocation.lat, userLocation.lng], 15);
    }
  };

  return (
    <div className="relative">
      <div ref={mapContainerRef} className="w-full h-[600px] rounded-lg shadow-md z-0" />
      {userLocation && (
          <button
            onClick={handleCenterOnUser}
            className="absolute bottom-5 right-5 z-[1000] bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors duration-200"
            aria-label="Về vị trí của tôi"
            title="Về vị trí của tôi"
          >
            <MyLocationIcon className="w-6 h-6 text-gray-700" />
          </button>
      )}
      <style>{`
          .user-location-marker {
              width: 24px;
              height: 24px;
              background-color: #3b82f6; /* blue-500 */
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 0 10px rgba(0,0,0,0.3);
              position: relative;
          }
          .user-location-marker::after {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background-color: rgba(59, 130, 246, 0.3);
              transform: translate(-50%, -50%);
              animation: pulse 2s infinite;
          }
          @keyframes pulse {
              0% {
                  transform: translate(-50%, -50%) scale(1);
                  opacity: 0.8;
              }
              100% {
                  transform: translate(-50%, -50%) scale(2.5);
                  opacity: 0;
              }
          }
      `}</style>
    </div>
  );
};

export default memo(MapView);
