'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '../../lib/firebase';
import { useParams } from 'next/navigation';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { useSession, signIn } from 'next-auth/react';
import RegistrationForm from '@/app/components/RegistrationForm';

const ElevationChart = dynamic(() => import('../../components/ElevationChart'), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
      <p className="text-white/30 text-sm">Φόρτωση γραφήματος...</p>
    </div>
  ),
});

const BrevetMap = dynamic(() => import('../../components/BrevetMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
      <p className="text-white/30 text-sm">Φόρτωση χάρτη...</p>
    </div>
  ),
});

interface ClimbSegment {
  startKm: number;
  endKm: number;
  category: string;
  avgGrade: number;
  maxGrade: number;
  elevationGain: number;
}

interface ControlPoint {
  km: number;
  name: string;
  lat: number;
  lng: number;
  isManned: boolean;
}

interface BrevetDetail {
  id: string;
  title: string;
  distance: number;
  date: string;
  organizer: string;
  organizerId: string;
  coOrganizerId: string;       // ← NEW
  start: string;
  finish: string;
  ascent: number;
  certification: string;
  type: string;
  gpxUrl: string;
  mapUrl: string;
  description: string;
  imageUrl: string;
  startCoords: string;
  finishCoords: string;
  controls: ControlPoint[];
  difficultyLabel: string;
  difficultyColor: string;
  difficultyEmoji: string;
  wcs: number;
  climbCount: number;
  duration: string;
  organizerLogo: string;
  climbProfile: ClimbSegment[];
}

function getDifficultyInfo(bdi: number): { label: string; color: string; emoji: string } {
  if (bdi < 4)  return { label: 'ΕΥΚΟΛΟ',        color: '#2E7D32', emoji: '🟢' };
  if (bdi < 7)  return { label: 'ΜΕΤΡΙΟ',         color: '#F9A825', emoji: '🟡' };
  if (bdi < 10) return { label: 'ΔΥΣΚΟΛΟ',        color: '#E65100', emoji: '🟠' };
  if (bdi < 14) return { label: 'ΠΟΛΥ ΔΥΣΚΟΛΟ',  color: '#D32F2F', emoji: '🔴' };
  if (bdi < 19) return { label: 'ΑΚΡΑΙΟ',         color: '#6A1B9A', emoji: '💀' };
  return         { label: 'ΘΡΥΛΙΚΟ',              color: '#1A1A1A', emoji: '☠️' };
}

function computeBDI(wcs: number, km: number, ascent: number): number {
  if (km <= 0) return 0;
  if (wcs > 0) {
    const distBase = Math.log(km / 100 + 1) * 2.2;
    return distBase + wcs / 1403;
  }
  return (km / 100) * (1 + ascent / (km * 8));
}

function getTimeLimit(distance: number): string {
  if (distance >= 1000) return '75:00 ώρες';
  if (distance >= 600)  return '40:00 ώρες';
  if (distance >= 400)  return '27:00 ώρες';
  if (distance === 360) return '24:00 ώρες';
  if (distance >= 300)  return '20:00 ώρες';
  return '13:30 ώρες';
}

function getOpenTime(cpKm: number, startDate: Date): string {
  const maxSpeed = cpKm <= 200 ? 34 : cpKm <= 400 ? 32 : 30;
  const hours = cpKm / maxSpeed;
  const openTime = new Date(startDate.getTime() + hours * 3600000);
  return openTime.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
}

function getCloseTime(cpKm: number, startDate: Date): string {
  let hours: number;
  if (cpKm === 0) { hours = 1; }
  else if (cpKm <= 600) { hours = cpKm / 15; }
  else { hours = cpKm / 11.428; }
  const closeTime = new Date(startDate.getTime() + hours * 3600000);
  return closeTime.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
}

