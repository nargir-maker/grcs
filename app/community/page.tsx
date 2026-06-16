'use client';

import { useEffect, useState } from 'react';
import { usePageEnabled, ComingSoon } from '@/app/lib/usePageEnabled';
import {
  BarChart, Bar, AreaChart, Area,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────

interface EventEntry {
  name: string; date: string; og: string;
  women: number; men: number; total: number;
}

interface CommunityData {
  totalWomen: number; totalMen: number; womenPct: number;
  byDistance: Record<string, { women: number; men: number }>;
  sortedYears: string[];
  womenByYear: Record<string, number>; totalByYear: Record<string, number>;
  newWomenByYear: Record<string, number>; newMenByYear: Record<string, number>;
  topByCount: EventEntry[]; topByPct: EventEntry[];
  menTopByCount: EventEntry[]; menTopByPct: EventEntry[];
  womenSR: number; menSR: number;
  womenWithSR: Array<{ name: string; srCount: number }>;
  menWithSR:   Array<{ name: string; srCount: number }>;
  firstWomanName: string; firstWomanYear: string; firstWomanEvent: string;
  firstWomanLastBrevetName: string; firstWomanLastBrevetYear: string;
  firstManName: string;   firstManYear:   string; firstManEvent:   string;
  firstManLastBrevetName:   string; firstManLastBrevetYear:   string;
  eventsByMonth: Record<string, number>;
  eventsByMonthWomen: Record<string, number>;
  streakBuckets: Record<string, number>;
  globalMaxStreak: number; globalMaxStreakName: string;
  milestoneCounts: Record<string, number>;
}

// ── Constants ────────────────────────────────────────────────────────────────

const MONTHS_EL = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαϊ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];

// ── Small Components ─────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-blue-950/40 border border-white/10 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-white/80 text-xs font-bold uppercase tracking-widest mb-4">{children}</h2>;
}

function GenderPill({ gender, count, pct, color }: { gender: string; count: number; pct: number; color: string }) {
  return (
    <div className="flex-1 rounded-xl p-4 border" style={{ borderColor: `${color}33`, background: `${color}11` }}>
      <div className="text-2xl mb-1">{gender === 'F' ? '👩' : '👨'}</div>
      <div className="font-bold text-xl" style={{ color }}>{count.toLocaleString('el-GR')}</div>
      <div className="text-white/50 text-xs mt-0.5">{gender === 'F' ? 'Γυναίκες' : 'Άνδρες'} · {pct.toFixed(1)}%</div>
      <div className="mt-2 h-1.5 rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function EventRow({ e, valueKey, total }: { e: EventEntry; valueKey: 'women' | 'men'; total?: boolean }) {
  const val = e[valueKey];
  const pct = e.total > 0 ? Math.round((val / e.total) * 100) : 0;
  const color = valueKey === 'women' ? '#ec4899' : '#60a5fa';
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-white/90 text-sm truncate">{e.name}</div>
        <div className="text-white/40 text-xs">{e.og} · {e.date?.substring(0, 7)}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-bold text-sm" style={{ color }}>{val}</div>
        {total && <div className="text-white/30 text-xs">{pct}%</div>}
      </div>
    </div>
  );
}

