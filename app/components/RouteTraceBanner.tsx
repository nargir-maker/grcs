'use client';

// ── RouteTraceBanner.tsx ──────────────────────────────────────────────────────
// No-photo fallback for brevet cards / the brevet detail hero: draws the GPX
// route trace plus an elevation-profile silhouette as a decorative banner,
// mirroring the Flutter app's RouteBanner widget.

import { useEffect, useRef, useState } from 'react';

interface RawPt { lat: number; lon: number; ele: number; distKm: number; }

const gpxCache = new Map<string, Promise<RawPt[] | null>>();

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchGpx(gpxUrl: string): Promise<RawPt[] | null> {
  try {
    const res = await fetch(gpxUrl);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    const trkpts = doc.querySelectorAll('trkpt');
    if (trkpts.length === 0) return null;
    const pts: RawPt[] = [];
    let prevLat = 0, prevLon = 0, distKm = 0;
    trkpts.forEach((pt, i) => {
      const lat = parseFloat(pt.getAttribute('lat') ?? '');
      const lon = parseFloat(pt.getAttribute('lon') ?? '');
      if (isNaN(lat) || isNaN(lon)) return;
      const ele = parseFloat(pt.querySelector('ele')?.textContent ?? '0') || 0;
      if (i > 0 && prevLat !== 0) distKm += haversineKm(prevLat, prevLon, lat, lon);
      prevLat = lat; prevLon = lon;
      pts.push({ lat, lon, ele, distKm });
    });
    return pts.length >= 2 ? pts : null;
  } catch {
    return null;
  }
}

function getGpx(gpxUrl: string): Promise<RawPt[] | null> {
  let cached = gpxCache.get(gpxUrl);
  if (!cached) {
    cached = fetchGpx(gpxUrl);
    gpxCache.set(gpxUrl, cached);
  }
  return cached;
}

function simplify<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

const VB_W = 400;
const VB_H = 300;
const ELEV_BASE_Y = VB_H;
const ELEV_PEAK_Y = VB_H * 0.28; // tallest peak reaches ~28% from the top
const ROUTE_PAD = 22;

function buildRoutePath(points: RawPt[]): { path: string; start: [number, number]; end: [number, number] } {
  const meanLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const cosLat = Math.cos((meanLat * Math.PI) / 180) || 1;
  const xy = points.map((p): [number, number] => [p.lon * cosLat, -p.lat]);
  const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(1e-9, maxX - minX);
  const spanY = Math.max(1e-9, maxY - minY);
  const scale = Math.max((VB_W - ROUTE_PAD * 2) / spanX, (VB_H * 0.72 - ROUTE_PAD * 2) / spanY);
  const offX = (VB_W - spanX * scale) / 2 - minX * scale;
  const offY = (VB_H * 0.62 - spanY * scale) / 2 - minY * scale;
  const px = xy.map(([x, y]): [number, number] => [offX + x * scale, offY + y * scale]);
  const path = px.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return { path, start: px[0], end: px[px.length - 1] };
}

function buildElevationPath(points: RawPt[]): { area: string; ridge: string } | null {
  const totalKm = points[points.length - 1].distKm;
  if (totalKm <= 0) return null;
  const bins = 120;
  const binMax = new Array(bins).fill(-Infinity);
  points.forEach((p) => {
    let bin = Math.floor((p.distKm / totalKm) * bins);
    if (bin >= bins) bin = bins - 1;
    if (bin < 0) bin = 0;
    if (p.ele > binMax[bin]) binMax[bin] = p.ele;
  });
  // fill empty bins by interpolating neighbors, then light smoothing
  let last = binMax.find((v) => v !== -Infinity) ?? 0;
  for (let i = 0; i < bins; i++) {
    if (binMax[i] === -Infinity) binMax[i] = last; else last = binMax[i];
  }
  const smoothed = binMax.map((_, i) => {
    const w = [binMax[Math.max(0, i - 2)], binMax[Math.max(0, i - 1)], binMax[i], binMax[Math.min(bins - 1, i + 1)], binMax[Math.min(bins - 1, i + 2)]];
    return w.reduce((a, b) => a + b, 0) / w.length;
  });
  const minEle = Math.min(...smoothed), maxEle = Math.max(...smoothed);
  const eleRange = Math.max(1, maxEle - minEle);
  const toY = (ele: number) => ELEV_BASE_Y - ((ele - minEle) / eleRange) * (ELEV_BASE_Y - ELEV_PEAK_Y);
  const toX = (i: number) => (i / (bins - 1)) * VB_W;
  const ridgePts = smoothed.map((ele, i) => [toX(i), toY(ele)] as [number, number]);
  const ridge = ridgePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `M0,${ELEV_BASE_Y} ${ridgePts.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} L${VB_W},${ELEV_BASE_Y} Z`;
  return { area, ridge };
}

interface Built {
  routePath: string;
  start: [number, number];
  end: [number, number];
  elevation: { area: string; ridge: string } | null;
}

export default function RouteTraceBanner({ gpxUrl }: { gpxUrl: string }) {
  const [built, setBuilt] = useState<Built | null>(null);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisible(true);
        obs.disconnect();
      }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !gpxUrl) return;
    let cancelled = false;
    getGpx(gpxUrl).then((points) => {
      if (cancelled || !points) return;
      const route = buildRoutePath(simplify(points, 300));
      const elevation = buildElevationPath(points);
      setBuilt({ routePath: route.path, start: route.start, end: route.end, elevation });
    });
    return () => { cancelled = true; };
  }, [visible, gpxUrl]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" style={{ background: '#0d1f33' }}>
      {built && (
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <filter id="route-trace-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            <linearGradient id="route-trace-elev-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3a6690" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#13304f" stopOpacity={0.95} />
            </linearGradient>
          </defs>

          {built.elevation && (
            <>
              <path d={built.elevation.area} fill="url(#route-trace-elev-grad)" />
              <path d={built.elevation.ridge} fill="none" stroke="rgba(150,195,235,0.55)" strokeWidth={1.5} />
            </>
          )}

          <path d={built.routePath} fill="none" stroke="rgba(0,0,0,0.65)" strokeWidth={7}
            strokeLinecap="round" strokeLinejoin="round" filter="url(#route-trace-glow)" />
          <path d={built.routePath} fill="none" stroke="#FFAB40" strokeOpacity={0.4} strokeWidth={5}
            strokeLinecap="round" strokeLinejoin="round" filter="url(#route-trace-glow)" />
          <path d={built.routePath} fill="none" stroke="#FFAB40" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={built.start[0]} cy={built.start[1]} r={5} fill="#22c55e" stroke="white" strokeWidth={1.5} />
          <circle cx={built.end[0]} cy={built.end[1]} r={5} fill="#ef4444" stroke="white" strokeWidth={1.5} />
        </svg>
      )}
    </div>
  );
}
