'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const ElevationChart = dynamic(() => import('./ElevationChart'), { ssr: false });

// ── Thunderforest API key ──────────────────────────────────────────────────────
const TF = process.env.NEXT_PUBLIC_THUNDERFOREST_KEY;

// ── Wind arrow helpers ────────────────────────────────────────────────────────
function geobrg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const d2r = Math.PI / 180;
  const dLng = (lng2 - lng1) * d2r;
  const la1 = lat1 * d2r, la2 = lat2 * d2r;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function windToBf(kmh: number): number {
  if (kmh < 1)  return 0; if (kmh < 6)  return 1; if (kmh < 12) return 2;
  if (kmh < 20) return 3; if (kmh < 29) return 4; if (kmh < 39) return 5;
  if (kmh < 50) return 6; if (kmh < 62) return 7; if (kmh < 75) return 8;
  return 9;
}

function windIntensityColor(kmh: number): string {
  if (kmh < 20) return '#6EE7B7';
  if (kmh < 35) return '#FCD34D';
  if (kmh < 50) return '#FB923C';
  return '#F87171';
}

// ── Weather source (route markers) ──────────────────────────────────────────
// MET Norway is more accurate but only forecasts ~9 days out; beyond that we
// fall back to Open-Meteo/ECMWF (~16 days). Same 9-day cutoff as the Flutter
// app's map screen.
export type WeatherSourceId = 'metno' | 'openmeteo';

function pickWeatherSource(startDate: Date): WeatherSourceId {
  return startDate.getTime() < Date.now() + 9 * 86400000 ? 'metno' : 'openmeteo';
}

async function fetchPointWeather(
  lat: number, lng: number, time: Date, source: WeatherSourceId,
): Promise<{ windSpeed: number; windDirection: number; precipMm: number; precipProb: number } | null> {
  try {
    if (source === 'metno') {
      const res = await fetch(`/api/weather/metno?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&time=${encodeURIComponent(time.toISOString())}`);
      if (!res.ok) return null;
      const d = await res.json();
      return {
        windSpeed: d.windSpeed ?? 0,
        windDirection: d.windDirection ?? 0,
        precipMm: d.precipitation ?? 0,
        precipProb: 0,
      };
    }
    const dateStr = time.toISOString().split('T')[0];
    const endDate = new Date(time.getTime() + 86400000).toISOString().split('T')[0];
    const url =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      `&hourly=windspeed_10m,winddirection_10m,precipitation_probability` +
      `&start_date=${dateStr}&end_date=${endDate}&models=best_match&timezone=UTC`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const targetHour = time.toISOString().slice(0, 13) + ':00';
    const times: string[] = data.hourly?.time ?? [];
    let idx = times.findIndex((t) => t === targetHour);
    if (idx === -1) {
      const targetMs = time.getTime();
      let minDiff = Infinity;
      times.forEach((t, i) => {
        const diff = Math.abs(new Date(t + ':00Z').getTime() - targetMs);
        if (diff < minDiff) { minDiff = diff; idx = i; }
      });
    }
    if (idx === -1) return null;
    return {
      windSpeed: Math.round(data.hourly.windspeed_10m?.[idx] ?? 0),
      windDirection: Math.round(data.hourly.winddirection_10m?.[idx] ?? 0),
      precipMm: 0,
      precipProb: Math.round(data.hourly.precipitation_probability?.[idx] ?? 0),
    };
  } catch {
    return null;
  }
}

// ── Rain indicator chip — 💧XX% (Open-Meteo) or 💧X.Xmm (MET Norway) ─────────
// severity: 1=light, 2=moderate, 3=heavy (same thresholds as the Flutter app)
function rainChipInfo(source: WeatherSourceId, precipMm: number, precipProb: number): { label: string; title: string; severity: number } | null {
  if (source === 'metno') {
    if (precipMm < 0.5) return null;
    return {
      label: `${precipMm.toFixed(1)}mm`,
      title: `💧 ${precipMm.toFixed(1)}mm βροχή`,
      severity: precipMm < 1.0 ? 1 : (precipMm < 3.0 ? 2 : 3),
    };
  }
  if (precipProb < 20) return null;
  return {
    label: `${precipProb}%`,
    title: `💧 ${precipProb}% πιθανότητα βροχής`,
    severity: precipProb < 40 ? 1 : (precipProb < 70 ? 2 : 3),
  };
}

