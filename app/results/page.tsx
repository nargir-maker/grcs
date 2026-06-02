'use client';

// app/results/page.tsx
// Αποτελέσματα — grouped by year → brevet → participants
// Data source: members collection → stats (JSON) → history → events
// Only public profiles

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getPublicMembers } from '@/app/lib/publicMembersCache';
import { usePageEnabled, ComingSoon } from '@/app/lib/usePageEnabled';

// ── Types ──────────────────────────────────────────────────────────
interface RawEvent {
  n:   string;   // brevet name
  d:   number;   // distance km
  t:   string;   // type BRM/PBP/LRM/FLC
  as:  number;   // ascent m
  mt:  string;   // max time
  rt:  string;   // real time
  acp: string;   // ACP cert
  har: string;   // HAR cert
  dt:  string;   // date string
  og:  string;   // organizer
  eid: string;   // event id = brevet key
  pc:  number;   // participant count
}

interface Participant {
  memberId:  string;
  firstName: string;
  lastName:  string;
  rt:        string;   // real time
}

interface BrevetResult {
  eid:          string;
  name:         string;
  distance:     number;
  type:         string;
  date:         Date | null;
  organizer:    string;
  ascent:       number;
  maxTime:      string;
  certification: string;
  participants: Participant[];
}

interface YearGroup {
  year:    number;
  brevets: BrevetResult[];
  totalKm: number;
  totalParticipations: number;
}

