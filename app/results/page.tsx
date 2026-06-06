'use client';

// app/results/page.tsx — Κοινοτικά Στατιστικά

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getPublicMembers } from '@/app/lib/publicMembersCache';
import { usePageEnabled, ComingSoon } from '@/app/lib/usePageEnabled';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────
interface RawEvent {
  d: number; t: string; as: number;
  acp: string; har: string; og: string; eid: string;
}

interface YearStats {
  year: number;
  completions: number;
  km: number;
  ascent: number;
  activeRiders: number;
  srEarners: number;
}

interface CommunityStats {
  allTime: {
    totalKm: number;
    totalAscent: number;
    totalCompletions: number;
    uniqueRiders: number;
  };
  byYear: YearStats[];
  distanceDistribution: { name: string; value: number }[];
  certDistribution:     { name: string; value: number }[];
  typeDistribution:     { name: string; value: number }[];
  byOrganizer:          { name: string; value: number }[];
}

// ── Colors ────────────────────────────────────────────────────────
const C = {
  cyan:   '#06b6d4',
  blue:   '#3b82f6',
  purple: '#a855f7',
  amber:  '#f59e0b',
  green:  '#10b981',
  rose:   '#f43f5e',
  orange: '#f97316',
  indigo: '#6366f1',
};
const PIE_PAL = [C.cyan, C.blue, C.purple, C.amber, C.green, C.rose];

// ── Chart definitions ─────────────────────────────────────────────
const CHARTS = [
  { id: 'participations', icon: '🚴', label: 'Συμμετοχές\nανά έτος',   color: C.cyan,   title: 'Ολοκληρώσεις brevet ανά έτος' },
  { id: 'km',             icon: '🗺️', label: 'Χιλιόμετρα\nανά έτος',  color: C.blue,   title: 'Συνολικά χλμ. κοινότητας ανά έτος' },
  { id: 'ascent',         icon: '⛰️', label: 'Υψομετρικά\nανά έτος',  color: C.purple, title: 'Σύνολο υψομετρικής ανόδου ανά έτος' },
  { id: 'riders',         icon: '👥', label: 'Ενεργοί\nαναβάτες',      color: C.green,  title: 'Μοναδικοί αναβάτες που συμμετείχαν ανά έτος' },
  { id: 'distances',      icon: '📏', label: 'Κατανομή\nαποστάσεων',   color: C.amber,  title: 'Ολοκληρώσεις ανά κατηγορία απόστασης' },
  { id: 'cert',           icon: '🏅', label: 'ACP vs HAR',             color: C.orange, title: 'Κατανομή πιστοποιήσεων ACP / HAR' },
  { id: 'types',          icon: '🏷️', label: 'Τύποι\nbrevet',         color: C.indigo, title: 'BRM / LRM / FLC / PBP — ποιοτική κατανομή' },
  { id: 'organizers',     icon: '🏛️', label: 'Ανά\nσύλλογο',          color: C.amber,  title: 'Ολοκληρώσεις ανά διοργανωτή (top 8)' },
  { id: 'sr',             icon: '⭐', label: 'Super\nRandonneurs',     color: C.rose,   title: 'SR τίτλοι που αποκτήθηκαν ανά έτος' },
] as const;

type ChartId = typeof CHARTS[number]['id'];

