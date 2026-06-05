'use client';

import { useEffect, useRef, useState } from 'react';

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

function kmInterval(totalKm: number): number {
  if (totalKm <= 100) return 5;
  if (totalKm <= 300) return 10;
  return 20;
}

// ── Κοινή συνάρτηση αρχικοποίησης χάρτη ──────────────────────────────────────
function initMap(
  container: HTMLDivElement,
  L: any,
  trackPoints: { lat: number; lng: number }[],
  startCoords: string,
  finishCoords: string,
  controls: Control[],
  totalKm: number,
) {
  function haversine(la1: number, lo1: number, la2: number, lo2: number) {
    const R = 6371, d2r = Math.PI / 180;
    const dLa = (la2-la1)*d2r, dLo = (lo2-lo1)*d2r;
    const a = Math.sin(dLa/2)**2 +
      Math.cos(la1*d2r)*Math.cos(la2*d2r)*Math.sin(dLo/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  const map = L.map(container, { zoomControl: true, attributionControl: false });
  setTimeout(() => map.invalidateSize(), 100);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
  }).addTo(map);

  // Διαδρομή
  const latlngs = trackPoints.map(p => [p.lat, p.lng] as [number, number]);
  const polyline = L.polyline(latlngs, { color: '#ef4444', weight: 3, opacity: 0.9 }).addTo(map);

  // Cumulative km
  const cumKm: number[] = [];
  let dist = 0;
  trackPoints.forEach((pt, i) => {
    if (i === 0) { cumKm.push(0); return; }
    dist += haversine(trackPoints[i-1].lat, trackPoints[i-1].lng, pt.lat, pt.lng);
    cumKm.push(dist);
  });

  // Km markers
  const total    = totalKm || cumKm[cumKm.length - 1] || 0;
  const interval = kmInterval(total);
  let nextTarget = interval;
  trackPoints.forEach((pt, i) => {
    if (cumKm[i] >= nextTarget && nextTarget < total - interval * 0.5) {
      const kmLabel = Math.round(cumKm[i]);
      const icon = L.divIcon({
        html: `<div style="width:26px;height:26px;border-radius:50%;
          background:#fff;border:2px solid #ef4444;color:#111;font-size:9px;
          font-weight:700;display:flex;align-items:center;justify-content:center;
          font-family:sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.6)">${kmLabel}</div>`,
        className: '', iconSize: [26, 26], iconAnchor: [13, 13],
      });
      L.marker([pt.lat, pt.lng], { icon })
        .bindTooltip(`${kmLabel} km`, { permanent: false })
        .addTo(map);
      nextTarget += interval;
    }
  });

  // Control points
// ── Control points ───────────────────────────────────────────────────────────
controls.forEach((ctrl, idx) => {
  if (!ctrl.lat || !ctrl.lng) return;
  const icon = L.divIcon({
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:#f59e0b;border:2.5px solid #fff;
      color:#000;font-size:9px;font-weight:800;
      display:flex;align-items:center;justify-content:center;
      font-family:sans-serif;letter-spacing:-0.5px;
      box-shadow:0 1px 6px rgba(0,0,0,.5)">
      CP${idx + 1}
    </div>`,
    className: '',
    iconSize:   [32, 32],
    iconAnchor: [16, 16],
  });
  const label = ctrl.name
    ? `<b>CP${idx + 1}: ${ctrl.name}</b><br/>${ctrl.km} km`
    : `<b>CP${idx + 1}</b><br/>${ctrl.km} km`;
  L.marker([ctrl.lat, ctrl.lng], { icon })
    .bindTooltip(label + (ctrl.isManned ? '<br/>Επανδρωμένο' : ''), { permanent: false })
    .addTo(map);
});

  // Start
  const [slat, slng] = startCoords.split(',').map(parseFloat);
  if (slat && slng) {
    const icon = L.divIcon({
      html: `<div style="width:28px;height:28px;border-radius:50%;
        background:#22c55e;border:2.5px solid #fff;color:#fff;font-size:13px;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 1px 4px rgba(0,0,0,.5)">🚴</div>`,
      className: '', iconSize: [28, 28], iconAnchor: [14, 14],
    });
    L.marker([slat, slng], { icon }).bindTooltip('Εκκίνηση').addTo(map);
  }

  // Finish
  const [flat, flng] = finishCoords.split(',').map(parseFloat);
  const isSamePoint  = Math.abs(slat - flat) < 0.001 && Math.abs(slng - flng) < 0.001;
  if (flat && flng && !isSamePoint) {
    const icon = L.divIcon({
      html: `<div style="width:28px;height:28px;border-radius:50%;
        background:#ef4444;border:2.5px solid #fff;color:#fff;font-size:13px;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 1px 4px rgba(0,0,0,.5)">🏆</div>`,
      className: '', iconSize: [28, 28], iconAnchor: [14, 14],
    });
    L.marker([flat, flng], { icon }).bindTooltip('Τερματισμός').addTo(map);
  }

  setTimeout(() => {
    map.fitBounds(polyline.getBounds(), { padding: [24, 24] });
  }, 150);

  return map;
}

// ── Fullscreen modal ──────────────────────────────────────────────────────────
function FullscreenModal({
  trackPoints, startCoords, finishCoords, controls, totalKm, onClose,
}: Props & { onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || trackPoints.length === 0) return;

    // Escape key
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);

    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    let destroyed = false;
    import('leaflet').then(L => {
      if (destroyed || !containerRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      mapRef.current = initMap(
        containerRef.current, L,
        trackPoints, startCoords, finishCoords,
        controls ?? [], totalKm ?? 0,
      );
    });

    return () => {
      destroyed = true;
      window.removeEventListener('keydown', onKey);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[96vw] h-[92vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Κουμπί κλεισίματος */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-[1001] flex items-center gap-1.5 px-3 py-1.5
            rounded-lg text-xs font-bold border backdrop-blur-sm transition-all
            hover:brightness-110"
          style={{
            backgroundColor: 'rgba(10,22,40,0.90)',
            borderColor: 'rgba(239,68,68,0.5)',
            color: '#ef4444',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
          </svg>
          Κλείσιμο (Esc)
        </button>

        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GpxPreviewMap({
  trackPoints, startCoords, finishCoords,
  controls = [], totalKm = 0, height = '320px',
}: Props) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current || trackPoints.length === 0) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then(L => {
      if (!containerRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      mapRef.current = initMap(
        containerRef.current, L,
        trackPoints, startCoords, finishCoords, controls, totalKm,
      );
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [trackPoints, startCoords, finishCoords, controls, totalKm]);

  return (
    <>
      {/* Fullscreen modal */}
      {fullscreen && (
        <FullscreenModal
          trackPoints={trackPoints}
          startCoords={startCoords}
          finishCoords={finishCoords}
          controls={controls}
          totalKm={totalKm}
          onClose={() => setFullscreen(false)}
        />
      )}

      {/* Inline map */}
      <div className="relative">
        <div
          ref={containerRef}
          style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden', isolation: 'isolate' }}
        />

        {/* Κουμπί fullscreen */}
        <button
          onClick={() => setFullscreen(true)}
          title="Πλήρης οθόνη"
          className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5
            px-2.5 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm
            transition-all hover:brightness-110"
          style={{
            backgroundColor: 'rgba(10,22,40,0.85)',
            borderColor: 'rgba(239,68,68,0.4)',
            color: '#ef4444',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
          </svg>
          Πλήρης οθόνη
        </button>
      </div>
    </>
  );
}