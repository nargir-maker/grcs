'use client';

// ── /brevets/overview ────────────────────────────────────────────────────────
// One map showing every 2026 brevet route at once, color-coded by distance,
// with a clickable route list that highlights a single route on the map.

import { useEffect, useRef, useState } from 'react';
import { db } from '@/app/lib/firebase';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { usePageEnabled, ComingSoon } from '@/app/lib/usePageEnabled';
import { TILE_STYLES, DEFAULT_STYLE, TileSwitcher } from '@/app/components/BrevetMap';
import PageViews from '@/app/components/PageViews';

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

type Club = 'lepote' | 'har' | 'both';

interface RouteInfo {
  id: string;
  title: string;
  distance: number;
  start: string;
  gpxUrl: string;
  club: Club;
  organizerId: string;
  coOrganizerId: string;
  certification: string;
  coords: [number, number][] | null; // null = not yet fetched, [] = failed
}

// Same club-detection rule as RegistrationForm.tsx: a co-organizer means both
// clubs homologate it; otherwise the certification field decides ACP/ΛΕΠΟΤΕ vs HAR.
function deriveClub(certification: string, coOrganizerId: string): Club {
  const cert     = certification.toUpperCase().replaceAll('.', '').trim();
  const hasCoOrg = !!(coOrganizerId && coOrganizerId !== '0');
  const isHAR    = cert.includes('HAR');
  return hasCoOrg ? 'both' : isHAR ? 'har' : 'lepote';
}

// Same asset convention as BrevetCard.tsx / brevets/[id]/page.tsx: a co-organizer
// gets the combined "both.png" badge, otherwise the club decides ACP/ΛΕΠΟΤΕ vs HAR.
function homologationBadge(club: Club, certification: string): { logo: string; label: string } {
  if (club === 'both') return { logo: '/logos/both.png',    label: 'ΛΕ.ΠΟ.Τ.Ε. + HAR' };
  if (club === 'har')  return { logo: '/logos/659999.png',  label: certification || 'H.A.R.' };
  return                       { logo: '/logos/650000.png', label: certification || 'A.C.P.' };
}

const CLUB_FILTERS: { id: 'all' | 'har' | 'lepote'; label: string }[] = [
  { id: 'all',    label: 'Όλα' },
  { id: 'lepote', label: 'ΛΕ.ΠΟ.Τ.Ε.' },
  { id: 'har',    label: 'HAR' },
];

