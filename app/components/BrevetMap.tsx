'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Lazy import ElevationChart inside the modal (avoids circular dep issues)
const ElevationChart = dynamic(() => import('./ElevationChart'), { ssr: false });

interface BrevetMapProps {
  gpxUrl: string;
  startCoords?: string;
  finishCoords?: string;
  controls?: { km: number; name: string; lat: number; lng: number }[];
  scrubberKm?: number | null; // from parent — drives the moving dot
}

// ── Coord store — parsed once, reused by both inline and fullscreen ────────
interface ParsedCoord {
  lat: number;
  lng: number;
  distKm: number;
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Interpolate lat/lng from parsed coords at a given km position
function interpolateLatLng(coords: ParsedCoord[], km: number): [number, number] | null {
  if (coords.length === 0) return null;
  if (km <= coords[0].distKm) return [coords[0].lat, coords[0].lng];
  if (km >= coords[coords.length-1].distKm) {
    const last = coords[coords.length-1];
    return [last.lat, last.lng];
  }
  // Binary search for surrounding segment
  let lo = 0, hi = coords.length - 1;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (coords[mid].distKm <= km) lo = mid; else hi = mid;
  }
  const a = coords[lo], b = coords[hi];
  const segLen = b.distKm - a.distKm;
  if (segLen === 0) return [a.lat, a.lng];
  const t = (km - a.distKm) / segLen;
  return [a.lat + t * (b.lat - a.lat), a.lng + t * (b.lng - a.lng)];
}

// ── Shared Leaflet initializer ─────────────────────────────────────────────
async function initLeafletMap(
  container: HTMLDivElement,
  gpxUrl: string,
  controls: { km: number; name: string; lat: number; lng: number }[],
  scrollWheelZoom: boolean,
  onCoordsReady?: (coords: ParsedCoord[]) => void
): Promise<{ map: any; markerRef: { current: any } }> {
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
    attribution: '© OpenStreetMap contributors', maxZoom: 18,
  }).addTo(map);

  // Scrubber dot marker — hidden initially
  const dotIcon = L.divIcon({
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:#06b6d4;border:2px solid white;
      box-shadow:0 0 8px rgba(6,182,212,0.8);
    "></div>`,
    className: '',
    iconAnchor: [7, 7],
  });
  const dotMarker = L.marker([0, 0], { icon: dotIcon, opacity: 0 }).addTo(map);
  const markerRef = { current: dotMarker };

  try {
    const response = await fetch(gpxUrl);
    const gpxText = await response.text();
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
    const trackPoints = gpxDoc.querySelectorAll('trkpt');

    const coords: [number, number][] = [];
    const parsedCoords: ParsedCoord[] = [];
    let distKm = 0, prevLat = 0, prevLng = 0;

    trackPoints.forEach((pt, i) => {
      const lat = parseFloat(pt.getAttribute('lat') ?? '0');
      const lng = parseFloat(pt.getAttribute('lon') ?? '0');
      if (lat && lng) {
        if (i > 0 && prevLat !== 0) distKm += haversineM(prevLat, prevLng, lat, lng) / 1000;
        prevLat = lat; prevLng = lng;
        coords.push([lat, lng]);
        parsedCoords.push({ lat, lng, distKm });
      }
    });

    if (coords.length === 0) { map.setView([38.0, 23.7], 7); }
    else {
      const polyline = L.polyline(coords, { color: '#ff3d02', weight: 3, opacity: 0.9 }).addTo(map);
      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

      L.marker(coords[0], {
        icon: L.divIcon({
          html: `<div style="background:#22c55e;color:white;font-size:11px;font-weight:bold;padding:3px 7px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);">🟢 START</div>`,
          className: '', iconAnchor: [30, 10],
        }),
      }).addTo(map).bindPopup('Αφετηρία');

      L.marker(coords[coords.length-1], {
        icon: L.divIcon({
          html: `<div style="background:#f59e0b;color:white;font-size:11px;font-weight:bold;padding:3px 7px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);">🏁 FINISH</div>`,
          className: '', iconAnchor: [35, 10],
        }),
      }).addTo(map).bindPopup('Τερματισμός');

      controls.forEach((cp, i) => {
        if (!cp.lat || !cp.lng) return;
        L.marker([cp.lat, cp.lng], {
          icon: L.divIcon({
            html: `<div style="background:#0A1628;color:#06b6d4;font-size:10px;font-weight:bold;padding:3px 7px;border-radius:12px;border:1px solid #06b6d4;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);">CP${i+1}</div>`,
            className: '', iconAnchor: [15, 10],
          }),
        }).addTo(map).bindPopup(`CP${i+1}: ${cp.name}`);
      });

      // Notify parent of parsed coords for interpolation
      onCoordsReady?.(parsedCoords);
    }
  } catch (e) {
    console.error('GPX load error:', e);
    map.setView([38.0, 23.7], 7);
  }

  return { map, markerRef };
}

