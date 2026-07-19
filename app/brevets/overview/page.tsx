'use client';

// ── /brevets/overview ────────────────────────────────────────────────────────
// One map showing every 2026 brevet route at once, color-coded by distance,
// with a clickable route list that highlights a single route on the map.

import { useEffect, useRef, useState } from 'react';
import { db } from '@/app/lib/firebase';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { usePageEnabled, ComingSoon } from '@/app/lib/usePageEnabled';

const YEAR = 2026;

// Same distance→color convention as the mobile app's history chart, kept in
// sync across both platforms.
const DISTANCE_COLORS: { max: number; color: string; label: string }[] = [
  { max: 200,  color: '#1E88E5', label: '200 km' },
  { max: 300,  color: '#43A047', label: '300 km' },
  { max: 400,  color: '#7986CB', label: '400 km' },
  { max: 600,  color: '#EF6C00', label: '600 km' },
  { max: Infinity, color: '#7E57C2', label: '1000+ km' },
];

function colorForDistance(km: number): string {
  return (DISTANCE_COLORS.find(b => km <= b.max) ?? DISTANCE_COLORS[DISTANCE_COLORS.length - 1]).color;
}

interface RouteInfo {
  id: string;
  title: string;
  distance: number;
  start: string;
  gpxUrl: string;
  coords: [number, number][] | null; // null = not yet fetched, [] = failed
}

// Keep each polyline light — an overview map doesn't need full GPS precision.
function decimate<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

async function fetchRouteCoords(gpxUrl: string): Promise<[number, number][]> {
  const res = await fetch(gpxUrl);
  const text = await res.text();
  const gpxDoc = new DOMParser().parseFromString(text, 'text/xml');
  const pts = gpxDoc.querySelectorAll('trkpt');
  const coords: [number, number][] = [];
  pts.forEach(pt => {
    const lat = parseFloat(pt.getAttribute('lat') ?? '0');
    const lng = parseFloat(pt.getAttribute('lon') ?? '0');
    if (lat && lng) coords.push([lat, lng]);
  });
  return decimate(coords, 400);
}

