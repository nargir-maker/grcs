'use client';

import { useEffect, useState } from 'react';
import { db } from '@/app/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { usePageEnabled, ComingSoon } from '@/app/lib/usePageEnabled';
import BrevetCard from '@/app/components/BrevetCard';
import PageViews from '@/app/components/PageViews';

const scrollStyle = `
  @keyframes brevScroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .brevet-scroll {
    animation: brevScroll 35s linear infinite;
  }
  .brevet-scroll:hover {
    animation-play-state: paused;
  }
  @keyframes haloFade {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 1; }
  }
  .brevet-halo {
    border: 1.5px solid rgba(6,182,212,0.6);
  }
  .brevet-halo-glow {
    animation: haloFade 2.8s ease-in-out infinite;
    will-change: opacity;
  }
`;

// ── Module-level cache ─────────────────────────────────────────────
let cachedBrevets: Brevet[] = [];
let cachedClubs: Record<string, string> = {};
let cachedLogos: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000;

interface Brevet {
  id: string;
  title: string;
  distance: number;
  date: string;
  organizer: string;
  organizerId: string;
  organizerLogo: string;
  coOrganizerId: string;
  start: string;
  ascent: number;
  certification: string;
  type: string;
  gpxUrl: string;
  imageUrl: string;
  difficultyLabel: string;
  difficultyColor: string;
}

interface OrganizerOption {
  id: string;
  name: string;
  logo: string;
}

function getDifficultyLabel(bdi: number): { label: string; color: string } {
  if (bdi < 4)  return { label: 'ΕΥΚΟΛΟ',       color: '#2E7D32' };
  if (bdi < 7)  return { label: 'ΜΕΤΡΙΟ',        color: '#F9A825' };
  if (bdi < 10) return { label: 'ΔΥΣΚΟΛΟ',       color: '#E65100' };
  if (bdi < 14) return { label: 'ΠΟΛΥ ΔΥΣΚΟΛΟ', color: '#D32F2F' };
  if (bdi < 19) return { label: 'ΑΚΡΑΙΟ',        color: '#6A1B9A' };
  return         { label: 'ΘΡΥΛΙΚΟ',             color: '#1A1A1A' };
}

function computeBDI(wcs: number, km: number, ascent: number): number {
  if (km <= 0) return 0;
  if (wcs > 0) {
    const distBase = Math.log(km / 100 + 1) * 2.2;
    return distBase + wcs / 1403;
  }
  return (km / 100) * (1 + ascent / (km * 8));
}

