'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { db, rtdb } from '@/app/lib/firebase';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('../../components/LiveMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '70vh' }} className="bg-white/5 rounded-2xl border border-white/10
      flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent
          rounded-full animate-spin mx-auto mb-2" />
        <p className="text-white/30 text-sm">Φόρτωση χάρτη...</p>
      </div>
    </div>
  ),
});

// ── Elevation chart — lazy loaded ─────────────────────────────────────────────
const ElevationChart = dynamic(() => import('../../components/ElevationChart'), {
  ssr: false,
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

// ── Glassmorphism stat chip ────────────────────────────────────────────────────
function StatChip({ value, label, color }: {
  value: number; label: string; color: string;
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
      <span style={{ color, fontSize: 18, fontWeight: 'bold',
        lineHeight: 1, fontFamily: 'Arial, sans-serif' }}>
        {value}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
        {label}
      </span>
    </div>
  );
}

export default function LiveBrevetPage() {
  const params = useParams();
  const id = params.id as string;
  const [brevet, setBrevet]           = useState<BrevetInfo | null>(null);
  const [riders, setRiders]           = useState<Rider[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate]   = useState<Date | null>(null);
  const [showElevation, setShowElevation] = useState(false);
  const [scrubberKm, setScrubberKm]   = useState<number | null>(null);

  // Fetch brevet info
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

  // RTDB real-time listener
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
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent
        rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── BACK ── */}
        <a href="/live" className="inline-flex items-center gap-2 text-white/40
          hover:text-white text-sm mb-4 transition-colors">
          ← Πίσω στα Live Brevets
        </a>

        {/* ── HEADER ── */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-red-400 text-xs font-bold tracking-wider">LIVE</span>
          <h1 className="text-xl font-bold text-white truncate">{brevet?.title ?? id}</h1>
          {brevet && (
            <span className="text-white/30 text-sm shrink-0">
              {brevet.distance}km
            </span>
          )}
        </div>

        {/* ── MAP CONTAINER — relative so overlays can be absolute ── */}
        {brevet && (
          <div className="relative rounded-2xl overflow-hidden border border-white/10 mb-6"
            style={{ height: '70vh' }}>

            {/* MAP — fills container */}
            <div className="absolute inset-0">
              <LiveMap
                gpxUrl={brevet.gpxUrl}
                controls={brevet.controls}
                riders={riders}
                selectedRiderId={selectedRider}
                onRiderSelect={setSelectedRider}
                mapHeight="100%"
              />
            </div>

            {/* ── STAT CHIPS — glassmorphism top-left ── */}
            <div className="absolute top-3 left-3 z-[1000] flex flex-wrap gap-2">
              <StatChip value={activeRiders.length}   label="🚴 Σε πορεία"  color="#06b6d4" />
              <StatChip value={finishedRiders.length} label="🏁 Τερμάτισαν" color="#22c55e" />
              <StatChip value={dnfRiders.length}      label="❌ DNF"         color="#ef4444" />
              <StatChip value={riders.length}         label="👥 Σύνολο"      color="white"   />
            </div>

            {/* ── LAST UPDATE — glassmorphism top-right ── */}
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

            {/* ── ELEVATION TOGGLE BUTTON — bottom-right ── */}
            {brevet.gpxUrl && (
              <button
                onClick={() => setShowElevation(e => !e)}
                className="absolute z-[1000] flex items-center gap-1.5 px-3 py-2
                  rounded-xl text-xs font-bold border transition-all"
                style={{
                  bottom: showElevation ? 'calc(38% + 8px)' : 12,
                  right: 12,
                  background: showElevation
                    ? 'rgba(6,182,212,0.85)'
                    : 'rgba(10,22,40,0.80)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderColor: showElevation
                    ? 'rgba(6,182,212,0.6)'
                    : 'rgba(255,255,255,0.15)',
                  color: showElevation ? '#000' : '#06b6d4',
                }}
              >
                ⛰️ Υψόμετρο
              </button>
            )}

            {/* ── ELEVATION CHART — glassmorphism bottom panel ── */}
            {showElevation && brevet.gpxUrl && (
              <div
                className="absolute bottom-0 left-0 right-0 z-[999]"
                style={{
                  height: '38%',
                  background: 'linear-gradient(to top, rgba(10,22,40,0.82) 0%, rgba(10,22,40,0.60) 80%, rgba(10,22,40,0.10) 100%)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  borderTop: '1px solid rgba(6,182,212,0.2)',
                  padding: '12px 16px 8px',
                }}
              >
                {/* Close button */}
                <button
                  onClick={() => setShowElevation(false)}
                  className="absolute top-2 right-3 text-white/40 hover:text-white
                    text-xs z-10 transition-colors"
                >
                  ✕
                </button>
                <ElevationChart
                  gpxUrl={brevet.gpxUrl}
                  scrubberKm={scrubberKm}
                  onScrub={setScrubberKm}
                  defaultZoomed={false}
                />
              </div>
            )}
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
                    <p className={`text-xs ${statusColor(rider.status)}`}>
                      {statusLabel(rider.status)}
                    </p>
                  </div>
                  <div className="flex gap-4 text-right shrink-0">
                    {rider.currentKm !== '0' && (
                      <div>
                        <div className="text-white text-sm font-bold">
                          {parseFloat(rider.currentKm).toFixed(0)}km
                        </div>
                        <div className="text-white/30 text-xs">διανυθείσα</div>
                      </div>
                    )}
                    {rider.avgSpeed !== '0' && (
                      <div>
                        <div className="text-cyan-400 text-sm font-bold">
                          {rider.avgSpeed}
                        </div>
                        <div className="text-white/30 text-xs">km/h μ.ο.</div>
                      </div>
                    )}
                  </div>
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