export default function BrevetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [brevet, setBrevet] = useState<BrevetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const [showForm, setShowForm] = useState(false);
  const [scrubberKm, setScrubberKm] = useState<number | null>(null);
  const handleScrub = useCallback((km: number | null) => setScrubberKm(km), []);

  useEffect(() => {
    async function fetchBrevet() {
      try {
        let docSnap;
        try {
          docSnap = await getDocFromCache(doc(db, 'all_brevets', id));
          console.log('Detail: loaded from cache');
        } catch {
          docSnap = await getDoc(doc(db, 'all_brevets', id));
          console.log('Detail: loaded from server');
        }

        if (!docSnap.exists()) { setLoading(false); return; }

        const d = docSnap.data();
        const info  = d.info  || {};
        const route = d.route || {};
        const extra = d.extra || {};

        const organizerId   = info.organizerId?.toString()   ?? '';
        const coOrganizerId = info.coOrganizerId?.toString() ?? ''; // ← NEW

        let organizerName = '';
        let organizerLogo = '/logos/000000.png';
        if (organizerId) {
          const clubDoc = await getDoc(doc(db, 'clubs', organizerId));
          if (clubDoc.exists()) {
            const cd = clubDoc.data();
            organizerName = cd.CLUB_NAME_SHORT_EN || cd.CLUB_NAME_SHORT_GR || organizerId;
            organizerLogo = `/logos/${organizerId}.png`;
          }
        }

        const rawControls = Array.isArray(d.controls) ? d.controls : [];
        const controls: ControlPoint[] = rawControls.map((c: any) => ({
          km:       parseInt(c.km?.toString() ?? '0') || 0,
          name:     c.name?.toString() ?? '',
          lat:      parseFloat(c.lat?.toString() ?? '0') || 0,
          lng:      parseFloat(c.lng?.toString() ?? '0') || 0,
          isManned: c.isManned === true,
        }));

        const km     = parseInt(info.distance?.toString() ?? '0') || 0;
        const ascent = parseInt(route.ascent?.toString()  ?? '0') || 0;
        const wcs    = parseFloat(route.wcs?.toString()   ?? '0') || 0;
        const bdi    = computeBDI(wcs, km, ascent);
        const { label, color, emoji } = getDifficultyInfo(bdi);

        let parsedDate = '';
        try {
          const dateStr = info.date?.toString() ?? '';
          const d2 = new Date(dateStr.split('+')[0]);
          if (!isNaN(d2.getTime())) parsedDate = d2.toISOString();
        } catch { parsedDate = ''; }

        setBrevet({
          id:              docSnap.id,
          title:           info.title?.toString() ?? docSnap.id,
          distance:        km,
          date:            parsedDate,
          organizer:       organizerName,
          organizerId,
          coOrganizerId,                                             // ← NEW
          start:           route.start?.toString()        ?? '',
          finish:          route.finish?.toString()       ?? '',
          ascent,
          certification:   info.certification?.toString() ?? '',
          type:            info.type?.toString()          ?? 'BRM',
          gpxUrl:          route.gpxUrl?.toString()       ?? '',
          mapUrl:          route.mapUrl?.toString()       ?? '',
          description:     extra.description?.toString()  ?? '',
          imageUrl:        extra.imageUrl?.toString()     ?? '',
          startCoords:     route.startCoords?.toString()  ?? '',
          finishCoords:    route.finishCoords?.toString() ?? '',
          controls,
          difficultyLabel: label,
          difficultyColor: color,
          difficultyEmoji: emoji,
          wcs,
          climbCount:      parseInt(route.climbCount?.toString() ?? '0') || 0,
          duration:        getTimeLimit(km),
          organizerLogo,
          climbProfile: (() => {
            const raw = route.climbProfile;
            if (!raw) return [];
            const entries = Array.isArray(raw) ? raw : Object.values(raw);
            return entries.map((c: any) => {
              const avgGrad = parseFloat(c.avgGrad?.toString() ?? '0') || 0;
              const distKm  = parseFloat(c.distKm?.toString()  ?? '0') || 0;
              const gainM   = parseFloat(c.gainM?.toString()   ?? '0') || 0;
              const score   = distKm > 0 ? (gainM * gainM) / (distKm * 1000) : 0;
              const category = (score >= 64 || gainM >= 800) ? 'HC'
                : score >= 32 ? 'C1'
                : score >= 16 ? 'C2'
                : score >= 8  ? 'C3'
                : 'C4';
              return {
                startKm:       parseFloat(c.startKm?.toString() ?? '0') || 0,
                endKm:         parseFloat(c.endKm?.toString()   ?? '0') || 0,
                category,
                avgGrade:      avgGrad,
                maxGrade:      parseFloat(c.maxGrad?.toString() ?? '0') || 0,
                elevationGain: gainM,
              };
            });
          })(),
        });
      } catch (e) {
        console.error('Error fetching brevet:', e);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchBrevet();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Φόρτωση brevet...</p>
        </div>
      </div>
    );
  }

  if (!brevet) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <p className="text-white/30 text-lg">Το brevet δεν βρέθηκε</p>
      </div>
    );
  }

  const startDate  = brevet.date ? new Date(brevet.date) : null;
  const isCoOrg    = brevet.coOrganizerId && brevet.coOrganizerId !== '' && brevet.coOrganizerId !== '0';

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-3xl mx-auto">

        {/* ── BACK ───────────────────────────────────── */}
        <a href="/brevets"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-8 transition-colors">
          ← Πίσω στα Brevets
        </a>

        {/* ── FLOATING LOGO + HERO ───────────────────── */}
        <div className="relative mb-8">
          <div className="h-72 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            {brevet.imageUrl && brevet.imageUrl.length > 0 && (
              <img src={brevet.imageUrl} alt={brevet.title}
                className="w-full h-full object-cover" />
            )}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 z-10">
            {/* ── Co-org: show both.png, single: organizer logo ── */}
            <img
              src={isCoOrg ? '/logos/both.png' : brevet.organizerLogo}
              alt={isCoOrg ? 'Συνδιοργάνωση' : brevet.organizer}
              className="w-40 h-40 object-contain rounded-full border-2 border-white/10 drop-shadow-2xl bg-[#0A1628]"
              onError={(e) => { (e.target as HTMLImageElement).src = '/logos/000000.png'; }}
            />
          </div>
        </div>

        {/* ── TITLE ──────────────────────────────────── */}
        <div className="mt-10 mb-8 text-center">
          {/* Co-org label or organizer name */}
          {isCoOrg ? (
            <p className="text-cyan-400 text-sm font-bold mb-1">🤝 Συνδιοργάνωση</p>
          ) : brevet.organizer ? (
            <p className="text-white/40 text-sm mb-2">{brevet.organizer}</p>
          ) : null}
          <div className="flex items-center justify-center gap-4 mb-3">
            <h1 className="text-3xl font-bold text-white leading-tight">{brevet.title}</h1>
            <span className="bg-cyan-500/10 text-cyan-400 text-sm font-bold px-4 py-2 rounded-full border border-cyan-500/20 shrink-0">
              {brevet.distance}km
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-white/50 text-sm">
            {startDate && (
              <span>
                📅 {startDate.toLocaleDateString('el-GR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            )}
            <span>🏷️ {brevet.certification} {brevet.type}</span>
          </div>
        </div>

        {/* ── STATS GRID ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{brevet.distance}</div>
            <div className="text-white/40 text-xs mt-1">χιλιόμετρα</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {brevet.ascent > 0 ? brevet.ascent.toLocaleString() : '—'}
            </div>
            <div className="text-white/40 text-xs mt-1">μέτρα ανάβαση</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{brevet.duration}</div>
            <div className="text-white/40 text-xs mt-1">χρονικό όριο</div>
          </div>
          <div className="rounded-xl p-4 text-center"
            style={{
              backgroundColor: brevet.difficultyColor + '15',
              border: `1px solid ${brevet.difficultyColor}30`,
            }}>
            <div className="text-2xl font-bold" style={{ color: brevet.difficultyColor }}>
              {brevet.difficultyEmoji}
            </div>
            <div className="text-xs mt-1 font-bold" style={{ color: brevet.difficultyColor }}>
              {brevet.difficultyLabel}
            </div>
          </div>
        </div>

        {/* ── ROUTE ──────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-4">🗺️ Διαδρομή</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-lg">🟢</span>
              <div>
                <div className="text-white/40 text-xs">Αφετηρία</div>
                <div className="text-white text-sm font-medium">{brevet.start || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-red-400 text-lg">🔴</span>
              <div>
                <div className="text-white/40 text-xs">Τερματισμός</div>
                <div className="text-white text-sm font-medium">
                  {brevet.finish || brevet.start || '—'}
                </div>
              </div>
            </div>
          </div>

          {brevet.gpxUrl && (
            <div className="mt-6">
              <BrevetMap
                gpxUrl={brevet.gpxUrl}
                startCoords={brevet.startCoords}
                finishCoords={brevet.finishCoords}
                controls={brevet.controls}
                scrubberKm={scrubberKm}
              />
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {brevet.mapUrl && (
              <a href={brevet.mapUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-bold py-3 rounded-xl text-center transition-colors">
                📥 GPX
              </a>
            )}
            <button
              onClick={() => {
                const el = document.getElementById('registration-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold py-3 rounded-xl text-center transition-colors">
              🚴 Εγγραφή →
            </button>
          </div>
        </div>

        {/* ── CONTROL POINTS ─────────────────────────── */}
        {brevet.controls.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-bold text-lg mb-4">📍 Σημεία Ελέγχου</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs border-b border-white/10">
                    <th className="text-left pb-3">CP</th>
                    <th className="text-left pb-3">Όνομα</th>
                    <th className="text-center pb-3">Χλμ</th>
                    <th className="text-center pb-3">Άνοιγμα</th>
                    <th className="text-center pb-3">Κλείσιμο</th>
                    <th className="text-center pb-3">Τύπος</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="py-3 text-cyan-400 font-bold">START</td>
                    <td className="py-3">
                      {brevet.startCoords ? (
                        <a href={`https://www.google.com/maps?q=${brevet.startCoords}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-white hover:text-cyan-400 transition-colors flex items-center gap-1">
                          {brevet.start} <span className="text-white/30 text-xs">📍</span>
                        </a>
                      ) : (
                        <span className="text-white">{brevet.start}</span>
                      )}
                    </td>
                    <td className="py-3 text-center text-white/60">0</td>
                    <td className="py-3 text-center text-green-400">
                      {startDate ? startDate.toLocaleTimeString('el-GR', {
                        hour: '2-digit', minute: '2-digit',
                      }) : '—'}
                    </td>
                    <td className="py-3 text-center text-orange-400">
                      {startDate ? getCloseTime(0, startDate) : '—'}
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-full">
                        Εκκίνηση
                      </span>
                    </td>
                  </tr>
                  {brevet.controls.map((cp, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-3 text-cyan-400 font-bold">CP{i + 1}</td>
                      <td className="py-3">
                        {cp.lat && cp.lng ? (
                          <a href={`https://www.google.com/maps?q=${cp.lat},${cp.lng}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-white hover:text-cyan-400 transition-colors flex items-center gap-1">
                            {cp.name} <span className="text-white/30 text-xs">📍</span>
                          </a>
                        ) : (
                          <span className="text-white">{cp.name}</span>
                        )}
                      </td>
                      <td className="py-3 text-center text-white/60">{cp.km}</td>
                      <td className="py-3 text-center text-green-400">
                        {startDate ? getOpenTime(cp.km, startDate) : '—'}
                      </td>
                      <td className="py-3 text-center text-orange-400">
                        {startDate ? getCloseTime(cp.km, startDate) : '—'}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          cp.isManned ? 'bg-orange-500/10 text-orange-400' : 'bg-white/5 text-white/40'
                        }`}>
                          {cp.isManned ? '👤 Επανδρωμένο' : '📸 Self-check'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-3 text-amber-400 font-bold">FINISH</td>
                    <td className="py-3">
                      {brevet.finishCoords ? (
                        <a href={`https://www.google.com/maps?q=${brevet.finishCoords}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-white hover:text-cyan-400 transition-colors flex items-center gap-1">
                          {brevet.finish || brevet.start}
                          <span className="text-white/30 text-xs">📍</span>
                        </a>
                      ) : (
                        <span className="text-white">{brevet.finish || brevet.start}</span>
                      )}
                    </td>
                    <td className="py-3 text-center text-white/60">{brevet.distance}</td>
                    <td className="py-3 text-center text-green-400">—</td>
                    <td className="py-3 text-center text-orange-400">
                      {startDate ? getCloseTime(brevet.distance, startDate) : '—'}
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full">
                        🏁 Τερματισμός
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DESCRIPTION ────────────────────────────── */}
        {brevet.description && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-bold text-lg mb-4">📝 Περιγραφή</h2>
            <p className="text-white/60 text-sm leading-relaxed">{brevet.description}</p>
          </div>
        )}

        {/* ── ELEVATION & CLIMBS ─────────────────────── */}
        {brevet.gpxUrl && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-bold text-lg mb-2">
              ⛰️ Προφίλ Υψομέτρου & Ανηφόρες
            </h2>
            <ElevationChart
              gpxUrl={brevet.gpxUrl}
              climbProfile={brevet.climbProfile}
              storedAscent={brevet.ascent}
              scrubberKm={scrubberKm}
              onScrub={handleScrub}
            />
          </div>
        )}

        {/* ── REGISTRATION ───────────────────────────── */}
        <div id="registration-section" className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-2">🚴 Εγγραφή στο Brevet</h2>
          {!session ? (
            <div className="text-center py-6">
              <p className="text-white/50 text-sm mb-4">Συνδέσου για να εγγραφείς στο brevet</p>
              <button onClick={() => signIn('google')}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-full text-sm transition-colors">
                Σύνδεση με Google
              </button>
            </div>
          ) : !showForm ? (
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-sm">Συνδεδεμένος ως {session.user?.name}</p>
              <button onClick={() => setShowForm(true)}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-full text-sm transition-colors">
                Εγγραφή →
              </button>
            </div>
          ) : (
            <RegistrationForm
              brevet={brevet}
              session={session}
              onClose={() => setShowForm(false)}
            />
          )}
        </div>

      </div>
    </div>
  );
}
