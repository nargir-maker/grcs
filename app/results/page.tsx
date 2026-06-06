'use client';

// app/results/page.tsx — Κοινοτικά Στατιστικά με drill-down

import { useEffect, useState, useRef, useCallback } from 'react';
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
interface RawEvent { d: number; t: string; as: number; acp: string; har: string; og: string; eid: string; }

interface YearStats { year: number; completions: number; km: number; ascent: number; activeRiders: number; srEarners: number; }

interface CommunityStats {
  allTime: { totalKm: number; totalAscent: number; totalCompletions: number; uniqueRiders: number; };
  byYear: YearStats[];
  distanceDistribution: { name: string; value: number }[];
  certDistribution:     { name: string; value: number }[];
  typeDistribution:     { name: string; value: number }[];
  byOrganizer:          { name: string; value: number }[];
  yearDetail: Record<number, { byDistance: { name: string; value: number }[]; byOrganizer: { name: string; value: number }[]; }>;
  distTrend: Record<string, { year: number; value: number }[]>;
  certTrend: Record<string, { year: number; value: number }[]>;
  typeTrend: Record<string, { year: number; value: number }[]>;
  orgTrend:  Record<string, { year: number; value: number }[]>;
}

type DrillDown =
  | { type: 'year'; year: number }
  | { type: 'distance'; dist: string }
  | { type: 'cert'; cert: string }
  | { type: 'btype'; btype: string }
  | { type: 'organizer'; org: string };

// ── Colors ────────────────────────────────────────────────────────
const C = { cyan: '#06b6d4', blue: '#3b82f6', purple: '#a855f7', amber: '#f59e0b', green: '#10b981', rose: '#f43f5e', orange: '#f97316', indigo: '#6366f1' };
const PIE_PAL = [C.cyan, C.blue, C.purple, C.amber, C.green, C.rose];

const CHARTS = [
  { id: 'participations', icon: '🚴', label: 'Συμμετοχές\nανά έτος',  color: C.cyan,   title: 'Ολοκληρώσεις brevet ανά έτος' },
  { id: 'km',             icon: '🗺️', label: 'Χιλιόμετρα\nανά έτος', color: C.blue,   title: 'Συνολικά χλμ. κοινότητας ανά έτος' },
  { id: 'ascent',         icon: '⛰️', label: 'Υψομετρικά\nανά έτος', color: C.purple, title: 'Σύνολο ανόδου ανά έτος' },
  { id: 'riders',         icon: '👥', label: 'Ενεργοί\nαναβάτες',     color: C.green,  title: 'Μοναδικοί αναβάτες ανά έτος' },
  { id: 'distances',      icon: '📏', label: 'Κατανομή\nαποστάσεων',  color: C.amber,  title: 'Ολοκληρώσεις ανά κατηγορία απόστασης' },
  { id: 'cert',           icon: '🏅', label: 'ACP vs HAR',            color: C.orange, title: 'Κατανομή πιστοποιήσεων' },
  { id: 'types',          icon: '🏷️', label: 'Τύποι\nbrevet',        color: C.indigo, title: 'BRM / LRM / FLC / PBP' },
  { id: 'organizers',     icon: '🏛️', label: 'Ανά\nσύλλογο',         color: C.amber,  title: 'Ολοκληρώσεις ανά διοργανωτή' },
  { id: 'sr',             icon: '⭐', label: 'Super\nRandonneurs',    color: C.rose,   title: 'SR τίτλοι ανά έτος' },
] as const;

type ChartId = typeof CHARTS[number]['id'];

// ── Recharts helpers ──────────────────────────────────────────────
const axisStyle = { fill: 'rgba(255,255,255,0.28)', fontSize: 11 };
const gridStyle  = { stroke: 'rgba(255,255,255,0.06)' };
function fmtLarge(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return `${v}`;
}