// ── Data processing ───────────────────────────────────────────────
function computeStats(docs: any[]): CommunityStats {
  const yearMemberMap = new Map<number, Map<string, RawEvent[]>>();
  const distMap  = new Map<number, number>();
  const typeMap  = new Map<string, number>();
  const orgMap   = new Map<string, number>();
  let certACP = 0, certHAR = 0, certBoth = 0;
  let uniqueRiders = 0;

  for (const raw of docs) {
    const memberId = raw.id as string;
    let history: Record<string, any> = {};
    try {
      const h = raw.stats?.history_raw;
      if (h) { const p = JSON.parse(h); history = p.history ?? p; }
    } catch { continue; }

    if (!Object.keys(history).length) continue;
    let hasAny = false;

    for (const [yearStr, yearData] of Object.entries(history)) {
      const events: RawEvent[] = (yearData as any).events ?? [];
      if (!events.length) continue;
      const year = parseInt(yearStr);
      if (year < 2000 || year > 2100) continue;

      if (!yearMemberMap.has(year)) yearMemberMap.set(year, new Map());
      const mm = yearMemberMap.get(year)!;
      if (!mm.has(memberId)) mm.set(memberId, []);
      mm.get(memberId)!.push(...events);
      hasAny = true;

      for (const evt of events) {
        const d = evt.d ?? 0;
        if ([200, 300, 400, 600, 1000, 1200].includes(d))
          distMap.set(d, (distMap.get(d) ?? 0) + 1);

        const hasA = !!(evt.acp && evt.acp !== '');
        const hasH = !!(evt.har && evt.har !== '' && evt.har !== 'AUR0');
        if (hasA && hasH) certBoth++;
        else if (hasA)    certACP++;
        else if (hasH)    certHAR++;

        const type = evt.t || 'BRM';
        typeMap.set(type, (typeMap.get(type) ?? 0) + 1);

        const org = (evt.og || 'Άλλος').slice(0, 20);
        orgMap.set(org, (orgMap.get(org) ?? 0) + 1);
      }
    }
    if (hasAny) uniqueRiders++;
  }

  function hasSR(events: RawEvent[], field: 'acp' | 'har'): boolean {
    const dists = new Set<number>();
    for (const e of events) {
      const ok = field === 'acp'
        ? !!(e.acp && e.acp !== '')
        : !!(e.har && e.har !== '' && e.har !== 'AUR0');
      if (ok && [200, 300, 400, 600].includes(e.d)) dists.add(e.d);
    }
    return [200, 300, 400, 600].every(d => dists.has(d));
  }

  let totalKm = 0, totalAscent = 0, totalCompletions = 0;

  const byYear: YearStats[] = Array.from(yearMemberMap.entries())
    .map(([year, mm]) => {
      let km = 0, ascent = 0, completions = 0, srEarners = 0;
      for (const [, events] of mm) {
        for (const e of events) { km += e.d ?? 0; ascent += e.as ?? 0; completions++; }
        if (hasSR(events, 'acp') || hasSR(events, 'har')) srEarners++;
      }
      totalKm += km; totalAscent += ascent; totalCompletions += completions;
      return { year, completions, km, ascent, activeRiders: mm.size, srEarners };
    })
    .sort((a, b) => a.year - b.year);

  return {
    allTime: { totalKm, totalAscent, totalCompletions, uniqueRiders },
    byYear,
    distanceDistribution: Array.from(distMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([d, v]) => ({ name: `${d}km`, value: v })),
    certDistribution: [
      { name: 'ACP',     value: certACP  },
      { name: 'HAR',     value: certHAR  },
      { name: 'ACP+HAR', value: certBoth },
    ].filter(x => x.value > 0),
    typeDistribution: Array.from(typeMap.entries())
      .map(([n, v]) => ({ name: n, value: v }))
      .sort((a, b) => b.value - a.value),
    byOrganizer: Array.from(orgMap.entries())
      .map(([n, v]) => ({ name: n, value: v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
  };
}

// ── Count-up animation ────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, enabled = false) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, enabled]);

  return value;
}

// ── Tooltip ───────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label, fmt }: {
  active?: boolean; payload?: any[]; label?: string;
  fmt?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1f3d] border border-white/15 rounded-xl px-4 py-3 shadow-2xl">
      {label && <p className="text-white/50 text-xs mb-2">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color || p.fill }}>
          {p.name}: {fmt ? fmt(p.value) : (p.value as number)?.toLocaleString('el-GR')}
        </p>
      ))}
    </div>
  );
}

