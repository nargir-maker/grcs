'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { BubbleItem } from '../components/BubbleChart';
import BrevetSpotlightCarousel from '../components/BrevetSpotlightCarousel';
import PageViews from '../components/PageViews';

const BubbleChart = dynamic(() => import('../components/BubbleChart'), { ssr: false });

interface RouteEntry {
  key: string;
  name: string;
  distance: number;
  organizer: string;
  participants: number;
  editions: number;
  firstYear: string;
  lastYear: string;
}

interface UniverseData {
  totalRoutes: number;
  totalParticipations: number;
  ranking: RouteEntry[];
}

const DIST_OPTIONS = [0, 200, 300, 400, 600, 1000] as const;
type DistFilter = typeof DIST_OPTIONS[number];

function distLabel(d: DistFilter) {
  if (d === 0)    return 'Όλες';
  if (d === 1000) return '1000+';
  return `${d} χλμ`;
}

function distBadgeColor(d: number) {
  if (d <= 200)  return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  if (d <= 300)  return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  if (d <= 400)  return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
  if (d <= 600)  return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
}

function rankColor(rank: number) {
  if (rank === 1) return 'text-amber-400';
  if (rank === 2) return 'text-slate-300';
  if (rank === 3) return 'text-orange-400';
  if (rank <= 5)  return 'text-cyan-400';
  return 'text-white/50';
}

function matchesDist(d: number, filter: DistFilter) {
  if (filter === 0)    return true;
  if (filter === 1000) return d >= 1000;
  return d === filter;
}

export default function BrevetUniversePage() {
  const [data, setData]         = useState<UniverseData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [distFilter, setDistFilter] = useState<DistFilter>(0);

  useEffect(() => {
    fetch('/api/brevet-universe')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = (data?.ranking ?? []).filter(r => matchesDist(r.distance, distFilter));

  const bubbleItems: BubbleItem[] = filtered
    .slice(0, 30)
    .map((r, i) => ({
      id:       r.key,
      label:    r.name,
      sublabel: `${r.participants.toLocaleString('el')} συμμ. · ${r.distance} χλμ`,
      value:    r.participants,
      rank:     i + 1,
    }));

  const yearRange = data?.ranking.length
    ? `${Math.min(...data.ranking.map(r => parseInt(r.firstYear || '9999')))} – ${Math.max(...data.ranking.map(r => parseInt(r.lastYear || '0')))}`
    : '—';

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-12">
      <div className="max-w-5xl mx-auto">

        {/* Hero */}
        <div className="mb-10">
          <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Στατιστικά</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
            🚴 Brevet Universe
          </h1>
          <p className="text-white/40 text-sm">
            Όλες οι διαδρομές που έχουν τρεχτεί σε επίσημα brevets στην Ελλάδα.
          </p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse h-20" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400 text-sm mb-10">
            Αδυναμία φόρτωσης δεδομένων.
          </div>
        ) : data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
            {[
              { label: 'Μοναδικές Διαδρομές', value: data.totalRoutes.toLocaleString('el') },
              { label: 'Συμμετοχές',          value: data.totalParticipations.toLocaleString('el') },
              { label: 'Χρονική Περίοδος',    value: yearRange },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-cyan-400 font-bold text-2xl mb-1">{s.value}</div>
                <div className="text-white/40 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Spotlight Carousel — most popular brevet overall + per distance */}
        {data && data.ranking.length > 0 && (
          <BrevetSpotlightCarousel routes={data.ranking} />
        )}

        {/* Distance filter chips */}
        {data && (
          <div className="flex flex-wrap gap-2 mb-8">
            {DIST_OPTIONS.map(d => (
              <button key={d}
                onClick={() => setDistFilter(d)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all
                  ${distFilter === d
                    ? 'bg-cyan-500 border-cyan-500 text-black'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'}`}>
                {distLabel(d)}
                {d > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({(data.ranking.filter(r => matchesDist(r.distance, d))).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Bubble Universe */}
        {data && bubbleItems.length > 0 && (
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden mb-10">
            <div className="px-6 pt-5 pb-2 border-b border-white/8">
              <div className="text-white font-bold text-base">Bubble Universe</div>
              <div className="text-white/35 text-xs mt-0.5">
                Top {bubbleItems.length} διαδρομές{distFilter ? ` · ${distLabel(distFilter)}` : ''} · μέγεθος = συμμετοχές · αγγίξτε για λεπτομέρειες
              </div>
            </div>
            <div className="p-4">
              <BubbleChart items={bubbleItems} />
            </div>
          </div>
        )}

        {/* Ranking table */}
        {data && filtered.length > 0 && (
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
              <div className="text-white font-bold text-base">Πλήρης Κατάταξη</div>
              <div className="text-white/30 text-sm">{filtered.length} διαδρομές</div>
            </div>
            <div className="divide-y divide-white/5">
              {filtered.map((route, i) => (
                <div key={route.key}
                  className={`flex items-center gap-3 px-6 py-3.5 hover:bg-white/4 transition-colors ${i === 24 ? 'border-t-2 border-white/10' : ''}`}>
                  {/* Rank */}
                  <div className={`w-8 text-sm font-bold tabular-nums flex-shrink-0 ${rankColor(i + 1)}`}>
                    {i + 1}
                  </div>

                  {/* Distance badge */}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${distBadgeColor(route.distance)}`}>
                    {route.distance} χλμ
                  </span>

                  {/* Name & meta */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{route.name}</div>
                    <div className="text-white/35 text-xs mt-0.5">
                      {route.editions} εκδόσεις
                      {route.organizer ? ` · ${route.organizer}` : ''}
                      {route.firstYear ? ` · ${route.firstYear}${route.lastYear && route.lastYear !== route.firstYear ? `–${route.lastYear}` : ''}` : ''}
                    </div>
                  </div>

                  {/* Progress + count */}
                  <div className="hidden sm:flex items-center gap-3 w-48">
                    <div className="flex-1 bg-white/8 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-cyan-500/60 rounded-full"
                        style={{ width: `${(route.participants / (filtered[0]?.participants || 1)) * 100}%` }}
                      />
                    </div>
                    <div className="text-white/60 text-xs tabular-nums w-16 text-right">
                      {route.participants.toLocaleString('el')}
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="sm:hidden text-white/50 text-sm tabular-nums flex-shrink-0">
                    {route.participants.toLocaleString('el')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <PageViews page="brevet-universe" />
      </div>
    </div>
  );
}