// returns true = clockwise, false = counter-clockwise, null = open route
export function detectClockwise(coords: { lat: number; lng: number }[]): boolean | null {
  if (coords.length < 3) return null;
  const first = coords[0], last = coords[coords.length - 1];
  const dLat = Math.abs(last.lat - first.lat), dLng = Math.abs(last.lng - first.lng);
  if (dLat > 0.08 || dLng > 0.08) return null; // open route (~8km threshold)
  let sum = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    sum += (coords[i + 1].lng - coords[i].lng) * (coords[i + 1].lat + coords[i].lat);
  }
  return sum < 0; // lat/lng: negative shoelace = clockwise
}

function interp(coords: { lat: number; lng: number; distKm: number }[], km: number) {
  let lo = 0, hi = coords.length - 1;
  while (lo < hi - 1) { const m = Math.floor((lo + hi) / 2); if (coords[m].distKm <= km) lo = m; else hi = m; }
  const a = coords[lo], b = coords[hi];
  const t = (b.distKm - a.distKm) === 0 ? 0 : (km - a.distKm) / (b.distKm - a.distKm);
  return { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
}

async function addWeatherMarkers(
  map: any, L: any,
  coords: { lat: number; lng: number; distKm: number }[],
  startDate: Date,
  aborted: { current: boolean },
  onSource?: (source: WeatherSourceId) => void,
) {
  if (coords.length === 0) return;
  const totalKm = coords[coords.length - 1].distKm;
  const AVG_SPEED = 18;
  const NUM = 7;
  const source = pickWeatherSource(startDate);
  onSource?.(source);

  for (let i = 1; i < NUM; i++) {
    if (aborted.current) return;
    const km = (totalKm / NUM) * i;
    const { lat, lng } = interp(coords, km);

    // Route bearing from prev to next sample
    const step = totalKm / NUM;
    const prev = interp(coords, Math.max(0, km - step / 2));
    const next = interp(coords, Math.min(totalKm, km + step / 2));
    const routeBrg = geobrg(prev.lat, prev.lng, next.lat, next.lng);

    const eta = new Date(startDate.getTime() + (km / AVG_SPEED) * 3600000);
    try {
      const w = await fetchPointWeather(lat, lng, eta, source);
      if (!w || aborted.current) continue;

      const windDir = w.windDirection;
      const windSpd = w.windSpeed;

      // Arrow points where wind GOES, absolute map direction
      const arrowRot = (windDir + 180) % 360;
      const color = windIntensityColor(windSpd);
      const bf = windToBf(windSpd);

      // Relative for tooltip label only
      const rel = (windDir - routeBrg + 360) % 360;
      const impact = (rel <= 45 || rel >= 315) ? 'Αντίθετος' : (rel >= 135 && rel <= 225) ? 'Ευνοϊκός' : 'Πλαϊνός';

      const etaLabel = eta.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });

      const windHtml = `<div style="display:flex;flex-direction:column;align-items:center;user-select:none;">
        <svg width="22" height="32" viewBox="0 0 22 32" xmlns="http://www.w3.org/2000/svg"
          style="transform:rotate(${arrowRot}deg);filter:drop-shadow(0 0 2px rgba(0,0,0,.9));overflow:visible">
          <path d="M11 1 L20 11 L16 11 L16 31 L6 31 L6 11 L2 11 Z"
            fill="${color}" stroke="black" stroke-width="2" stroke-linejoin="round"/>
        </svg>
        <div style="background:white;border:1.5px solid black;border-radius:6px;
          padding:1px 4px;font-size:10px;font-weight:800;color:black;
          font-family:Arial,sans-serif;white-space:nowrap;margin-top:2px;line-height:1.4">
          ${bf}Bf
        </div>
      </div>`;

      const windIcon = L.divIcon({ html: windHtml, className: '', iconSize: [30, 52], iconAnchor: [15, 16] });
      L.marker([lat, lng], { icon: windIcon, zIndexOffset: 500 })
        .bindTooltip(`💨 ${windSpd} km/h · ${impact}<br/>km ${Math.round(km)} · ETA ${etaLabel}`)
        .addTo(map);

      // ── Rain indicator chip — below the point, so it doesn't collide with the wind arrow above it ──
      const rain = rainChipInfo(source, w.precipMm, w.precipProb);
      if (rain) {
        const rainColor = rain.severity <= 1 ? '#64B5F6' : rain.severity === 2 ? '#1E88E5' : '#0D47A1';
        const rainTextColor = rain.severity >= 3 ? '#fff' : '#000';
        const rainHtml = `<div style="display:flex;align-items:center;gap:2px;background:${rainColor};
          border:1.5px solid black;border-radius:10px;padding:2px 6px;font-size:11px;font-weight:800;
          color:${rainTextColor};font-family:Arial,sans-serif;white-space:nowrap;
          box-shadow:0 1px 3px rgba(0,0,0,.5)">💧${rain.label}</div>`;
        const rainIcon = L.divIcon({ html: rainHtml, className: '', iconSize: [60, 22], iconAnchor: [30, -6] });
        L.marker([lat, lng], { icon: rainIcon, zIndexOffset: 400 })
          .bindTooltip(`${rain.title}<br/>km ${Math.round(km)} · ETA ${etaLabel}`)
          .addTo(map);
      }
    } catch { /* skip this point */ }

    if (i < NUM - 1) await new Promise(r => setTimeout(r, 200));
  }
}

