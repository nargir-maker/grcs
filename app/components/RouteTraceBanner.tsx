'use client';

// ── RouteTraceBanner.tsx ──────────────────────────────────────────────────────
// No-photo fallback for BrevetCard: draws the GPX route trace as a decorative
// card background, mirroring the Flutter app's RouteBanner widget.

import { useEffect, useRef, useState } from 'react';

type LatLon = [number, number];

const routeCache = new Map<string, Promise<LatLon[] | null>>();

async function fetchRoutePoints(gpxUrl: string): Promise<LatLon[] | null> {
  try {
    const res = await fetch(gpxUrl);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    const trkpts = doc.querySelectorAll('trkpt');
    if (trkpts.length === 0) return null;
    const pts: LatLon[] = [];
    trkpts.forEach((pt) => {
      const lat = parseFloat(pt.getAttribute('lat') ?? '');
      const lon = parseFloat(pt.getAttribute('lon') ?? '');
      if (!isNaN(lat) && !isNaN(lon)) pts.push([lat, lon]);
    });
    return pts.length >= 2 ? pts : null;
  } catch {
    return null;
  }
}

function getRoutePoints(gpxUrl: string): Promise<LatLon[] | null> {
  let cached = routeCache.get(gpxUrl);
  if (!cached) {
    cached = fetchRoutePoints(gpxUrl);
    routeCache.set(gpxUrl, cached);
  }
  return cached;
}

function simplify(points: LatLon[], maxPoints: number): LatLon[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const out: LatLon[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

interface Projected {
  path: string;
  start: [number, number];
  end: [number, number];
}

const VB_W = 400;
const VB_H = 300;

function project(points: LatLon[]): Projected {
  const meanLat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cosLat = Math.cos((meanLat * Math.PI) / 180) || 1;
  const xy: [number, number][] = points.map(([lat, lon]) => [lon * cosLat, -lat]);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(1e-9, maxX - minX);
  const spanY = Math.max(1e-9, maxY - minY);
  // "cover" fit: scale so the route fills the whole viewBox (overflow crops via preserveAspectRatio="slice")
  const scale = Math.max(VB_W / spanX, VB_H / spanY);
  const offX = (VB_W - spanX * scale) / 2 - minX * scale;
  const offY = (VB_H - spanY * scale) / 2 - minY * scale;
  const toPx = ([x, y]: [number, number]): [number, number] => [offX + x * scale, offY + y * scale];
  const px = xy.map(toPx);
  const path = px.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return { path, start: px[0], end: px[px.length - 1] };
}

export default function RouteTraceBanner({ gpxUrl }: { gpxUrl: string }) {
  const [projected, setProjected] = useState<Projected | null>(null);
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
    getRoutePoints(gpxUrl).then((points) => {
      if (cancelled || !points) return;
      setProjected(project(simplify(points, 250)));
    });
    return () => { cancelled = true; };
  }, [visible, gpxUrl]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" style={{ background: '#0d1f33' }}>
      {projected && (
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <filter id="route-trace-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <path d={projected.path} fill="none" stroke="rgba(0,0,0,0.65)" strokeWidth={7}
            strokeLinecap="round" strokeLinejoin="round" filter="url(#route-trace-glow)" />
          <path d={projected.path} fill="none" stroke="#FFAB40" strokeOpacity={0.4} strokeWidth={5}
            strokeLinecap="round" strokeLinejoin="round" filter="url(#route-trace-glow)" />
          <path d={projected.path} fill="none" stroke="#FFAB40" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={projected.start[0]} cy={projected.start[1]} r={5} fill="#22c55e" stroke="white" strokeWidth={1.5} />
          <circle cx={projected.end[0]} cy={projected.end[1]} r={5} fill="#ef4444" stroke="white" strokeWidth={1.5} />
        </svg>
      )}
    </div>
  );
}
