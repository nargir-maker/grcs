'use client';

// app/members/directory/page.tsx
// Full member registry (ΛΕ.ΠΟ.Τ.Ε. + H.A.R.) — mirrors the mobile app's
// MembersDirectoryPage. Unlike /members (opt-in "Hall of Fame"), this shows
// every non-deleted member regardless of profile_type, gated only by being
// signed in (any NextAuth session) via a server API using the admin SDK.

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';
import { usePageEnabled, ComingSoon } from '@/app/lib/usePageEnabled';
import PageViews from '@/app/components/PageViews';
import { useTranslations } from 'next-intl';

const PAGE_SIZES = [20, 50, 100] as const;

type SearchMode = 'name' | 'lepote' | 'har';

interface DirectoryMember {
  id:          string;
  firstName:   string;
  lastName:    string;
  gender:      string;
  lepoteId:    string;
  harId:       string;
  isInsured:   boolean;
  profileType: string;
}

interface Cursor { surname: string; id: string; }

// ── Shield icons (insurance status) ─────────────────────────────────
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldXIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Member row ──────────────────────────────────────────────────────
function MemberRow({ m }: { m: DirectoryMember }) {
  const t = useTranslations('memberDirectory');
  const hasLepote = m.lepoteId && m.lepoteId !== '0';
  const hasHar    = m.harId    && m.harId    !== '0';

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/20
          flex items-center justify-center text-base shrink-0">
          {m.gender === 'F' ? '👩' : '👨'}
        </span>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {m.firstName} {m.lastName}
          </p>
          <p className="text-white/40 text-xs font-mono truncate">
            {hasLepote ? `ΛΕ #${m.lepoteId}` : t('noLepote')}
            {' · '}
            {hasHar ? `HAR #${m.harId}` : t('noHar')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span
          title={m.isInsured ? t('insured') : t('notInsured')}
          className={`flex items-center justify-center w-7 h-7 rounded-full border ${
            m.isInsured
              ? 'text-green-400 bg-green-500/10 border-green-500/25'
              : 'text-red-400 bg-red-500/10 border-red-500/25'
          }`}
        >
          {m.isInsured
            ? <ShieldIcon className="w-4 h-4" />
            : <ShieldXIcon className="w-4 h-4" />}
        </span>
        <span className="hidden sm:inline text-[10px] text-white/40 bg-white/5 border border-white/10
          px-2 py-0.5 rounded-full">
          {m.profileType === 'public' ? t('profilePublic') : t('profilePrivate')}
        </span>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function MemberDirectoryPage() {
  const { data: session, status } = useSession();
  const router  = useRouter();
  const enabled = usePageEnabled('memberDirectory');
  const t = useTranslations('memberDirectory');

  const [members,       setMembers]       = useState<DirectoryMember[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const [search,     setSearch]     = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('name');

  const [pageSize,       setPageSize]       = useState<number>(PAGE_SIZES[0]);
  const [pageIndex,      setPageIndex]      = useState(0);
  const [maxKnownPage,   setMaxKnownPage]   = useState(0);
  const [hasNextPage,    setHasNextPage]    = useState(false);
  const [cursorsByPage,  setCursorsByPage]  = useState<Record<number, Cursor | null>>({ 0: null });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth guard ───────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.replace('/login'); return; }
  }, [session, status]);

  // ── Debounced reset + fetch on search / mode / page size change ──
  useEffect(() => {
    if (!session) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCursorsByPage({ 0: null });
      setMaxKnownPage(0);
      setHasNextPage(false);
      loadPage(0, { 0: null }, pageSize);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, searchMode, pageSize, session]);

  async function loadPage(pageIdx: number, cursorMap: Record<number, Cursor | null>, size: number) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/member/directory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: search.trim(),
          mode: searchMode,
          cursor: cursorMap[pageIdx] ?? null,
          pageSize: size,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Search failed');

      const nextCursor: Cursor | null = json.nextCursor ?? null;
      setMembers(json.results);
      setPageIndex(pageIdx);
      if (nextCursor) {
        setCursorsByPage(prev => ({ ...prev, [pageIdx + 1]: nextCursor }));
        setMaxKnownPage(prev => Math.max(prev, pageIdx + 1));
      }
      setHasNextPage(!!nextCursor);
    } catch (e) {
      console.error('Member directory fetch error:', e);
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  function goToPage(idx: number) {
    if (idx < 0 || idx > maxKnownPage || idx === pageIndex) return;
    loadPage(idx, cursorsByPage, pageSize);
  }

  function changePageSize(size: number) {
    if (size === pageSize) return;
    setPageSize(size);
  }

  // ── Guards ───────────────────────────────────────────────────────
  if (status === 'loading' || enabled === null) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!session)          return null;
  if (enabled === false) return <ComingSoon label={t('comingSoonLabel')} />;

  const placeholder =
    searchMode === 'lepote' ? t('placeholderLepote') :
    searchMode === 'har'    ? t('placeholderHar') :
                              t('placeholderSurname');

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t('heading')}</h1>
          <p className="text-white/40 text-sm">{t('subheading')}</p>
        </div>

        {/* Search controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
            <button
              onClick={() => { setSearchMode('name'); setSearch(''); }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                searchMode === 'name' ? 'bg-cyan-500 text-black' : 'text-white/50 hover:text-white'
              }`}
            >
              {t('modeSurname')}
            </button>
            <button
              onClick={() => { setSearchMode('lepote'); setSearch(''); }}
              className={`px-2 py-1.5 rounded-lg transition-all ${
                searchMode === 'lepote' ? 'bg-white/20 ring-2 ring-cyan-500' : 'hover:bg-white/10 opacity-60 hover:opacity-100'
              }`}
              title={t('modeLepoteTitle')}
            >
              <img src="/logos/650000.png" alt="ΛΕ.ΠΟ.Τ.Ε."
                className="w-8 h-8 object-contain rounded-full"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </button>
            <button
              onClick={() => { setSearchMode('har'); setSearch(''); }}
              className={`px-2 py-1.5 rounded-lg transition-all ${
                searchMode === 'har' ? 'bg-white/20 ring-2 ring-cyan-500' : 'hover:bg-white/10 opacity-60 hover:opacity-100'
              }`}
              title={t('modeHarTitle')}
            >
              <img src="/logos/659999.png" alt="H.A.R."
                className="w-8 h-8 object-contain rounded-full"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </button>
          </div>

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

        {/* Per-page selector */}
        <div className="flex items-center justify-end gap-2 mb-3">
          <span className="text-white/40 text-xs">{t('perPage')}</span>
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            {PAGE_SIZES.map(size => (
              <button
                key={size}
                onClick={() => changePageSize(size)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  pageSize === size ? 'bg-cyan-500 text-black' : 'text-white/50 hover:text-white'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-white/30">{t('noneFound')}</p>
          </div>
        ) : (
          <>
            <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
              {members.map(m => <MemberRow key={m.id} m={m} />)}
            </div>

            {(pageIndex > 0 || hasNextPage) && (
              <div className="flex items-center justify-center gap-1.5 mt-8">
                <button
                  onClick={() => goToPage(pageIndex - 1)}
                  disabled={pageIndex === 0}
                  aria-label={t('prevPage')}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10
                    text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ‹
                </button>

                {Array.from({ length: maxKnownPage + 1 }, (_, i) => i).map(i => (
                  <button
                    key={i}
                    onClick={() => goToPage(i)}
                    aria-label={t('page', { page: i + 1 })}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                      i === pageIndex
                        ? 'bg-cyan-500 text-black'
                        : 'bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => goToPage(pageIndex + 1)}
                  disabled={!hasNextPage}
                  aria-label={t('nextPage')}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10
                    text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}

        <PageViews page="memberDirectory" />
      </div>
    </div>
  );
}
