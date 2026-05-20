'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '../../lib/firebase';
import { useParams } from 'next/navigation';
import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { useSession, signIn } from 'next-auth/react';
import RegistrationForm from '@/app/components/RegistrationForm';


const WeatherStrip = dynamic(() => import('../../components/WeatherStrip'), {
  ssr: false,
  loading: () => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 text-white/40 text-sm">
        <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        Φόρτωση καιρού...
      </div>
    </div>
  ),
});

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

// ── Types ──────────────────────────────────────────────────────────────────────
interface ClimbSegment {
  startKm: number; endKm: number; category: string;
  avgGrade: number; maxGrade: number; elevationGain: number;
}
interface ControlPoint {
  km: number; name: string; lat: number; lng: number; isManned: boolean;
}
interface BrevetDetail {
  id: string; title: string; distance: number; date: string;
  organizer: string; organizerId: string; coOrganizerId: string;
  start: string; finish: string; ascent: number; certification: string;
  type: string; gpxUrl: string; mapUrl: string; description: string;
  imageUrl: string; startCoords: string; finishCoords: string;
  controls: ControlPoint[]; difficultyLabel: string; difficultyColor: string;
  difficultyEmoji: string; wcs: number; climbCount: number; duration: string;
  organizerLogo: string; climbProfile: ClimbSegment[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getDifficultyInfo(bdi: number) {
  if (bdi < 4)  return { label: 'ΕΥΚΟΛΟ',       color: '#2E7D32', emoji: '🟢' };
  if (bdi < 7)  return { label: 'ΜΕΤΡΙΟ',        color: '#F9A825', emoji: '🟡' };
  if (bdi < 10) return { label: 'ΔΥΣΚΟΛΟ',       color: '#E65100', emoji: '🟠' };
  if (bdi < 14) return { label: 'ΠΟΛΥ ΔΥΣΚΟΛΟ', color: '#D32F2F', emoji: '🔴' };
  if (bdi < 19) return { label: 'ΑΚΡΑΙΟ',        color: '#6A1B9A', emoji: '💀' };
  return         { label: 'ΘΡΥΛΙΚΟ',             color: '#1A1A1A', emoji: '☠️' };
}

function computeBDI(wcs: number, km: number, ascent: number) {
  if (km <= 0) return 0;
  if (wcs > 0) return Math.log(km / 100 + 1) * 2.2 + wcs / 1403;
  return (km / 100) * (1 + ascent / (km * 8));
}
function getTimeLimit(distance: number) {
  if (distance >= 1000) return '75:00 ώρες';
  if (distance >= 600)  return '40:00 ώρες';
  if (distance >= 400)  return '27:00 ώρες';
  if (distance === 360) return '24:00 ώρες';
  if (distance >= 300)  return '20:00 ώρες';
  return '13:30 ώρες';
}
function getTimeLimitHours(distance: number) {
  if (distance >= 1000) return 75;
  if (distance >= 600)  return 40;
  if (distance >= 400)  return 27;
  if (distance === 360) return 24;
  if (distance >= 300)  return 20;
  return 13.5;
}
function getOpenTime(cpKm: number, startDate: Date) {
  const maxSpeed = cpKm <= 200 ? 34 : cpKm <= 400 ? 32 : 30;
  const t = new Date(startDate.getTime() + (cpKm / maxSpeed) * 3600000);
  return t.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
}
function getCloseTime(cpKm: number, startDate: Date) {
  const hours = cpKm === 0 ? 1 : cpKm <= 600 ? cpKm / 15 : cpKm / 11.428;
  const t = new Date(startDate.getTime() + hours * 3600000);
  return t.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
}
function fmtHM(h: number, m: number) {
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function fmtDuration(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}ω` : `${h}ω ${m}λ`;
}

// ── Jean Meeus sunrise/sunset — accurate to ~1 min ────────────────────────────
function getSunTimes(lat: number, lng: number, date: Date): { sunrise: Date; sunset: Date } {
  let mo = date.getMonth() + 1;
  let yr = date.getFullYear();
  if (mo <= 2) { yr -= 1; mo += 12; }
  const A = Math.floor(yr / 100);
  const B = 2 - A + Math.floor(A / 4);
  const JD = Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mo + 1)) + date.getDate() + B - 1524.5;
  const n = JD - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
  const lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;
  const eps = (23.439 - 0.0000004 * n) * Math.PI / 180;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const latR = lat * Math.PI / 180;
  const cosH = (Math.cos(90.833 * Math.PI / 180) - Math.sin(dec) * Math.sin(latR))
             / (Math.cos(dec) * Math.cos(latR));
  // Fallback for polar day/night
  if (cosH < -1 || cosH > 1) {
    const sr = new Date(date); sr.setHours(6, 0, 0, 0);
    const ss = new Date(date); ss.setHours(20, 0, 0, 0);
    return { sunrise: sr, sunset: ss };
  }
  const H = Math.acos(cosH) * 180 / Math.PI;
  const B2 = 2 * Math.PI / 365 * (n - 81);
  const eqT = 9.87 * Math.sin(2 * B2) - 7.53 * Math.cos(B2) - 1.5 * Math.sin(B2);
  const solarNoonUtc = 12 - lng / 15 - eqT / 60;
  // Use device timezone offset (includes DST)
  const tzH = -date.getTimezoneOffset() / 60;
  const srLocal = solarNoonUtc - H / 15 + tzH;
  const ssLocal = solarNoonUtc + H / 15 + tzH;
  function toDate(localH: number): Date {
    const d = new Date(date);
    const h = Math.floor(localH) % 24;
    const m = Math.round((localH % 1) * 60);
    d.setHours(h < 0 ? h + 24 : h, m, 0, 0);
    return d;
  }
  return { sunrise: toDate(srLocal), sunset: toDate(ssLocal) };
}

// ── DaylightSection component ─────────────────────────────────────────────────
function DaylightSection({ startCoords, startDate, distanceKm }: {
  startCoords: string;
  startDate: Date;
  distanceKm: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const parts = startCoords.split(',');
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;

  const { sunrise, sunset } = getSunTimes(lat, lng, startDate);

  // ACP rule
  const lightsOn  = new Date(sunset.getTime()  + 30 * 60000);
  const lightsOff = new Date(sunrise.getTime() - 30 * 60000);

  const timeLimitH  = getTimeLimitHours(distanceKm);
  const brevetEnd   = new Date(startDate.getTime() + timeLimitH * 3600000);
  const avgSpeed    = 15; // assumed for static view

  // km at lights-on
  const msToLightsOn  = lightsOn.getTime() - startDate.getTime();
  const hoursToLightsOn = msToLightsOn / 3600000;
  const kmAtLightsOn  = Math.round(hoursToLightsOn * avgSpeed);

  // Total darkness within brevet window
  let darkMinutes = 0;
  if (lightsOn < brevetEnd) {
    const darkStart = lightsOn > startDate ? lightsOn : startDate;
    darkMinutes += (brevetEnd.getTime() - darkStart.getTime()) / 60000;
  }
  if (startDate < lightsOff) {
    const darkEnd = lightsOff < brevetEnd ? lightsOff : brevetEnd;
    darkMinutes += (darkEnd.getTime() - startDate.getTime()) / 60000;
  }



  // Daylight duration
  const daylightMin = Math.round((sunset.getTime() - sunrise.getTime()) / 60000);

  // Bar: full 24h scale
  function pct(dt: Date) {
    const dayStart = new Date(startDate);
    dayStart.setHours(0, 0, 0, 0);
    const minOfDay = (dt.getTime() - dayStart.getTime()) / 60000;
    return Math.min(100, Math.max(0, (minOfDay / 1440) * 100));
  }
  const sunrisePct  = pct(sunrise);
  const sunsetPct   = pct(sunset);
  const lightsOnPct = pct(lightsOn);
  const lightsOffPct = pct(lightsOff);
  const brevetStartPct = pct(startDate);
  const brevetEndPct   = pct(brevetEnd);

  function fmt(d: Date) {
    return fmtHM(d.getHours(), d.getMinutes());
  }

  const needsLights = kmAtLightsOn > 0 && kmAtLightsOn < distanceKm && hoursToLightsOn > 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
      {/* ── HEADER ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          🌤️ Φως &amp; Σκοτάδι Brevet
        </h2>
        <span className="text-lime-400 text-xl">{expanded ? '▲' : '☞'}</span>
      </button>

      {expanded && (
        <div className="mt-5">

          {/* ── GRADIENT BAR ── */}
          <div className="relative mb-1">
            {/* Above bar: night + lights labels */}
            <div className="relative h-5 mb-1 text-xs">
              {/* 🌙 left night */}
              {lightsOffPct > 2 && (
                <span className="absolute text-slate-400 text-[10px]"
                  style={{ left: `${lightsOffPct / 2}%`, transform: 'translateX(-50%)' }}>
                  🌙 Νύχτα
                </span>
              )}
              {/* 💡 lights off */}
              {lightsOffPct > 2 && lightsOffPct < 98 && (
                <span className="absolute text-blue-300 font-bold text-[10px]"
                  style={{ left: `${lightsOffPct}%`, transform: 'translateX(-50%)' }}>
                  💡 {fmt(lightsOff)}
                </span>
              )}
              {/* 💡 lights on */}
              {lightsOnPct < 98 && (
                <span className="absolute text-amber-300 font-bold text-[10px]"
                  style={{ left: `${lightsOnPct}%`, transform: 'translateX(-50%)' }}>
                  💡 {fmt(lightsOn)}
                </span>
              )}
              {/* 🌙 right night */}
              {lightsOnPct < 98 && (
                <span className="absolute text-slate-400 text-[10px]"
                  style={{ left: `${lightsOnPct + (100 - lightsOnPct) / 2}%`, transform: 'translateX(-50%)' }}>
                  🌙 Νύχτα
                </span>
              )}
            </div>

            {/* The bar */}
            <div className="relative h-11 rounded-xl overflow-hidden"
              style={{
                background: `linear-gradient(to right,
                  #0A0F2E 0%,
                  #0A0F2E ${Math.max(0, sunrisePct - 4)}%,
                  #FF8C42 ${sunrisePct}%,
                  #87CEEB ${Math.min(100, sunrisePct + 4)}%,
                  #87CEEB ${Math.max(0, sunsetPct - 4)}%,
                  #FF8C42 ${sunsetPct}%,
                  #0A0F2E ${Math.min(100, sunsetPct + 4)}%,
                  #0A0F2E 100%)`
              }}>

              {/* Dark overlays with stars */}
              {lightsOffPct > 0 && (
                <div className="absolute top-0 left-0 h-full bg-[#0A0F2E]/50 flex items-center justify-center overflow-hidden"
                  style={{ width: `${lightsOffPct}%` }}>
                  <span className="text-white/20 text-xs tracking-widest">· · · · ·</span>
                </div>
              )}
              {lightsOnPct < 100 && (
                <div className="absolute top-0 h-full bg-[#0A0F2E]/50 flex items-center justify-center overflow-hidden"
                  style={{ left: `${lightsOnPct}%`, width: `${100 - lightsOnPct}%` }}>
                  <span className="text-white/20 text-xs tracking-widest">· · · · ·</span>
                </div>
              )}

              {/* Brevet window highlight */}
              <div className="absolute top-0 h-full border-x-2 border-white/60 bg-white/10"
                style={{
                  left: `${brevetStartPct}%`,
                  width: `${brevetEndPct - brevetStartPct}%`
                }}>
                {/* Start triangle */}
                <div className="absolute -top-0 left-0 w-0 h-0"
                  style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid rgba(255,255,255,0.9)' }} />
                {/* End triangle */}
                <div className="absolute -top-0 right-0 w-0 h-0"
                  style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid rgba(255,255,255,0.9)' }} />
              </div>

              {/* Lights ON line */}
              {lightsOnPct > 0 && lightsOnPct < 100 && (
                <div className="absolute top-0 h-full w-0.5 bg-amber-400/90"
                  style={{ left: `${lightsOnPct}%` }} />
              )}
              {/* Lights OFF line */}
              {lightsOffPct > 0 && lightsOffPct < 100 && (
                <div className="absolute top-0 h-full w-0.5 bg-blue-300/90"
                  style={{ left: `${lightsOffPct}%` }} />
              )}
            </div>

            {/* Below bar: sunrise + sunset */}
            <div className="relative h-5 mt-1 text-[10px]">
              <span className="absolute text-orange-400 font-bold"
                style={{ left: `${sunrisePct}%`, transform: 'translateX(-50%)' }}>
                🌅 {fmt(sunrise)}
              </span>
              <span className="absolute text-orange-600 font-bold"
                style={{ left: `${sunsetPct}%`, transform: 'translateX(-50%)' }}>
                🌇 {fmt(sunset)}
              </span>
            </div>

            {/* Hour markers */}
            <div className="flex justify-between text-[9px] text-white/30 mt-1">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
          </div>

          {/* ── CHIPS ── */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="bg-orange-500/15 border border-orange-500/30 text-orange-400
              text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1">
              🌅 Ανατολή <span className="text-orange-300">{fmt(sunrise)}</span>
            </span>
            <span className="bg-orange-700/15 border border-orange-700/30 text-orange-500
              text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1">
              🌇 Δύση <span className="text-orange-400">{fmt(sunset)}</span>
            </span>
            <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400
              text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1">
              💡 Φώτα ON <span className="text-amber-300">{fmt(lightsOn)}</span>
            </span>
            <span className="bg-blue-500/15 border border-blue-500/30 text-blue-300
              text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1">
              💡 Φώτα OFF <span className="text-blue-200">{fmt(lightsOff)}</span>
            </span>
            <span className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-400
              text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1">
              ☀️ Ημέρα <span className="text-yellow-300">{fmtDuration(daylightMin)}</span>
            </span>
          </div>

          {/* ── KM AT LIGHTS ON ── */}
          {needsLights && (
            <div className="mt-4 bg-amber-500/10 border border-amber-500/25
              rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-2xl">🦺</span>
              <p className="text-amber-300 text-sm font-semibold">
                Θα χρειαστείς φώτα &amp; ανακλαστικό γιλέκο περίπου στο{' '}
                <span className="text-amber-200">km {kmAtLightsOn}</span>{' '}
                (~{fmt(lightsOn)})
              </p>
            </div>
          )}

          {/* ── DARKNESS DURATION ── */}
          {darkMinutes > 0 && (
            <div className="mt-3 bg-white/5 border border-white/10
              rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-2xl">🔋</span>
              <p className="text-white/70 text-sm">
                Θα χρειαστείς φώτα για{' '}
                <span className="text-amber-400 font-bold">{fmtDuration(Math.round(darkMinutes))}</span>{' '}
                συνεχόμενα — έλεγξε τη φόρτιση των φώτων σου
              </p>
            </div>
          )}

          {/* ── ACP FOOTNOTE ── */}
          <p className="text-white/25 text-[10px] italic mt-4">
            Κανόνας ACP: Φώτα υποχρεωτικά 30' μετά τη δύση έως 30' πριν την ανατολή
          </p>
        </div>
      )}
    </div>
  );
}


