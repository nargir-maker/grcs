'use client';

import { useEffect, useRef, useState } from 'react';

interface Rider {
  id: string;
  fullName: string;
  registryId?: string;
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
  mapHeight?: string;
  riderLabelMode?: 'brevet' | 'friendly';
}

// ── Tile styles ───────────────────────────────────────────────────────────────
const TF = process.env.NEXT_PUBLIC_THUNDERFOREST_KEY;

const TILE_STYLES = [
  {
    id: 'street',
    label: '🗺️', title: 'Οδικός',
    tooltip: 'Οδικός χάρτης — δρόμοι, πόλεις, σήμανση',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  },
  {
    id: 'cycling',
    label: '🚴', title: 'Ποδηλατικός',
    tooltip: 'Ποδηλατικός χάρτης — ποδηλατοδρόμοι, διαδρομές, σήμανση cycling',
    url: `https://api.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=${TF}`,
    attribution: '© Thunderforest · OpenStreetMap contributors',
    maxZoom: 22,
  },
  {
    id: 'outdoors',
    label: '⛰️', title: 'Τοπογραφικός',
    tooltip: 'Τοπογραφικός χάρτης — υψόμετρο, ανάγλυφο εδάφους, μονοπάτια',
    url: `https://api.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${TF}`,
    attribution: '© Thunderforest · OpenStreetMap contributors',
    maxZoom: 22,
  },
];

const DEFAULT_STYLE = 'outdoors';

