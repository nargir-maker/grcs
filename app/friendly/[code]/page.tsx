'use client';

// app/friendly/[code]/page.tsx
// Web viewer for a friendly ride session
// Reads from friendly_rides/{code}/participants in RTDB

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '@/app/lib/firebase';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('../../components/LiveMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '82vh' }} className="bg-white/5 rounded-2xl
      border border-white/10 flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent
          rounded-full animate-spin mx-auto mb-2" />
        <p className="text-white/30 text-sm">Φόρτωση χάρτη...</p>
      </div>
    </div>
  ),
});

interface Rider {
  id: string;
  fullName: string;
  status: string;
  lat: number;
  lng: number;
  speed: string;
  avgSpeed: string;
  currentKm: string;
  timestamp: number;
  gender: string;
}

// ── Glassmorphism chip ─────────────────────────────────────────────────────────
function Chip({ value, label, color }: {
  value: string | number; label: string; color: string;
}) {
  return (
    <div style={{
      background: 'rgba(10,22,40,0.72)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 12,
      padding: '6px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color, fontSize: 18, fontWeight: 'bold', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
        {label}
      </span>
    </div>
  );
}

export default function FriendlyRidePage() {
  const params  = useParams();
  const code    = (params.code as string)?.toUpperCase();

  const [riders, setRiders]         = useState<Rider[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [notFound, setNotFound]     = useState(false);

  // ── RTDB listener ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!code) return;
    const participantsRef = ref(rtdb, `friendly_rides/${code}/participants`);

    onValue(participantsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setRiders([]);
        setNotFound(true);
        return;
      }
      setNotFound(false);
      const list: Rider[] = Object.entries(data)
        .filter(([, val]: [string, any]) => val.status !== 'left')
        .map(([key, val]: [string, any]) => ({
          id:        key,
          fullName:  val.fullName ?? key,
          status:    val.status ?? 'active',
          lat:       parseFloat(val.lat ?? '0') || 0,
          lng:       parseFloat(val.lng ?? '0') || 0,
          speed:     val.speed ?? '0',
          avgSpeed:  val.avg_speed ?? '0',
          currentKm: val.current_km ?? '0',
          timestamp: val.timestamp ?? 0,
          gender:    val.gender ?? 'M',
        }));
      setRiders(list);
      setLastUpdate(new Date());
    });

    return () => off(participantsRef);
  }, [code]);

  const activeRiders = riders.filter(r => r.lat !== 0);

  // ── Not found ─────────────────────────────────────────────────────────────────
  if (notFound && riders.length === 0) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🚴</div>
        <h1 className="text-white font-bold text-xl mb-2">Βόλτα δεν βρέθηκε</h1>
        <p className="text-white/40 text-sm mb-6">
          Δεν υπάρχει ενεργή φιλική βόλτα με κωδικό{' '}
          <span className="text-green-400 font-bold">{code}</span>.
        </p>
        <a href="/"
          className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
          ← Επιστροφή στην αρχική
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── HEADER ── */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <span className="text-green-400 text-xs font-bold tracking-wider">LIVE</span>
          <h1 className="text-xl font-bold text-white">Φιλική Βόλτα 🚴‍♂️</h1>
          <span className="text-white/30 text-sm font-mono tracking-widest">
            {code}
          </span>
        </div>

        {/* ── MAP CONTAINER ── */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 mb-6"
          style={{ height: '82vh' }}>

          {/* MAP */}
          <div className="absolute inset-0">
            <LiveMap
              gpxUrl=""
              controls={[]}
              riders={riders.map(r => ({
                ...r,
                registryId: r.id,
                altitude: '0',
                checkpoints: {},
              }))}
              selectedRiderId={selectedRider}
              onRiderSelect={setSelectedRider}
              mapHeight="100%"
            />
          </div>

          {/* ── STAT CHIPS — top left ── */}
          <div className="absolute top-3 left-3 z-[1000] flex flex-wrap gap-2">
            <Chip value={activeRiders.length} label="🚴 Σε βόλτα" color="#22c55e" />
            <Chip value={riders.length}       label="👥 Σύνολο"   color="white"   />
          </div>

          {/* ── LAST UPDATE — top right ── */}
          {lastUpdate && (
            <div className="absolute top-3 right-3 z-[1000]" style={{
              background: 'rgba(10,22,40,0.72)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: '5px 10px',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                Ενημέρωση: {lastUpdate.toLocaleTimeString('el-GR', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>

        {/* ── RIDERS LIST ── */}
        {riders.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">Αναβάτες</h2>
            </div>
            <div className="divide-y divide-white/5">
              {riders
                .sort((a, b) => parseFloat(b.currentKm) - parseFloat(a.currentKm))
                .map(rider => {
                  const mins = rider.timestamp
                    ? Math.floor((Date.now() - rider.timestamp) / 60000)
                    : null;
                  return (
                    <div
                      key={rider.id}
                      onClick={() => setSelectedRider(
                        selectedRider === rider.id ? null : rider.id
                      )}
                      className={`px-6 py-4 flex items-center gap-4 cursor-pointer
                        hover:bg-white/5 transition-colors ${
                        selectedRider === rider.id ? 'bg-green-500/10' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center
                        justify-center shrink-0">
                        <span className="text-sm">
                          {rider.gender === 'F' ? '👩' : '👨'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {rider.fullName}
                        </p>
                        <p className="text-xs text-green-400">🚴 Σε βόλτα</p>
                      </div>

                      <div className="flex gap-4 text-right shrink-0">
                        {rider.currentKm !== '0' && (
                          <div>
                            <div className="text-white text-sm font-bold">
                              {parseFloat(rider.currentKm).toFixed(1)}km
                            </div>
                            <div className="text-white/30 text-xs">διανυθείσα</div>
                          </div>
                        )}
                        {rider.avgSpeed !== '0' && (
                          <div>
                            <div className="text-cyan-400 text-sm font-bold">
                              {parseFloat(rider.avgSpeed).toFixed(1)}
                            </div>
                            <div className="text-white/30 text-xs">km/h μ.ο.</div>
                          </div>
                        )}
                        {mins !== null && (
                          <div>
                            <div className={`text-sm font-bold ${
                              mins > 5 ? 'text-red-400' : 'text-green-400'
                            }`}>
                              {mins < 1 ? 'Τώρα' : `${mins}λ`}
                            </div>
                            <div className="text-white/30 text-xs">σήμα</div>
                          </div>
                        )}
                      </div>

                      {rider.lat !== 0 && (
                        <div className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${
                          selectedRider === rider.id
                            ? 'border-green-500 text-green-400 bg-green-500/10'
                            : 'border-white/20 text-white/30'
                        }`}>
                          📍
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {riders.length === 0 && !notFound && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🚴</div>
            <p className="text-white/30">
              Αναμονή για αναβάτες να ενωθούν στη βόλτα...
            </p>
          </div>
        )}

        <p className="text-white/20 text-xs text-center mt-6">
          Φιλική Βόλτα · {code} · Greek Brevets Tracker
        </p>
      </div>
    </div>
  );
}