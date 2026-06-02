'use client';

// app/members/page.tsx
// Hall of Fame — public member cards
// Only shows members with profile_type === 'public'
// Requires login to view

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getPublicMembers } from '@/app/lib/publicMembersCache';
import { usePageEnabled, ComingSoon } from '@/app/lib/usePageEnabled';

// ── Types ──────────────────────────────────────────────────────────
interface PublicMember {
  id:          string;
  firstName:   string;
  lastName:    string;
  gender:      string;
  lepoteId:    string;
  harId:       string;
  totalKm:     number;
  totalBrevets:number;
  firstYear:   number;  // first brevet year
  srCount:     number;
  pbpCount:    number;
}

type SortKey = 'name' | 'km' | 'brevets' | 'years';

// ── Helpers ────────────────────────────────────────────────────────
function getFirstYear(history: any): number {
  if (!history) return 0;
  try {
    const raw = typeof history === 'string' ? JSON.parse(history) : history;
    const h   = raw.history ?? raw;
    const years = Object.keys(h).map(Number).filter(y => y > 1990).sort();
    return years[0] ?? 0;
  } catch { return 0; }
}

function srCountFromHistory(history: any): number {
  if (!history) return 0;
  try {
    const raw = typeof history === 'string' ? JSON.parse(history) : history;
    const h   = raw.history ?? raw;
    return Object.values(h).filter((y: any) => {
      const evts = y.events ?? [];
      return (
        evts.some((e: any) => parseFloat(e.d) >= 200 && parseFloat(e.d) < 300) &&
        evts.some((e: any) => parseFloat(e.d) >= 300 && parseFloat(e.d) < 400) &&
        evts.some((e: any) => parseFloat(e.d) >= 400 && parseFloat(e.d) < 600) &&
        evts.some((e: any) => parseFloat(e.d) >= 600)
      );
    }).length;
  } catch { return 0; }
}