// ── BackButton ─────────────────────────────────────────────────────────────────
function BackButton() {
  const [href, setHref] = useState('/brevets');
  const [label, setLabel] = useState('← Πίσω στα Brevets');
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const from = p.get('from'); const clubId = p.get('clubId');
    if (from === 'organizer' && clubId) {
      setHref(`/brevets?organizer=${clubId}`);
      setLabel('← Πίσω στα Brevets μου');
    }
  }, []);
  return (
    <a href={href} className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-8 transition-colors">
      {label}
    </a>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
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
        const coOrganizerId = info.coOrganizerId?.toString() ?? '';
        let organizerName = ''; let organizerLogo = '/logos/000000.png';
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
          km: parseInt(c.km?.toString() ?? '0') || 0,
          name: c.name?.toString() ?? '',
          lat: parseFloat(c.lat?.toString() ?? '0') || 0,
          lng: parseFloat(c.lng?.toString() ?? '0') || 0,
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
          id: docSnap.id, title: info.title?.toString() ?? docSnap.id,
          distance: km, date: parsedDate, organizer: organizerName,
          organizerId, coOrganizerId,
          start: route.start?.toString() ?? '', finish: route.finish?.toString() ?? '',
          ascent, certification: info.certification?.toString() ?? '',
          type: info.type?.toString() ?? 'BRM',
          gpxUrl: route.gpxUrl?.toString() ?? '', mapUrl: route.mapUrl?.toString() ?? '',
          description: extra.description?.toString() ?? '',
          imageUrl: extra.imageUrl?.toString() ?? '',
          startCoords: route.startCoords?.toString() ?? '',
          finishCoords: route.finishCoords?.toString() ?? '',
          controls, difficultyLabel: label, difficultyColor: color, difficultyEmoji: emoji,
          wcs, climbCount: parseInt(route.climbCount?.toString() ?? '0') || 0,
          duration: getTimeLimit(km), organizerLogo,
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
                : score >= 32 ? 'C1' : score >= 16 ? 'C2' : score >= 8 ? 'C3' : 'C4';
              return {
                startKm: parseFloat(c.startKm?.toString() ?? '0') || 0,
                endKm: parseFloat(c.endKm?.toString() ?? '0') || 0,
                category, avgGrade: avgGrad,
                maxGrade: parseFloat(c.maxGrad?.toString() ?? '0') || 0,
                elevationGain: gainM,
              };
            });
          })(),
        });
      } catch (e) { console.error('Error fetching brevet:', e); }
      finally { setLoading(false); }
    }
    if (id) fetchBrevet();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/50 text-sm">Φόρτωση brevet...</p>
      </div>
    </div>
  );

  if (!brevet) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <p className="text-white/30 text-lg">Το brevet δεν βρέθηκε</p>
    </div>
  );

  const startDate = brevet.date ? new Date(brevet.date) : null;
  const isCoOrg   = brevet.coOrganizerId && brevet.coOrganizerId !== '' && brevet.coOrganizerId !== '0';

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-3xl mx-auto">

        <BackButton />

        {/* ── HERO ── */}
        <div className="relative mb-8">
          <div className="h-72 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            {brevet.imageUrl && <img src={brevet.imageUrl} alt={brevet.title} className="w-full h-full object-cover" />}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 z-10">
            <img
              src={isCoOrg ? '/logos/both.png' : brevet.organizerLogo}
              alt={isCoOrg ? 'Συνδιοργάνωση' : brevet.organizer}
              className="w-40 h-40 object-contain rounded-full border-2 border-white/10 drop-shadow-2xl bg-[#0A1628]"
              onError={(e) => { (e.target as HTMLImageElement).src = '/logos/000000.png'; }}
            />
          </div>
        </div>

        {/* ── TITLE ── */}
        <div className="mt-10 mb-8 text-center">
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
              <span>📅 {startDate.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            )}
            <span>🏷️ {brevet.certification} {brevet.type}</span>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{brevet.distance}</div>
            <div className="text-white/40 text-xs mt-1">χιλιόμετρα</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{brevet.ascent > 0 ? brevet.ascent.toLocaleString() : '—'}</div>
            <div className="text-white/40 text-xs mt-1">μέτρα ανάβαση</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{brevet.duration}</div>
            <div className="text-white/40 text-xs mt-1">χρονικό όριο</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: brevet.difficultyColor + '15', border: `1px solid ${brevet.difficultyColor}30` }}>
            <div className="text-2xl font-bold" style={{ color: brevet.difficultyColor }}>{brevet.difficultyEmoji}</div>
            <div className="text-xs mt-1 font-bold" style={{ color: brevet.difficultyColor }}>{brevet.difficultyLabel}</div>
          </div>
        </div>

        {/* ── ROUTE ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-4">🗺️ Διαδρομή</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-lg">🟢</span>
              <div><div className="text-white/40 text-xs">Αφετηρία</div>
                <div className="text-white text-sm font-medium">{brevet.start || '—'}</div></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-red-400 text-lg">🔴</span>
              <div><div className="text-white/40 text-xs">Τερματισμός</div>
                <div className="text-white text-sm font-medium">{brevet.finish || brevet.start || '—'}</div></div>
            </div>
          </div>
          {brevet.gpxUrl && (
            <div className="mt-6">
              <BrevetMap gpxUrl={brevet.gpxUrl} startCoords={brevet.startCoords}
                finishCoords={brevet.finishCoords} controls={brevet.controls} scrubberKm={scrubberKm} />
            </div>
          )}
          <div className="flex gap-3 mt-6">
            {brevet.mapUrl && (
              <a href={brevet.mapUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-bold py-3 rounded-xl text-center transition-colors">
                📥 GPX
              </a>
            )}
            <button onClick={() => { document.getElementById('registration-section')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold py-3 rounded-xl text-center transition-colors">
              🚴 Εγγραφή →
            </button>
          </div>
        </div>

        {/* ── DAYLIGHT SECTION ── */}
        {startDate && brevet.startCoords && (
          <DaylightSection
            startCoords={brevet.startCoords}
            startDate={startDate}
            distanceKm={brevet.distance}
          />
        )}

