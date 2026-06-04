'use client';

import { useEffect, useRef } from 'react';

interface Control {
  km:       number;
  name:     string;
  isManned: boolean;
  lat:      number;
  lng:      number;
}

interface Props {
  trackPoints:  { lat: number; lng: number }[];
  startCoords:  string;
  finishCoords: string;
  controls?:    Control[];
  totalKm?:     number;
  height?:      string;
}

// Επιλογή interval ανά km markers ανάλογα με απόσταση
function kmInterval(totalKm: number): number {
  if (totalKm <= 100)  return 5;
  if (totalKm <= 300)  return 10;
  return 20;
}

export default function GpxPreviewMap({
  trackPoints, startCoords, finishCoords,
  controls = [], totalKm = 0, height = '320px',
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
      setTimeout(() => map.invalidateSize(), 100);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      // ── Διαδρομή: κόκκινη ───────────────────────────────────────────────
      const latlngs = trackPoints.map(p => [p.lat, p.lng] as [number, number]);
      const polyline = L.polyline(latlngs, {
        color:   '#ef4444',
        weight:  3,
        opacity: 0.9,
      }).addTo(map);

      // ── Km markers: κύκλοι ανά 5/10/20 km ───────────────────────────────
      // Υπολογισμός cumulative km για τα downsampled trackPoints
      function haversine(la1: number, lo1: number, la2: number, lo2: number) {
        const R = 6371, d2r = Math.PI / 180;
        const dLa = (la2-la1)*d2r, dLo = (lo2-lo1)*d2r;
        const a = Math.sin(dLa/2)**2 +
          Math.cos(la1*d2r)*Math.cos(la2*d2r)*Math.sin(dLo/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      }

      const cumKm: number[] = [];
      let dist = 0;
      trackPoints.forEach((pt, i) => {
        if (i === 0) { cumKm.push(0); return; }
        dist += haversine(
          trackPoints[i-1].lat, trackPoints[i-1].lng,
          pt.lat, pt.lng
        );
        cumKm.push(dist);
      });

      const total = totalKm || cumKm[cumKm.length - 1] || 0;
      const interval = kmInterval(total);
      let nextTarget = interval;

      trackPoints.forEach((pt, i) => {
        if (cumKm[i] >= nextTarget && nextTarget < total - interval * 0.5) {
          const kmLabel = Math.round(cumKm[i]);
const icon = L.divIcon({
  html: `<div style="
    width:26px;height:26px;border-radius:50%;
    background:#fff;border:2px solid #ef4444;
    color:#111;font-size:9px;font-weight:700;
    display:flex;align-items:center;justify-content:center;
    font-family:sans-serif;line-height:1;
    box-shadow:0 1px 4px rgba(0,0,0,.6)">
    ${kmLabel}
  </div>`,
  className: '',
  iconSize:   [26, 26],
  iconAnchor: [13, 13],
});
          L.marker([pt.lat, pt.lng], { icon })
            .bindTooltip(`${kmLabel} km`, { permanent: false })
            .addTo(map);
          nextTarget += interval;
        }
      });

      // ── Control points ───────────────────────────────────────────────────
      controls.forEach(ctrl => {
        if (!ctrl.lat || !ctrl.lng) return;
        const icon = L.divIcon({
          html: `<div style="
            width:28px;height:28px;border-radius:6px;
            background:#1e293b;border:2.5px solid #f59e0b;
            color:#f59e0b;font-size:14px;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 1px 6px rgba(0,0,0,.6)">
            🏁
          </div>`,
          className: '',
          iconSize:   [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([ctrl.lat, ctrl.lng], { icon })
          .bindTooltip(
            `<b>${ctrl.name || 'Control'}</b><br/>${ctrl.km} km${ctrl.isManned ? '<br/>Επανδρωμένο' : ''}`,
            { permanent: false }
          )
          .addTo(map);
      });

      // ── Start marker ─────────────────────────────────────────────────────
      const [slat, slng] = startCoords.split(',').map(parseFloat);
      if (slat && slng) {
        const icon = L.divIcon({
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:#22c55e;border:2.5px solid #fff;
            color:#fff;font-size:13px;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 1px 4px rgba(0,0,0,.5)">
            🚴
          </div>`,
          className: '',
          iconSize:   [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([slat, slng], { icon })
          .bindTooltip('Εκκίνηση', { permanent: false })
          .addTo(map);
      }

      // ── Finish marker ────────────────────────────────────────────────────
      const [flat, flng] = finishCoords.split(',').map(parseFloat);
      const isSamePoint  = Math.abs(slat - flat) < 0.001 && Math.abs(slng - flng) < 0.001;
      if (flat && flng && !isSamePoint) {
        const icon = L.divIcon({
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:#ef4444;border:2.5px solid #fff;
            color:#fff;font-size:13px;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 1px 4px rgba(0,0,0,.5)">
            🏆
          </div>`,
          className: '',
          iconSize:   [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([flat, flng], { icon })
          .bindTooltip('Τερματισμός', { permanent: false })
          .addTo(map);
      }

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
  }, [trackPoints, startCoords, finishCoords, controls, totalKm]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}
    />
  );
}