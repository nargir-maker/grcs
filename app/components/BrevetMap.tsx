'use client';

// app/components/BrevetMap.tsx
// Immersive full-map layout with glassmorphism elevation overlay
// The elevation panel floats over the map at the bottom
// Scrubber dot syncs between chart and map marker

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const ElevationChart = dynamic(() => import('./ElevationChart'), { ssr: false });

interface BrevetMapProps {
  gpxUrl: string;
  startCoords?: string;
  finishCoords?: string;
  controls?: { km: number; name: string; lat: number; lng: number }[];
  scrubberKm?: number | null;
  climbProfile?: any[];
  storedAscent?: number;
  distance?: number;
  ascent?: number;
  duration?: string;
  onScrub?: (km: number | null) => void;
}

interface ParsedCoord {
  lat: number; lng: number; distKm: number;
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function interpolateLatLng(coords: ParsedCoord[], km: number): [number, number] | null {
  if (!coords.length) return null;
  if (km <= coords[0].distKm) return [coords[0].lat, coords[0].lng];
  if (km >= coords[coords.length-1].distKm) return [coords[coords.length-1].lat, coords[coords.length-1].lng];
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

  // Dark map tiles — more dramatic, fits the dark UI
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CartoDB',
    maxZoom: 19,
    subdomains: 'abcd',
  }).addTo(map);

  // Scrubber dot
  const dotIcon = L.divIcon({
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:#06b6d4;border:2px solid white;
      box-shadow:0 0 12px rgba(6,182,212,0.9);
    "></div>`,
    className: '', iconAnchor: [7, 7],
  });
  const dotMarker = L.marker([0, 0], { icon: dotIcon, opacity: 0 }).addTo(map);
  const markerRef = { current: dotMarker };

  try {
    const response = await fetch(gpxUrl);
    const gpxText  = await response.text();
    const parser   = new DOMParser();
    const gpxDoc   = parser.parseFromString(gpxText, 'text/xml');
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

    if (coords.length === 0) {
      map.setView([38.0, 23.7], 7);
    } else {
      // Glowing cyan route
      // Shadow/glow layer underneath
      L.polyline(coords, { color: '#06b6d4', weight: 7, opacity: 0.2 }).addTo(map);
      // Main route line
      const polyline = L.polyline(coords, { color: '#06b6d4', weight: 2.5, opacity: 0.95 }).addTo(map);
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

      // START marker
      L.marker(coords[0], {
        icon: L.divIcon({
          html: `<div style="background:rgba(34,197,94,0.9);color:white;font-size:11px;font-weight:800;padding:4px 8px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.3);">🟢 START</div>`,
          className: '', iconAnchor: [32, 12],
        }),
      }).addTo(map).bindPopup('Αφετηρία');

      // FINISH marker
      L.marker(coords[coords.length - 1], {
        icon: L.divIcon({
          html: `<div style="background:rgba(245,158,11,0.9);color:white;font-size:11px;font-weight:800;padding:4px 8px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.3);">🏁 FINISH</div>`,
          className: '', iconAnchor: [38, 12],
        }),
      }).addTo(map).bindPopup('Τερματισμός');

      // CP markers
      controls.forEach((cp, i) => {
        if (!cp.lat || !cp.lng) return;
        L.marker([cp.lat, cp.lng], {
          icon: L.divIcon({
            html: `<div style="background:rgba(10,22,40,0.92);color:#06b6d4;font-size:10px;font-weight:800;padding:3px 8px;border-radius:10px;border:1.5px solid #06b6d4;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);">CP${i+1}</div>`,
            className: '', iconAnchor: [18, 10],
          }),
        }).addTo(map).bindPopup(`CP${i+1}: ${cp.name}`);
      });

      onCoordsReady?.(parsedCoords);
    }
  } catch (e) {
    console.error('GPX load error:', e);
    map.setView([38.0, 23.7], 7);
  }

  return { map, markerRef };
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BrevetMap({
  gpxUrl, controls = [], scrubberKm: externalScrubberKm,
  climbProfile, storedAscent, distance, ascent, duration,
  onScrub: externalOnScrub,
}: BrevetMapProps) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const dotMarkerRef  = useRef<any>(null);
  const initializedRef = useRef(false);
  const [parsedCoords, setParsedCoords] = useState<ParsedCoord[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelOpen, setPanelOpen]       = useState(true);

  // Internal scrubber state (for when not controlled externally)
  const [internalScrubKm, setInternalScrubKm] = useState<number | null>(null);
  const isControlled  = externalOnScrub !== undefined;
  const scrubberKm    = isControlled ? (externalScrubberKm ?? null) : internalScrubKm;
  const onScrub       = useCallback((km: number | null) => {
    if (isControlled) externalOnScrub?.(km);
    else setInternalScrubKm(km);
  }, [isControlled, externalOnScrub]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return;
    initializedRef.current = true;
    initLeafletMap(mapRef.current, gpxUrl, controls, false, coords => {
      setParsedCoords(coords);
    }).then(({ map, markerRef }) => {
      mapInstanceRef.current = map;
      dotMarkerRef.current   = markerRef.current;
    });
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [gpxUrl]);

  // Move scrubber dot
  useEffect(() => {
    const marker = dotMarkerRef.current;
    if (!marker) return;
    if (scrubberKm === null || !parsedCoords.length) {
      marker.setOpacity(0); return;
    }
    const pos = interpolateLatLng(parsedCoords, scrubberKm);
    if (pos) { marker.setLatLng(pos); marker.setOpacity(1); }
  }, [scrubberKm, parsedCoords]);

  // Invalidate map size when panel opens/closes
  useEffect(() => {
    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 320);
  }, [panelOpen, isFullscreen]);

  const MAP_H = isFullscreen ? '100%' : '540px';
  const PANEL_H = panelOpen ? '260px' : '48px';

  return (
    <>
      <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />

      {/* ── IMMERSIVE CONTAINER ── */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        style={{ height: isFullscreen ? '85vh' : '540px' }}>

        {/* MAP — full size */}
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

        {/* ── FULLSCREEN TOGGLE — top right ── */}
        <button
          onClick={() => setIsFullscreen(f => !f)}
          title={isFullscreen ? 'Κλείσιμο (Esc)' : 'Πλήρης οθόνη'}
          className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm transition-all hover:brightness-110"
          style={{ backgroundColor: 'rgba(10,22,40,0.85)', borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4' }}
        >
          {isFullscreen ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
            </svg>
          )}
          {isFullscreen ? 'Κλείσιμο' : 'Πλήρης οθόνη'}
        </button>

        {/* ── GLASSMORPHISM ELEVATION PANEL — bottom overlay ── */}
        <div
          className="absolute bottom-0 left-0 right-0 z-[999] transition-all duration-300"
          style={{
            height: PANEL_H,
            background: 'linear-gradient(to top, rgba(10,22,40,0.97) 0%, rgba(10,22,40,0.88) 70%, rgba(10,22,40,0.60) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(6,182,212,0.2)',
          }}
        >
          {/* ── PANEL HEADER — always visible, tap to collapse ── */}
          <button
            onClick={() => setPanelOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3"
            style={{ height: 48 }}
          >
            {/* Stats mini row */}
            <div className="flex items-center gap-4">
              {distance && (
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-400 text-xs">🚲</span>
                  <span className="text-white font-bold text-sm">{distance}km</span>
                </div>
              )}
              {ascent && ascent > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-400 text-xs">⛰️</span>
                  <span className="text-white font-bold text-sm">{ascent.toLocaleString()}m+</span>
                </div>
              )}
              {duration && (
                <div className="flex items-center gap-1.5">
                  <span className="text-cyan-400 text-xs">⏱</span>
                  <span className="text-white font-bold text-sm">{duration}</span>
                </div>
              )}
            </div>

            {/* Collapse arrow */}
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs">
                {panelOpen ? 'Προφίλ υψομέτρου' : 'Εμφάνιση προφίλ'}
              </span>
              <span className="text-cyan-400 text-sm transition-transform duration-300"
                style={{ transform: panelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▲
              </span>
            </div>
          </button>

          {/* ── ELEVATION CHART inside panel ── */}
          {panelOpen && (
            <div className="px-4 pb-3" style={{ height: `calc(${PANEL_H} - 48px)`, overflow: 'hidden' }}>
              <ElevationChart
                gpxUrl={gpxUrl}
                climbProfile={climbProfile}
                storedAscent={storedAscent}
                scrubberKm={scrubberKm}
                onScrub={onScrub}
                defaultZoomed={false}
                zoomedPxPerKm={8}
              />
            </div>
          )}
        </div>

        {/* Escape key for fullscreen */}
        {isFullscreen && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: -1 }}
            onKeyDown={(e) => { if (e.key === 'Escape') setIsFullscreen(false); }}
            tabIndex={-1}
          />
        )}
      </div>

      {/* Attribution */}
      <p className="text-white/20 text-xs text-right mt-1">
        © OpenStreetMap contributors © CartoDB
      </p>
    </>
  );
}