{/* ── WEATHER STRIP ── */}
{startDate && brevet.gpxUrl && (
  <WeatherStrip
    gpxUrl={brevet.gpxUrl}
    startDate={startDate}
    distanceKm={brevet.distance}
    controls={brevet.controls}
  />
)}
        {/* ── CONTROL POINTS ── */}
        {brevet.controls.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-bold text-lg mb-4">📍 Σημεία Ελέγχου</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs border-b border-white/10">
                    <th className="text-left pb-3">CP</th><th className="text-left pb-3">Όνομα</th>
                    <th className="text-center pb-3">Χλμ</th><th className="text-center pb-3">Άνοιγμα</th>
                    <th className="text-center pb-3">Κλείσιμο</th><th className="text-center pb-3">Τύπος</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="py-3 text-cyan-400 font-bold">START</td>
                    <td className="py-3">{brevet.startCoords ? (
                      <a href={`https://www.google.com/maps?q=${brevet.startCoords}`} target="_blank" rel="noopener noreferrer"
                        className="text-white hover:text-cyan-400 transition-colors flex items-center gap-1">
                        {brevet.start} <span className="text-white/30 text-xs">📍</span></a>
                    ) : <span className="text-white">{brevet.start}</span>}</td>
                    <td className="py-3 text-center text-white/60">0</td>
                    <td className="py-3 text-center text-green-400">
                      {startDate ? startDate.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 text-center text-orange-400">{startDate ? getCloseTime(0, startDate) : '—'}</td>
                    <td className="py-3 text-center">
                      <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-full">Εκκίνηση</span>
                    </td>
                  </tr>
                  {brevet.controls.map((cp, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-3 text-cyan-400 font-bold">CP{i + 1}</td>
                      <td className="py-3">{cp.lat && cp.lng ? (
                        <a href={`https://www.google.com/maps?q=${cp.lat},${cp.lng}`} target="_blank" rel="noopener noreferrer"
                          className="text-white hover:text-cyan-400 transition-colors flex items-center gap-1">
                          {cp.name} <span className="text-white/30 text-xs">📍</span></a>
                      ) : <span className="text-white">{cp.name}</span>}</td>
                      <td className="py-3 text-center text-white/60">{cp.km}</td>
                      <td className="py-3 text-center text-green-400">{startDate ? getOpenTime(cp.km, startDate) : '—'}</td>
                      <td className="py-3 text-center text-orange-400">{startDate ? getCloseTime(cp.km, startDate) : '—'}</td>
                      <td className="py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${cp.isManned ? 'bg-orange-500/10 text-orange-400' : 'bg-white/5 text-white/40'}`}>
                          {cp.isManned ? '👤 Επανδρωμένο' : '📸 Self-check'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-3 text-amber-400 font-bold">FINISH</td>
                    <td className="py-3">{brevet.finishCoords ? (
                      <a href={`https://www.google.com/maps?q=${brevet.finishCoords}`} target="_blank" rel="noopener noreferrer"
                        className="text-white hover:text-cyan-400 transition-colors flex items-center gap-1">
                        {brevet.finish || brevet.start} <span className="text-white/30 text-xs">📍</span></a>
                    ) : <span className="text-white">{brevet.finish || brevet.start}</span>}</td>
                    <td className="py-3 text-center text-white/60">{brevet.distance}</td>
                    <td className="py-3 text-center text-green-400">—</td>
                    <td className="py-3 text-center text-orange-400">{startDate ? getCloseTime(brevet.distance, startDate) : '—'}</td>
                    <td className="py-3 text-center">
                      <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full">🏁 Τερματισμός</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DESCRIPTION ── */}
        {brevet.description && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-bold text-lg mb-4">📝 Περιγραφή</h2>
            <p className="text-white/60 text-sm leading-relaxed">{brevet.description}</p>
          </div>
        )}

        {/* ── ELEVATION & CLIMBS ── */}
        {brevet.gpxUrl && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-white font-bold text-lg mb-2">⛰️ Προφίλ Υψομέτρου & Ανηφόρες</h2>
            <ElevationChart gpxUrl={brevet.gpxUrl} climbProfile={brevet.climbProfile}
              storedAscent={brevet.ascent} scrubberKm={scrubberKm} onScrub={handleScrub} />
          </div>
        )}

        {/* ── REGISTRATION ── */}
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
            <RegistrationForm brevet={brevet} session={session} onClose={() => setShowForm(false)} />
          )}
        </div>

      </div>
    </div>
  );
}