// ── computeStats ──────────────────────────────────────────────────
function computeStats(docs: any[]): CommunityStats {
  const yearMemberMap = new Map<number, Map<string, RawEvent[]>>();
  const distMap  = new Map<number, number>();
  const typeMap  = new Map<string, number>();
  const orgMap   = new Map<string, number>();
  let certACP = 0, certHAR = 0, certBoth = 0, uniqueRiders = 0;

  const yearDistMap  = new Map<number, Map<number, number>>();
  const yearOrgMap   = new Map<number, Map<string, number>>();
  const distYearMap  = new Map<number, Map<number, number>>();
  const certYearACP  = new Map<number, number>();
  const certYearHAR  = new Map<number, number>();
  const certYearBoth = new Map<number, number>();
  const typeYearMap  = new Map<string, Map<number, number>>();
  const orgYearMap   = new Map<string, Map<number, number>>();

  function incN<K1, K2>(m: Map<K1, Map<K2, number>>, k1: K1, k2: K2) {
    if (!m.has(k1)) m.set(k1, new Map());
    const inner = m.get(k1)!;
    inner.set(k2, (inner.get(k2) ?? 0) + 1);
  }

  for (const raw of docs) {
    const memberId = raw.id as string;
    let history: Record<string, any> = {};
    try { const h = raw.stats?.history_raw; if (h) { const p = JSON.parse(h); history = p.history ?? p; } }
    catch { continue; }
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
        const type = evt.t || 'BRM';
        const org = (evt.og || 'Άλλος').slice(0, 22);
        const hasA = !!(evt.acp && evt.acp !== '');
        const hasH = !!(evt.har && evt.har !== '' && evt.har !== 'AUR0');

        if ([200, 300, 400, 600, 1000, 1200].includes(d)) {
          distMap.set(d, (distMap.get(d) ?? 0) + 1);
          incN(yearDistMap, year, d);
          incN(distYearMap, d, year);
        }
        typeMap.set(type, (typeMap.get(type) ?? 0) + 1);
        orgMap.set(org, (orgMap.get(org) ?? 0) + 1);
        incN(yearOrgMap, year, org);
        incN(typeYearMap, type, year);
        incN(orgYearMap, org, year);

        if (hasA && hasH) { certBoth++; certYearBoth.set(year, (certYearBoth.get(year) ?? 0) + 1); }
        else if (hasA)    { certACP++;  certYearACP .set(year, (certYearACP .get(year) ?? 0) + 1); }
        else if (hasH)    { certHAR++;  certYearHAR .set(year, (certYearHAR .get(year) ?? 0) + 1); }
      }
    }
    if (hasAny) uniqueRiders++;
  }

  function hasSR(events: RawEvent[], field: 'acp' | 'har') {
    const dists = new Set<number>();
    for (const e of events) {
      const ok = field === 'acp' ? !!(e.acp && e.acp !== '') : !!(e.har && e.har !== '' && e.har !== 'AUR0');
      if (ok && [200, 300, 400, 600].includes(e.d)) dists.add(e.d);
    }
    return [200, 300, 400, 600].every(d => dists.has(d));
  }

  let totalKm = 0, totalAscent = 0, totalCompletions = 0;
  const byYear: YearStats[] = Array.from(yearMemberMap.entries()).map(([year, mm]) => {
    let km = 0, ascent = 0, completions = 0, srEarners = 0;
    for (const [, evts] of mm) {
      for (const e of evts) { km += e.d ?? 0; ascent += e.as ?? 0; completions++; }
      if (hasSR(evts, 'acp') || hasSR(evts, 'har')) srEarners++;
    }
    totalKm += km; totalAscent += ascent; totalCompletions += completions;
    return { year, completions, km, ascent, activeRiders: mm.size, srEarners };
  }).sort((a, b) => a.year - b.year);

  const allYears = byYear.map(y => y.year);

  const yearDetail: CommunityStats['yearDetail'] = {};
  for (const year of allYears) {
    const yd = yearDistMap.get(year);
    const yo = yearOrgMap.get(year);
    yearDetail[year] = {
      byDistance: yd ? Array.from(yd.entries()).sort(([a],[b]) => a-b).map(([d,v]) => ({ name: `${d}km`, value: v })) : [],
      byOrganizer: yo ? Array.from(yo.entries()).sort(([,a],[,b]) => b-a).slice(0,6).map(([n,v]) => ({ name: n, value: v })) : [],
    };
  }

  function buildTrend(yearMap: Map<number, number>) {
    return allYears.filter(y => yearMap.has(y)).map(y => ({ year: y, value: yearMap.get(y) ?? 0 }));
  }

  const distTrend: CommunityStats['distTrend'] = {};
  for (const [dist, ym] of distYearMap) distTrend[`${dist}km`] = buildTrend(ym);

  const certTrend: CommunityStats['certTrend'] = {
    'ACP':     buildTrend(certYearACP),
    'HAR':     buildTrend(certYearHAR),
    'ACP+HAR': buildTrend(certYearBoth),
  };

  const typeTrend: CommunityStats['typeTrend'] = {};
  for (const [type, ym] of typeYearMap) typeTrend[type] = buildTrend(ym);

  const topOrgs = Array.from(orgMap.entries()).sort(([,a],[,b]) => b-a).slice(0,8).map(([n]) => n);
  const orgTrend: CommunityStats['orgTrend'] = {};
  for (const org of topOrgs) { const ym = orgYearMap.get(org); if (ym) orgTrend[org] = buildTrend(ym); }

  return {
    allTime: { totalKm, totalAscent, totalCompletions, uniqueRiders },
    byYear,
    distanceDistribution: Array.from(distMap.entries()).sort(([a],[b]) => a-b).map(([d,v]) => ({ name: `${d}km`, value: v })),
    certDistribution: [{ name: 'ACP', value: certACP }, { name: 'HAR', value: certHAR }, { name: 'ACP+HAR', value: certBoth }].filter(x => x.value > 0),
    typeDistribution: Array.from(typeMap.entries()).map(([n,v]) => ({ name: n, value: v })).sort((a,b) => b.value-a.value),
    byOrganizer: Array.from(orgMap.entries()).map(([n,v]) => ({ name: n, value: v })).sort((a,b) => b.value-a.value).slice(0,8),
    yearDetail, distTrend, certTrend, typeTrend, orgTrend,
  };
}