function PioneerCard({ name, year, firstEvent, lastBrevetName, lastBrevetYear, gender }: {
  name: string; year: string; firstEvent: string;
  lastBrevetName: string; lastBrevetYear: string; gender: 'F' | 'M';
}) {
  const color = gender === 'F' ? '#ec4899' : '#60a5fa';
  return (
    <div className="flex-1 rounded-xl border p-4" style={{ borderColor: `${color}33`, background: `${color}0A` }}>
      <div className="text-2xl mb-2">{gender === 'F' ? '👩' : '👨'}</div>
      <div className="font-bold" style={{ color }}>{name || '—'}</div>
      <div className="text-white/40 text-xs mt-1">Πρώτο Brevet: {year}</div>
      {firstEvent && <div className="text-white/60 text-xs mt-0.5 truncate">{firstEvent}</div>}
      {lastBrevetYear && (
        <div className="text-white/30 text-xs mt-2">
          Τελευταίο: {lastBrevetYear}
          {lastBrevetName && ` · ${lastBrevetName}`}
        </div>
      )}
    </div>
  );
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A1628] border border-white/20 rounded-xl px-3 py-2 text-xs">
      <div className="text-white/60 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const enabled = usePageEnabled('community');
  const [data, setData]     = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [srGender, setSrGender] = useState<'F' | 'M'>('F');
  const [evtGender, setEvtGender] = useState<'F' | 'M'>('F');
  const [evtSort, setEvtSort] = useState<'count' | 'pct'>('count');

  useEffect(() => {
    fetch('/api/community')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Σφάλμα φόρτωσης δεδομένων.'); setLoading(false); });
  }, []);

  if (enabled === false) return <ComingSoon label="Κοινότητα & Τάσεις" />;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-white/40 text-sm">Φόρτωση στατιστικών...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="text-white/50 text-sm">{error || 'Δεν βρέθηκαν δεδομένα.'}</div>
      </div>
    );
  }

  const total = data.totalWomen + data.totalMen;

  // Chart data: yearly active riders
  const yearlyData = data.sortedYears.map(y => ({
    year: y,
    Σύνολο: data.totalByYear[y] ?? 0,
    Γυναίκες: data.womenByYear[y] ?? 0,
    'Νέοι άνδρες': data.newMenByYear[y] ?? 0,
    'Νέες γυναίκες': data.newWomenByYear[y] ?? 0,
  }));

  // Seasonality data
  const monthData = Array.from({ length: 12 }, (_, i) => ({
    m: MONTHS_EL[i],
    Σύνολο: data.eventsByMonth[(i + 1).toString()] ?? 0,
    Γυναίκες: data.eventsByMonthWomen[(i + 1).toString()] ?? 0,
  }));

  // Top events by selected gender + sort
  const topEvents = evtGender === 'F'
    ? (evtSort === 'count' ? data.topByCount : data.topByPct)
    : (evtSort === 'count' ? data.menTopByCount : data.menTopByPct);

  // Streak distribution
  const streakEntries = Object.entries(data.streakBuckets)
    .map(([k, v]) => ({ years: parseInt(k), count: v }))
    .sort((a, b) => a.years - b.years);

  return (
    <main className="min-h-screen bg-[#0A1628] pb-16">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 max-w-3xl mx-auto">
        <h1 className="text-white font-bold text-2xl">Κοινότητα &amp; Τάσεις</h1>
        <p className="text-white/40 text-sm mt-1">
          {total.toLocaleString('el-GR')} αναβάτες · {data.sortedYears.length} χρόνια ιστορίας
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-5">

        {/* ── Gender split ─────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Κατανομή Φύλου</SectionTitle>
          <div className="flex gap-3">
            <GenderPill gender="F" count={data.totalWomen} pct={data.womenPct} color="#ec4899" />
            <GenderPill gender="M" count={data.totalMen}   pct={100 - data.womenPct} color="#60a5fa" />
          </div>
        </Card>

        {/* ── Distance distribution ─────────────────────────────────── */}
        <Card>
          <SectionTitle>Κατανομή Αποστάσεων (μοναδικοί αναβάτες)</SectionTitle>
          <div className="space-y-3">
            {Object.entries(data.byDistance)
              .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
              .map(([dist, { women, men }]) => {
                const tot = women + men;
                const wPct = tot > 0 ? (women / tot) * 100 : 0;
                return (
                  <div key={dist}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/70 text-sm font-mono">{dist} km</span>
                      <span className="text-white/40 text-xs">{tot} αναβάτες · {women}♀ {men}♂</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
                      <div className="h-full bg-pink-500/80 transition-all" style={{ width: `${wPct}%` }} />
                      <div className="h-full bg-blue-500/80 transition-all" style={{ width: `${100 - wPct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-white/30">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />Γυναίκες</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Άνδρες</span>
          </div>
        </Card>

        {/* ── Yearly active riders ──────────────────────────────────── */}
        <Card>
          <SectionTitle>Ενεργοί Αναβάτες ανά Έτος</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={yearlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="Σύνολο"   stroke="#60a5fa" fill="rgba(96,165,250,0.15)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Γυναίκες" stroke="#ec4899" fill="rgba(236,72,153,0.15)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* ── New riders per year ───────────────────────────────────── */}
        <Card>
          <SectionTitle>Νέοι Αναβάτες ανά Έτος</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={yearlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Νέοι άνδρες"    fill="#3b82f6" radius={[3, 3, 0, 0]} stackId="new" />
              <Bar dataKey="Νέες γυναίκες" fill="#ec4899" radius={[3, 3, 0, 0]} stackId="new" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* ── Pioneers ─────────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Πρωτοπόροι</SectionTitle>
          <div className="flex gap-3">
            <PioneerCard
              name={data.firstWomanName} year={data.firstWomanYear}
              firstEvent={data.firstWomanEvent}
              lastBrevetName={data.firstWomanLastBrevetName}
              lastBrevetYear={data.firstWomanLastBrevetYear}
              gender="F"
            />
            <PioneerCard
              name={data.firstManName} year={data.firstManYear}
              firstEvent={data.firstManEvent}
              lastBrevetName={data.firstManLastBrevetName}
              lastBrevetYear={data.firstManLastBrevetYear}
              gender="M"
            />
          </div>
        </Card>

        {/* ── SR ───────────────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Super Randonneurs</SectionTitle>
          <div className="flex gap-2 mb-4">
            <div className="flex-1 rounded-xl p-3 text-center border border-pink-500/30 bg-pink-500/10">
              <div className="text-pink-400 font-bold text-2xl">{data.womenSR}</div>
              <div className="text-white/40 text-xs mt-0.5">γυναίκες SR</div>
            </div>
            <div className="flex-1 rounded-xl p-3 text-center border border-blue-500/30 bg-blue-500/10">
              <div className="text-blue-400 font-bold text-2xl">{data.menSR}</div>
              <div className="text-white/40 text-xs mt-0.5">άνδρες SR</div>
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setSrGender('F')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${srGender === 'F' ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50' : 'text-white/40 border border-white/10 hover:border-white/20'}`}>
              Γυναίκες
            </button>
            <button onClick={() => setSrGender('M')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${srGender === 'M' ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' : 'text-white/40 border border-white/10 hover:border-white/20'}`}>
              Άνδρες
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
            {(srGender === 'F' ? data.womenWithSR : data.menWithSR).map((r, i) => (
              <div key={i}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 border text-xs"
                style={{
                  borderColor: srGender === 'F' ? 'rgba(236,72,153,0.3)' : 'rgba(96,165,250,0.3)',
                  background:  srGender === 'F' ? 'rgba(236,72,153,0.08)' : 'rgba(96,165,250,0.08)',
                  color:       srGender === 'F' ? '#f9a8d4' : '#93c5fd',
                }}>
                {r.name}
                {r.srCount > 1 && <span className="opacity-60">×{r.srCount}</span>}
              </div>
            ))}
          </div>
        </Card>

        {/* ── Top Events ───────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Κορυφαία Events</SectionTitle>
          <div className="flex gap-2 mb-3 flex-wrap">
            <button onClick={() => setEvtGender('F')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${evtGender === 'F' ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50' : 'text-white/40 border border-white/10'}`}>
              Γυναίκες
            </button>
            <button onClick={() => setEvtGender('M')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${evtGender === 'M' ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' : 'text-white/40 border border-white/10'}`}>
              Άνδρες
            </button>
            <div className="w-px bg-white/10 self-stretch" />
            <button onClick={() => setEvtSort('count')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${evtSort === 'count' ? 'bg-white/20 text-white border border-white/30' : 'text-white/40 border border-white/10'}`}>
              Αριθμός
            </button>
            <button onClick={() => setEvtSort('pct')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${evtSort === 'pct' ? 'bg-white/20 text-white border border-white/30' : 'text-white/40 border border-white/10'}`}>
              Ποσοστό %
            </button>
          </div>
          <div>
            {topEvents.map((e, i) => (
              <EventRow key={i} e={e} valueKey={evtGender === 'F' ? 'women' : 'men'} total={evtSort === 'pct'} />
            ))}
          </div>
        </Card>

        {/* ── Seasonality ──────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Εποχικότητα (Brevets ανά μήνα)</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="m" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Σύνολο"   fill="rgba(96,165,250,0.6)"  radius={[3, 3, 0, 0]} />
              <Bar dataKey="Γυναίκες" fill="rgba(236,72,153,0.8)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* ── Streaks ──────────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Streak (Διαδοχικά Ενεργά Χρόνια)</SectionTitle>
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
            <div className="text-3xl">🔥</div>
            <div>
              <div className="text-amber-300 font-bold">{data.globalMaxStreakName}</div>
              <div className="text-white/40 text-xs">{data.globalMaxStreak} διαδοχικά χρόνια — ρεκόρ κοινότητας</div>
            </div>
          </div>
          <div className="space-y-2">
            {streakEntries.slice(-8).reverse().map(({ years, count }) => {
              const maxCount = Math.max(...streakEntries.map(s => s.count));
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={years} className="flex items-center gap-3">
                  <div className="text-white/50 text-xs w-14 text-right shrink-0">{years} {years === 1 ? 'χρόνο' : 'χρόνια'}</div>
                  <div className="flex-1 h-2 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-amber-500/70 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-white/40 text-xs w-6 text-right shrink-0">{count}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Milestones ───────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Ορόσημα (αναβάτες με X+ brevets)</SectionTitle>
          <div className="grid grid-cols-5 gap-2">
            {[['10', '🌱'], ['25', '🥉'], ['50', '🥈'], ['100', '🥇'], ['200', '🏆']].map(([k, emoji]) => (
              <div key={k} className="rounded-xl border border-white/10 p-3 text-center bg-white/5">
                <div className="text-xl mb-1">{emoji}</div>
                <div className="text-white font-bold text-lg">{data.milestoneCounts[k] ?? 0}</div>
                <div className="text-white/40 text-xs">{k}+</div>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </main>
  );
}
