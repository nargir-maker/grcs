'use client';

// app/components/LiveMap.tsx
// Real-time Leaflet map showing GPX route + live rider positions

import { useEffect, useRef, useState } from 'react';

interface Rider {
  id: string;
  fullName: string;
  status: string;
  lat: number;
  lng: number;
  speed: string;
  avgSpeed: string;
  currentKm: string;
  gender: string;
}

interface LiveMapProps {
  gpxUrl: string;
  controls: { km: number; name: string; lat: number; lng: number }[];
  riders: Rider[];
  selectedRiderId: string | null;
  onRiderSelect: (id: string | null) => void;
}

export default function LiveMap({
  gpxUrl, controls, riders, selectedRiderId, onRiderSelect,
}: LiveMapProps) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const riderMarkers = useRef<Map<string, any>>(new Map());
  const [L, setL]   = useState<any>(null);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    async function initMap() {
      const leaflet = (await import('leaflet')).default;
      setL(leaflet);

      if ((mapRef.current as any)?._leaflet_id) return;

      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = leaflet.map(mapRef.current!, {
        zoomControl: true,
        scrollWheelZoom: true,
      });

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstance.current = map;

      // Load GPX route
      if (gpxUrl) {
        try {
          const res  = await fetch(gpxUrl);
          const text = await res.text();
          const xml  = new DOMParser().parseFromString(text, 'text/xml');
          const pts  = xml.querySelectorAll('trkpt');
          const coords: [number, number][] = [];
          pts.forEach(pt => {
            const lat = parseFloat(pt.getAttribute('lat') ?? '0');
            const lng = parseFloat(pt.getAttribute('lon') ?? '0');
            if (lat && lng) coords.push([lat, lng]);
          });
          if (coords.length > 0) {
            const poly = leaflet.polyline(coords, {
              color: '#ff3d02', weight: 3, opacity: 0.7,
            }).addTo(map);
            map.fitBounds(poly.getBounds(), { padding: [30, 30] });

            // Start marker
            leaflet.marker(coords[0], {
              icon: leaflet.divIcon({
                html: `<div style="background:#22c55e;color:white;font-size:10px;font-weight:bold;padding:3px 6px;border-radius:10px;white-space:nowrap;">🟢 START</div>`,
                className: '', iconAnchor: [28, 10],
              }),
            }).addTo(map);

            // Finish marker
            leaflet.marker(coords[coords.length - 1], {
              icon: leaflet.divIcon({
                html: `<div style="background:#f59e0b;color:white;font-size:10px;font-weight:bold;padding:3px 6px;border-radius:10px;white-space:nowrap;">🏁 FINISH</div>`,
                className: '', iconAnchor: [32, 10],
              }),
            }).addTo(map);
          }
        } catch (e) {
          console.error('GPX load error:', e);
          map.setView([38.0, 23.7], 7);
        }
      } else {
        map.setView([38.0, 23.7], 7);
      }

      // CP markers
      controls.forEach((cp, i) => {
        if (!cp.lat || !cp.lng) return;
        leaflet.marker([cp.lat, cp.lng], {
          icon: leaflet.divIcon({
            html: `<div style="background:#0A1628;color:#06b6d4;font-size:9px;font-weight:bold;padding:2px 6px;border-radius:10px;border:1px solid #06b6d4;white-space:nowrap;">CP${i+1}</div>`,
            className: '', iconAnchor: [14, 8],
          }),
        }).addTo(map).bindPopup(`CP${i+1}: ${cp.name}`);
      });
    }

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        riderMarkers.current.clear();
      }
    };
  }, [gpxUrl]);

  // Update rider markers when riders change
  useEffect(() => {
    if (!mapInstance.current || !L) return;
    const map = mapInstance.current;

    riders.forEach(rider => {
      if (!rider.lat || !rider.lng) return;

      const isSelected = selectedRiderId === rider.id;
      const isDNF      = rider.status === 'DNF';
      const isFinished = rider.status === 'FINISHED';

      const color = isDNF      ? '#ef4444'
                  : isFinished ? '#22c55e'
                  : isSelected ? '#f59e0b'
                  : '#06b6d4';

      const size = isSelected ? 18 : 12;

      const icon = L.divIcon({
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${color};border:2px solid white;
          box-shadow:0 0 ${isSelected ? '12px' : '6px'} ${color};
          transition:all 0.3s;
        " title="${rider.fullName}"></div>`,
        className: '',
        iconAnchor: [size/2, size/2],
      });

      if (riderMarkers.current.has(rider.id)) {
        const marker = riderMarkers.current.get(rider.id);
        marker.setLatLng([rider.lat, rider.lng]);
        marker.setIcon(icon);
      } else {
        const marker = L.marker([rider.lat, rider.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:160px">
              <strong>${rider.fullName}</strong><br/>
              <span style="color:${color}">${rider.status === 'FINISHED' ? '🏁 Τερμάτισε' : rider.status === 'DNF' ? '❌ DNF' : '🚴 Σε πορεία'}</span><br/>
              📍 km ${parseFloat(rider.currentKm).toFixed(0)}<br/>
              ⚡ ${rider.avgSpeed} km/h μ.ο.
            </div>
          `)
          .on('click', () => onRiderSelect(rider.id));
        riderMarkers.current.set(rider.id, marker);
      }
    });

    // Remove markers for riders no longer in list
    riderMarkers.current.forEach((marker, riderId) => {
      if (!riders.find(r => r.id === riderId)) {
        map.removeLayer(marker);
        riderMarkers.current.delete(riderId);
      }
    });

    // Pan to selected rider
    if (selectedRiderId) {
      const rider = riders.find(r => r.id === selectedRiderId);
      if (rider?.lat && rider?.lng) {
        map.panTo([rider.lat, rider.lng], { animate: true });
      }
    }

  }, [riders, selectedRiderId, L]);

  return (
    <>
      <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div
        ref={mapRef}
        style={{ height: '500px', width: '100%' }}
        className="rounded-2xl overflow-hidden border border-white/10"
      />
      <p className="text-white/20 text-xs text-right mt-1">
        © OpenStreetMap · Ανανέωση σε πραγματικό χρόνο
      </p>
    </>
  );
}
