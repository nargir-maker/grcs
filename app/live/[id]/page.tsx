'use client';

// app/live/[id]/page.tsx
// Real-time map showing all riders for a specific brevet

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { db, rtdb } from '@/app/lib/firebase';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/app/components/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-white/30 text-sm">Φόρτωση χάρτη...</p>
      </div>
    </div>
  ),
});

interface Rider {
  id: string;
  fullName: string;
  registryId: string;
  status: string;
  lat: number;
  lng: number;
  speed: string;
  avgSpeed: string;
  currentKm: string;
  altitude: string;
  timestamp: number;
  gender: string;
  checkpoints: Record<string, string>;
}

interface BrevetInfo {
  title: string;
  distance: number;
  date: string;
  gpxUrl: string;
  controls: { km: number; name: string; lat: number; lng: number }[];
}

export default function LiveBrevetPage() {
  const params = useParams();
  const id = params.id as string;
  const [brevet, setBrevet] = useState<BrevetInfo | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch brevet info from Firestore
  useEffect(() => {
    async function fetchBrevet() {
      try {
        const docSnap = await getDoc(doc(db, 'all_brevets', id));
        if (!docSnap.exists()) return;
        const d = docSnap.data();
        const info  = d.info  || {};
        const route = d.route || {};
        const rawControls = Array.isArray(d.controls) ? d.controls : [];
        setBrevet({
          title:    info.title?.toString() ?? id,
          distance: parseInt(info.distance?.toString() ?? '0') || 0,
          date:     info.date?.toString() ?? '',
          gpxUrl:   route.gpxUrl?.toString() ?? '',
          controls: rawControls.map((c: any) => ({
            km:   parseInt(c.km?.toString() ?? '0') || 0,
            name: c.name?.toString() ?? '',
            lat:  parseFloat(c.lat?.toString() ?? '0') || 0,
            lng:  parseFloat(c.lng?.toString() ?? '0') || 0,
          })),
        });
      } catch (e) {
        console.error('Brevet fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchBrevet();
  }, [id]);

  // RTDB real-time listener for riders
  useEffect(() => {
    if (!id) return;
    const participantsRef = ref(rtdb, `live_events/${id}/participants`);

    onValue(participantsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setRiders([]); return; }

      const riderList: Rider[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id:          key,
        fullName:    val.fullName ?? key,
        registryId:  val.registryId ?? '',
        status:      val.status ?? 'unknown',
        lat:         parseFloat(val.lat ?? '0') || 0,
        lng:         parseFloat(val.lng ?? '0') || 0,
        speed:       val.speed ?? '0',
        avgSpeed:    val.avg_speed ?? '0',
        currentKm:   val.current_km ?? '0',
        altitude:    val.altitude ?? '0',
        timestamp:   val.timestamp ?? 0,
        gender:      val.gender ?? 'M',
        checkpoints: val.checkpoints ?? {},
      }));

      setRiders(riderList);
      setLastUpdate(new Date());
    });

    return () => off(participantsRef);
  }, [id]);

  const activeRiders   = riders.filter(r => r.status !== 'DNF' && r.status !== 'FINISHED' && r.lat !== 0);
  const finishedRiders = riders.filter(r => r.status === 'FINISHED');
  const dnfRiders      = riders.filter(r => r.status === 'DNF');

  function statusColor(status: string) {
    if (status === 'FINISHED') return 'text-green-400';
    if (status === 'DNF')      return 'text-red-400';
    if (status === 'ready')    return 'text-yellow-400';
    return 'text-cyan-400';
  }

  function statusLabel(status: string) {
    if (status === 'FINISHED') return '🏁 Τερμάτισε';
    if (status === 'DNF')      return '❌ DNF';
    if (status === 'ready')    return '⏳ Έτοιμος';
    if (status === 'OVT')      return '⏱️ OVT';
    return '🚴 Σε πορεία';
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-5xl mx-auto">

        {/* ── BACK ── */}
        <a href="/live" className="inline-flex items-center gap-2 text-white/40
          hover:text-white text-sm mb-6 transition-colors">
          ← Πίσω στα Live Brevets
        </a>

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-bold tracking-wider">LIVE</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{brevet?.title ?? id}</h1>
            {brevet && (
              <p className="text-white/40 text-sm mt-1">
                {brevet.distance}km · {brevet.date ? new Date(brevet.date).toLocaleDateString('el-GR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                }) : '—'}
              </p>
            )}
          </div>
          {lastUpdate && (
            <span className="text-white/20 text-xs shrink-0">
              Ενημέρωση: {lastUpdate.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{activeRiders.length}</div>
            <div className="text-white/40 text-xs mt-1">🚴 Σε πορεία</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{finishedRiders.length}</div>
            <div className="text-white/40 text-xs mt-1">🏁 Τερμάτισαν</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{dnfRiders.length}</div>
            <div className="text-white/40 text-xs mt-1">❌ DNF</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{riders.length}</div>
            <div className="text-white/40 text-xs mt-1">👥 Σύνολο</div>
          </div>
        </div>

        {/* ── MAP ── */}
        {brevet && (
          <div className="mb-6">
            <LiveMap
              gpxUrl={brevet.gpxUrl}
              controls={brevet.controls}
              riders={riders}
              selectedRiderId={selectedRider}
              onRiderSelect={setSelectedRider}
            />
          </div>
        )}

        {/* ── RIDERS LIST ── */}
        {riders.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">Αναβάτες</h2>
            </div>
            <div className="divide-y divide-white/5">
              {riders
                .sort((a, b) => parseFloat(b.currentKm) - parseFloat(a.currentKm))
                .map(rider => (
                <div
                  key={rider.id}
                  onClick={() => setSelectedRider(
                    selectedRider === rider.id ? null : rider.id
                  )}
                  className={`px-6 py-4 flex items-center gap-4 cursor-pointer
                    hover:bg-white/5 transition-colors ${
                    selectedRider === rider.id ? 'bg-cyan-500/10' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <span className="text-sm">{rider.gender === 'F' ? '👩' : '👨'}</span>
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{rider.fullName}</p>
                    <p className={`text-xs ${statusColor(rider.status)}`}>
                      {statusLabel(rider.status)}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-right shrink-0">
                    {rider.currentKm !== '0' && (
                      <div>
                        <div className="text-white text-sm font-bold">{parseFloat(rider.currentKm).toFixed(0)}km</div>
                        <div className="text-white/30 text-xs">διανυθείσα</div>
                      </div>
                    )}
                    {rider.avgSpeed !== '0' && (
                      <div>
                        <div className="text-cyan-400 text-sm font-bold">{rider.avgSpeed}</div>
                        <div className="text-white/30 text-xs">km/h μ.ο.</div>
                      </div>
                    )}
                  </div>

                  {/* Focus button */}
                  {rider.lat !== 0 && (
                    <div className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${
                      selectedRider === rider.id
                        ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                        : 'border-white/20 text-white/30'
                    }`}>
                      📍
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {riders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/30">Δεν υπάρχουν αναβάτες ακόμα</p>
          </div>
        )}

      </div>
    </div>
  );
}