function matchesClubFilter(club: Club, filter: 'all' | 'har' | 'lepote'): boolean {
  if (filter === 'all')    return true;
  if (filter === 'har')    return club === 'har'    || club === 'both';
  return club === 'lepote' || club === 'both';
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
  const tileLayerRef   = useRef<any>(null);
  const polylinesRef   = useRef<Record<string, any>>({});
  const fetchStartedRef = useRef(false);
  const fittedRef      = useRef(false);
  const prevFilterRef  = useRef<'all' | 'har' | 'lepote'>('all');

  const [routes, setRoutes]       = useState<RouteInfo[]>([]);
  const [pending, setPending]     = useState(0);
  const [mapReady, setMapReady]   = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clubFilter, setClubFilter] = useState<'all' | 'har' | 'lepote'>('all');
  const [activeStyle, setActiveStyle] = useState<string>(DEFAULT_STYLE);
  const [clubNames, setClubNames] = useState<Record<string, string>>({});

  const enabled = usePageEnabled('brevets-overview');

  // Fetch all 2026_* brevet docs (doc IDs are "{year}_{startCity}_{km}_{organizerId}")
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [snap, clubsSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'all_brevets'),
          where(documentId(), '>=', `${YEAR}_`),
          where(documentId(), '<', `${YEAR + 1}_`),
        )),
        getDocs(collection(db, 'clubs')),
      ]);
      const names: Record<string, string> = {};
      clubsSnap.forEach(doc => {
        const d = doc.data();
        names[doc.id] = d.CLUB_NAME_SHORT_EN || d.CLUB_NAME_SHORT_GR || doc.id;
      });
      const list: RouteInfo[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        const info  = d.info  || {};
        const route = d.route || {};
        const gpxUrl = route.gpxUrl?.toString() ?? '';
        if (!gpxUrl) return;
        const certification = info.certification?.toString() ?? '';
        const coOrganizerId = info.coOrganizerId?.toString() ?? '';
        list.push({
          id:       doc.id,
          title:    info.title?.toString() ?? doc.id,
          distance: parseInt(info.distance?.toString() ?? '0') || 0,
          start:    route.start?.toString() ?? '',
          gpxUrl,
          club:     deriveClub(certification, coOrganizerId),
          organizerId: info.organizerId?.toString() ?? '',
          coOrganizerId,
          certification,
          coords:   null,
        });
      });
      list.sort((a, b) => a.distance - b.distance || a.title.localeCompare(b.title, 'el'));
      if (!cancelled) { setRoutes(list); setClubNames(names); setDocsLoaded(true); }
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
      const defaultTile = TILE_STYLES.find(s => s.id === DEFAULT_STYLE) ?? TILE_STYLES[0];
      tileLayerRef.current = L.tileLayer(defaultTile.url, {
        attribution: defaultTile.attribution, maxZoom: defaultTile.maxZoom,
      }).addTo(map);
      LRef.current   = L;
      mapRef.current = map;
      setMapReady(true);
    })();
    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [enabled]);

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

  // Show only the routes matching the club filter; drop the selection if it
  // falls outside the current filter.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const routeById = new Map(routes.map(r => [r.id, r]));
    Object.entries(polylinesRef.current).forEach(([id, pl]) => {
      const r = routeById.get(id);
      const visible = !r || matchesClubFilter(r.club, clubFilter);
      const onMap = map.hasLayer(pl);
      if (visible && !onMap) pl.addTo(map);
      if (!visible && onMap) map.removeLayer(pl);
    });
    if (selectedId) {
      const r = routeById.get(selectedId);
      if (r && !matchesClubFilter(r.club, clubFilter)) setSelectedId(null);
    }
  }, [clubFilter, routes, selectedId]);

  // Re-fit the map to whatever's visible, but only on an actual filter change
  // — not on every GPX arrival, which would otherwise re-zoom constantly.
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    if (prevFilterRef.current === clubFilter) return;
    prevFilterRef.current = clubFilter;
    const visiblePls = Object.values(polylinesRef.current).filter((pl: any) => map.hasLayer(pl));
    if (visiblePls.length > 0) {
      const group = L.featureGroup(visiblePls);
      map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }
  }, [clubFilter]);

  // Esc exits fullscreen; lock page scroll while fullscreen is open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', handler);
    const prevOverflow = document.body.style.overflow;
    if (isFullscreen) document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // Leaflet needs a nudge once its container's size actually changes
  useEffect(() => {
    const id = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    return () => clearTimeout(id);
  }, [isFullscreen]);

  if (enabled === null) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (enabled === false) return <ComingSoon label="Χάρτης διαδρομών" />;

  const filteredRoutes = routes.filter(r => matchesClubFilter(r.club, clubFilter));
  const grouped = DISTANCE_COLORS.map(bucket => ({
    ...bucket,
    routes: filteredRoutes.filter(r => colorForDistance(r.distance) === bucket.color),
  })).filter(b => b.routes.length > 0);

  const selectedRoute = selectedId ? routes.find(r => r.id === selectedId) ?? null : null;
  const isCoOrg = !!(selectedRoute && selectedRoute.coOrganizerId && selectedRoute.coOrganizerId !== '0');
  const organizerLogo = isCoOrg ? '/logos/both.png' : `/logos/${selectedRoute?.organizerId}.png`;
  const organizerName = isCoOrg ? 'Συνδιοργάνωση' : (clubNames[selectedRoute?.organizerId ?? ''] ?? selectedRoute?.organizerId ?? '');
  const badge = selectedRoute ? homologationBadge(selectedRoute.club, selectedRoute.certification) : null;

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
                ? `${clubFilter === 'all' ? routes.length : filteredRoutes.length} brevets · ${pending > 0 ? `φόρτωση ${routes.length - pending}/${routes.length}…` : 'όλες οι διαδρομές φορτώθηκαν'}`
                : 'Φόρτωση διαδρομών…'}
            </p>
          </div>
        </div>

        <div
          className={isFullscreen ? 'fixed inset-0 z-50 bg-[#0A1628]' : 'flex flex-col lg:flex-row gap-4'}
        >
          {/* ── Route list ── */}
          <div
            className={
              isFullscreen
                ? 'absolute top-20 left-4 bottom-4 z-10 w-72 rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl backdrop-blur-md'
                : 'lg:w-72 shrink-0 rounded-2xl border border-white/10 overflow-hidden flex flex-col'
            }
            style={{
              background: isFullscreen ? 'rgba(10,22,40,0.72)' : 'rgba(255,255,255,0.03)',
              maxHeight: isFullscreen ? undefined : 640,
            }}
          >
            {/* ── Club filter ── */}
            <div className="flex items-center gap-1 p-2 border-b border-white/10">
              {CLUB_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setClubFilter(f.id)}
                  className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                  style={{
                    background: clubFilter === f.id ? 'rgba(6,182,212,0.2)' : 'transparent',
                    color:      clubFilter === f.id ? '#06b6d4' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

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
                    style={{ background: isFullscreen ? 'rgba(10,22,40,0.85)' : 'rgba(10,22,40,0.92)', color: bucket.color }}
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
          <div
            className={
              isFullscreen
                ? 'absolute inset-0'
                : 'flex-1 relative rounded-2xl overflow-hidden border border-white/10'
            }
            style={{ height: isFullscreen ? '100%' : 640, isolation: 'isolate' }}
          >
            <div ref={mapDivRef} style={{ height: '100%', width: '100%' }} />

            <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
              <TileSwitcher
                activeId={activeStyle}
                mapInstanceRef={mapRef}
                tileLayerRef={tileLayerRef}
                LRef={LRef}
                onSwitch={setActiveStyle}
              />

              <button
                onClick={() => setIsFullscreen(f => !f)}
                title={isFullscreen ? 'Έξοδος από πλήρη οθόνη (Esc)' : 'Πλήρης οθόνη'}
                className="flex items-center gap-1.5 px-2.5 py-1.5
                  rounded-lg text-xs font-bold border backdrop-blur-sm transition-all hover:brightness-110"
                style={{ backgroundColor: 'rgba(10,22,40,0.85)', borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4' }}
              >
                {isFullscreen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
                  </svg>
                )}
                {isFullscreen ? 'Έξοδος' : 'Πλήρης οθόνη'}
              </button>
            </div>

            {selectedRoute && badge && (
              <div
                className="absolute top-16 right-3 z-[1000] rounded-lg border backdrop-blur-sm px-3 py-2 space-y-2"
                style={{ backgroundColor: 'rgba(10,22,40,0.85)', borderColor: 'rgba(6,182,212,0.4)' }}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={organizerLogo}
                    alt={organizerName}
                    width={56}
                    height={56}
                    className="rounded-full object-cover shrink-0"
                    style={{ width: 56, height: 56 }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/logos/000000.png'; }}
                  />
                  <div className="leading-tight">
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wide">Διοργανωτής</div>
                    <div className="text-xs font-semibold text-white truncate max-w-[160px]">{organizerName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={badge.logo}
                    alt={badge.label}
                    width={56}
                    height={56}
                    className="rounded-full object-cover shrink-0"
                    style={{ width: 56, height: 56 }}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/logos/000000.png'; }}
                  />
                  <div className="leading-tight">
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wide">Φορέας</div>
                    <div className="text-xs font-semibold text-white truncate max-w-[160px]">{badge.label}</div>
                  </div>
                </div>
              </div>
            )}
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

        <PageViews page="brevets-overview" />
      </div>
    </div>
  );
}
