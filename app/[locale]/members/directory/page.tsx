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

const PAGE_SIZE = 20;

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
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          m.isInsured
            ? 'text-green-400 bg-green-500/10 border-green-500/25'
            : 'text-red-400 bg-red-500/10 border-red-500/25'
        }`}>
          {m.isInsured ? t('insured') : t('notInsured')}
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

  const [members,     setMembers]     = useState<DirectoryMember[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [cursor,      setCursor]      = useState<Cursor | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const [search,     setSearch]     = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('name');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth guard ───────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.replace('/login'); return; }
  }, [session, status]);

  // ── Debounced fetch on search / mode change ──────────────────────
  useEffect(() => {
    if (!session) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPage(false), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, searchMode, session]);

  async function fetchPage(append: boolean) {
    if (append) setLoadingMore(true);
    else        setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/member/directory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: search.trim(),
          mode: searchMode,
          cursor: append ? cursor : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Search failed');

      setMembers(prev => append ? [...prev, ...json.results] : json.results);
      setCursor(json.nextCursor ?? null);
      setHasMore(!!json.nextCursor);
    } catch (e) {
      console.error('Member directory fetch error:', e);
      setError(e instanceof Error ? e.message : 'Error');
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
                  {loadingMore ? t('loadingMore') : t('nextPage', { count: PAGE_SIZE })}
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