// ── SVG marker builders ───────────────────────────────────────────────────────
function svgCpMarker(num: number): string {
  return `<div style="
    width:32px;height:32px;border-radius:50%;
    background:#f59e0b;border:2.5px solid #fff;
    color:#000;font-size:9px;font-weight:800;
    display:flex;align-items:center;justify-content:center;
    font-family:sans-serif;letter-spacing:-0.5px;
    box-shadow:0 1px 6px rgba(0,0,0,.5)">
    CP${num}
  </div>`;
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

function svgRiderMarker(
  gender: string,
  isDNF: boolean,
  isFinished: boolean,
  isSelected: boolean,
  fullName: string,
  registryId: string,
  labelMode: 'brevet' | 'friendly',
): string {
  const bg = isDNF      ? '#616161'
           : isFinished ? '#388E3C'
           : isSelected ? '#F9A825'
           : gender === 'F' ? '#E91E8C'
           : '#1565C0';

  const symbol   = gender === 'F' ? '♀' : '♂';
  const sqSize   = isSelected ? 40 : 32;
  const fontSize = isSelected ? 22 : 17;

  const parts      = fullName.trim().split(' ');
  const firstName  = parts[0] ?? fullName;
  const lastName   = parts.slice(1).join(' ');
  const firstInitial = firstName.length > 0 ? firstName[0] + '.' : '';
  const chipLabel  = labelMode === 'brevet' && registryId && registryId !== '-'
    ? `${registryId}-${firstInitial} ${lastName}`.trim()
    : firstName;
  const chipW = Math.max(56, chipLabel.length * 8.5 + 18);
  const chipH = 24, gap = 4;
  const totalW = sqSize + gap + chipW;
  const totalH = Math.max(sqSize, chipH);
  const chipY  = (totalH - chipH) / 2;
  const chipX  = sqSize + gap;
  const sqY    = (totalH - sqSize) / 2;

  return `
    <svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}"
      xmlns="http://www.w3.org/2000/svg">
      ${isSelected ? `<defs><filter id="glow">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter></defs>` : ''}
      <rect x="1" y="${sqY + 1}" width="${sqSize - 2}" height="${sqSize - 2}"
        rx="7" ry="7" fill="${bg}" stroke="white" stroke-width="2.5"
        ${isSelected ? 'filter="url(#glow)"' : ''}/>
      <text x="${sqSize / 2}" y="${sqY + sqSize / 2 + fontSize * 0.35}"
        text-anchor="middle" font-family="Arial,sans-serif"
        font-size="${fontSize}" font-weight="bold" fill="white">${symbol}</text>
      <rect x="${chipX}" y="${chipY}" width="${chipW}" height="${chipH}"
        rx="6" ry="6" fill="${bg}" fill-opacity="0.88"
        stroke="white" stroke-opacity="0.5" stroke-width="1.2"/>
      <text x="${chipX + chipW / 2}" y="${chipY + chipH / 2 + 5}"
        text-anchor="middle" font-family="Arial,sans-serif"
        font-size="13" font-weight="bold" fill="white">${chipLabel}</text>
    </svg>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

interface ParsedCoord { lat: number; lng: number; distKm: number; }

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
  const totalKm  = coords[coords.length - 1].distKm;
  for (let km = interval; km < totalKm; km += interval) {
    const pos = interpolateLatLng(coords, km);
    if (!pos) continue;
    const icon   = L.divIcon({ html: svgKmMarker(km), className: '', iconAnchor: [17, 17] });
    const marker = L.marker(pos, { icon, zIndexOffset: 100 }).addTo(map);
    marker.bindPopup(`km ${km}`);
    layerRef.current.push(marker);
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LiveMap({
  gpxUrl, controls, riders, selectedRiderId, onRiderSelect,
  mapHeight = '500px',
  riderLabelMode = 'brevet',
}: LiveMapProps) {
  const mapRef       = useRef<HTMLDivElement>(null);
  const mapInstance  = useRef<any>(null);
  const riderMarkers = useRef<Map<string, any>>(new Map());
  const kmLayerRef   = useRef<any[]>([]);
  const parsedCoords = useRef<ParsedCoord[]>([]);
  const tileLayerRef = useRef<any>(null);
  const [L, setL]    = useState<any>(null);
  const [activeStyle, setActiveStyle] = useState<string>(DEFAULT_STYLE);

  // ── Init map once ─────────────────────────────────────────────────────────
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
        zoomControl: true, scrollWheelZoom: true,
      });

      // Default tile — Outdoors
      const defaultStyle = TILE_STYLES.find(s => s.id === DEFAULT_STYLE)!;
      const tile = leaflet.tileLayer(defaultStyle.url, {
        attribution: defaultStyle.attribution, maxZoom: defaultStyle.maxZoom,
      }).addTo(map);
      tileLayerRef.current = tile;
      mapInstance.current  = map;

      if (gpxUrl) {
        try {
          const res  = await fetch(gpxUrl);
          const text = await res.text();
          const xml  = new DOMParser().parseFromString(text, 'text/xml');
          const pts  = xml.querySelectorAll('trkpt');
          const coords: [number, number][] = [];
          const parsed: ParsedCoord[]      = [];
          let distKm = 0, prevLat = 0, prevLng = 0;

          pts.forEach((pt, i) => {
            const lat = parseFloat(pt.getAttribute('lat') ?? '0');
            const lng = parseFloat(pt.getAttribute('lon') ?? '0');
            if (lat && lng) {
              if (i > 0 && prevLat !== 0)
                distKm += haversineM(prevLat, prevLng, lat, lng) / 1000;
              prevLat = lat; prevLng = lng;
              coords.push([lat, lng]);
              parsed.push({ lat, lng, distKm });
            }
          });

          parsedCoords.current = parsed;

          if (coords.length > 0) {
            const poly = leaflet.polyline(coords, {
              color: '#ff3d02', weight: 3, opacity: 0.7,
            }).addTo(map);
            map.fitBounds(poly.getBounds(), { padding: [30, 30] });

            // START 🚴
            leaflet.marker(coords[0], {
              icon: leaflet.divIcon({
                html: `<div style="width:28px;height:28px;border-radius:50%;
                  background:#22c55e;border:2.5px solid #fff;color:#fff;font-size:13px;
                  display:flex;align-items:center;justify-content:center;
                  box-shadow:0 1px 4px rgba(0,0,0,.5)">🚴</div>`,
                className: '', iconSize: [28, 28], iconAnchor: [14, 14],
              }),
            }).addTo(map).bindPopup('Αφετηρία');

            // FINISH 🏆
            leaflet.marker(coords[coords.length - 1], {
              icon: leaflet.divIcon({
                html: `<div style="width:28px;height:28px;border-radius:50%;
                  background:#ef4444;border:2.5px solid #fff;color:#fff;font-size:13px;
                  display:flex;align-items:center;justify-content:center;
                  box-shadow:0 1px 4px rgba(0,0,0,.5)">🏆</div>`,
                className: '', iconSize: [28, 28], iconAnchor: [14, 14],
              }),
            }).addTo(map).bindPopup('Τερματισμός');

            // CP MARKERS — κίτρινοι κύκλοι CPx
            controls.forEach((cp, i) => {
              if (!cp.lat || !cp.lng) return;
              leaflet.marker([cp.lat, cp.lng], {
                icon: leaflet.divIcon({
                  html: svgCpMarker(i + 1),
                  className: '', iconSize: [32, 32], iconAnchor: [16, 16],
                }),
                zIndexOffset: 300,
              }).addTo(map).bindTooltip(
                cp.name
                  ? `<b>CP${i+1}: ${cp.name}</b><br/>${cp.km} km`
                  : `<b>CP${i+1}</b><br/>${cp.km} km`,
                { permanent: false }
              );
            });

            // KM MARKERS
            buildKmMarkers(leaflet, map, parsed, map.getZoom(), kmLayerRef);
            map.on('zoomend', () => {
              buildKmMarkers(leaflet, map, parsed, map.getZoom(), kmLayerRef);
            });
          }
        } catch (e) {
          console.error('GPX load error:', e);
          map.setView([38.0, 23.7], 7);
        }
      } else {
        map.setView([38.0, 23.7], 7);
      }
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

  // ── Update rider markers ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !L) return;
    const map = mapInstance.current;

    riders.forEach(rider => {
      if (!rider.lat || !rider.lng) return;

      const isSelected = selectedRiderId === rider.id;
      const isDNF      = rider.status === 'DNF';
      const isFinished = rider.status === 'FINISHED';
      const sqSize     = isSelected ? 40 : 32;

      const icon = L.divIcon({
        html: svgRiderMarker(rider.gender, isDNF, isFinished, isSelected,
          rider.fullName, rider.registryId ?? '', riderLabelMode),
        className: '',
        iconAnchor: [sqSize / 2, sqSize / 2],
      });

      if (riderMarkers.current.has(rider.id)) {
        const marker = riderMarkers.current.get(rider.id);
        marker.setLatLng([rider.lat, rider.lng]);
        marker.setIcon(icon);
      } else {
        const marker = L.marker([rider.lat, rider.lng], {
          icon,
          zIndexOffset: isSelected ? 1000 : 500,
        })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:160px;font-family:Arial,sans-serif;">
              <strong>${rider.fullName}</strong><br/>
              <span style="color:${isDNF ? '#ef4444' : isFinished ? '#22c55e' : '#06b6d4'}">
                ${isFinished ? '🏁 Τερμάτισε' : isDNF ? '❌ DNF' : '🚴 Σε πορεία'}
              </span><br/>
              📍 km ${parseFloat(rider.currentKm).toFixed(0)}<br/>
              ⚡ ${rider.avgSpeed} km/h μ.ο.
            </div>
          `)
          .on('click', () => onRiderSelect(rider.id));
        riderMarkers.current.set(rider.id, marker);
      }
    });

    // Αφαίρεση markers για riders που δεν υπάρχουν πλέον
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

  // ── Tile switcher ─────────────────────────────────────────────────────────
  function switchTileLayer(style: typeof TILE_STYLES[0]) {
    if (!mapInstance.current || !L || !tileLayerRef.current) return;
    mapInstance.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(style.url, {
      attribution: style.attribution, maxZoom: style.maxZoom,
    }).addTo(mapInstance.current);
    setActiveStyle(style.id);
  }

  return (
    <>
      <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div className="relative" style={{ height: mapHeight, isolation: 'isolate' }}>
        <div
          ref={mapRef}
          style={{ height: '100%', width: '100%' }}
          className="rounded-2xl overflow-hidden border border-white/10"
        />
        {/* Tile switcher */}
        <div className="absolute bottom-4 left-4 z-[1000] flex gap-1.5">
          {TILE_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => switchTileLayer(style)}
              title={style.tooltip}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                text-xs font-bold transition-all backdrop-blur-md border"
              style={{
                background:  activeStyle === style.id ? 'rgba(6,182,212,0.85)' : 'rgba(10,22,40,0.80)',
                borderColor: activeStyle === style.id ? 'rgba(6,182,212,0.8)'  : 'rgba(255,255,255,0.15)',
                color:       activeStyle === style.id ? '#000'                  : 'rgba(255,255,255,0.7)',
                boxShadow:   activeStyle === style.id ? '0 0 12px rgba(6,182,212,0.4)' : 'none',
              }}
            >
              <span>{style.label}</span>
              <span className="hidden sm:inline ml-0.5">{style.title}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-white/20 text-xs text-right mt-1">
        © OpenStreetMap · Ανανέωση σε πραγματικό χρόνο
      </p>
    </>
  );
}