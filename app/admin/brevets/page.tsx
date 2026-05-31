'use client';

// app/admin/brevets/page.tsx
// Admin brevet list — filter by year, click to edit
// ── TODO: SECURITY ─────────────────────────────────────────────────
// Currently all_brevets allows write: if true in Firestore rules.
// This means anyone with Firestore knowledge could edit brevet data.
// Fix: create app/api/admin/brevet/route.ts using Firebase Admin SDK
// (same pattern as app/api/admin/settings/route.ts)
// and change Firestore rule back to: allow write: if false;
// Priority: after go-live, Phase 2.
// ──────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import Link from 'next/link';


interface BrevetItem {
  id: string;
  title: string;
  distance: number;
  date: string;
  start: string;
  organizerId: string;
  type: string;
  certification: string;
}

export default function AdminBrevetsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking]     = useState(true);
  const [brevets, setBrevets]       = useState<BrevetItem[]>([]);
  const [loading, setLoading]       = useState(false);
  const [year, setYear]             = useState(new Date().getFullYear());

  const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

  // ── Auth check (same as admin page) ───────────────────────────────
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
      if (memberSnap.data().account_type !== 'admin') { router.replace('/'); return; }
      setAuthorized(true);
    } catch { router.replace('/'); }
    finally { setChecking(false); }
  }

  // ── Fetch brevets for selected year ───────────────────────────────
  useEffect(() => {
    if (!authorized) return;
    fetchBrevets(year);
  }, [authorized, year]);

  async function fetchBrevets(y: number) {
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'all_brevets'),
        where('info.date', '>=', `${y}-01-01`),
        where('info.date', '<=', `${y}-12-31`)
      ));
      const data: BrevetItem[] = snap.docs.map(d => {
        const info  = d.data().info  ?? {};
        const route = d.data().route ?? {};
        let date = '';
        try {
          const raw = info.date?.toString() ?? '';
          const dt = new Date(raw.split('+')[0]);
          if (!isNaN(dt.getTime())) date = dt.toISOString();
        } catch {}
        return {
          id:            d.id,
          title:         info.title?.toString() ?? d.id,
          distance:      parseInt(info.distance?.toString() ?? '0') || 0,
          date,
          start:         route.start?.toString() ?? '',
          organizerId:   info.organizerId?.toString() ?? '',
          type:          info.type?.toString() ?? 'BRM',
          certification: info.certification?.toString() ?? '',
        };
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setBrevets(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  if (checking || status === 'loading') return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin"
            className="text-white/40 hover:text-white text-sm transition-colors">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold text-white">📅 Brevets</h1>
          <span className="text-xs bg-red-500/20 text-red-400 border
            border-red-500/30 px-2 py-1 rounded-full font-bold">ADMIN</span>
        </div>

        {/* Year filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {YEARS.map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                year === y
                  ? 'bg-cyan-500 text-black'
                  : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
              }`}>
              {y}
            </button>
          ))}
        </div>

        {/* Brevet list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent
              rounded-full animate-spin" />
          </div>
        ) : brevets.length === 0 ? (
          <p className="text-white/30 text-center py-16">
            Δεν βρέθηκαν brevets για το {year}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Count */}
            <p className="text-white/30 text-xs mb-2">{brevets.length} brevets</p>

            {brevets.map(b => (
              <div key={b.id}
                className="flex items-center justify-between gap-4
                  bg-white/5 border border-white/10 rounded-xl px-4 py-3
                  hover:border-white/20 transition-colors">

                {/* Left: info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Distance badge */}
                  <span className="flex-shrink-0 text-cyan-400 font-bold text-sm
                    bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-lg
                    min-w-[56px] text-center">
                    {b.distance}km
                  </span>

                  {/* Title + meta */}
                  <div className="min-w-0">
                    <div className="text-white font-medium text-sm truncate">
                      {b.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {b.date && (
                        <span className="text-white/40 text-xs">
                          {new Date(b.date).toLocaleDateString('el-GR', {
                            day: 'numeric', month: 'short'
                          })}
                        </span>
                      )}
                      {b.start && (
                        <span className="text-white/30 text-xs">
                          📍 {b.start}
                        </span>
                      )}
                      {b.certification && (
                        <span className="text-white/30 text-xs">
                          {b.certification}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit button */}
                <Link
                  href={`/admin/brevets/${b.id}`}
                  className="flex-shrink-0 bg-white/5 hover:bg-cyan-500/20
                    border border-white/10 hover:border-cyan-500/40
                    text-white/60 hover:text-cyan-400
                    text-xs font-bold px-3 py-2 rounded-lg transition-all"
                >
                  ✏️ Επεξεργασία
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}