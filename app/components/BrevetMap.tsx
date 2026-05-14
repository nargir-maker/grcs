'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface BrevetMapProps {
  gpxUrl: string;
  startCoords?: string;
  finishCoords?: string;
  controls?: { km: number; name: string; lat: number; lng: number }[];
}

// ── Shared map initializer ─────────────────────────────────────────────────
async function initLeafletMap(
  container: HTMLDivElement,
  gpxUrl: string,
  controls: { km: number; name: string; lat: number; lng: number }[],
  scrollWheelZoom: boolean
): Promise<any> {
  const L = (await import('leaflet')).default;

  if ((container as any)._leaflet_id) {
    try { (container as any)._leaflet_map?.remove(); } catch {}
    delete (container as any)._leaflet_id;
  }

  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });

  const map = L.map(container, { zoomControl: true, scrollWheelZoom });

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

    if (coords.length === 0) { map.setView([38.0, 23.7], 7); return map; }

    const polyline = L.polyline(coords, { color: '#ff3d02', weight: 3, opacity: 0.9 }).addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

    L.marker(coords[0], {
      icon: L.divIcon({
        html: `<div style="background:#22c55e;color:white;font-size:11px;font-weight:bold;padding:3px 7px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);">🟢 START</div>`,
        className: '', iconAnchor: [30, 10],
      }),
    }).addTo(map).bindPopup('Αφετηρία');

    L.marker(coords[coords.length - 1], {
      icon: L.divIcon({
        html: `<div style="background:#f59e0b;color:white;font-size:11px;font-weight:bold;padding:3px 7px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);">🏁 FINISH</div>`,
        className: '', iconAnchor: [35, 10],
      }),
    }).addTo(map).bindPopup('Τερματισμός');

    controls.forEach((cp, i) => {
      if (!cp.lat || !cp.lng) return;
      L.marker([cp.lat, cp.lng], {
        icon: L.divIcon({
          html: `<div style="background:#0A1628;color:#06b6d4;font-size:10px;font-weight:bold;padding:3px 7px;border-radius:12px;border:1px solid #06b6d4;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);">CP${i + 1}</div>`,
          className: '', iconAnchor: [15, 10],
        }),
      }).addTo(map).bindPopup(`CP${i + 1}: ${cp.name}`);
    });

  } catch (e) {
    console.error('GPX load error:', e);
    map.setView([38.0, 23.7], 7);
  }

  return map;
}

// ── Fullscreen modal — completely fresh map instance ───────────────────────
function FullscreenMap({
  gpxUrl, controls, onClose,
}: {
  gpxUrl: string;
  controls: { km: number; name: string; lat: number; lng: number }[];
  onClose: () => void;
}) {
  const modalMapRef = useRef<HTMLDivElement>(null);
  const modalMapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!modalMapRef.current) return;
    let destroyed = false;

    initLeafletMap(modalMapRef.current, gpxUrl, controls, true).then(map => {
      if (destroyed) { map.remove(); return; }
      modalMapInstanceRef.current = map;
    });

    return () => {
      destroyed = true;
      if (modalMapInstanceRef.current) {
        modalMapInstanceRef.current.remove();
        modalMapInstanceRef.current = null;
      }
    };
  }, [gpxUrl]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[96vw] h-[90vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div ref={modalMapRef} style={{ width: '100%', height: '100%' }} />

        <button
          onClick={onClose}
          title="Κλείσιμο (Esc)"
          className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(10,22,40,0.85)',
            borderColor: 'rgba(6,182,212,0.4)',
            color: '#06b6d4',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
          </svg>
          Κλείσιμο
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BrevetMap({
  gpxUrl, startCoords, finishCoords, controls = [],
}: BrevetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => setIsFullscreen(f => !f), []);

  // Inline map — initialized once, never moves
  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return;
    initializedRef.current = true;

    initLeafletMap(mapRef.current, gpxUrl, controls, false).then(map => {
      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [gpxUrl]);

  return (
    <>
      <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />

      {/* Fullscreen modal — separate instance, mounts only when open */}
      {isFullscreen && (
        <FullscreenMap gpxUrl={gpxUrl} controls={controls} onClose={toggleFullscreen} />
      )}

      {/* Inline map — stays put */}
      <div className="relative">
        <div
          ref={mapRef}
          style={{ height: '400px', width: '100%' }}
          className="rounded-xl overflow-hidden border border-white/10"
        />

        <button
          onClick={toggleFullscreen}
          title="Πλήρης οθόνη"
          className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm transition-all hover:brightness-110"
          style={{
            backgroundColor: 'rgba(10,22,40,0.85)',
            borderColor: 'rgba(6,182,212,0.4)',
            color: '#06b6d4',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
          </svg>
          Πλήρης οθόνη
        </button>

        <p className="text-white/20 text-xs text-right mt-1">
          © OpenStreetMap contributors
        </p>
      </div>
    </>
  );
}