// ── Count-up hook ─────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, enabled = false) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled || target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - t, 4)) * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick); else setValue(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, enabled]);
  return value;
}

// ── Components ────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label, fmt }: { active?: boolean; payload?: any[]; label?: string; fmt?: (v: number) => string; }) {
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

function HeroStat({ target, label, suffix = '', color, enabled }: { target: number; label: string; suffix?: string; color: string; enabled: boolean; }) {
  const v = useCountUp(target, 1800, enabled);
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-1.5">
      <div className="text-2xl sm:text-3xl font-bold tabular-nums" style={{ color }}>{v.toLocaleString('el-GR')}{suffix}</div>
      <div className="text-white/45 text-xs sm:text-sm leading-snug">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/[0.04] rounded-xl px-4 py-3">
      <div className="text-base sm:text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-white/40 text-xs mt-0.5">{label}</div>
    </div>
  );
}

function ChartBtn({ icon, label, color, active, onClick }: { icon: string; label: string; color: string; active: boolean; onClick: () => void; }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-3 sm:p-5 border transition-all duration-200 text-center w-full
        ${active ? 'scale-[1.03] text-white' : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20 text-white/60 hover:text-white'}`}
      style={active ? { backgroundColor: `${color}1a`, borderColor: `${color}55`, boxShadow: `0 0 28px ${color}18` } : {}}>
      <span className="text-2xl sm:text-3xl leading-none">{icon}</span>
      <span className="text-[10px] sm:text-xs font-semibold leading-tight whitespace-pre-line">{label}</span>
    </button>
  );
}