export default function BrevetsOverviewPage() {
  const mapDivRef      = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<any>(null);
  const LRef           = useRef<any>(null);
  const polylinesRef   = useRef<Record<string, any>>({});
  const fetchStartedRef = useRef(false);
  const fittedRef      = useRef(false);

  const [routes, setRoutes]       = useState<RouteInfo[]>([]);
  const [pending, setPending]     = useState(0);
  const [mapReady, setMapReady]   = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [docsLoaded, setDocsLoaded] = useState(false);

  const enabled = usePageEnabled('brevets-overview');

  // Fetch all 2026_* brevet docs (doc IDs are "{year}_{startCity}_{km}_{organizerId}")
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = query(
        collection(db, 'all_brevets'),
        where(documentId(), '>=', `${YEAR}_`),
        where(documentId(), '<', `${YEAR + 1}_`),
      );
      const snap = await getDocs(q);
      const list: RouteInfo[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        const info  = d.info  || {};
        const route = d.route || {};
        const gpxUrl = route.gpxUrl?.toString() ?? '';
        if (!gpxUrl) return;
        list.push({
          id:       doc.id,
          title:    info.title?.toString() ?? doc.id,
          distance: parseInt(info.distance?.toString() ?? '0') || 0,
          start:    route.start?.toString() ?? '',
          gpxUrl,
          coords:   null,
        });
      });
      list.sort((a, b) => a.distance - b.distance || a.title.localeCompare(b.title, 'el'));
      if (!cancelled) { setRoutes(list); setDocsLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Init the Leaflet map once
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    let destroyed = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (destroyed || !mapDivRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      const map = L.map(mapDivRef.current, { zoomControl: true }).setView([38.5, 23.0], 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);
      LRef.current   = L;
      mapRef.current = map;
      setMapReady(true);
    })();
    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Kick off GPX fetches once, after the doc list arrives
  useEffect(() => {
    if (!docsLoaded || fetchStartedRef.current || routes.length === 0) return;
    fetchStartedRef.current = true;
    setPending(routes.length);
    routes.forEach(r => {
      fetchRouteCoords(r.gpxUrl)
        .then(coords => setRoutes(prev => prev.map(p => p.id === r.id ? { ...p, coords } : p)))
        .catch(() => setRoutes(prev => prev.map(p => p.id === r.id ? { ...p, coords: [] } : p)))
        .finally(() => setPending(c => c - 1));
    });
  }, [docsLoaded, routes]);

  // Draw each route's polyline as its GPX arrives
  useEffect(() => {
    if (!mapReady) return;
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;

    routes.forEach(r => {
      if (!r.coords || r.coords.length === 0 || polylinesRef.current[r.id]) return;
      const pl = L.polyline(r.coords, {
        color: colorForDistance(r.distance), weight: 2.5, opacity: 0.55,
      }).addTo(map);
      pl.bindTooltip(`${r.title} — ${r.distance} km`, { sticky: true });
      pl.on('click', () => setSelectedId(prev => prev === r.id ? null : r.id));
      polylinesRef.current[r.id] = pl;
    });

    if (!fittedRef.current && pending === 0 && Object.keys(polylinesRef.current).length > 0) {
      fittedRef.current = true;
      const group = L.featureGroup(Object.values(polylinesRef.current));
      map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }
  }, [routes, mapReady, pending]);

  // Highlight the selected route, dim the rest
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    Object.entries(polylinesRef.current).forEach(([id, pl]) => {
      if (selectedId === null) {
        pl.setStyle({ opacity: 0.55, weight: 2.5 });
      } else if (id === selectedId) {
        pl.setStyle({ opacity: 1, weight: 5 });
        pl.bringToFront();
      } else {
        pl.setStyle({ opacity: 0.12, weight: 2 });
      }
    });
    if (selectedId) {
      const pl = polylinesRef.current[selectedId];
      if (pl) map.fitBounds(pl.getBounds(), { padding: [40, 40] });
    }
  }, [selectedId]);

  if (enabled === null) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (enabled === false) return <ComingSoon label="Χάρτης διαδρομών" />;

  const grouped = DISTANCE_COLORS.map(bucket => ({
    ...bucket,
    routes: routes.filter(r => colorForDistance(r.distance) === bucket.color),
  })).filter(b => b.routes.length > 0);

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />

      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <a href="/brevets" className="text-cyan-400/70 text-xs font-bold no-underline hover:text-cyan-400">
              ← Πίσω στο ημερολόγιο
            </a>
            <h1 className="text-3xl font-bold text-white mt-2 mb-1">
              🗺️ Όλες οι διαδρομές {YEAR}
            </h1>
            <p className="text-white/50 text-sm">
              {routes.length > 0
                ? `${routes.length} brevets · ${pending > 0 ? `φόρτωση ${routes.length - pending}/${routes.length}…` : 'όλες οι διαδρομές φορτώθηκαν'}`
                : 'Φόρτωση διαδρομών…'}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* ── Route list ── */}
          <div
            className="lg:w-72 shrink-0 rounded-2xl border border-white/10 overflow-hidden flex flex-col"
            style={{ background: 'rgba(255,255,255,0.03)', maxHeight: 640 }}
          >
            {selectedId && (
              <button
                onClick={() => setSelectedId(null)}
                className="text-xs font-bold px-4 py-3 text-left text-cyan-400 hover:bg-cyan-500/10 border-b border-white/10"
              >
                ✕ Καθαρισμός επιλογής — εμφάνιση όλων
              </button>
            )}
            <div className="overflow-y-auto flex-1">
              {grouped.map(bucket => (
                <div key={bucket.label}>
                  <div
                    className="sticky top-0 flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wide"
                    style={{ background: 'rgba(10,22,40,0.92)', color: bucket.color }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: bucket.color }} />
                    {bucket.label}
                    <span className="text-white/30 font-normal normal-case">({bucket.routes.length})</span>
                  </div>
                  {bucket.routes.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(prev => prev === r.id ? null : r.id)}
                      className="w-full text-left px-4 py-2 text-xs border-b border-white/5 transition-colors"
                      style={{
                        background: selectedId === r.id ? 'rgba(6,182,212,0.15)' : 'transparent',
                        color:      selectedId === r.id ? '#fff' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      <div className="font-semibold truncate">{r.title}</div>
                      <div className="text-white/35 truncate">{r.start}</div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ── Map ── */}
          <div className="flex-1 rounded-2xl overflow-hidden border border-white/10" style={{ height: 640 }}>
            <div ref={mapDivRef} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-white/50">
          <span className="text-white/30 font-semibold">Απόσταση:</span>
          {DISTANCE_COLORS.map(b => (
            <span key={b.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: b.color }} />
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
