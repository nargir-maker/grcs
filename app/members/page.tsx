'use client';

// app/members/page.tsx
// Hall of Fame — paginated public members, 12 per page
// Search: by surname prefix, ΛΕΠΟΤΕ registry ID, or HAR registry ID

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  collection, getDocs, query, where, orderBy, limit,
  startAfter, QueryDocumentSnapshot, DocumentData,
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { usePageEnabled, ComingSoon } from '@/app/lib/usePageEnabled';

const PAGE_SIZE = 12;
// Unicode sentinel for Firestore prefix range queries
const RANGE_END = '';

type SearchMode = 'name' | 'lepote' | 'har';

// ── Types ───────────────────────────────────────────────────────────
interface PublicMember {
  id:           string;
  firstName:    string;
  lastName:     string;
  gender:       string;
  lepoteId:     string;
  harId:        string;
  totalKm:      number;
  totalBrevets: number;
  firstYear:    number;
  srCount:      number;
  pbpCount:     number;
}

// ── Helpers ─────────────────────────────────────────────────────────
function getFirstYear(history: any): number {
  if (!history) return 0;
  try {
    const raw   = typeof history === 'string' ? JSON.parse(history) : history;
    const h     = raw.history ?? raw;
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

function parseMemberDoc(d: QueryDocumentSnapshot<DocumentData>): PublicMember | null {
  const raw    = d.data();
  const stats  = raw.stats      ?? {};
  const lepote = raw.reg_lepote ?? {};
  const har    = raw.reg_har    ?? {};

  const firstName = raw.name_el ?? '';
  if (!firstName) return null;

  let historyRaw = null;
  try { if (stats.history_raw) historyRaw = JSON.parse(stats.history_raw); } catch {}

  return {
    id:           d.id,
    firstName,
    lastName:     raw.surname_el ?? '',
    gender:       raw.gender     ?? 'M',
    lepoteId:     lepote.id?.toString() ?? '',
    harId:        har.id?.toString()    ?? '',
    totalKm:      parseFloat(stats.total_km ?? '0') || 0,
    totalBrevets: parseInt(stats.total_brm  ?? '0') || 0,
    pbpCount:     parseInt(stats.pbp        ?? '0') || 0,
    firstYear:    getFirstYear(historyRaw),
    srCount:      srCountFromHistory(historyRaw),
  };
}

// ── Member Card ──────────────────────────────────────────────────────
function MemberCard({ m }: { m: PublicMember }) {
  const hasLepote   = m.lepoteId && m.lepoteId !== '0';
  const hasHar      = m.harId    && m.harId    !== '0';
  const yearsActive = m.firstYear > 0 ? new Date().getFullYear() - m.firstYear + 1 : 0;

  return (
    <div className="bg-blue-900/30 border border-blue-500/20 rounded-2xl overflow-hidden
      hover:border-cyan-500/50 hover:bg-blue-900/40 transition-all duration-200 flex flex-col">

      <div className="h-16 relative"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1a2d5e 50%, #1e3a8a 100%)' }}>
        <div className="absolute top-3 right-3 flex gap-1.5">
          {hasLepote && (
            <img src="/logos/650000.png" alt="ΛΕ.ΠΟ.Τ.Ε."
              className="w-9 h-9 object-contain rounded-full bg-white/10"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          {hasHar && (
            <img src="/logos/659999.png" alt="H.A.R."
              className="w-9 h-9 object-contain rounded-full bg-white/10"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
        </div>
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-16 h-16 rounded-full border-4 border-[#0A1628]
            bg-gradient-to-br from-[#0D3B5E] to-[#2d1b69]
            flex items-center justify-center text-3xl shadow-xl">
            {m.gender === 'F' ? '👩' : '👨'}
          </div>
        </div>
      </div>

      <div className="pt-10 pb-5 px-4 flex flex-col items-center gap-3 flex-1">
        <div className="text-center">
          <div className="text-white font-bold text-base">
            {m.firstName} {m.lastName[0]}.
          </div>
          {m.firstYear > 0 && (
            <div className="text-white/40 text-xs mt-0.5">
              Από το {m.firstYear} · {yearsActive} χρόνια
            </div>
          )}
          {/* Registry ID chips */}
          <div className="flex gap-1.5 flex-wrap justify-center mt-1.5">
            {hasLepote && (
              <span className="text-[10px] text-white/50 font-mono
                bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                ΛΕ #{m.lepoteId}
              </span>
            )}
            {hasHar && (
              <span className="text-[10px] text-white/50 font-mono
                bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                HAR #{m.harId}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3 w-full justify-center">
          <div className="text-center flex-1">
            <div className="text-cyan-400 font-bold text-lg leading-none">{m.totalBrevets}</div>
            <div className="text-white/30 text-xs mt-1">brevets</div>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center flex-1">
            <div className="text-cyan-400 font-bold text-lg leading-none">
              {m.totalKm >= 1000 ? `${(m.totalKm / 1000).toFixed(1)}k` : m.totalKm}
            </div>
            <div className="text-white/30 text-xs mt-1">km</div>
          </div>
          {m.srCount > 0 && (
            <>
              <div className="w-px bg-white/10" />
              <div className="text-center flex-1">
                <div className="text-amber-400 font-bold text-lg leading-none">{m.srCount}</div>
                <div className="text-white/30 text-xs mt-1">SR</div>
              </div>
            </>
          )}
        </div>

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
              🚀 {Math.floor(m.totalKm / 1000)}k km
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function MembersPage() {
  const { data: session, status } = useSession();
  const router  = useRouter();
  const enabled = usePageEnabled('members');

  const [members,     setMembers]     = useState<PublicMember[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [lastDoc,     setLastDoc]     = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [search,     setSearch]     = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('name');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth guard ───────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.replace('/login'); return; }
  }, [session, status]);

  // ── Initial fetch ────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    fetchPage(false);
  }, [session]);

  // ── Debounced re-fetch on search change ──────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (session) fetchPage(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, searchMode]);

  // ── Fetch ────────────────────────────────────────────────────────
  async function fetchPage(append: boolean) {
    if (append) setLoadingMore(true);
    else        setLoading(true);

    try {
      const term  = search.trim();
      const after = append ? lastDoc : null;
      let   docs: QueryDocumentSnapshot<DocumentData>[] = [];
      let   more  = false;

      const base = collection(db, 'members');
      const pf   = where('profile_type', '==', 'public');

      if (term && (searchMode === 'lepote' || searchMode === 'har')) {
        // Registry ID: stored type is uncertain — try number first, fall back to string
        const field  = searchMode === 'lepote' ? 'reg_lepote.id' : 'reg_har.id';
        const idNum  = parseInt(term);

        const runQ = (val: number | string) => getDocs(
          after
            ? query(base, pf, where(field, '==', val), limit(PAGE_SIZE), startAfter(after))
            : query(base, pf, where(field, '==', val), limit(PAGE_SIZE))
        );

        if (!isNaN(idNum)) {
          const snap = await runQ(idNum);
          if (snap.docs.length > 0) { docs = snap.docs; more = snap.docs.length === PAGE_SIZE; }
        }
        // Fallback: try as string
        if (docs.length === 0) {
          const snap = await runQ(term);
          docs = snap.docs; more = snap.docs.length === PAGE_SIZE;
        }

      } else if (term && searchMode === 'name') {
        // Prefix search on surname_el
        const cap = term.charAt(0).toUpperCase() + term.slice(1);
        const snap = await getDocs(
          after
            ? query(base, pf, where('surname_el', '>=', cap), where('surname_el', '<=', cap + RANGE_END), orderBy('surname_el'), limit(PAGE_SIZE), startAfter(after))
            : query(base, pf, where('surname_el', '>=', cap), where('surname_el', '<=', cap + RANGE_END), orderBy('surname_el'), limit(PAGE_SIZE))
        );
        docs = snap.docs; more = snap.docs.length === PAGE_SIZE;

      } else {
        // Default: alphabetical
        const snap = await getDocs(
          after
            ? query(base, pf, orderBy('surname_el'), limit(PAGE_SIZE), startAfter(after))
            : query(base, pf, orderBy('surname_el'), limit(PAGE_SIZE))
        );
        docs = snap.docs; more = snap.docs.length === PAGE_SIZE;
      }

      const parsed = docs.map(parseMemberDoc).filter((m): m is PublicMember => m !== null);
      setMembers(prev => append ? [...prev, ...parsed] : parsed);
      setHasMore(more);
      setLastDoc(docs[docs.length - 1] ?? null);
    } catch (e: any) {
      console.error('Members fetch error:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // ── Guards ───────────────────────────────────────────────────────
  if (status === 'loading' || enabled === null) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!session)          return null;
  if (enabled === false) return <ComingSoon label="Αναβάτες" />;

  const placeholder =
    searchMode === 'lepote' ? 'Αριθμός μητρώου ΛΕ.ΠΟ.Τ.Ε.' :
    searchMode === 'har'    ? 'Αριθμός μητρώου H.A.R.' :
                              'Αναζήτηση με επώνυμο...';

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🏆 Hall of Fame</h1>
          <p className="text-white/40 text-sm">
            Αναβάτες που έχουν επιλέξει να μοιραστούν το ιστορικό τους
          </p>
        </div>

        {/* Search controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">

          {/* Mode toggle */}
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
            <button
              onClick={() => { setSearchMode('name'); setSearch(''); }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                searchMode === 'name'
                  ? 'bg-cyan-500 text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Επώνυμο
            </button>
            <button
              onClick={() => { setSearchMode('lepote'); setSearch(''); }}
              className={`px-2 py-1.5 rounded-lg transition-all ${
                searchMode === 'lepote'
                  ? 'bg-white/20 ring-2 ring-cyan-500'
                  : 'hover:bg-white/10 opacity-60 hover:opacity-100'
              }`}
              title="Αναζήτηση με μητρώο ΛΕ.ΠΟ.Τ.Ε."
            >
              <img src="/logos/650000.png" alt="ΛΕ.ΠΟ.Τ.Ε."
                className="w-8 h-8 object-contain rounded-full"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </button>
            <button
              onClick={() => { setSearchMode('har'); setSearch(''); }}
              className={`px-2 py-1.5 rounded-lg transition-all ${
                searchMode === 'har'
                  ? 'bg-white/20 ring-2 ring-cyan-500'
                  : 'hover:bg-white/10 opacity-60 hover:opacity-100'
              }`}
              title="Αναζήτηση με μητρώο H.A.R."
            >
              <img src="/logos/659999.png" alt="H.A.R."
                className="w-8 h-8 object-contain rounded-full"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </button>
          </div>

          {/* Search input */}
          <input
            type={searchMode === 'name' ? 'text' : 'number'}
            placeholder={placeholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 text-white
              placeholder-white/30 rounded-xl px-4 py-3 text-sm
              focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Count */}
        {!loading && members.length > 0 && (
          <p className="text-white/30 text-xs mb-6">
            {members.length} αναβάτες{hasMore ? '+' : ''}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🚴</div>
            <p className="text-white/30">
              {search ? 'Δεν βρέθηκαν αναβάτες' : 'Κανένα δημόσιο προφίλ ακόμα'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {members.map(m => <MemberCard key={m.id} m={m} />)}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchPage(true)}
                  disabled={loadingMore}
                  className="bg-white/5 border border-white/10 text-white/70 hover:text-white
                    hover:bg-white/10 px-8 py-3 rounded-xl text-sm font-bold
                    transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : null}
                  {loadingMore ? 'Φόρτωση...' : `Επόμενοι ${PAGE_SIZE}`}
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