// ── Chart renderer ────────────────────────────────────────────────
function renderChart(id: ChartId, stats: CommunityStats, openDD: (dd: DrillDown) => void) {
  const tt = (fmt?: (v: number) => string) => (props: any) => <DarkTooltip {...props} fmt={fmt} />;
  const leg = (v: string) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{v}</span>;

  switch (id) {
    case 'participations':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.byYear} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip content={tt()} />
            <Bar dataKey="completions" name="Ολοκληρώσεις" fill={C.cyan} radius={[4,4,0,0]}
              style={{ cursor: 'pointer' }}
              onClick={(d: any) => openDD({ type: 'year', year: d.year })} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'km':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={stats.byYear} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            onClick={(d: any) => { if (d?.activePayload?.[0]) openDD({ type: 'year', year: d.activePayload[0].payload.year }); }}
            style={{ cursor: 'pointer' }}>
            <defs>
              <linearGradient id="gKm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.blue} stopOpacity={0.45} />
                <stop offset="95%" stopColor={C.blue} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtLarge} />
            <Tooltip content={tt(v => `${v.toLocaleString('el-GR')} km`)} />
            <Area type="monotone" dataKey="km" name="Χιλιόμετρα" stroke={C.blue} strokeWidth={2.5} fill="url(#gKm)"
              dot={{ fill: C.blue, r: 4, strokeWidth: 0, cursor: 'pointer' }}
              activeDot={{ r: 7, fill: C.blue }} />
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
            <Tooltip content={tt(v => `${v.toLocaleString('el-GR')} m`)} />
            <Bar dataKey="ascent" name="Υψομετρικά (m)" fill={C.purple} radius={[4,4,0,0]}
              style={{ cursor: 'pointer' }}
              onClick={(d: any) => openDD({ type: 'year', year: d.year })} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'riders':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.byYear} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            onClick={(d: any) => { if (d?.activePayload?.[0]) openDD({ type: 'year', year: d.activePayload[0].payload.year }); }}
            style={{ cursor: 'pointer' }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={tt()} />
            <Line type="monotone" dataKey="activeRiders" name="Αναβάτες" stroke={C.green} strokeWidth={3}
              dot={{ fill: C.green, r: 4, strokeWidth: 0, cursor: 'pointer' }}
              activeDot={{ r: 7, fill: C.green }} />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'distances':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={stats.distanceDistribution} cx="50%" cy="45%" innerRadius={70} outerRadius={110} paddingAngle={3}
              dataKey="value" nameKey="name" style={{ cursor: 'pointer' }}
              onClick={(d: any) => openDD({ type: 'distance', dist: d.name })}>
              {stats.distanceDistribution.map((_,i) => <Cell key={i} fill={PIE_PAL[i % PIE_PAL.length]} />)}
            </Pie>
            <Tooltip content={tt()} />
            <Legend formatter={leg} />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'cert':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={stats.certDistribution} cx="50%" cy="45%" innerRadius={70} outerRadius={110} paddingAngle={3}
              dataKey="value" nameKey="name" style={{ cursor: 'pointer' }}
              onClick={(d: any) => openDD({ type: 'cert', cert: d.name })}>
              {stats.certDistribution.map((_,i) => <Cell key={i} fill={PIE_PAL[i % PIE_PAL.length]} />)}
            </Pie>
            <Tooltip content={tt()} />
            <Legend formatter={leg} />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'types':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={stats.typeDistribution} cx="50%" cy="45%" innerRadius={70} outerRadius={110} paddingAngle={3}
              dataKey="value" nameKey="name" style={{ cursor: 'pointer' }}
              onClick={(d: any) => openDD({ type: 'btype', btype: d.name })}>
              {stats.typeDistribution.map((_,i) => <Cell key={i} fill={PIE_PAL[i % PIE_PAL.length]} />)}
            </Pie>
            <Tooltip content={tt()} />
            <Legend formatter={leg} />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'organizers':
      return (
        <ResponsiveContainer width="100%" height={Math.max(260, stats.byOrganizer.length * 48)}>
          <BarChart data={stats.byOrganizer} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...gridStyle} horizontal={false} />
            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={115} tick={{ ...axisStyle, textAnchor: 'end' }} axisLine={false} tickLine={false} />
            <Tooltip content={tt()} />
            <Bar dataKey="value" name="Συμμετοχές" fill={C.amber} radius={[0,4,4,0]}
              style={{ cursor: 'pointer' }}
              onClick={(d: any) => openDD({ type: 'organizer', org: d.name })} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'sr':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.byYear.filter(y => y.srEarners > 0)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={tt()} />
            <Bar dataKey="srEarners" name="Super Randonneurs" fill={C.rose} radius={[4,4,0,0]}
              style={{ cursor: 'pointer' }}
              onClick={(d: any) => openDD({ type: 'year', year: d.year })} />
          </BarChart>
        </ResponsiveContainer>
      );
  }
}