// ── Hero Stat ─────────────────────────────────────────────────────
function HeroStat({ target, label, suffix = '', color, enabled }: {
  target: number; label: string; suffix?: string; color: string; enabled: boolean;
}) {
  const value = useCountUp(target, 1800, enabled);
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-1.5">
      <div className="text-2xl sm:text-3xl font-bold tabular-nums" style={{ color }}>
        {value.toLocaleString('el-GR')}{suffix}
      </div>
      <div className="text-white/45 text-xs sm:text-sm leading-snug">{label}</div>
    </div>
  );
}

// ── Chart Button ──────────────────────────────────────────────────
function ChartBtn({ icon, label, color, active, onClick }: {
  icon: string; label: string; color: string;
  active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2.5 rounded-2xl p-3 sm:p-5
        border transition-all duration-200 text-center w-full
        ${active
          ? 'scale-[1.03] text-white'
          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20 text-white/60 hover:text-white'
        }`}
      style={active ? {
        backgroundColor: `${color}1a`,
        borderColor: `${color}55`,
        boxShadow: `0 0 28px ${color}18`,
      } : {}}
    >
      <span className="text-2xl sm:text-3xl leading-none">{icon}</span>
      <span className="text-[10px] sm:text-xs font-semibold leading-tight whitespace-pre-line">
        {label}
      </span>
    </button>
  );
}

// ── Chart renderer ────────────────────────────────────────────────
const axisStyle = { fill: 'rgba(255,255,255,0.28)', fontSize: 11 };
const gridStyle = { stroke: 'rgba(255,255,255,0.06)' };

function fmtLarge(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return `${v}`;
}

function renderChart(id: ChartId, stats: CommunityStats) {
  const mkTT = (fmt?: (v: number) => string) =>
    (props: any) => <DarkTooltip {...props} fmt={fmt} />;

  switch (id) {
    case 'participations':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.byYear} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip content={mkTT()} />
            <Bar dataKey="completions" name="Ολοκληρώσεις" fill={C.cyan} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'km':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={stats.byYear} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gKm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.blue} stopOpacity={0.45} />
                <stop offset="95%" stopColor={C.blue} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtLarge} />
            <Tooltip content={mkTT(v => `${v.toLocaleString('el-GR')} km`)} />
            <Area type="monotone" dataKey="km" name="Χιλιόμετρα"
              stroke={C.blue} strokeWidth={2.5} fill="url(#gKm)" />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'ascent':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.byYear} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtLarge} />
            <Tooltip content={mkTT(v => `${v.toLocaleString('el-GR')} m`)} />
            <Bar dataKey="ascent" name="Υψομετρικά (m)" fill={C.purple} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'riders':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.byYear} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={mkTT()} />
            <Line type="monotone" dataKey="activeRiders" name="Αναβάτες"
              stroke={C.green} strokeWidth={3}
              dot={{ fill: C.green, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'distances':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={stats.distanceDistribution} cx="50%" cy="45%"
              innerRadius={70} outerRadius={110} paddingAngle={3}
              dataKey="value" nameKey="name">
              {stats.distanceDistribution.map((_, i) => (
                <Cell key={i} fill={PIE_PAL[i % PIE_PAL.length]} />
              ))}
            </Pie>
            <Tooltip content={mkTT()} />
            <Legend formatter={v => (
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{v}</span>
            )} />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'cert':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={stats.certDistribution} cx="50%" cy="45%"
              innerRadius={70} outerRadius={110} paddingAngle={3}
              dataKey="value" nameKey="name">
              {stats.certDistribution.map((_, i) => (
                <Cell key={i} fill={PIE_PAL[i % PIE_PAL.length]} />
              ))}
            </Pie>
            <Tooltip content={mkTT()} />
            <Legend formatter={v => (
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{v}</span>
            )} />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'types':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={stats.typeDistribution} cx="50%" cy="45%"
              innerRadius={70} outerRadius={110} paddingAngle={3}
              dataKey="value" nameKey="name">
              {stats.typeDistribution.map((_, i) => (
                <Cell key={i} fill={PIE_PAL[i % PIE_PAL.length]} />
              ))}
            </Pie>
            <Tooltip content={mkTT()} />
            <Legend formatter={v => (
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{v}</span>
            )} />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'organizers':
      return (
        <ResponsiveContainer width="100%" height={Math.max(260, stats.byOrganizer.length * 48)}>
          <BarChart data={stats.byOrganizer} layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...gridStyle} horizontal={false} />
            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={115}
              tick={{ ...axisStyle, textAnchor: 'end' }} axisLine={false} tickLine={false} />
            <Tooltip content={mkTT()} />
            <Bar dataKey="value" name="Συμμετοχές" fill={C.amber} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'sr':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.byYear.filter(y => y.srEarners > 0)}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={mkTT()} />
            <Bar dataKey="srEarners" name="Super Randonneurs" fill={C.rose} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
  }
}

// ── Skeleton placeholders ─────────────────────────────────────────
function SkeletonHero() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 h-24 animate-pulse" />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function StatisticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const enabled = usePageEnabled('results');

  const [stats, setStats]             = useState<CommunityStats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [ready, setReady]             = useState(false);
  const [activeChart, setActiveChart] = useState<ChartId>('participations');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.replace('/login');
  }, [session, status, router]);

  useEffect(() => {
    if (!session) return;
    getPublicMembers()
      .then(docs => {
        setStats(computeStats(docs));
        setLoading(false);
        setTimeout(() => setReady(true), 80);
      })
      .catch(e => { console.error(e); setLoading(false); });
  }, [session]);

  // All hooks above — guards below
  if (status === 'loading' || enabled === null) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!session) return null;
  if (enabled === false) return <ComingSoon label="Στατιστικά" />;

  const at = stats?.allTime;
  const activeChartMeta = CHARTS.find(c => c.id === activeChart)!;

  return (
    <div className="min-h-screen bg-[#0A1628] px-5 py-12">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Στατιστικά Κοινότητας
          </h1>
          <p className="text-white/40 text-sm">
            Συγκεντρωτικά δεδομένα από δημόσια προφίλ αναβατών
          </p>
        </div>

        {/* ── Hero numbers ── */}
        {loading || !at ? <SkeletonHero /> : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
            <HeroStat
              target={at.uniqueRiders}
              label="Αναβάτες"
              color={C.cyan}
              enabled={ready}
            />
            <HeroStat
              target={at.totalCompletions}
              label="Ολοκληρώσεις"
              color={C.blue}
              enabled={ready}
            />
            <HeroStat
              target={at.totalKm}
              label="Χιλιόμετρα κοινότητας"
              suffix=" km"
              color={C.purple}
              enabled={ready}
            />
            <HeroStat
              target={Math.round(at.totalAscent / 1000)}
              label="Χλμ. ανόδου (σύνολο)"
              suffix=" km"
              color={C.green}
              enabled={ready}
            />
          </div>
        )}

        {/* ── Chart toggle buttons ── */}
        <div className="mb-5">
          <p className="text-white/30 text-[11px] uppercase tracking-widest mb-4">Αναλυτικά</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
            {CHARTS.map(c => (
              <ChartBtn
                key={c.id}
                icon={c.icon}
                label={c.label}
                color={c.color}
                active={activeChart === c.id}
                onClick={() => setActiveChart(c.id)}
              />
            ))}
          </div>
        </div>

        {/* ── Chart area ── */}
        <div
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 sm:p-7 transition-shadow duration-500"
          style={{ boxShadow: `0 0 50px ${activeChartMeta.color}12` }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-white/30 text-sm">Ανάλυση δεδομένων...</p>
            </div>
          ) : stats ? (
            <>
              <div className="mb-6 flex items-center gap-2.5">
                <span className="text-xl">{activeChartMeta.icon}</span>
                <span className="text-white font-semibold text-sm sm:text-base">
                  {activeChartMeta.title}
                </span>
              </div>
              {renderChart(activeChart, stats)}
            </>
          ) : null}
        </div>

      </div>
    </div>
  );
}
