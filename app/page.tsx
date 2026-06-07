'use client';

import { useEffect, useState } from 'react';
import { db } from '@/app/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// ── TYPES ──────────────────────────────────────────────────────
interface Brevet {
  id: string;
  title: string;
  distance: number;
  date: string;         // ISO string
  organizer: string;
  organizerId: string;
  organizerLogo: string;
  start: string;
  imageUrl: string;
  startTime?: string;
}

// ── ΒΟΗΘΗΤΙΚΕΣ ΓΙΑ LIVE ───────────────────────────────────────
function getTimeLimitHours(distanceKm: number): number {
  if (distanceKm <= 200) return 13.5;
  if (distanceKm <= 300) return 20;
  if (distanceKm <= 400) return 27;
  if (distanceKm <= 600) return 40;
  if (distanceKm <= 1000) return 75;
  return 75 + (distanceKm - 1000) / 1000 * 75;
}

function isBrevetLiveNow(brevet: Brevet, now: Date): boolean {
  if (!brevet.date) return false;
  const startTimeStr = brevet.startTime || '07:00';
  const [year, month, day] = brevet.date.split('T')[0].split('-').map(Number);
  const [hours, minutes] = startTimeStr.split(':').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) return false;

  const startDate = new Date(year, month - 1, day, hours, minutes);
  const timeLimit = getTimeLimitHours(brevet.distance);
  const endDate = new Date(startDate.getTime() + timeLimit * 60 * 60 * 1000);

  return now >= startDate && now <= endDate;
}

function isUpcoming(brevet: Brevet, now: Date): boolean {
  if (!brevet.date) return false;
  const startTimeStr = brevet.startTime || '07:00';
  const [year, month, day] = brevet.date.split('T')[0].split('-').map(Number);
  const [hours, minutes] = startTimeStr.split(':').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) return false;

  const startDate = new Date(year, month - 1, day, hours, minutes);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);

  return startDate >= tomorrow && startDate <= nextWeek;
}

// ── CACHE (όπως στη σελίδα /brevets) ───────────────────────────
let cachedBrevets: Brevet[] = [];
let cachedClubs: Record<string, string> = {};
let cachedLogos: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000;