// ── Member Card ────────────────────────────────────────────────────
function MemberCard({ m }: { m: PublicMember }) {
  const hasLepote = m.lepoteId && m.lepoteId !== '0' && m.lepoteId !== '';
  const hasHar    = m.harId    && m.harId    !== '0' && m.harId    !== '';
  const yearsActive = m.firstYear > 0
    ? new Date().getFullYear() - m.firstYear + 1
    : 0;

  const avatarEmoji = m.gender === 'F' ? '👩' : '👨';

  return (
    <div className="bg-blue-900/30 border border-blue-500/20 rounded-2xl overflow-hidden
  hover:border-cyan-500/50 hover:bg-blue-900/40 transition-all duration-200
  flex flex-col">

      {/* Top gradient band */}
      <div className="h-16 relative"
        style={{
  background: 'linear-gradient(135deg, #1e3a5f 0%, #1a2d5e 50%, #1e3a8a 100%)',
}}>

        {/* Club logos — top right */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          {hasLepote && (
            <img src="/logos/650000.png" alt="ΛΕ.ΠΟ.Τ.Ε."
              className="w-9 h-9 object-contain rounded-full bg-white/10"
              onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
            />
          )}
          {hasHar && (
            <img src="/logos/659999.png" alt="H.A.R."
              className="w-9 h-9 object-contain rounded-full bg-white/10"
              onError={e => { (e.target as HTMLImageElement).style.display='none'; }}
            />
          )}
        </div>

        {/* Avatar — straddles the band */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-16 h-16 rounded-full border-4 border-[#0A1628]
            bg-gradient-to-br from-[#0D3B5E] to-[#2d1b69]
            flex items-center justify-center text-3xl shadow-xl">
            {avatarEmoji}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-10 pb-5 px-4 flex flex-col items-center gap-3 flex-1">

        {/* Name */}
        <div className="text-center">
          <div className="text-white font-bold text-base">
            {m.firstName} {m.lastName[0]}.
          </div>
          {m.firstYear > 0 && (
            <div className="text-white/40 text-xs mt-0.5">
              Από το {m.firstYear} · {yearsActive} χρόνια
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-3 w-full justify-center">
          <div className="text-center flex-1">
            <div className="text-cyan-400 font-bold text-lg leading-none">
              {m.totalBrevets}
            </div>
            <div className="text-white/30 text-xs mt-1">brevets</div>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center flex-1">
            <div className="text-cyan-400 font-bold text-lg leading-none">
              {m.totalKm >= 1000
                ? `${(m.totalKm / 1000).toFixed(1)}k`
                : m.totalKm}
            </div>
            <div className="text-white/30 text-xs mt-1">km</div>
          </div>
          {m.srCount > 0 && (
            <>
              <div className="w-px bg-white/10" />
              <div className="text-center flex-1">
                <div className="text-amber-400 font-bold text-lg leading-none">
                  {m.srCount}
                </div>
                <div className="text-white/30 text-xs mt-1">SR</div>
              </div>
            </>
          )}
        </div>

        {/* Achievement chips */}
        <div className="flex gap-1.5 flex-wrap justify-center">
          {m.pbpCount > 0 && (
            <span className="text-xs bg-blue-500/15 text-blue-400
              border border-blue-500/25 px-2 py-0.5 rounded-full font-bold">
              🏆 PBP×{m.pbpCount}
            </span>
          )}
          {m.srCount > 0 && (
            <span className="text-xs bg-amber-500/15 text-amber-400
              border border-amber-500/25 px-2 py-0.5 rounded-full font-bold">
              ⭐ SR×{m.srCount}
            </span>
          )}
          {m.totalKm >= 10000 && (
            <span className="text-xs bg-purple-500/15 text-purple-400
              border border-purple-500/25 px-2 py-0.5 rounded-full font-bold">
              🚀 {Math.floor(m.totalKm/1000)}k km
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function MembersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [members,  setMembers]  = useState<PublicMember[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sortBy,   setSortBy]   = useState<SortKey>('km');
  const [search,   setSearch]   = useState('');

  // ── Auth guard ─────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.replace('/login'); return; }
  }, [session, status]);

  // ── Page enabled guard ─────────────────────────────────────────
  const enabled = usePageEnabled('members');

  // ── Fetch public members ───────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    fetchMembers();
  }, [session]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const docs = await getPublicMembers();

      const data: PublicMember[] = docs.map((raw: any) => {
        const stats   = raw.stats ?? {};
        const lepote  = raw.reg_lepote ?? {};
        const har     = raw.reg_har    ?? {};

        let historyRaw = null;
        try {
          if (stats.history_raw) historyRaw = JSON.parse(stats.history_raw);
        } catch {}

        return {
          id:           raw.id,
          firstName:    raw.name_el    ?? '',
          lastName:     raw.surname_el ?? '',
          gender:       raw.gender     ?? 'M',
          lepoteId:     lepote.id?.toString() ?? '',
          harId:        har.id?.toString()    ?? '',
          totalKm:      parseFloat(stats.total_km  ?? '0') || 0,
          totalBrevets: parseInt(stats.total_brm   ?? '0') || 0,
          pbpCount:     parseInt(stats.pbp         ?? '0') || 0,
          firstYear:    getFirstYear(historyRaw),
          srCount:      srCountFromHistory(historyRaw),
        };
      }).filter((m: any) => m.firstName);

      setMembers(data);
    } catch (e) {
      console.error('Members fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ── Sort + filter ──────────────────────────────────────────────
  const sorted = useMemo(() => {
    let result = [...members];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.lastName.localeCompare(b.lastName, 'el'));
        break;
      case 'km':
        result.sort((a, b) => b.totalKm - a.totalKm);
        break;
      case 'brevets':
        result.sort((a, b) => b.totalBrevets - a.totalBrevets);
        break;
      case 'years':
        result.sort((a, b) => (a.firstYear || 9999) - (b.firstYear || 9999));
        break;
    }

    return result;
  }, [members, sortBy, search]);

  // ── Guards ─────────────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent
        rounded-full animate-spin" />
    </div>
  );
  if (!session) return null;

  if (enabled === null) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent
        rounded-full animate-spin" />
    </div>
  );
  if (enabled === false) return <ComingSoon label="Αναβάτες" />;

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🏆 Hall of Fame
          </h1>
          <p className="text-white/40 text-sm">
            Αναβάτες που έχουν επιλέξει να μοιραστούν το ιστορικό τους
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <input
            type="text"
            placeholder="Αναζήτηση αναβάτη..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 text-white
              placeholder-white/30 rounded-xl px-4 py-3 text-sm
              focus:outline-none focus:border-cyan-500/50"
          />

          {/* Sort buttons */}
          <div className="flex gap-2">
            {([
              { key: 'km',      label: 'Km' },
              { key: 'brevets', label: 'Brevets' },
              { key: 'years',   label: 'Παλαιότεροι' },
              { key: 'name',    label: 'Όνομα' },
            ] as { key: SortKey; label: string }[]).map(s => (
              <button key={s.key} onClick={() => setSortBy(s.key)}
                className={`px-3 py-2 rounded-xl text-xs font-bold
                  transition-colors border ${
                  sortBy === s.key
                    ? 'bg-cyan-500 text-black border-transparent'
                    : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-white/30 text-xs mb-6">
            {sorted.length} δημόσια προφίλ
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-cyan-500
              border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🚴</div>
            <p className="text-white/30">
              {search ? 'Δεν βρέθηκαν αναβάτες' : 'Κανένα δημόσιο προφίλ ακόμα'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sorted.map(m => <MemberCard key={m.id} m={m} />)}
          </div>
        )}

      </div>
    </div>
  );
}