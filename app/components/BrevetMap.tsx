'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const ElevationChart = dynamic(() => import('./ElevationChart'), { ssr: false });

interface BrevetMapProps {
  gpxUrl: string;
  startCoords?: string;
  finishCoords?: string;
  controls?: { km: number; name: string; lat: number; lng: number }[];
  scrubberKm?: number | null;
}

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

function interpolateLatLng(coords: ParsedCoord[], km: number): [number, number] | null {
  if (coords.length === 0) return null;
  if (km <= coords[0].distKm) return [coords[0].lat, coords[0].lng];
  if (km >= coords[coords.length-1].distKm) {
    const last = coords[coords.length-1];
    return [last.lat, last.lng];
  }
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

function svgCpMarker(num: number, isManned: boolean): string {
  const fill = isManned ? '#FFF176' : '#80DEEA';
  return `
    <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <polygon points="22,3 41,41 3,41"
        fill="${fill}" stroke="#D32F2F" stroke-width="3.5"
        stroke-linejoin="round"/>
      <text x="22" y="38" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="11"
        font-weight="bold" fill="#000">CP${num}</text>
    </svg>`;
}

function svgKmMarker(km: number): string {
  const fontSize = km >= 100 ? 11 : 13;
  return `
    <svg width="34" height="34" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
      <circle cx="17" cy="17" r="15" fill="white" stroke="#D32F2F" stroke-width="3"/>
      <text x="17" y="22" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="${fontSize}"
        font-weight="bold" fill="#000">${km}</text>
    </svg>`;
}

function kmInterval(zoom: number): number {
  if (zoom < 8)  return 50;
  if (zoom < 10) return 30;
  if (zoom < 12) return 10;
  if (zoom < 14) return 5;
  return 2;
}

function buildKmMarkers(
  L: any, map: any, coords: ParsedCoord[],
  zoom: number, layerRef: { current: any[] }
) {
  layerRef.current.forEach(m => map.removeLayer(m));
  layerRef.current = [];
  if (coords.length === 0) return;
  const interval = kmInterval(zoom);
  const totalKm = coords[coords.length - 1].distKm;
  for (let km = interval; km < totalKm; km += interval) {
    const pos = interpolateLatLng(coords, km);
    if (!pos) continue;
    const icon = L.divIcon({ html: svgKmMarker(km), className: '', iconAnchor: [17, 17] });
    const marker = L.marker(pos, { icon, zIndexOffset: 100 }).addTo(map);
    marker.bindPopup(`km ${km}`);
    layerRef.current.push(marker);
  }
}

async function initLeafletMap(
  container: HTMLDivElement,
  gpxUrl: string,
  controls: { km: number; name: string; lat: number; lng: number }[],
  scrollWheelZoom: boolean,
  onCoordsReady?: (coords: ParsedCoord[]) => void,
  kmLayerRef?: { current: any[] },
  onMapReady?: (map: any, L: any) => void
,
  onTileReady?: (tile: any) => void
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
  const tile = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }
  ).addTo(map);
  if (onTileReady) onTileReady(tile);

  const dotIcon = L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#06b6d4;border:2px solid white;box-shadow:0 0 8px rgba(6,182,212,0.8);"></div>`,
    className: '', iconAnchor: [7, 7],
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

    if (coords.length === 0) {
      map.setView([38.0, 23.7], 7);
    } else {
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
          icon: L.divIcon({ html: svgCpMarker(i + 1, true), className: '', iconAnchor: [22, 44] }),
          zIndexOffset: 300,
        }).addTo(map).bindPopup(`<b>CP${i+1}: ${cp.name}</b><br/>km ${cp.km}`);
      });

      if (kmLayerRef) {
        buildKmMarkers(L, map, parsedCoords, map.getZoom(), kmLayerRef);
        map.on('zoomend', () => {
          buildKmMarkers(L, map, parsedCoords, map.getZoom(), kmLayerRef!);
        });
      }

      onCoordsReady?.(parsedCoords);
      onMapReady?.(map, L);
    }
  } catch (e) {
    console.error('GPX load error:', e);
    map.setView([38.0, 23.7], 7);
  }

  return { map, markerRef };
}

