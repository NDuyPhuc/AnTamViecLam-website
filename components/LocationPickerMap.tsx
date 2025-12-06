
import React, { useRef, useEffect } from 'react';
import MapPinIcon from './icons/MapPinIcon';

interface LocationPickerMapProps {
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onLocationChange: (coords: { lat: number; lng: number }) => void;
}

const LocationPickerMap: React.FC<LocationPickerMapProps> = ({ initialCenter, initialZoom, onLocationChange }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any | null>(null); // L.Map

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) {
      return;
    }

    const L = (window as any).L;
    if (!L) {
      console.error("Thư viện Leaflet không tìm thấy.");
      return;
    }

    const defaultCenter = initialCenter || { lat: 16.0544, lng: 108.2022 };
    const defaultZoom = initialZoom || 6;

    // Initialize map, set a view immediately, and disable default zoom control.
    const map = L.map(mapContainerRef.current, {
        zoomControl: false,
    }).setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
    mapRef.current = map;

    // Add zoom control to a different corner.
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add tile layer, which is safe now.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Immediately report the initial location.
    onLocationChange({ lat: defaultCenter.lat, lng: defaultCenter.lng });
    
    // Update location when map stops moving
    map.on('moveend', () => {
      const newCenter = map.getCenter();
      onLocationChange({ lat: newCenter.lat, lng: newCenter.lng });
    });

    // REMOVED: Internal navigator.geolocation call. We rely on initialCenter prop now.

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Watch for changes in initialCenter (e.g., when parent component loads user location)
  useEffect(() => {
      if (mapRef.current && initialCenter) {
          mapRef.current.setView([initialCenter.lat, initialCenter.lng], initialZoom || 15);
          // Also update the reported location
          onLocationChange(initialCenter);
      }
  }, [initialCenter, initialZoom, onLocationChange]);

  return (
    <div className="relative w-full h-80 rounded-lg shadow-md z-0 border overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[1000]">
            <MapPinIcon className="w-10 h-10 text-red-500 drop-shadow-lg" />
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md pointer-events-none">
            Di chuyển bản đồ để chọn vị trí
        </div>
    </div>
  );
};

export default LocationPickerMap;