// ── Fullscreen modal ───────────────────────────────────────────────────────
function FullscreenMap({
  gpxUrl, controls, onClose, climbProfile, storedAscent,
}: {
  gpxUrl: string;
  controls: { km: number; name: string; lat: number; lng: number }[];
  onClose: () => void;
  climbProfile?: any[];
  storedAscent?: number;
}) {
  const modalMapRef = useRef<HTMLDivElement>(null);
  const modalMapInstanceRef = useRef<any>(null);
  const modalDotMarkerRef = useRef<any>(null);
  const [modalCoords, setModalCoords] = useState<ParsedCoord[]>([]);
  const [modalScrubberKm, setModalScrubberKm] = useState<number | null>(null);

  useEffect(() => {
    if (!modalMapRef.current) return;
    let destroyed = false;

    initLeafletMap(modalMapRef.current, gpxUrl, controls, true, coords => {
      if (!destroyed) setModalCoords(coords);
    }).then(({ map, markerRef }) => {
      if (destroyed) { map.remove(); return; }
      modalMapInstanceRef.current = map;
      modalDotMarkerRef.current = markerRef.current;
    });

    return () => {
      destroyed = true;
      if (modalMapInstanceRef.current) {
        modalMapInstanceRef.current.remove();
        modalMapInstanceRef.current = null;
      }
    };
  }, [gpxUrl]);

  // Move dot on modal map when modal scrubber changes
  useEffect(() => {
    const marker = modalDotMarkerRef.current;
    if (!marker) return;
    if (modalScrubberKm === null || modalCoords.length === 0) {
      marker.setOpacity(0);
      return;
    }
    const pos = interpolateLatLng(modalCoords, modalScrubberKm);
    if (pos) {
      marker.setLatLng(pos);
      marker.setOpacity(1);
    }
  }, [modalScrubberKm, modalCoords]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div
        className="relative w-[96vw] h-[90vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col bg-[#0A1628]"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onClose} title="Κλείσιμο (Esc)"
          className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(10,22,40,0.85)', borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4' }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
          </svg>
          Κλείσιμο
        </button>

        {/* Map — takes ~55% of height */}
        <div ref={modalMapRef} style={{ width: '100%', flex: '0 0 55%' }} />

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Elevation chart — takes remaining ~45% */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2" style={{ background: '#0A1628' }}>
          <ElevationChart
            gpxUrl={gpxUrl}
            climbProfile={climbProfile}
            storedAscent={storedAscent}
            scrubberKm={modalScrubberKm}
            onScrub={setModalScrubberKm}
            defaultZoomed={true}  // ← ADD
            zoomedPxPerKm={10}  // ← ADD
          />
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BrevetMap({
  gpxUrl, startCoords, finishCoords, controls = [], scrubberKm,
}: BrevetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const dotMarkerRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [parsedCoords, setParsedCoords] = useState<ParsedCoord[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => setIsFullscreen(f => !f), []);

  // Initialize inline map once
  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return;
    initializedRef.current = true;

    initLeafletMap(mapRef.current, gpxUrl, controls, false, coords => {
      setParsedCoords(coords);
    }).then(({ map, markerRef }) => {
      mapInstanceRef.current = map;
      dotMarkerRef.current = markerRef.current;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [gpxUrl]);

  // Move dot on inline map when scrubberKm changes
  useEffect(() => {
    const marker = dotMarkerRef.current;
    if (!marker) return;
    if (scrubberKm === null || scrubberKm === undefined || parsedCoords.length === 0) {
      marker.setOpacity(0);
      return;
    }
    const pos = interpolateLatLng(parsedCoords, scrubberKm);
    if (pos) {
      marker.setLatLng(pos);
      marker.setOpacity(1);
    }
  }, [scrubberKm, parsedCoords]);

  return (
    <>
      <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />

      {/* Fullscreen modal */}
      {isFullscreen && (
        <FullscreenMap
          gpxUrl={gpxUrl}
          controls={controls}
          onClose={toggleFullscreen}
        />
      )}

      {/* Inline map — stays put, hidden when fullscreen open */}
      <div className="relative" style={{ visibility: isFullscreen ? 'hidden' : 'visible' }}>
        <div ref={mapRef} style={{ height: '400px', width: '100%' }}
          className="rounded-xl overflow-hidden border border-white/10" />

        <button onClick={toggleFullscreen} title="Πλήρης οθόνη"
          className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm transition-all hover:brightness-110"
          style={{ backgroundColor: 'rgba(10,22,40,0.85)', borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4' }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
          </svg>
          Πλήρης οθόνη
        </button>

        <p className="text-white/20 text-xs text-right mt-1">© OpenStreetMap contributors</p>
      </div>
    </>
  );
}
