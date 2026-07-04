'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { BubbleItem } from '../components/BubbleChart';

const BubbleChart = dynamic(() => import('../components/BubbleChart'), { ssr: false });

interface OrganizerEntry {
  id: string;
  name: string;
  participants: number;
  uniqueRiders: number;
  brevets: number;
  firstYear: string;
  lastYear: string;
}

interface UniverseData {
  totalOrganizers: number;
  totalParticipations: number;
  ranking: OrganizerEntry[];
}

function distColor(rank: number) {
  if (rank === 1) return 'text-amber-400';
  if (rank === 2) return 'text-slate-300';
  if (rank === 3) return 'text-orange-400';
  if (rank <= 5)  return 'text-cyan-400';
  return 'text-white/50';
}

export default function OrganizerUniversePage() {
  const [data, setData]       = useState<UniverseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    fetch('/api/organizer-universe')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const bubbleItems: BubbleItem[] = (data?.ranking ?? [])
    .slice(0, 30)
    .map((o, i) => ({
      id:       o.id,
      label:    o.name,
      sublabel: `${o.participants.toLocaleString('el')} συμμετοχές`,
      value:    o.participants,
      rank:     i + 1,
    }));

  const yearRange = data?.ranking.length
    ? `${Math.min(...data.ranking.map(o => parseInt(o.firstYear || '9999')))} – ${Math.max(...data.ranking.map(o => parseInt(o.lastYear || '0')))}`
    : '—';

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-12">
      <div className="max-w-5xl mx-auto">

        {/* Hero */}
        <div className="mb-10">
          <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-3">Στατιστικά</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
            🌌 Organizer Universe
          </h1>
          <p className="text-white/40 text-sm">
            Όλοι οι διοργανωτές που έχουν γράψει ιστορία στο ελληνικό randonneuring.
          </p>
        </div>

        {/* Stats cards */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse h-20" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400 text-sm mb-10">
            Αδυναμία φόρτωσης δεδομένων.
          </div>
        ) : data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Διοργανωτές',    value: data.totalOrganizers.toLocaleString('el') },
              { label: 'Συμμετοχές',     value: data.totalParticipations.toLocaleString('el') },
              { label: 'Brevets',        value: data.ranking.reduce((s, o) => s + o.brevets, 0).toLocaleString('el') },
              { label: 'Χρονική περίοδος', value: yearRange },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-purple-400 font-bold text-2xl mb-1">{s.value}</div>
                <div className="text-white/40 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Bubble Universe */}
        {data && bubbleItems.length > 0 && (
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden mb-10">
            <div className="px-6 pt-5 pb-2 border-b border-white/8 flex items-center justify-between">
              <div>
                <div className="text-white font-bold text-base">Bubble Universe</div>
                <div className="text-white/35 text-xs mt-0.5">Top {bubbleItems.length} διοργανωτές · μέγεθος = συμμετοχές · αγγίξτε για λεπτομέρειες</div>
              </div>
            </div>
            <div className="p-4">
              <BubbleChart items={bubbleItems} height={500} />
            </div>
          </div>
        )}

        {/* Full ranking table */}
        {data && data.ranking.length > 0 && (
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/8">
              <div className="text-white font-bold text-base">Πλήρης Κατάταξη</div>
            </div>
            <div className="divide-y divide-white/5">
              {data.ranking.map((org, i) => (
                <div key={org.id}
                  className={`flex items-center gap-4 px-6 py-3.5 hover:bg-white/4 transition-colors ${i === 24 ? 'border-t-2 border-white/10' : ''}`}>
                  {/* Rank */}
                  <div className={`w-8 text-sm font-bold tabular-nums flex-shrink-0 ${distColor(i + 1)}`}>
                    {i + 1}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{org.name}</div>
                    <div className="text-white/35 text-xs mt-0.5">
                      {org.brevets} βrevets · {org.uniqueRiders} αναβάτες
                      {org.firstYear ? ` · ${org.firstYear}${org.lastYear && org.lastYear !== org.firstYear ? `–${org.lastYear}` : ''}` : ''}
                    </div>
                  </div>

                  {/* Progress bar + count */}
                  <div className="hidden sm:flex items-center gap-3 w-48">
                    <div className="flex-1 bg-white/8 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-purple-500/70 rounded-full"
                        style={{ width: `${(org.participants / (data.ranking[0]?.participants || 1)) * 100}%` }}
                      />
                    </div>
                    <div className="text-white/60 text-xs tabular-nums w-16 text-right">
                      {org.participants.toLocaleString('el')}
                    </div>
                  </div>

                  {/* Mobile count */}
                  <div className="sm:hidden text-white/50 text-sm tabular-nums flex-shrink-0">
                    {org.participants.toLocaleString('el')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