// ── Parse date from event dt string ───────────────────────────────
function parseEventDate(dt: string): Date | null {
  try {
    const d = new Date(dt);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

// ── Type badge color ───────────────────────────────────────────────
function typeBadge(type: string) {
  switch (type) {
    case 'PBP': return { bg: 'bg-blue-500/20',   text: 'text-blue-400',   border: 'border-blue-500/30' };
    case 'LRM': return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' };
    case 'FLC': return { bg: 'bg-amber-500/20',  text: 'text-amber-400',  border: 'border-amber-500/30' };
    default:    return { bg: 'bg-cyan-500/20',   text: 'text-cyan-400',   border: 'border-cyan-500/30' };
  }
}

// ── Brevet Row ─────────────────────────────────────────────────────
function BrevetRow({ brevet }: { brevet: BrevetResult }) {
  const [open, setOpen] = useState(false);
  const badge = typeBadge(brevet.type);
  const dateStr = brevet.date
    ? brevet.date.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })
    : '—';

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      {/* Brevet header row — clickable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3
          bg-white/3 hover:bg-white/6 transition-colors text-left"
      >
        {/* Date */}
        <span className="text-white/40 text-xs w-16 flex-shrink-0">{dateStr}</span>

        {/* Distance badge */}
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0
          ${badge.bg} ${badge.text} ${badge.border}`}>
          {brevet.distance}km
        </span>

        {/* Name */}
        <span className="text-white font-medium text-sm flex-1 truncate">
          {brevet.name}
        </span>

        {/* Organizer */}
        <span className="text-white/30 text-xs hidden sm:block truncate max-w-[120px]">
          {brevet.organizer}
        </span>

        {/* Ascent */}
        {brevet.ascent > 0 && (
          <span className="text-white/30 text-xs hidden sm:block flex-shrink-0">
            ⛰️ {brevet.ascent.toLocaleString()}m
          </span>
        )}

        {/* Participants count */}
        <span className="text-white/50 text-xs flex-shrink-0 font-bold">
          {brevet.participants.length > 0
            ? `${brevet.participants.length} 🚴`
            : brevet.participants.length === 0 && brevet.name
              ? '—'
              : ''}
        </span>

        {/* Chevron */}
        <span className={`text-white/30 text-sm transition-transform duration-200 flex-shrink-0
          ${open ? 'rotate-90' : ''}`}>›</span>
      </button>

      {/* Participants dropdown */}
      {open && (
        <div className="border-t border-white/10 bg-black/20">
          {brevet.participants.length === 0 ? (
            <p className="text-white/20 text-xs text-center py-4">
              Δεν υπάρχουν καταγεγραμμένοι συμμετέχοντες με δημόσιο προφίλ
            </p>
          ) : (
            <div className="divide-y divide-white/5">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2">
                <span className="text-white/30 text-xs w-6">#</span>
                <span className="text-white/30 text-xs flex-1">Αναβάτης</span>
                <span className="text-white/30 text-xs w-20 text-right">Χρόνος</span>
              </div>
              {brevet.participants
                .sort((a, b) => a.lastName.localeCompare(b.lastName, 'el'))
                .map((p, i) => (
                  <div key={p.memberId}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors">
                    <span className="text-white/20 text-xs w-6">{i + 1}</span>
                    <span className="text-white text-sm flex-1">
                      {p.firstName} {p.lastName[0]}.
                    </span>
                    <span className="text-cyan-400 text-xs font-mono w-20 text-right">
                      {p.rt || '—'}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Year Section ───────────────────────────────────────────────────
function YearSection({ group }: { group: YearGroup }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      {/* Year header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4
          bg-white/5 hover:bg-white/8 border border-white/10
          rounded-2xl transition-all text-left"
      >
        <span className="text-white font-bold text-xl">{group.year}</span>

        <div className="flex items-center gap-4 flex-1">
          <div className="text-center">
            <div className="text-cyan-400 font-bold text-sm">{group.brevets.length}</div>
            <div className="text-white/30 text-xs">brevets</div>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center">
            <div className="text-cyan-400 font-bold text-sm">
              {group.totalParticipations}
            </div>
            <div className="text-white/30 text-xs">συμμετοχές</div>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center">
            <div className="text-cyan-400 font-bold text-sm">
              {group.totalKm >= 1000
                ? `${(group.totalKm / 1000).toFixed(0)}k`
                : group.totalKm}km
            </div>
            <div className="text-white/30 text-xs">σύνολο km</div>
          </div>
        </div>

        <span className={`text-white/40 text-lg transition-transform duration-200
          ${open ? 'rotate-90' : ''}`}>›</span>
      </button>

      {/* Brevets list */}
      {open && (
        <div className="mt-2 flex flex-col gap-2 pl-2">
          {group.brevets.map(b => (
            <BrevetRow key={b.eid} brevet={b} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function ResultsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [yearGroups,   setYearGroups]   = useState<YearGroup[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [distFilter,   setDistFilter]   = useState<number | null>(null);

  // ── Auth guard ─────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.replace('/login'); return; }
  }, [session, status]);

  // ── Page enabled guard ─────────────────────────────────────────
  const enabled = usePageEnabled('results');

  // ── Fetch & process ────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    fetchResults();
  }, [session]);

  async function fetchResults() {
    setLoading(true);
    try {
      const docs = await getPublicMembers();

      // Map: eid → BrevetResult
      const brevetMap = new Map<string, BrevetResult>();

      docs.forEach((raw: any) => {
        const memberId = raw.id;
        const firstName = raw.name_el    ?? '';
        const lastName  = raw.surname_el ?? '';
        if (!firstName) return;

        // Parse stats.history_raw (JSON string)
        let history: Record<string, any> = {};
        try {
          const statsObj = raw.stats ?? {};
          if (statsObj.history_raw) {
            const decoded = JSON.parse(statsObj.history_raw);
            history = decoded.history ?? decoded;
          }
        } catch { return; }

        if (!Object.keys(history).length) return;

        // Iterate years → events
        Object.entries(history).forEach(([year, yearData]: [string, any]) => {
          const events: RawEvent[] = yearData.events ?? [];
          events.forEach(evt => {
            const eid = evt.eid || `${year}_${evt.n}_${evt.d}`;

            if (!brevetMap.has(eid)) {
              brevetMap.set(eid, {
                eid,
                name:          evt.n   ?? '',
                distance:      evt.d   ?? 0,
                type:          evt.t   ?? 'BRM',
                date:          parseEventDate(evt.dt),
                organizer:     evt.og  ?? '',
                ascent:        evt.as  ?? 0,
                maxTime:       evt.mt  ?? '',
                certification: evt.acp ? (evt.har && evt.har !== 'AUR0' ? 'ACP+HAR' : 'ACP') : (evt.har && evt.har !== 'AUR0' ? 'HAR' : ''),
                participants:  [],
              });
            }

            brevetMap.get(eid)!.participants.push({
              memberId,
              firstName,
              lastName,
              rt: evt.rt ?? '',
            });
          });
        });
      });

      // Group by year
      const yearMap = new Map<number, BrevetResult[]>();
      brevetMap.forEach(brevet => {
        const year = brevet.date?.getFullYear() ?? 0;
        if (!yearMap.has(year)) yearMap.set(year, []);
        yearMap.get(year)!.push(brevet);
      });

      // Build sorted year groups
      const groups: YearGroup[] = Array.from(yearMap.entries())
        .filter(([year]) => year > 1990)
        .map(([year, brevets]) => {
          // Sort brevets by date
          const sorted = brevets.sort((a, b) =>
            (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0)
          );
          const totalKm = sorted.reduce((s, b) => s + b.distance, 0);
          const totalPart = sorted.reduce((s, b) => s + b.participants.length, 0);
          return { year, brevets: sorted, totalKm, totalParticipations: totalPart };
        })
        .sort((a, b) => b.year - a.year); // newest first

      setYearGroups(groups);
    } catch (e) {
      console.error('Results fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ── Filter ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search && distFilter === null) return yearGroups;
    return yearGroups.map(g => ({
      ...g,
      brevets: g.brevets.filter(b => {
        const matchDist = distFilter === null || b.distance === distFilter;
        const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase())
          || b.organizer.toLowerCase().includes(search.toLowerCase());
        return matchDist && matchSearch;
      }),
    })).filter(g => g.brevets.length > 0);
  }, [yearGroups, search, distFilter]);

  // Total stats
  const totalBrevets = useMemo(() =>
    yearGroups.reduce((s, g) => s + g.brevets.length, 0), [yearGroups]);
  const totalYears = yearGroups.length;

  // ── Guards ─────────────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!session) return null;
  if (enabled === null) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (enabled === false) return <ComingSoon label="Αποτελέσματα" />;

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🏅 Αποτελέσματα
          </h1>
          <p className="text-white/40 text-sm">
            Ιστορικό αγώνων από δημόσια προφίλ αναβατών
          </p>
          {!loading && (
            <div className="flex gap-4 mt-3">
              <span className="text-white/30 text-xs">
                {totalYears} χρόνια ·
              </span>
              <span className="text-white/30 text-xs">
                {totalBrevets} brevets
              </span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Αναζήτηση brevet, διοργανωτή..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 text-white
              placeholder-white/30 rounded-xl px-4 py-3 text-sm
              focus:outline-none focus:border-cyan-500/50"
          />
          <div className="flex gap-2 flex-wrap">
            {[null, 200, 300, 400, 600, 1000, 1200].map(d => (
              <button key={d ?? 'all'}
                onClick={() => setDistFilter(d)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${
                  distFilter === d
                    ? 'bg-cyan-500 text-black border-transparent'
                    : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                }`}>
                {d === null ? 'Όλα' : `${d}km`}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent
                rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/30 text-sm">Φόρτωση αποτελεσμάτων...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🏅</div>
            <p className="text-white/30">Δεν βρέθηκαν αποτελέσματα</p>
          </div>
        ) : (
          <div>
            {filtered.map(g => <YearSection key={g.year} group={g} />)}
          </div>
        )}

      </div>
    </div>
  );
}