export default function Home() {
  const [liveBrevets, setLiveBrevets] = useState<Brevet[]>([]);
  const [upcomingBrevets, setUpcomingBrevets] = useState<Brevet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAndFilter() {
      try {
        // Φόρτωση clubs
        if (Object.keys(cachedClubs).length === 0) {
          const clubsSnap = await getDocs(collection(db, 'clubs'));
          clubsSnap.forEach(doc => {
            const data = doc.data();
            cachedClubs[doc.id] = data.CLUB_NAME_SHORT_EN || data.CLUB_NAME_SHORT_GR || doc.id;
            cachedLogos[doc.id] = `/logos/${doc.id}.png`;
          });
        }

        // Φόρτωση brevets (ίδια λογική με /brevets)
        let brevetsData = cachedBrevets;
        if (!brevetsData.length || Date.now() - cacheTimestamp > CACHE_TTL) {
          const currentYear = new Date().getFullYear();
          const q = query(
            collection(db, 'all_brevets'),
            where('info.date', '>=', `${currentYear}-01-01`),
            where('info.date', '<=', `${currentYear}-12-31`)
          );
          const snapshot = await getDocs(q);
          const temp: Brevet[] = [];

          snapshot.forEach(doc => {
            const d = doc.data();
            const info = d.info || {};
            const route = d.route || {};
            const extra = d.extra || {};

            let parsedDate = '';
            try {
              const dateStr = info.date?.toString() ?? '';
              const d2 = new Date(dateStr.split('+')[0]);
              if (!isNaN(d2.getTime())) parsedDate = d2.toISOString();
            } catch { /* ignore */ }

            const orgId = info.organizerId?.toString() ?? '';
            temp.push({
              id: doc.id,
              title: info.title?.toString() ?? doc.id,
              distance: parseInt(info.distance?.toString() ?? '0') || 0,
              date: parsedDate,
              organizer: cachedClubs[orgId] ?? '',
              organizerId: orgId,
              organizerLogo: cachedLogos[orgId] ?? '/logos/000000.png',
              start: route.start?.toString() ?? '',
              imageUrl: extra.imageUrl?.toString() ?? '',
              startTime: info.startTime?.toString() ?? '07:00',
            });
          });

          temp.sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });

          cachedBrevets = temp;
          cacheTimestamp = Date.now();
          brevetsData = temp;
        }

        const now = new Date();
        const live = brevetsData.filter(b => isBrevetLiveNow(b, now));
        const upcoming = brevetsData.filter(b => isUpcoming(b, now));

        setLiveBrevets(live);
        setUpcomingBrevets(upcoming);
      } catch (err) {
        console.error('Σφάλμα φόρτωσης brevets:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAndFilter();
  }, []);

  // ── COMPONENT SCROLLING CARDS (χωρίς διπλασιασμό, μόνο manual scroll) ──
  const ScrollSection = ({ title, icon, brevets, emptyMsg, liveMode = false }: 
    { title: string; icon: string; brevets: Brevet[]; emptyMsg: string; liveMode?: boolean }) => {
    
    return (
      <div className="mb-16">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-white/70 text-sm font-bold tracking-widest uppercase flex items-center gap-2">
            {icon} {title}
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : brevets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/40 text-sm">{emptyMsg}</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent">
            <div className="flex gap-5" style={{ minWidth: 'max-content' }}>
              {brevets.map((b) => {
                const dateObj = b.date ? new Date(b.date) : null;
                const dayMonth = dateObj ? dateObj.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' }) : '';
                const hours = (b.startTime || '07:00').split(':')[0];
                const minutes = (b.startTime || '07:00').split(':')[1];
                const isLiveNowFlag = liveMode && isBrevetLiveNow(b, new Date());

                return (
                  <a
                    key={b.id}
                    href={`/brevets/${b.id}`}
                    className="relative flex-shrink-0 w-64 h-36 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 group"
                  >
                    <div className="absolute -inset-[2px] rounded-2xl opacity-70 group-hover:opacity-100 transition-opacity"
                         style={{ boxShadow: '0 0 15px 3px rgba(6,182,212,0.7)' }} />
                    <div className="absolute inset-0 rounded-2xl overflow-hidden">
                      {b.imageUrl ? (
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${b.imageUrl})` }} />
                      ) : (
                        <div className="absolute inset-0 bg-white/5" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/60 to-transparent" />
                    </div>

                    {isLiveNowFlag && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                          LIVE
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2 right-2 z-10">
                      <span className="bg-cyan-500/90 text-black text-xs font-black px-2 py-0.5 rounded-full">
                        {b.distance}km
                      </span>
                    </div>

                    <div className="absolute top-2 left-2 z-10">
                      <img src={b.organizerLogo} alt={b.organizer}
                           className="w-7 h-7 object-contain rounded-full bg-black/30 backdrop-blur-sm"
                           onError={(e) => (e.currentTarget.src = '/logos/000000.png')} />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                      <div className="text-white font-bold text-sm leading-tight truncate drop-shadow-md">
                        {b.title}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-white/60 text-[11px]">{dayMonth} {hours}:{minutes}</span>
                        <span className="text-white/40 text-[11px]">📍 {b.start}</span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── RENDER ΣΕΛΙΔΑΣ (ίδιο hero + νέα sections) ──
  return (
    <div className="min-h-screen bg-[#0A1628] font-sans">
      {/* HERO (παραμένει ίδιο) */}
      <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
        <video autoPlay muted loop playsInline poster="/hero-poster.jpg" className="absolute inset-0 w-full h-full object-cover">
          <source src="/hero.webm" type="video/webm" />
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628]/60 via-[#0A1628]/40 to-[#0A1628]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px' }} />
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="flex justify-center mb-8"><img src="/grc-logo.png" alt="GRC Logo" className="w-64 h-64 object-contain drop-shadow-2xl" /></div>
          <div className="inline-block bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold px-4 py-2 rounded-full mb-8 tracking-widest backdrop-blur-sm">ΕΛΛΗΝΙΚΟ RANDONNEURING — ΜΙΑ ΠΛΑΤΦΟΡΜΑ ΓΙΑ ΟΛΟΥΣ</div>
          <h2 className="text-4xl sm:text-6xl font-bold text-white leading-tight mb-6 drop-shadow-lg">Όλα τα Brevets.<br /><span className="text-cyan-400">Μια πλατφόρμα.</span></h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-12 leading-relaxed drop-shadow">Εγγραφές, αποτελέσματα, live tracking και ιστορικό για κάθε αναβάτη και διοργανωτή του ελληνικού randonneuring.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/brevets" className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-4 rounded-full text-base transition-colors shadow-lg shadow-cyan-500/25">Δες τα Brevets →</a>
            <a href="/about" className="border border-white/30 hover:border-white/60 text-white px-8 py-4 rounded-full text-base transition-colors backdrop-blur-sm bg-white/5">Μάθε περισσότερα</a>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/30 animate-bounce">
          <span className="text-xs tracking-widest">SCROLL</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </section>

      {/* LIVE & UPCOMING SECTIONS (χωρίς διπλά) */}
      <div className="max-w-6xl mx-auto px-6 pt-12">
        <ScrollSection
          title="LIVE τώρα"
          icon="🚴‍♂️⚡"
          brevets={liveBrevets}
          emptyMsg="Κανένα brevet σε εξέλιξη αυτή τη στιγμή."
          liveMode={true}
        />
        <ScrollSection
          title="Επόμενα 7 ημέρες"
          icon="📅🔥"
          brevets={upcomingBrevets}
          emptyMsg="Δεν υπάρχουν προγραμματισμένα brevets για τις επόμενες 7 ημέρες."
        />
      </div>

      {/* FEATURES & STATS (παραμένουν ίδια) */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <a href="/brevets" className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/40 transition-colors"><div className="text-3xl mb-4">📅</div><h3 className="text-white font-bold text-lg mb-2">Ημερολόγιο Brevet</h3><p className="text-white/50 text-sm leading-relaxed">Όλα τα προγραμματισμένα brevets σε ένα μέρος. Εγγραφή με ένα κλικ.</p><div className="mt-4 text-cyan-400 text-xs font-bold tracking-wider">Δες εδώ →</div></a>
          <a href="/live" className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/40 transition-colors"><div className="text-3xl mb-4">🗺️</div><h3 className="text-white font-bold text-lg mb-2">Live Tracking</h3><p className="text-white/50 text-sm leading-relaxed">Παρακολούθηση σε πραγματικό χρόνο. Για αναβάτες, διοργανωτές και θεατές.</p><div className="mt-4 text-cyan-400 text-xs font-bold tracking-wider">Δες εδώ →</div></a>
          <a href="/members" className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/40 transition-colors"><div className="text-3xl mb-4">🏆</div><h3 className="text-white font-bold text-lg mb-2">Ιστορικό & Στατιστικά</h3><p className="text-white/50 text-sm leading-relaxed">20+ χρόνια ιστορικού του ελληνικού randonneuring. Το προφίλ κάθε αναβάτη.</p><div className="mt-4 text-cyan-400 text-xs font-bold tracking-wider">ΣΎΝΤΟΜΑ →</div></a>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            <div><div className="text-3xl font-bold text-cyan-400">20+</div><div className="text-white/50 text-sm mt-1">Χρόνια ιστορικού</div></div>
            <div><div className="text-3xl font-bold text-cyan-400">500+</div><div className="text-white/50 text-sm mt-1">Αναβάτες</div></div>
            <div><div className="text-3xl font-bold text-cyan-400">1000+</div><div className="text-white/50 text-sm mt-1">Brevets</div></div>
            <div><div className="text-3xl font-bold text-cyan-400">10</div><div className="text-white/50 text-sm mt-1">Διοργανωτές</div></div>
          </div>
        </div>
      </section>
    </div>
  );
}