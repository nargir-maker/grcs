'use client';

// app/components/LiveMap.tsx
// Real-time Leaflet map showing GPX route + live rider positions

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

// ── SVG marker builders ────────────────────────────────────────────────────────

function svgCpMarker(num: number): string {
  return `
    <svg width="40" height="40" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <polygon points="22,3 41,41 3,41"
        fill="#FFF176" stroke="#D32F2F" stroke-width="3.5"
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

// ── Rider marker: square + name chip to the right ─────────────────────────────
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

  // Label: brevet = "1234-Ν. Επώνυμο", friendly = "Όνομα"
  const parts     = fullName.trim().split(' ');
  const firstName = parts[0] ?? fullName;
  const lastName  = parts.slice(1).join(' ');
  const firstInitial = firstName.length > 0 ? firstName[0] + '.' : '';
  const chipLabel = labelMode === 'brevet' && registryId && registryId !== '-'
    ? `${registryId}-${firstInitial} ${lastName}`.trim()
    : firstName;
  // Estimate chip width: ~8px per char + 16px padding
  const chipW    = Math.max(56, chipLabel.length * 8.5 + 18);
  const chipH    = 24;
  const gap      = 4;
  const totalW   = sqSize + gap + chipW;
  const totalH   = Math.max(sqSize, chipH);
  const chipY    = (totalH - chipH) / 2;
  const chipX    = sqSize + gap;
  const sqY      = (totalH - sqSize) / 2;

  return `
    <svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}"
      xmlns="http://www.w3.org/2000/svg">
      ${isSelected ? `
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>` : ''}
      <!-- Square marker -->
      <rect x="1" y="${sqY + 1}" width="${sqSize - 2}" height="${sqSize - 2}"
        rx="7" ry="7" fill="${bg}" stroke="white" stroke-width="2.5"
        ${isSelected ? 'filter="url(#glow)"' : ''}/>
      <text x="${sqSize / 2}" y="${sqY + sqSize / 2 + fontSize * 0.35}"
        text-anchor="middle" font-family="Arial,sans-serif"
        font-size="${fontSize}" font-weight="bold" fill="white">${symbol}</text>
      <!-- Name chip -->
      <rect x="${chipX}" y="${chipY}" width="${chipW}" height="${chipH}"
        rx="6" ry="6" fill="${bg}" fill-opacity="0.88"
        stroke="white" stroke-opacity="0.5" stroke-width="1.2"/>
      <text x="${chipX + chipW / 2}" y="${chipY + chipH / 2 + 5}"
        text-anchor="middle" font-family="Arial,sans-serif"
        font-size="13" font-weight="bold" fill="white">${chipLabel}</text>
    </svg>`;
}

// ── Haversine ─────────────────────────────────────────────────────────────────
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
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
  const totalKm = coords[coords.length - 1].distKm;

  for (let km = interval; km < totalKm; km += interval) {
    const pos = interpolateLatLng(coords, km);
    if (!pos) continue;
    const icon = L.divIcon({
      html: svgKmMarker(km),
      className: '',
      iconAnchor: [17, 17],
    });
    const marker = L.marker(pos, { icon, zIndexOffset: 100 }).addTo(map);
    marker.bindPopup(`km ${km}`);
    layerRef.current.push(marker);
  }
}

// ── Main component ─────────────────────────────────────────────────────────────
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
  const [L, setL]    = useState<any>(null);

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

      if (gpxUrl) {
        try {
          const res  = await fetch(gpxUrl);
          const text = await res.text();
          const xml  = new DOMParser().parseFromString(text, 'text/xml');
          const pts  = xml.querySelectorAll('trkpt');
          const coords: [number, number][] = [];
          const parsed: ParsedCoord[] = [];
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

            // START
            leaflet.marker(coords[0], {
              icon: leaflet.divIcon({
                html: `<div style="background:#22c55e;color:white;font-size:10px;font-weight:bold;padding:3px 6px;border-radius:10px;white-space:nowrap;">🟢 START</div>`,
                className: '', iconAnchor: [28, 10],
              }),
            }).addTo(map);

            // FINISH
            leaflet.marker(coords[coords.length - 1], {
              icon: leaflet.divIcon({
                html: `<div style="background:#f59e0b;color:white;font-size:10px;font-weight:bold;padding:3px 6px;border-radius:10px;white-space:nowrap;">🏁 FINISH</div>`,
                className: '', iconAnchor: [32, 10],
              }),
            }).addTo(map);

            // CP MARKERS
            controls.forEach((cp, i) => {
              if (!cp.lat || !cp.lng) return;
              leaflet.marker([cp.lat, cp.lng], {
                icon: leaflet.divIcon({
                  html: svgCpMarker(i + 1),
                  className: '',
                  iconAnchor: [20, 40],
                }),
                zIndexOffset: 300,
              }).addTo(map).bindPopup(`<b>CP${i+1}: ${cp.name}</b><br/>km ${cp.km}`);
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

  // ── Update rider markers ───────────────────────────────────────────────────
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
        html: svgRiderMarker(rider.gender, isDNF, isFinished, isSelected, rider.fullName, rider.registryId ?? '', riderLabelMode),
        className: '',
        // Anchor at center of the square (left part of the SVG)
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
        style={{ height: mapHeight, width: '100%' }}
        className="rounded-2xl overflow-hidden border border-white/10"
      />
      <p className="text-white/20 text-xs text-right mt-1">
        © OpenStreetMap · Ανανέωση σε πραγματικό χρόνο
      </p>
    </>
  );
}
