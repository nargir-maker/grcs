'use client';

import { useEffect, useRef } from 'react';

interface BrevetMapProps {
  gpxUrl: string;
  startCoords?: string;
  finishCoords?: string;
  controls?: { km: number; name: string; lat: number; lng: number }[];
}

export default function BrevetMap({
  gpxUrl,
  startCoords,
  finishCoords,
  controls = [],
}: BrevetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function initMap() {
      const L = (await import('leaflet')).default;

      // If container already has a map — destroy it first
      if ((mapRef.current as any)._leaflet_id) {
        try {
          mapInstanceRef.current?.remove();
        } catch {}
        delete (mapRef.current as any)._leaflet_id;
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        zoomControl: true,
        scrollWheelZoom: false,
      });

      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      try {
        const response = await fetch(gpxUrl);
        const gpxText = await response.text();

        const parser = new DOMParser();
        const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
        const trackPoints = gpxDoc.querySelectorAll('trkpt');

        const coords: [number, number][] = [];
        trackPoints.forEach((pt) => {
          const lat = parseFloat(pt.getAttribute('lat') ?? '0');
          const lng = parseFloat(pt.getAttribute('lon') ?? '0');
          if (lat && lng) coords.push([lat, lng]);
        });

        if (coords.length === 0) {
          map.setView([38.0, 23.7], 7);
          return;
        }

        const polyline = L.polyline(coords, {
          color: '#ff3d02',
          weight: 3,
          opacity: 0.9,
        }).addTo(map);

        map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

        // Start marker
        const startIcon = L.divIcon({
          html: `<div style="
            background:#22c55e;color:white;font-size:11px;
            font-weight:bold;padding:3px 7px;border-radius:12px;
            white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);
          ">🟢 START</div>`,
          className: '',
          iconAnchor: [30, 10],
        });
        L.marker(coords[0], { icon: startIcon })
          .addTo(map)
          .bindPopup('Αφετηρία');

        // Finish marker
        const finishIcon = L.divIcon({
          html: `<div style="
            background:#f59e0b;color:white;font-size:11px;
            font-weight:bold;padding:3px 7px;border-radius:12px;
            white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);
          ">🏁 FINISH</div>`,
          className: '',
          iconAnchor: [35, 10],
        });
        L.marker(coords[coords.length - 1], { icon: finishIcon })
          .addTo(map)
          .bindPopup('Τερματισμός');

        // CP markers
        controls.forEach((cp, i) => {
          if (!cp.lat || !cp.lng) return;
          const cpIcon = L.divIcon({
            html: `<div style="
              background:#0A1628;color:#06b6d4;font-size:10px;
              font-weight:bold;padding:3px 7px;border-radius:12px;
              border:1px solid #06b6d4;white-space:nowrap;
              box-shadow:0 2px 4px rgba(0,0,0,0.3);
            ">CP${i + 1}</div>`,
            className: '',
            iconAnchor: [15, 10],
          });
          L.marker([cp.lat, cp.lng], { icon: cpIcon })
            .addTo(map)
            .bindPopup(`CP${i + 1}: ${cp.name}`);
        });

      } catch (e) {
        console.error('GPX load error:', e);
        map.setView([38.0, 23.7], 7);
      }
    }

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [gpxUrl]);

  return (
    <div className="relative">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div
        ref={mapRef}
        style={{ height: '400px', width: '100%' }}
        className="rounded-xl overflow-hidden border border-white/10"
      />
      <p className="text-white/20 text-xs text-right mt-1">
        © OpenStreetMap contributors
      </p>
    </div>
  );
}