// ── Tile styles — shared between inline map and fullscreen ────────────────────
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

interface BrevetMapProps {
  gpxUrl: string;
  startCoords?: string;
  finishCoords?: string;
  controls?: { km: number; name: string; lat: number; lng: number }[];
  scrubberKm?: number | null;
  startDate?: Date;
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

async function initLeafletMap(
  container:       HTMLDivElement,
  gpxUrl:          string,
  controls:        { km: number; name: string; lat: number; lng: number }[],
  scrollWheelZoom: boolean,
  initialStyleId:  string,
  onCoordsReady?:  (coords: ParsedCoord[]) => void,
  kmLayerRef?:     { current: any[] },
  onMapReady?:     (map: any, L: any) => void,
  onTileReady?:    (tile: any) => void,
): Promise<{ map: any; markerRef: { current: any } }> {
  const L = (await import('leaflet')).default;

  if ((container as any)._leaflet_id) {
    try { (container as any)._leaflet_map?.remove(); } catch {}
    delete (container as any)._leaflet_id;
  }

  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });

  const map = L.map(container, { zoomControl: true, scrollWheelZoom });

  // Default tile layer από το TILE_STYLES
  const defaultStyle = TILE_STYLES.find(s => s.id === initialStyleId) ?? TILE_STYLES[0];
  const tile = L.tileLayer(defaultStyle.url, {
    attribution: defaultStyle.attribution,
    maxZoom:     defaultStyle.maxZoom,
  }).addTo(map);
  if (onTileReady) onTileReady(tile);

  const dotIcon = L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#06b6d4;border:2px solid white;box-shadow:0 0 8px rgba(6,182,212,0.8);"></div>`,
    className: '', iconAnchor: [7, 7],
  });
  const dotMarker = L.marker([0, 0], { icon: dotIcon, opacity: 0 }).addTo(map);
  const markerRef = { current: dotMarker };

  try {
    const response  = await fetch(gpxUrl);
    const gpxText   = await response.text();
    const gpxDoc    = new DOMParser().parseFromString(gpxText, 'text/xml');
    const trackPts  = gpxDoc.querySelectorAll('trkpt');
    const coords:        [number, number][] = [];
    const parsedCoords:  ParsedCoord[]      = [];
    let distKm = 0, prevLat = 0, prevLng = 0;

    trackPts.forEach((pt, i) => {
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

      // Start
      L.marker(coords[0], {
        icon: L.divIcon({
          html: `<div style="width:28px;height:28px;border-radius:50%;
            background:#22c55e;border:2.5px solid #fff;color:#fff;font-size:13px;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 1px 4px rgba(0,0,0,.5)">🚴</div>`,
          className: '', iconSize: [28, 28], iconAnchor: [14, 14],
        }),
      }).addTo(map).bindPopup('Αφετηρία');

      // Finish
      L.marker(coords[coords.length - 1], {
        icon: L.divIcon({
          html: `<div style="width:28px;height:28px;border-radius:50%;
            background:#ef4444;border:2.5px solid #fff;color:#fff;font-size:13px;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 1px 4px rgba(0,0,0,.5)">🏆</div>`,
          className: '', iconSize: [28, 28], iconAnchor: [14, 14],
        }),
      }).addTo(map).bindPopup('Τερματισμός');

      // Control points
      controls.forEach((cp, i) => {
        if (!cp.lat || !cp.lng) return;
        L.marker([cp.lat, cp.lng], {
          icon: L.divIcon({
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

      if (kmLayerRef) {
        buildKmMarkers(L, map, parsedCoords, map.getZoom(), kmLayerRef);
        map.on('zoomend', () => buildKmMarkers(L, map, parsedCoords, map.getZoom(), kmLayerRef!));
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

// ── Wind legend ───────────────────────────────────────────────────────────────
const WIND_LEGEND_ITEMS = [
  { color: '#6EE7B7', label: '< 20 Αύρα' },
  { color: '#FCD34D', label: '20–35 Μέτριος' },
  { color: '#FB923C', label: '35–50 Δυνατός' },
  { color: '#F87171', label: '> 50 Θυελλώδης' },
] as const;

function weatherSourceLabel(source: WeatherSourceId): string {
  return source === 'metno' ? 'Καιρός: 🇳🇴 MET Norway' : 'Καιρός: 🌐 Open-Meteo';
}

// full = below inline map; compact = overlay inside fullscreen
function WindLegend({
  clockwise, showLegend, compact = false, source = null,
}: { clockwise?: boolean | null; showLegend: boolean; compact?: boolean; source?: WeatherSourceId | null }) {
  if (compact) {
    if (!showLegend && clockwise == null && !source) return null;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {showLegend && WIND_LEGEND_ITEMS.map(({ color, label }) => (
          <span key={label}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold
              border backdrop-blur-md"
            style={{ background: 'rgba(10,22,40,0.80)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)' }}>
            <svg width="8" height="12" viewBox="0 0 22 32">
              <path d="M11 1 L20 11 L16 11 L16 31 L6 31 L6 11 L2 11 Z"
                fill={color} stroke="black" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            {label}
          </span>
        ))}
        {clockwise != null && (
          <span className="flex items-center px-2 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-md"
            style={{ background: 'rgba(10,22,40,0.80)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)' }}>
            {clockwise ? '↻ Δεξιόστροφη' : '↺ Αριστερόστροφη'}
          </span>
        )}
        {source && (
          <span className="flex items-center px-2 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-md"
            style={{ background: 'rgba(10,22,40,0.80)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)' }}>
            {weatherSourceLabel(source)}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      {showLegend && (
        <div className="flex flex-wrap items-center justify-between gap-y-1 mt-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
            <span className="text-white/30 font-semibold">🌬️ Άνεμος:</span>
            {WIND_LEGEND_ITEMS.map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1">
                <svg width="10" height="14" viewBox="0 0 22 32">
                  <path d="M11 1 L20 11 L16 11 L16 31 L6 31 L6 11 L2 11 Z"
                    fill={color} stroke="black" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
                {label}
              </span>
            ))}
            {clockwise != null && (
              <span className="ml-1 px-2 py-0.5 rounded-full border border-white/20 text-white/60 font-medium">
                {clockwise ? '↻ Δεξιόστροφη' : '↺ Αριστερόστροφη'}
              </span>
            )}
            {source && (
              <span className="ml-1 px-2 py-0.5 rounded-full border border-white/20 text-white/60 font-medium">
                {weatherSourceLabel(source)}
              </span>
            )}
          </div>
          <p className="text-white/20 text-xs">© OpenStreetMap contributors</p>
        </div>
      )}
      {!showLegend && (
        <p className="text-white/20 text-xs text-right mt-1">© OpenStreetMap contributors</p>
      )}
    </>
  );
}

// ── Tile switcher buttons — reusable (no absolute positioning; caller positions it) ──
function TileSwitcher({
  activeId, mapInstanceRef, tileLayerRef, LRef, onSwitch,
}: {
  activeId:       string;
  mapInstanceRef: React.MutableRefObject<any>;
  tileLayerRef:   React.MutableRefObject<any>;
  LRef:           React.MutableRefObject<any>;
  onSwitch:       (id: string) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {TILE_STYLES.map(style => (
        <button
          key={style.id}
          title={style.tooltip}
          onClick={() => {
            if (!mapInstanceRef.current || !tileLayerRef.current || !LRef.current) return;
            mapInstanceRef.current.removeLayer(tileLayerRef.current);
            tileLayerRef.current = LRef.current.tileLayer(style.url, {
              attribution: style.attribution, maxZoom: style.maxZoom,
            }).addTo(mapInstanceRef.current);
            onSwitch(style.id);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold
            transition-all backdrop-blur-md border"
          style={{
            background:  activeId === style.id ? 'rgba(6,182,212,0.85)' : 'rgba(10,22,40,0.80)',
            borderColor: activeId === style.id ? 'rgba(6,182,212,0.8)'  : 'rgba(255,255,255,0.15)',
            color:       activeId === style.id ? '#000'                  : 'rgba(255,255,255,0.7)',
            boxShadow:   activeId === style.id ? '0 0 12px rgba(6,182,212,0.4)' : 'none',
          }}
        >
          <span>{style.label}</span>
          <span>{style.title}</span>
        </button>
      ))}
    </div>
  );
}

// ── Fullscreen modal ──────────────────────────────────────────────────────────
function FullscreenMap({
  gpxUrl, controls, onClose, climbProfile, storedAscent, initialStyle, startDate,
}: {
  gpxUrl:        string;
  controls:      { km: number; name: string; lat: number; lng: number }[];
  onClose:       () => void;
  climbProfile?: any[];
  storedAscent?: number;
  initialStyle?: string;
  startDate?:    Date;
}) {
  const modalMapRef         = useRef<HTMLDivElement>(null);
  const modalMapInstanceRef = useRef<any>(null);
  const modalDotMarkerRef   = useRef<any>(null);
  const kmLayerRef          = useRef<any[]>([]);
  const fsTileLayerRef      = useRef<any>(null);
  const fsLRef              = useRef<any>(null);

  const [modalCoords,     setModalCoords]     = useState<ParsedCoord[]>([]);
  const [modalScrubberKm, setModalScrubberKm] = useState<number | null>(null);
  const [showChart,       setShowChart]       = useState(true);
  const [fsActiveStyle,   setFsActiveStyle]   = useState(initialStyle ?? DEFAULT_STYLE);
  const [fsWeatherSource, setFsWeatherSource] = useState<WeatherSourceId | null>(null);

  useEffect(() => {
    if (!modalMapRef.current) return;
    let destroyed = false;
    const windAborted = { current: false };
    let capturedCoords: ParsedCoord[] = [];
    initLeafletMap(
      modalMapRef.current, gpxUrl, controls, true, fsActiveStyle,
      coords => { capturedCoords = coords; if (!destroyed) setModalCoords(coords); },
      kmLayerRef, undefined,
      tile => { fsTileLayerRef.current = tile; },
    ).then(async ({ map, markerRef }) => {
      if (destroyed) { map.remove(); return; }
      modalMapInstanceRef.current = map;
      modalDotMarkerRef.current   = markerRef.current;
      fsLRef.current = (await import('leaflet')).default;
      if (startDate && capturedCoords.length > 0 && !destroyed) {
        addWeatherMarkers(map, fsLRef.current, capturedCoords, startDate, windAborted, setFsWeatherSource);
      }
    });
    return () => {
      destroyed = true;
      windAborted.current = true;
      if (modalMapInstanceRef.current) {
        modalMapInstanceRef.current.remove();
        modalMapInstanceRef.current = null;
      }
    };
  }, [gpxUrl]);

  useEffect(() => {
    const marker = modalDotMarkerRef.current;
    if (!marker) return;
    if (modalScrubberKm === null || modalCoords.length === 0) { marker.setOpacity(0); return; }
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
        {/* Κλείσιμο */}
        <button onClick={onClose} title="Κλείσιμο (Esc)"
          className="absolute top-3 right-3 z-[1001] flex items-center gap-1.5 px-2.5 py-1.5
            rounded-lg text-xs font-bold border backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(10,22,40,0.85)', borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4' }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
          </svg>
          Κλείσιμο
        </button>

        {/* Toggle chart */}
        <button onClick={() => setShowChart(s => !s)}
          className="absolute z-[1001] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
            text-xs font-bold border backdrop-blur-sm transition-all"
          style={{
            bottom: showChart ? 'calc(42% + 8px)' : 12, right: 12,
            backgroundColor: showChart ? 'rgba(6,182,212,0.85)' : 'rgba(10,22,40,0.85)',
            borderColor:     showChart ? 'rgba(6,182,212,0.6)'  : 'rgba(6,182,212,0.4)',
            color:           showChart ? '#000' : '#06b6d4',
          }}>
          ⛰️ {showChart ? 'Κλείσιμο γραφήματος' : 'Υψομετρικό'}
        </button>

        {/* Map */}
        <div ref={modalMapRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Tile switcher + wind legend row */}
        <div className="absolute bottom-4 left-4 z-[1001] flex flex-wrap items-center gap-3">
          <TileSwitcher
            activeId={fsActiveStyle}
            mapInstanceRef={modalMapInstanceRef}
            tileLayerRef={fsTileLayerRef}
            LRef={fsLRef}
            onSwitch={setFsActiveStyle}
          />
          <WindLegend
            compact
            showLegend={!!startDate}
            clockwise={startDate ? detectClockwise(modalCoords) : undefined}
            source={fsWeatherSource}
          />
        </div>

        {/* Elevation panel */}
        {showChart && (
          <div className="absolute bottom-0 left-0 right-0 z-[1000]"
            style={{
              background: 'linear-gradient(to top, rgba(10,22,40,0.65) 0%, rgba(10,22,40,0.40) 75%, rgba(10,22,40,0.10) 100%)',
              backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(12px)',
              borderTop: '1px solid rgba(6,182,212,0.15)',
              padding: '16px 20px 12px', maxHeight: '42%', overflowY: 'auto',
            }}>
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

// ── Main component ────────────────────────────────────────────────────────────
export default function BrevetMap({
  gpxUrl, startCoords, finishCoords, controls = [], scrubberKm, startDate,
}: BrevetMapProps) {
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const dotMarkerRef   = useRef<any>(null);
  const initializedRef = useRef(false);
  const kmLayerRef     = useRef<any[]>([]);
  const tileLayerRef   = useRef<any>(null);
  const LRef           = useRef<any>(null);
  const windAbortRef   = useRef(false);

  const [parsedCoords, setParsedCoords] = useState<ParsedCoord[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeStyle,  setActiveStyle]  = useState<string>(DEFAULT_STYLE);
  const [mapReady,     setMapReady]     = useState(false);
  const [clockwise,    setClockwise]    = useState<boolean | null>(null);
  const [weatherSource, setWeatherSource] = useState<WeatherSourceId | null>(null);

  const toggleFullscreen = useCallback(() => setIsFullscreen(f => !f), []);

  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return;
    initializedRef.current = true;
    initLeafletMap(
      mapRef.current, gpxUrl, controls, false, DEFAULT_STYLE,
      coords => { setParsedCoords(coords); setClockwise(detectClockwise(coords)); },
      kmLayerRef, undefined,
      tile => { tileLayerRef.current = tile; },
    ).then(async ({ map, markerRef }) => {
      mapInstanceRef.current = map;
      dotMarkerRef.current   = markerRef.current;
      LRef.current = (await import('leaflet')).default;
      setMapReady(true);
    });
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        initializedRef.current = false;
        setMapReady(false);
      }
    };
  }, [gpxUrl]);

  useEffect(() => {
    if (!mapReady || !startDate || parsedCoords.length === 0) return;
    const map = mapInstanceRef.current;
    const L   = LRef.current;
    if (!map || !L) return;
    windAbortRef.current = false;
    addWeatherMarkers(map, L, parsedCoords, startDate, windAbortRef, setWeatherSource);
    return () => { windAbortRef.current = true; };
  }, [mapReady, startDate, parsedCoords]);

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
          initialStyle={activeStyle}
          startDate={startDate}
        />
      )}

      {/* Map — relative div contains only the map + absolutely-positioned overlays */}
      <div className="relative" style={{ visibility: isFullscreen ? 'hidden' : 'visible' }}>
        <div
          ref={mapRef}
          style={{ height: '400px', width: '100%', isolation: 'isolate' }}
          className="rounded-xl overflow-hidden border border-white/10"
        />

        <div className="absolute bottom-3 left-3 z-[1000]">
          <TileSwitcher
            activeId={activeStyle}
            mapInstanceRef={mapInstanceRef}
            tileLayerRef={tileLayerRef}
            LRef={LRef}
            onSwitch={setActiveStyle}
          />
        </div>

        <button onClick={toggleFullscreen} title="Πλήρης οθόνη"
          className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1.5
            rounded-lg text-xs font-bold border backdrop-blur-sm transition-all hover:brightness-110"
          style={{ backgroundColor: 'rgba(10,22,40,0.85)', borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4' }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
          </svg>
          Πλήρης οθόνη
        </button>
      </div>

      {/* Legend + attribution — outside the relative div so it never shifts tile buttons */}
      <WindLegend clockwise={startDate ? clockwise : undefined} showLegend={!!startDate} source={weatherSource} />
    </>
  );
}
