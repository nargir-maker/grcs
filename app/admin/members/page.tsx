'use client';

// app/admin/members/page.tsx
// Admin — search all members (public + private) and jump to the registry editor.
// Mirrors the mobile app's admin members_directory_page.dart search modes.

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import Link from 'next/link';

type SearchMode = 'name' | 'lepote' | 'har';

interface MemberResult {
  id: string;
  firstName: string;
  lastName: string;
  lepoteId: string;
  harId: string;
  accountType: string;
  profileType: string;
}

export default function AdminMembersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  const [results, setResults] = useState<MemberResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('name');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth check ─────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.email) { router.replace('/'); return; }
    checkAdmin(session.user.email);
  }, [session, status]);

  async function checkAdmin(email: string) {
    try {
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('email', '==', email))
      );
      if (usersSnap.empty) { router.replace('/'); return; }

      const linkedId = usersSnap.docs[0].data().linkedLegacyMemberId?.toString() ?? '';
      if (!linkedId) { router.replace('/'); return; }

      const memberSnap = await getDoc(doc(db, 'members', linkedId));
      if (!memberSnap.exists()) { router.replace('/'); return; }

      const accountType = memberSnap.data().account_type?.toString() ?? 'user';
      if (accountType !== 'admin') { router.replace('/'); return; }

      setAuthorized(true);
    } catch (e) {
      console.error('Admin check error:', e);
      router.replace('/');
    } finally {
      setChecking(false);
    }
  }

  // ── Search (debounced) ────────────────────────────────────────────
  useEffect(() => {
    if (!authorized) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runSearch, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, searchMode, authorized]);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/member/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: search.trim(), mode: searchMode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Search failed');
      setResults(json.results ?? []);
    } catch (e: any) {
      console.error('Member search error:', e);
      setError(e.message ?? 'Σφάλμα αναζήτησης');
    } finally {
      setLoading(false);
    }
  }

  if (checking || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!authorized) return null;

  const placeholder =
    searchMode === 'lepote' ? 'Αριθμός μητρώου ΛΕ.ΠΟ.Τ.Ε.' :
    searchMode === 'har'    ? 'Αριθμός μητρώου H.A.R.' :
                              'Αναζήτηση με επώνυμο...';

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">👥</span>
            <h1 className="text-3xl font-bold text-white">Επεξεργασία Μητρώου Μελών</h1>
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30
              px-2 py-1 rounded-full font-bold">ADMIN</span>
          </div>
          <p className="text-white/40 text-sm">
            Αναζήτησε ένα μέλος για να επεξεργαστείς τα στοιχεία μητρώου του
          </p>
          <Link href="/admin" className="text-cyan-400 text-xs hover:underline mt-1 inline-block">
            ← Admin Panel
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
            {(['name', 'lepote', 'har'] as SearchMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setSearchMode(m); setSearch(''); }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  searchMode === m
                    ? 'bg-cyan-500 text-black'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {m === 'name' ? 'Επώνυμο' : m === 'lepote' ? 'ΛΕ.ΠΟ.Τ.Ε.' : 'H.A.R.'}
              </button>
            ))}
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

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-16">
            {search ? 'Δεν βρέθηκαν μέλη' : 'Πληκτρολόγησε για αναζήτηση ή δες τα πρώτα μέλη'}
          </p>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {results.map(m => (
              <Link
                key={m.id}
                href={`/admin/members/${m.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="text-white/40 text-xs font-mono truncate">
                    {m.lepoteId && `ΛΕ #${m.lepoteId}`}
                    {m.lepoteId && m.harId && ' · '}
                    {m.harId && `HAR #${m.harId}`}
                    {!m.lepoteId && !m.harId && '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {m.accountType === 'admin' && (
                    <span className="text-[10px] font-bold text-orange-400 bg-orange-500/15
                      border border-orange-500/25 px-2 py-0.5 rounded-full">ADMIN</span>
                  )}
                  <span className="text-[10px] text-white/40 bg-white/5 border border-white/10
                    px-2 py-0.5 rounded-full">
                    {m.profileType === 'public' ? 'δημόσιο' : 'ιδιωτικό'}
                  </span>
                  <span className="text-white/30 text-xs">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
