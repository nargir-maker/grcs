'use client';

import { useEffect, useRef } from 'react';

interface Props {
  trackPoints:  { lat: number; lng: number }[];
  startCoords:  string;
  finishCoords: string;
  height?:      string;
}

export default function GpxPreviewMap({
  trackPoints, startCoords, finishCoords, height = '320px',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || trackPoints.length === 0) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    import('leaflet').then(L => {
      // ── FIX 1: φόρτωση Leaflet CSS αν δεν υπάρχει ──────────────────────
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel  = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        attributionControl: false,
      });
      mapRef.current = map;

      // ── FIX 2: invalidateSize μετά το paint ─────────────────────────────
      setTimeout(() => map.invalidateSize(), 100);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      const latlngs = trackPoints.map(p => [p.lat, p.lng] as [number, number]);
      const polyline = L.polyline(latlngs, {
        color:   '#06b6d4',
        weight:  3,
        opacity: 0.85,
      }).addTo(map);

      const [slat, slng] = startCoords.split(',').map(parseFloat);
      if (slat && slng) {
        const startIcon = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;
            background:#22c55e;border:2.5px solid #fff;
            box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
          className: '',
          iconSize:   [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([slat, slng], { icon: startIcon })
          .bindTooltip('Εκκίνηση', { permanent: false })
          .addTo(map);
      }

      const [flat, flng] = finishCoords.split(',').map(parseFloat);
      const isSamePoint  = Math.abs(slat - flat) < 0.001 && Math.abs(slng - flng) < 0.001;
      if (flat && flng && !isSamePoint) {
        const finishIcon = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;
            background:#ef4444;border:2.5px solid #fff;
            box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
          className: '',
          iconSize:   [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([flat, flng], { icon: finishIcon })
          .bindTooltip('Τερματισμός', { permanent: false })
          .addTo(map);
      }

      // ── FIX 3: fitBounds μετά το invalidateSize ─────────────────────────
      setTimeout(() => {
        map.fitBounds(polyline.getBounds(), { padding: [24, 24] });
      }, 150);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [trackPoints, startCoords, finishCoords]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}
    />
  );
}