function deriveOrganizers(data: Brevet[]): OrganizerOption[] {
  const seen = new Map<string, OrganizerOption>();
  data.forEach((b) => {
    if (b.organizerId && !seen.has(b.organizerId)) {
      seen.set(b.organizerId, {
        id:   b.organizerId,
        name: b.organizer,
        logo: b.organizerLogo,
      });
    }
  });
  return Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export default function BrevetsPage() {
  const [brevets, setBrevets] = useState<Brevet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<number | null>(2026);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<number | null>(null);
  const [organizerFilter, setOrganizerFilter] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('organizer');
  });
  const [organizers, setOrganizers] = useState<OrganizerOption[]>([]);
  const [isOrganizerView, setIsOrganizerView] = useState(false);
  const [myOrganizerClubId, setMyOrganizerClubId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get('organizer');
    if (orgId) {
      setIsOrganizerView(true);
      setMyOrganizerClubId(orgId);
    }
  }, []);

  useEffect(() => {
    async function fetchAll() {
      try {
        if (cachedBrevets.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
          setBrevets(cachedBrevets);
          setOrganizers(deriveOrganizers(cachedBrevets));
          setLoading(false);
          return;
        }

        if (Object.keys(cachedClubs).length === 0) {
          const clubsSnapshot = await getDocs(collection(db, 'clubs'));
          clubsSnapshot.forEach((doc) => {
            const d = doc.data();
            cachedClubs[doc.id] = d.CLUB_NAME_SHORT_EN || d.CLUB_NAME_SHORT_GR || doc.id;
            cachedLogos[doc.id] = `/logos/${doc.id}.png`;
          });
        }

        const currentYear = new Date().getFullYear();
        const q = query(
          collection(db, 'all_brevets'),
          where('info.date', '>=', `${currentYear}-01-01`),
          where('info.date', '<=', `${currentYear}-12-31`)
        );

        const snapshot = await getDocs(q);
        const data: Brevet[] = [];

        snapshot.forEach((doc) => {
          const d = doc.data();
          const info  = d.info  || {};
          const route = d.route || {};
          const extra = d.extra || {};

          const km     = parseInt(info.distance?.toString()  ?? '0') || 0;
          const ascent = parseInt(route.ascent?.toString()   ?? '0') || 0;
          const wcs    = parseFloat(route.wcs?.toString()    ?? '0') || 0;
          const bdi    = computeBDI(wcs, km, ascent);
          const { label, color } = getDifficultyLabel(bdi);

          let parsedDate = '';
          try {
            const dateStr = info.date?.toString() ?? '';
            const d2 = new Date(dateStr.split('+')[0]);
            if (!isNaN(d2.getTime())) parsedDate = d2.toISOString();
          } catch { parsedDate = ''; }

          const orgId   = info.organizerId?.toString()   ?? '';
          const coOrgId = info.coOrganizerId?.toString() ?? '';

          data.push({
            id:              doc.id,
            title:           info.title?.toString() ?? doc.id,
            distance:        km,
            date:            parsedDate,
            organizer:       cachedClubs[orgId] ?? '',
            organizerId:     orgId,
            organizerLogo:   cachedLogos[orgId] ?? '/logos/000000.png',
            coOrganizerId:   coOrgId,
            start:           route.start?.toString() ?? '',
            ascent,
            certification:   info.certification?.toString() ?? '',
            type:            info.type?.toString() ?? 'BRM',
            gpxUrl:          route.gpxUrl?.toString() ?? '',
            imageUrl:        extra.imageUrl?.toString() ?? '',
            difficultyLabel: label,
            difficultyColor: color,
          });
        });

        data.sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        cachedBrevets  = data;
        cacheTimestamp = Date.now();
        setBrevets(data);
        setOrganizers(deriveOrganizers(data));

      } catch (e) {
        console.error('Error fetching data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const filtered = brevets.filter((b) => {
    const matchDist      = filter === null || b.distance === filter;
    const matchYear      = yearFilter === null || new Date(b.date).getFullYear() === yearFilter;
    const matchMonth     = monthFilter === null || new Date(b.date).getMonth() + 1 === monthFilter;
    const matchDiff      = difficultyFilter === null || b.difficultyLabel === difficultyFilter;
    const matchOrganizer = organizerFilter === null || b.organizerId === organizerFilter;
    const matchSearch    = search === '' ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.start.toLowerCase().includes(search.toLowerCase()) ||
      b.organizer.toLowerCase().includes(search.toLowerCase());
    return matchDist && matchYear && matchMonth && matchDiff && matchOrganizer && matchSearch;
  });

  const hasCoOrg = (b: Brevet) =>
    b.coOrganizerId && b.coOrganizerId !== '' && b.coOrganizerId !== '0';

  const enabled = usePageEnabled('brevets');
  if (enabled === null) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (enabled === false) return <ComingSoon label="Brevets" />;

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-5xl mx-auto">

        {/* ── BREVETS ΤΟΥ ΜΗΝΑ SCROLLER ── */}
        {(() => {
          const now = new Date();
          const thisMonth = now.getMonth();
          const thisYear  = now.getFullYear();
          const monthBrevets = brevets.filter(b => {
            if (!b.date) return false;
            const d = new Date(b.date);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
          });

          if (monthBrevets.length === 0 || loading) return null;

          const monthName = now.toLocaleDateString('el-GR', { month: 'long' });
          const doubled   = [...monthBrevets, ...monthBrevets];

          return (
            <div className="mb-10 -mx-6 overflow-hidden py-14">
              <style>{scrollStyle}</style>

              {/* Title */}
              <div className="px-6 mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-white/70 text-sm font-bold tracking-widest uppercase">
                  🚴 Τα Brevets του {monthName}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* Scrolling cards */}
              <div className="w-full overflow-hidden">
                <div className="flex brevet-scroll gap-4 w-max px-6 py-11">
                  {doubled.map((b, i) => {
                    const hasImage = b.imageUrl && b.imageUrl.length > 0;
                    const dateStr  = b.date
                      ? new Date(b.date).toLocaleDateString('el-GR', {
                          day: 'numeric', month: 'short',
                        })
                      : '';

                    return (
                      <a
                        key={i}
                        href={`/brevets/${b.id}`}
                        className="brevet-halo flex-shrink-0 w-52 h-32 rounded-2xl
                          relative transition-all no-underline block"
                      >
                        {/* GPU-composited glow layer — animates opacity only */}
                        <div
                          className="brevet-halo-glow absolute -inset-[3px] rounded-2xl pointer-events-none"
                          style={{
                            boxShadow: '0 0 18px 5px rgba(6,182,212,0.6), 0 0 48px 10px rgba(6,182,212,0.2)',
                          }}
                        />
                        {/* Inner div clips the background image to rounded corners */}
                        <div
                          className="absolute inset-0 rounded-2xl overflow-hidden"
                          style={hasImage ? {
                            backgroundImage: `url(${b.imageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          } : {
                            backgroundColor: 'rgba(255,255,255,0.04)',
                          }}
                        >
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t
                            from-[#0A1628] via-[#0A1628]/60 to-transparent" />
                        </div>

                        {/* Distance badge */}
                        <div className="absolute top-2 right-2 z-10">
                          <span className="bg-cyan-500/80 text-black text-xs
                            font-black px-2 py-0.5 rounded-full">
                            {b.distance}km
                          </span>
                        </div>

                        {/* Organizer logo */}
                        <div className="absolute top-2 left-2 z-10">
                          <img
                            src={b.organizerLogo}
                            alt={b.organizer}
                            className="w-8 h-8 object-contain rounded-full
                              bg-white/10 backdrop-blur-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/logos/000000.png';
                            }}
                          />
                        </div>

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                          <div className="text-white font-bold text-sm
                            leading-tight truncate drop-shadow-md">
                            {b.title}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-white/50 text-xs">{dateStr}</span>
                            <span className="text-white/40 text-xs">📍 {b.start}</span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── HEADER ── */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              📅 Ημερολόγιο Brevet
            </h1>
            <p className="text-white/50">
              Όλα τα προγραμματισμένα brevets της σεζόν
            </p>
          </div>
          <a
            href="/brevets/overview"
            className="flex items-center gap-2 text-xs font-bold px-3.5 py-2.5 rounded-xl
              transition-all hover:bg-cyan-500/20 no-underline"
            style={{
              color: '#06b6d4',
              border: '1px solid rgba(6,182,212,0.3)',
              background: 'rgba(6,182,212,0.08)',
            }}
          >
            🗺️ Χάρτης όλων των διαδρομών
          </a>
        </div>

        {/* ── FILTERS ── */}
        <div className="flex flex-col gap-4 mb-8">

          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Αναζήτηση brevet, πόλη, διοργανωτή..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 text-white
                placeholder-white/30 rounded-xl px-4 py-3 text-sm
                focus:outline-none focus:border-cyan-500/50"
            />
            <select
              onChange={(e) => setYearFilter(parseInt(e.target.value) || null)}
              defaultValue="2026"
              className="bg-white/5 border border-white/10 text-white rounded-xl
                px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">Όλα τα χρόνια</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-white/30 text-xs w-16">Απόσταση:</span>
            {[null, 200, 300, 400, 600, 1000].map((d) => (
              <button
                key={d ?? 'all'}
                onClick={() => setFilter(d)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                  filter === d
                    ? 'bg-cyan-500 text-black'
                    : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                }`}
              >
                {d === null ? 'Όλα' : `${d}km`}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-white/30 text-xs w-16">Δυσκολία:</span>
            {[
              { label: null,             display: 'Όλες',            color: null },
              { label: 'ΕΥΚΟΛΟ',        display: '🟢 Εύκολο',       color: '#2E7D32' },
              { label: 'ΜΕΤΡΙΟ',        display: '🟡 Μέτριο',       color: '#F9A825' },
              { label: 'ΔΥΣΚΟΛΟ',       display: '🟠 Δύσκολο',      color: '#E65100' },
              { label: 'ΠΟΛΥ ΔΥΣΚΟΛΟ', display: '🔴 Πολύ Δύσκολο', color: '#D32F2F' },
              { label: 'ΑΚΡΑΙΟ',        display: '💀 Ακραίο',       color: '#6A1B9A' },
            ].map((d) => (
              <button
                key={d.display}
                onClick={() => setDifficultyFilter(d.label)}
                className={`px-3 py-2 rounded-full text-xs font-bold transition-colors border ${
                  difficultyFilter === d.label
                    ? 'border-transparent text-white'
                    : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                }`}
                style={difficultyFilter === d.label ? { backgroundColor: d.color ?? '#06b6d4' } : {}}
              >
                {d.display}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-white/30 text-xs w-16">Μήνας:</span>
            {[
              { value: null, label: 'Όλοι' },
              { value: 1,  label: 'Ιαν' }, { value: 2,  label: 'Φεβ' },
              { value: 3,  label: 'Μαρ' }, { value: 4,  label: 'Απρ' },
              { value: 5,  label: 'Μαϊ' }, { value: 6,  label: 'Ιουν' },
              { value: 7,  label: 'Ιουλ' }, { value: 8,  label: 'Αυγ' },
              { value: 9,  label: 'Σεπ' }, { value: 10, label: 'Οκτ' },
              { value: 11, label: 'Νοε' }, { value: 12, label: 'Δεκ' },
            ].map((m) => (
              <button
                key={m.label}
                onClick={() => setMonthFilter(m.value)}
                className={`px-3 py-2 rounded-full text-xs font-bold transition-colors ${
                  monthFilter === m.value
                    ? 'bg-cyan-500 text-black'
                    : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {isOrganizerView ? (
            <div className="flex items-center justify-between
              bg-purple-500/10 border border-purple-400/30 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-purple-300 text-sm">🏁</span>
                <span className="text-purple-300 text-sm font-medium">
                  Εμφάνιση brevets του συλλόγου σου
                </span>
              </div>
              <button
                onClick={() => {
                  setIsOrganizerView(false);
                  setOrganizerFilter(null);
                  window.history.replaceState({}, '', '/brevets');
                }}
                className="text-xs text-purple-300 hover:text-white
                  border border-purple-400/30 hover:border-purple-400
                  px-3 py-1.5 rounded-lg transition-all"
              >
                Δες όλα →
              </button>
            </div>
          ) : organizers.length > 1 ? (
            <div className="flex items-center gap-3">
              <span className="text-white/30 text-xs w-16 flex-shrink-0">Διοργ.:</span>
              <div className="flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: 'grab' }}
                ref={(el) => {
                  if (!el) return;
                  el.onwheel = (e) => { if (e.deltaY !== 0) { e.preventDefault(); el.scrollLeft += e.deltaY; } };
                  let isDown = false, startX = 0, scrollLeft = 0;
                  el.onmousedown = (e) => { isDown = true; el.style.cursor = 'grabbing'; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; };
                  el.onmouseleave = () => { isDown = false; el.style.cursor = 'grab'; };
                  el.onmouseup   = () => { isDown = false; el.style.cursor = 'grab'; };
                  el.onmousemove = (e) => { if (!isDown) return; e.preventDefault(); el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX); };
                }}
              >
                <button
                  onClick={() => setOrganizerFilter(null)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold
                    transition-colors border ${
                    organizerFilter === null
                      ? 'bg-cyan-500 text-black border-transparent'
                      : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                  }`}
                >
                  Όλοι
                </button>
                {organizers.map((org) => {
                  const isSelected = organizerFilter === org.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => setOrganizerFilter(isSelected ? null : org.id)}
                      title={org.name}
                      className={`flex-shrink-0 w-14 h-14 rounded-full transition-all border-2 overflow-hidden ${
                        isSelected
                          ? 'border-cyan-500 scale-110 shadow-lg shadow-cyan-500/30'
                          : 'border-white/10 hover:border-white/40 hover:scale-105'
                      }`}
                    >
                      <img
                        src={org.logo}
                        alt={org.name}
                        className="w-full h-full object-contain bg-white/5"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/logos/000000.png'; }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan-500
                border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/50 text-sm">Φόρτωση brevets...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-white/30 text-lg">Δεν βρέθηκαν brevets</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((b) => (
              <BrevetCard key={b.id} b={b} hasCoOrg={!!hasCoOrg(b)} />
            ))}
          </div>
        )}

        {!loading && (
          <p className="text-white/30 text-xs text-center mt-8">
            {filtered.length} brevets
          </p>
        )}

        <PageViews page="brevets" />
      </div>
    </div>
  );
}