// ── Fullscreen modal ───────────────────────────────────────────────────────────
function FullscreenMap({
  gpxUrl, controls, onClose, climbProfile, storedAscent,
}: {
  gpxUrl: string;
  controls: { km: number; name: string; lat: number; lng: number }[];
  onClose: () => void;
  climbProfile?: any[];
  storedAscent?: number;
}) {
  const modalMapRef         = useRef<HTMLDivElement>(null);
  const modalMapInstanceRef = useRef<any>(null);
  const modalDotMarkerRef   = useRef<any>(null);
  const kmLayerRef          = useRef<any[]>([]);
  const [modalCoords, setModalCoords]         = useState<ParsedCoord[]>([]);
  const [modalScrubberKm, setModalScrubberKm] = useState<number | null>(null);
  const [showChart, setShowChart]             = useState(true);

  useEffect(() => {
    if (!modalMapRef.current) return;
    let destroyed = false;
    initLeafletMap(
      modalMapRef.current, gpxUrl, controls, true,
      coords => { if (!destroyed) setModalCoords(coords); },
      kmLayerRef
    ).then(({ map, markerRef }) => {
      if (destroyed) { map.remove(); return; }
      modalMapInstanceRef.current = map;
      modalDotMarkerRef.current   = markerRef.current;
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
    const marker = modalDotMarkerRef.current;
    if (!marker) return;
    if (modalScrubberKm === null || modalCoords.length === 0) {
      marker.setOpacity(0); return;
    }
    const pos = interpolateLatLng(modalCoords, modalScrubberKm);
    if (pos) { marker.setLatLng(pos); marker.setOpacity(1); }
  }, [modalScrubberKm, modalCoords]);

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
        className="relative w-[96vw] h-[90vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0A1628]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── CLOSE FULLSCREEN — top right ── */}
        <button
          onClick={onClose}
          title="Κλείσιμο (Esc)"
          className="absolute top-3 right-3 z-[1001] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(10,22,40,0.85)', borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
          </svg>
          Κλείσιμο
        </button>

        {/* ── TOGGLE CHART — bottom right, above chart ── */}
        <button
          onClick={() => setShowChart(s => !s)}
          className="absolute z-[1001] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm transition-all"
          style={{
            bottom: showChart ? 'calc(42% + 8px)' : 12,
            right: 12,
            backgroundColor: showChart ? 'rgba(6,182,212,0.85)' : 'rgba(10,22,40,0.85)',
            borderColor: showChart ? 'rgba(6,182,212,0.6)' : 'rgba(6,182,212,0.4)',
            color: showChart ? '#000' : '#06b6d4',
          }}
        >
          ⛰️ {showChart ? 'Κλείσιμο γραφήματος' : 'Υψομετρικό'}
        </button>

        {/* MAP */}

        <div ref={modalMapRef} style={{ position: 'absolute', inset: 0 }} />

        {/* ── ELEVATION PANEL — shown/hidden by toggle ── */}
        {/* ── TOGGLE CHART BUTTON — always visible bottom-right ── */}
        
        {showChart && (
          <div
            className="absolute bottom-0 left-0 right-0 z-[1000]"
            style={{
              background: 'linear-gradient(to top, rgba(10,22,40,0.65) 0%, rgba(10,22,40,0.40) 75%, rgba(10,22,40,0.10) 100%)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderTop: '1px solid rgba(6,182,212,0.15)',
              padding: '16px 20px 12px',
              maxHeight: '42%',
              overflowY: 'auto',
            }}
          >
            <ElevationChart
              gpxUrl={gpxUrl}
              climbProfile={climbProfile}
              storedAscent={storedAscent}
              scrubberKm={modalScrubberKm}
              onScrub={setModalScrubberKm}
              defaultZoomed={true}
              zoomedPxPerKm={10}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function BrevetMap({
  gpxUrl, startCoords, finishCoords, controls = [], scrubberKm,
}: BrevetMapProps) {
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const dotMarkerRef   = useRef<any>(null);
  const initializedRef = useRef(false);
  const kmLayerRef     = useRef<any[]>([]);
  const tileLayerRef   = useRef<any>(null);
  const LRef            = useRef<any>(null);
  const [parsedCoords, setParsedCoords] = useState<ParsedCoord[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeStyle, setActiveStyle]   = useState<string>('dark');

  const toggleFullscreen = useCallback(() => setIsFullscreen(f => !f), []);

  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return;
    initializedRef.current = true;
    initLeafletMap(
      mapRef.current, gpxUrl, controls, false,
      coords => setParsedCoords(coords),
      kmLayerRef,
      undefined,
      (tile) => { tileLayerRef.current = tile; }
    ).then(async ({ map, markerRef }) => {
      mapInstanceRef.current = map;
      dotMarkerRef.current   = markerRef.current;
      LRef.current = (await import('leaflet')).default;
    });
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [gpxUrl]);

  useEffect(() => {
    const marker = dotMarkerRef.current;
    if (!marker) return;
    if (scrubberKm === null || scrubberKm === undefined || parsedCoords.length === 0) {
      marker.setOpacity(0); return;
    }
    const pos = interpolateLatLng(parsedCoords, scrubberKm);
    if (pos) { marker.setLatLng(pos); marker.setOpacity(1); }
  }, [scrubberKm, parsedCoords]);

  return (
    <>
      <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />

      {isFullscreen && (
        <FullscreenMap
          gpxUrl={gpxUrl}
          controls={controls}
          onClose={toggleFullscreen}
        />
      )}

      <div className="relative" style={{ visibility: isFullscreen ? 'hidden' : 'visible' }}>
        <div
          ref={mapRef}
          style={{ height: '400px', width: '100%' }}
          className="rounded-xl overflow-hidden border border-white/10"
        />

        {/* ── Tile layer switcher ── */}
        {[
          { id: 'dark',    label: '🌑', title: 'Dark',    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',     attribution: '© OpenStreetMap © CARTO',                 maxZoom: 19 },
          { id: 'street',  label: '🗺️', title: 'Street',  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                attribution: '© OpenStreetMap contributors',             maxZoom: 19 },
          { id: 'cycling', label: '🚴', title: 'Cycling', url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', attribution: '© OpenStreetMap · CyclOSM',                maxZoom: 20 },
          { id: 'topo',    label: '⛰️', title: 'Topo',    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                  attribution: '© OpenStreetMap · OpenTopoMap (CC-BY-SA)', maxZoom: 17 },
        ].length > 0 && (
          <div className="absolute bottom-10 left-3 z-[1000] flex gap-1.5">
            {[
              { id: 'dark',    label: '🌑', title: 'Dark',    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',     attribution: '© OpenStreetMap © CARTO',                 maxZoom: 19 },
              { id: 'street',  label: '🗺️', title: 'Street',  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                attribution: '© OpenStreetMap contributors',             maxZoom: 19 },
              { id: 'cycling', label: '🚴', title: 'Cycling', url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', attribution: '© OpenStreetMap · CyclOSM',                maxZoom: 20 },
              { id: 'topo',    label: '⛰️', title: 'Topo',    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                  attribution: '© OpenStreetMap · OpenTopoMap (CC-BY-SA)', maxZoom: 17 },
            ].map(style => (
              <button
                key={style.id}
                title={style.title}
                onClick={() => {
                  if (!mapInstanceRef.current || !tileLayerRef.current) return;
                  mapInstanceRef.current.removeLayer(tileLayerRef.current);
                  if (!LRef.current) return;
                  tileLayerRef.current = LRef.current.tileLayer(style.url, {
                    attribution: style.attribution, maxZoom: style.maxZoom,
                  }).addTo(mapInstanceRef.current);
                  setActiveStyle(style.id);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold
                  transition-all backdrop-blur-md border"
                style={{
                  background:  activeStyle === style.id ? 'rgba(6,182,212,0.85)' : 'rgba(10,22,40,0.80)',
                  borderColor: activeStyle === style.id ? 'rgba(6,182,212,0.8)'  : 'rgba(255,255,255,0.15)',
                  color:       activeStyle === style.id ? '#000'                  : 'rgba(255,255,255,0.7)',
                }}
              >
                {style.label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={toggleFullscreen}
          title="Πλήρης οθόνη"
          className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm transition-all hover:brightness-110"
          style={{ backgroundColor: 'rgba(10,22,40,0.85)', borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4' }}
        >
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