// ── Drill-down helpers ────────────────────────────────────────────
function getDDTitle(dd: DrillDown): string {
  switch (dd.type) {
    case 'year':       return `Ανάλυση έτους ${dd.year}`;
    case 'distance':   return `Τάση ${dd.dist} ανά έτος`;
    case 'cert':       return `Πιστοποιήσεις ${dd.cert} ανά έτος`;
    case 'btype':      return `Τύπος "${dd.btype}" ανά έτος`;
    case 'organizer':  return `${dd.org} — ιστορικό συμμετοχών`;
  }
}

function renderDrillChart(dd: DrillDown, stats: CommunityStats) {
  const tt = (fmt?: (v: number) => string) => (props: any) => <DarkTooltip {...props} fmt={fmt} />;
  const leg = (v: string) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{v}</span>;
  const noData = <p className="text-white/30 text-sm text-center py-8">Δεν υπάρχουν δεδομένα</p>;

  switch (dd.type) {
    case 'year': {
      const yearData = stats.byYear.find(y => y.year === dd.year);
      const detail   = stats.yearDetail[dd.year];
      if (!detail) return noData;
      return (
        <div>
          {yearData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <MiniStat label="Ολοκληρώσεις" value={yearData.completions.toLocaleString('el-GR')} color={C.cyan} />
              <MiniStat label="Χιλιόμετρα"   value={`${yearData.km.toLocaleString('el-GR')} km`}   color={C.blue} />
              <MiniStat label="Αναβάτες"      value={yearData.activeRiders.toString()}               color={C.green} />
              <MiniStat label="SR τίτλοι"     value={yearData.srEarners.toString()}                  color={C.rose} />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {detail.byDistance.length > 0 && (
              <div>
                <p className="text-white/35 text-[10px] uppercase tracking-wider mb-3">Κατανομή αποστάσεων</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={detail.byDistance} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                      {detail.byDistance.map((_,i) => <Cell key={i} fill={PIE_PAL[i % PIE_PAL.length]} />)}
                    </Pie>
                    <Tooltip content={tt()} />
                    <Legend formatter={leg} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {detail.byOrganizer.length > 0 && (
              <div>
                <p className="text-white/35 text-[10px] uppercase tracking-wider mb-3">Ανά σύλλογο</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={detail.byOrganizer} layout="vertical" margin={{ top: 0, right: 10, left: 8, bottom: 0 }}>
                    <XAxis type="number" tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={tt()} />
                    <Bar dataKey="value" name="Συμμετοχές" fill={C.cyan} radius={[0,3,3,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'distance': {
      const trend = stats.distTrend[dd.dist] ?? [];
      if (!trend.length) return noData;
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={tt()} />
            <Bar dataKey="value" name={`${dd.dist} ολοκληρώσεις`} fill={C.amber} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'cert': {
      const trend = stats.certTrend[dd.cert] ?? [];
      if (!trend.length) return noData;
      const col = dd.cert === 'ACP' ? C.cyan : dd.cert === 'HAR' ? C.blue : C.purple;
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={tt()} />
            <Line type="monotone" dataKey="value" name={dd.cert} stroke={col} strokeWidth={3}
              dot={{ fill: col, r: 4, strokeWidth: 0 }} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'btype': {
      const trend = stats.typeTrend[dd.btype] ?? [];
      if (!trend.length) return noData;
      return (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={tt()} />
            <Bar dataKey="value" name={dd.btype} fill={C.indigo} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'organizer': {
      const trend = stats.orgTrend[dd.org] ?? [];
      if (!trend.length) return noData;
      return (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gOrg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.amber} stopOpacity={0.45} />
                <stop offset="95%" stopColor={C.amber} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={tt()} />
            <Area type="monotone" dataKey="value" name="Συμμετοχές" stroke={C.amber} strokeWidth={2.5} fill="url(#gOrg)" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
  }
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
  const [dd, setDD]                   = useState<DrillDown | null>(null);
  const [ddVisible, setDDVis]         = useState(false);
  const ddRef                         = useRef<DrillDown | null>(null);

  useEffect(() => { ddRef.current = dd; }, [dd]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.replace('/login');
  }, [session, status, router]);

  useEffect(() => {
    if (!session) return;
    getPublicMembers()
      .then(docs => { setStats(computeStats(docs)); setLoading(false); setTimeout(() => setReady(true), 80); })
      .catch(e => { console.error(e); setLoading(false); });
  }, [session]);

  const closeDD = useCallback(() => {
    setDDVis(false);
    setTimeout(() => setDD(null), 330);
  }, []);

  const openDD = useCallback((newDD: DrillDown) => {
    const current = ddRef.current;
    if (current) {
      setDDVis(false);
      setTimeout(() => {
        setDD(newDD);
        requestAnimationFrame(() => requestAnimationFrame(() => setDDVis(true)));
      }, 220);
    } else {
      setDD(newDD);
      requestAnimationFrame(() => requestAnimationFrame(() => setDDVis(true)));
    }
  }, []);

  // Close drill-down when switching main chart
  const switchChart = useCallback((id: ChartId) => {
    if (dd) closeDD();
    setActiveChart(id);
  }, [dd, closeDD]);

  // Guards (all hooks above)
  if (status === 'loading' || enabled === null) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!session) return null;
  if (enabled === false) return <ComingSoon label="Στατιστικά" />;

  const at = stats?.allTime;
  const meta = CHARTS.find(c => c.id === activeChart)!;

  return (
    <div className="min-h-screen bg-[#0A1628] px-5 py-12">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Στατιστικά Κοινότητας</h1>
          <p className="text-white/40 text-sm">Συγκεντρωτικά δεδομένα από δημόσια προφίλ αναβατών</p>
        </div>

        {/* Hero numbers */}
        {loading || !at ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
            {[...Array(4)].map((_,i) => <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 h-24 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
            <HeroStat target={at.uniqueRiders}                    label="Αναβάτες"                 color={C.cyan}   enabled={ready} />
            <HeroStat target={at.totalCompletions}                label="Ολοκληρώσεις"              color={C.blue}   enabled={ready} />
            <HeroStat target={at.totalKm}                         label="Χιλιόμετρα κοινότητας" suffix=" km" color={C.purple} enabled={ready} />
            <HeroStat target={Math.round(at.totalAscent / 1000)} label="Χλμ. ανόδου"           suffix=" km" color={C.green}  enabled={ready} />
          </div>
        )}

        {/* Chart buttons */}
        <div className="mb-5">
          <p className="text-white/30 text-[11px] uppercase tracking-widest mb-4">Αναλυτικά</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
            {CHARTS.map(c => (
              <ChartBtn key={c.id} icon={c.icon} label={c.label} color={c.color}
                active={activeChart === c.id} onClick={() => switchChart(c.id)} />
            ))}
          </div>
        </div>

        {/* Main chart */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 sm:p-7 transition-shadow duration-500"
          style={{ boxShadow: `0 0 50px ${meta.color}12` }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-white/30 text-sm">Ανάλυση δεδομένων...</p>
            </div>
          ) : stats ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{meta.icon}</span>
                  <span className="text-white font-semibold text-sm sm:text-base">{meta.title}</span>
                </div>
                <span className="text-white/20 text-[10px] hidden sm:block">Κλίκ σε στοιχείο για ανάλυση ↓</span>
              </div>
              {renderChart(activeChart, stats, openDD)}
            </>
          ) : null}
        </div>

        {/* Drill-down panel */}
        {dd && (
          <div
            className="mt-4 rounded-2xl border border-white/10 overflow-hidden"
            style={{
              opacity: ddVisible ? 1 : 0,
              transform: ddVisible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.33s ease, transform 0.33s ease',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-white/[0.04] border-b border-white/10">
              <button onClick={closeDD}
                className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors shrink-0">
                ← Πίσω
              </button>
              <span className="text-white/15 shrink-0">|</span>
              <span className="text-white/75 text-sm font-semibold truncate">{getDDTitle(dd)}</span>
            </div>
            {/* Content */}
            <div className="p-5 sm:p-6 bg-[#0A1628]">
              {stats && renderDrillChart(dd, stats)}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
