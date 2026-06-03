'use client';

// app/live/page.tsx
// Lists all currently active brevets with rider counts

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue, off, get } from 'firebase/database';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, rtdb } from '@/app/lib/firebase';

interface LiveBrevet {
  id: string;
  title: string;
  distance: number;
  date: string;
  organizerId: string;
  riderCount: number;
  activeRiders: number;   // status != DNF && status != FINISHED
  finishedRiders: number;
  dnfRiders: number;
}

interface FriendlyRide {
  code: string;
  participantCount: number;
  createdAt: string;
}

export default function LivePage() {
  const router = useRouter();
  const [brevets, setBrevets] = useState<LiveBrevet[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendlyRides, setFriendlyRides] = useState<FriendlyRide[]>([]);
  const [codeInput, setCodeInput] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    async function fetchActiveBrevets() {
      try {
        // Fetch brevets from last 3 days to next 1 day (covers running brevets)
        const now = new Date();
        const from = new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0];
        const to   = new Date(now.getTime() + 1 * 86400000).toISOString().split('T')[0];

        const q = query(
          collection(db, 'all_brevets'),
          where('info.date', '>=', from),
          where('info.date', '<=', to)
        );
        const snap = await getDocs(q);

        const liveList: LiveBrevet[] = [];

        for (const docSnap of snap.docs) {
          const d = docSnap.data();
          const info = d.info || {};
          liveList.push({
            id:            docSnap.id,
            title:         info.title?.toString() ?? docSnap.id,
            distance:      parseInt(info.distance?.toString() ?? '0') || 0,
            date:          info.date?.toString() ?? '',
            organizerId:   info.organizerId?.toString() ?? '',
            riderCount:    0,
            activeRiders:  0,
            finishedRiders: 0,
            dnfRiders:     0,
          });
        }

        setBrevets(liveList);
        setLoading(false);

        // Now attach RTDB listeners for each brevet
        liveList.forEach((brevet) => {
          const participantsRef = ref(rtdb, `live_events/${brevet.id}/participants`);
          onValue(participantsRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            const riders = Object.values(data) as any[];
            const active   = riders.filter(r => r.status && r.status !== 'DNF' && r.status !== 'FINISHED' && r.lat).length;
            const finished = riders.filter(r => r.status === 'FINISHED').length;
            const dnf      = riders.filter(r => r.status === 'DNF').length;

            setBrevets(prev => prev.map(b =>
              b.id === brevet.id
                ? { ...b, riderCount: riders.length, activeRiders: active, finishedRiders: finished, dnfRiders: dnf }
                : b
            ));
          });
        });

        // Cleanup listeners on unmount
        return () => {
          liveList.forEach(brevet => {
            off(ref(rtdb, `live_events/${brevet.id}/participants`));
          });
        };

      } catch (e) {
        console.error('Live page error:', e);
        setLoading(false);
      }
    }

    fetchActiveBrevets();

    // Friendly rides — one-time read from RTDB
    get(ref(rtdb, 'friendly_rides')).then(snap => {
      if (!snap.exists()) return;
      const data = snap.val() as Record<string, any>;
      const active = Object.entries(data)
        .filter(([, ride]) => ride.status === 'active')
        .map(([code, ride]) => ({
          code,
          participantCount: ride.participants ? Object.keys(ride.participants).length : 0,
          createdAt: ride.created_at ?? '',
        }));
      setFriendlyRides(active);
    });
  }, []);

  const activeBrevets  = brevets.filter(b => b.riderCount > 0);
  const emptyBrevets   = brevets.filter(b => b.riderCount === 0);

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-4xl mx-auto">

        {/* ── HEADER ── */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <h1 className="text-3xl font-bold text-white">Live Tracking</h1>
          </div>
          <p className="text-white/50">Brevets σε εξέλιξη αυτή τη στιγμή</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/50 text-sm">Φόρτωση live brevets...</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── ACTIVE BREVETS ── */}
            {activeBrevets.length > 0 ? (
              <div className="flex flex-col gap-4 mb-8">
                {activeBrevets.map(b => (
                  <a key={b.id} href={`/live/${b.id}`}
                    className="bg-white/5 border-2 border-red-500/30 rounded-2xl p-6
                      hover:border-red-500/60 transition-all cursor-pointer block no-underline">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-red-400 text-xs font-bold tracking-wider">LIVE</span>
                        </div>
                        <h2 className="text-white font-bold text-lg leading-tight mb-1">{b.title}</h2>
                        <p className="text-white/40 text-sm">
                          📅 {b.date ? new Date(b.date).toLocaleDateString('el-GR', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          }) : '—'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="bg-cyan-500/10 text-cyan-400 text-sm font-bold
                          px-3 py-1 rounded-full border border-cyan-500/20">
                          {b.distance}km
                        </span>
                      </div>
                    </div>

                    {/* Rider stats */}
                    <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{b.activeRiders}</div>
                        <div className="text-white/40 text-xs">🚴 Σε πορεία</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{b.finishedRiders}</div>
                        <div className="text-white/40 text-xs">🏁 Τερμάτισαν</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{b.dnfRiders}</div>
                        <div className="text-white/40 text-xs">❌ DNF</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-cyan-400">{b.riderCount}</div>
                        <div className="text-white/40 text-xs">👥 Σύνολο</div>
                      </div>
                      <div className="ml-auto flex items-center">
                        <span className="text-cyan-400 text-sm font-bold">Δες χάρτη →</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 mb-8">
                <div className="text-5xl mb-4">🚴</div>
                <p className="text-white/30 text-lg">Δεν υπάρχουν ενεργά brevets αυτή τη στιγμή</p>
                <p className="text-white/20 text-sm mt-2">Έλεγξε ξανά την ημέρα ενός brevet</p>
              </div>
            )}

            {/* ── FRIENDLY RIDES ── */}
            <div className="mb-8">
              <h2 className="text-white/40 text-sm font-bold uppercase tracking-wider mb-3">
                Φιλικές Βόλτες {friendlyRides.length > 0 && (
                  <span className="text-purple-400 normal-case font-normal ml-1">
                    · {friendlyRides.length} σε εξέλιξη
                  </span>
                )}
              </h2>

              {friendlyRides.length > 0 && (
                <div className="flex flex-col gap-3 mb-3">
                  {friendlyRides.map(ride => (
                    <button
                      key={ride.code}
                      onClick={() => router.push(`/friendly/${ride.code}`)}
                      className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-5 py-4
                        flex items-center justify-between hover:bg-purple-500/20 transition-all text-left w-full"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                          <span className="text-purple-400 text-xs font-bold tracking-wider">LIVE</span>
                        </div>
                        <p className="text-white font-medium">Φιλική Βόλτα #{ride.code}</p>
                        <p className="text-white/40 text-xs mt-0.5">
                          👥 {ride.participantCount} συμμετέχοντες
                        </p>
                      </div>
                      <span className="text-purple-400 text-sm font-bold">Δες χάρτη →</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Code input */}
              {!showCodeInput ? (
                <button
                  onClick={() => setShowCodeInput(true)}
                  className="w-full border border-dashed border-white/20 rounded-xl px-5 py-4
                    text-white/40 hover:text-white/60 hover:border-white/30 transition-all text-sm"
                >
                  + Εισαγωγή κωδικού φιλικής βόλτας
                </button>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                  <p className="text-white/60 text-sm mb-3">Εισήγαγε τον 5ψήφιο κωδικό:</p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={codeInput}
                      onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(''); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (codeInput.trim().length < 4) { setCodeError('Ο κωδικός είναι πολύ μικρός.'); return; }
                          router.push(`/friendly/${codeInput.trim()}`);
                        }
                      }}
                      placeholder="π.χ. 8YSM36"
                      maxLength={8}
                      autoFocus
                      className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2.5
                        text-white placeholder-white/30 text-sm font-mono tracking-widest
                        focus:outline-none focus:border-purple-500/50"
                    />
                    <button
                      onClick={() => {
                        if (codeInput.trim().length < 4) { setCodeError('Ο κωδικός είναι πολύ μικρός.'); return; }
                        router.push(`/friendly/${codeInput.trim()}`);
                      }}
                      className="bg-purple-500/20 border border-purple-500/30 text-purple-400
                        px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-purple-500/30 transition-all"
                    >
                      Πήγαινε →
                    </button>
                    <button
                      onClick={() => { setShowCodeInput(false); setCodeInput(''); setCodeError(''); }}
                      className="text-white/30 hover:text-white/60 px-2 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  {codeError && <p className="text-red-400 text-xs mt-2">{codeError}</p>}
                </div>
              )}
            </div>

            {/* ── UPCOMING BREVETS (no riders yet) ── */}
            {emptyBrevets.length > 0 && (
              <>
                <h2 className="text-white/40 text-sm font-bold uppercase tracking-wider mb-3">
                  Προσεχώς
                </h2>
                <div className="flex flex-col gap-3">
                  {emptyBrevets.map(b => (
                    <div key={b.id}
                      className="bg-white/3 border border-white/10 rounded-xl px-5 py-4
                        flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm font-medium">{b.title}</p>
                        <p className="text-white/30 text-xs mt-0.5">
                          {b.date ? new Date(b.date).toLocaleDateString('el-GR', {
                            day: 'numeric', month: 'long'
                          }) : '—'} · {b.distance}km
                        </p>
                      </div>
                      <span className="text-white/20 text-xs">Δεν έχει ξεκινήσει</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
