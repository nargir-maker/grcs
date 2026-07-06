'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { getPublicMembers } from '@/app/lib/publicMembersCache';
import { usePageEnabled, ComingSoon } from '@/app/lib/usePageEnabled';
import PageViews from '@/app/components/PageViews';

interface BrevetEvent {
  key: string;
  name: string;
  date: string;
  organizer: string;
  organizerId: string;
  distance: number;
  year: string;
  har: string;
  acp: string;
  parsedDate: Date;
  participants: Participant[];
}

interface Participant {
  displayName: string;
  lepoteId: string;
  harId: string;
  rideTime: string;
}

function distColor(d: number): string {
  if (d <= 200)  return '#EFC405';
  if (d <= 300)  return '#16a34a';
  if (d <= 400)  return '#7e22ce';
  if (d <= 600)  return '#EA6003';
  if (d <= 1000) return '#374151';
  if (d <= 1200) return '#DC2626';
  return '#ec4899';
}

function parseDate(dt: string): Date {
  try {
    const mm: Record<string, number> = {
      'ιαν': 1, 'φεβ': 2, 'μαρ': 3, 'απρ': 4,
      'μαΐ': 5, 'μαϊ': 5, 'μαι': 5, 'μάι': 5, 'μάϊ': 5,
      'ιουν': 6, 'ιουλ': 7, 'αυγ': 8, 'σεπ': 9,
      'οκτ': 10, 'νοε': 11, 'δεκ': 12,
    };
    let s = dt.toLowerCase().trim();
    for (const [k, v] of Object.entries(mm)) s = s.replaceAll(k, ` ${v} `);
    const parts = s.replace(/[^0-9]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 3) {
      let y = parseInt(parts[2]);
      if (y < 100) y += 2000;
      return new Date(y, parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
  } catch {}
  return new Date(1900, 0, 1);
}

function buildEvents(docs: any[], clubNameToId: Record<string, string>): BrevetEvent[] {
  const map = new Map<string, BrevetEvent>();

  for (const raw of docs) {
    const firstName = raw.name_el ?? '';
    const lastName  = raw.surname_el ?? '';
    const lepoteId  = raw.reg_lepote?.id?.toString() ?? '';
    const harId     = raw.reg_har?.id?.toString()    ?? '';
    const display   = `${firstName}${lastName ? ' ' + lastName[0] + '.' : ''}`.trim() || '—';

    let hist: Record<string, any> = {};
    try {
      const h = raw.stats?.history_raw;
      if (h) { const p = JSON.parse(h); hist = p.history ?? p; }
    } catch { continue; }

    for (const [yearStr, yd] of Object.entries(hist)) {
      for (const ev of ((yd as any).events ?? [])) {
        const name = (ev.n ?? '').trim();
        const date = (ev.dt ?? '').trim();
        if (!name || !date) continue;

        const key = `${name}||${date}`;
        if (!map.has(key)) {
          const org   = (ev.og ?? '').trim();
          const orgId = clubNameToId[org] ?? clubNameToId[org.slice(0, 22)] ?? '';
          map.set(key, {
            key, name, date,
            organizer: org,
            organizerId: orgId,
            distance: Number(ev.d) || 0,
            year: yearStr,
            har: ev.har ?? '',
            acp: ev.acp ?? '',
            parsedDate: parseDate(date),
            participants: [],
          });
        }
        map.get(key)!.participants.push({ displayName: display, lepoteId, harId, rideTime: ev.rt ?? '' });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());
}

function CertBadge({ har, acp }: { har: string; acp: string }) {
  const isH = !!(har && har !== '' && har !== 'AUR0');
  const isA = !!(acp && acp !== '');
  if (isH) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">H.A.R.</span>;
  if (isA) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">A.C.P.</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.08] text-white/35 border border-white/10">Brevet</span>;
}

export default function HistoryPage() {
  const enabled = usePageEnabled('history');

  const [events, setEvents]         = useState<BrevetEvent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<BrevetEvent | null>(null);
  const [detailVis, setDetailVis]   = useState(false);
  const [search, setSearch]         = useState('');
  const [yearFilter, setYearFilter] = useState('Όλα');
  const [orgFilter, setOrgFilter]   = useState('Όλοι');
  const [distFilter, setDistFilter] = useState<number | null>(null);
  const [sortAsc, setSortAsc]       = useState(false);
  const [partSort, setPartSort]     = useState<'name' | 'time'>('name');
  const [partAsc, setPartAsc]       = useState(true);

  const selRef = useRef<BrevetEvent | null>(null);
  useEffect(() => { selRef.current = selected; }, [selected]);

  useEffect(() => {
    Promise.all([getPublicMembers(), getDocs(collection(db, 'clubs'))])
      .then(([docs, snap]) => {
        const nm: Record<string, string> = {};
        snap.docs.forEach(d => {
          const x = d.data();
          [x.CLUB_NAME_SHORT_EN, x.CLUB_NAME_SHORT_GR].filter(Boolean).forEach((n: string) => {
            const t = n.trim();
            nm[t] = d.id;
            if (t.length > 22) nm[t.slice(0, 22)] = d.id;
          });
        });
        setEvents(buildEvents(docs, nm));
        setLoading(false);
      })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  const years = useMemo(() => {
    const s = new Set(events.map(e => e.year));
    return ['Όλα', ...Array.from(s).sort((a, b) => b.localeCompare(a))];
  }, [events]);

  const orgs = useMemo(() => {
    const s = new Set(events.map(e => e.organizer).filter(Boolean));
    return ['Όλοι', ...Array.from(s).sort((a, b) => a.localeCompare(b, 'el'))];
  }, [events]);

  const distances = useMemo(() => {
    const s = new Set(events.map(e => e.distance).filter(Boolean));
    return Array.from(s).sort((a, b) => a - b);
  }, [events]);

  const filtered = useMemo(() => {
    let list = events;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q) || e.organizer.toLowerCase().includes(q));
    }
    if (yearFilter !== 'Όλα') list = list.filter(e => e.year === yearFilter);
    if (orgFilter !== 'Όλοι') list = list.filter(e => e.organizer === orgFilter);
    if (distFilter !== null)  list = list.filter(e => e.distance === distFilter);
    return sortAsc ? [...list].reverse() : list;
  }, [events, search, yearFilter, orgFilter, distFilter, sortAsc]);

  const sortedParticipants = useMemo(() => {
    if (!selected) return [];
    return [...selected.participants].sort((a, b) => {
      if (partSort === 'name') {
        const c = a.displayName.localeCompare(b.displayName, 'el');
        return partAsc ? c : -c;
      }
      const ta = a.rideTime || '99:99:99';
      const tb = b.rideTime || '99:99:99';
      return partAsc ? ta.localeCompare(tb) : tb.localeCompare(ta);
    });
  }, [selected, partSort, partAsc]);

  const openDetail = useCallback((ev: BrevetEvent) => {
    const cur = selRef.current;
    if (cur && cur.key !== ev.key) {
      setDetailVis(false);
      setTimeout(() => {
        setSelected(ev); setPartSort('name'); setPartAsc(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setDetailVis(true)));
      }, 220);
    } else if (!cur) {
      setSelected(ev); setPartSort('name'); setPartAsc(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setDetailVis(true)));
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailVis(false);
    setTimeout(() => setSelected(null), 330);
  }, []);

  if (enabled === null) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (enabled === false) return <ComingSoon label="Ιστορικό Brevets" />;

  return (
    <div className="min-h-screen bg-[#0A1628] px-5 py-12">
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-0 select-none">
        <img src="/grc-logo.png" alt="" className="w-[640px] h-[640px] object-contain" style={{ opacity: 0.04 }} />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Ιστορικό Brevets</h1>
          <p className="text-white/40 text-sm">Όλα τα brevet από δημόσια προφίλ αναβατών</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Αναζήτηση brevet ή διοργανωτή..."
            className="w-full bg-white/[0.04] border border-white/10 text-white placeholder-white/25
              rounded-2xl pl-10 pr-10 py-3.5 text-sm focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors text-xl leading-none">
              ×
            </button>
          )}
        </div>

        {!loading && (
          <>
            {/* Year chips */}
            <div className="overflow-x-auto pb-2 mb-2">
              <div className="flex gap-2 w-max">
                {years.map(y => (
                  <button key={y} onClick={() => setYearFilter(y)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap
                      ${yearFilter === y
                        ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                        : 'bg-white/[0.06] text-white/45 hover:bg-white/10 hover:text-white border border-white/10'}`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Organizer chips */}
            <div className="overflow-x-auto pb-2 mb-4">
              <div className="flex gap-2 w-max">
                {orgs.map(o => (
                  <button key={o} onClick={() => setOrgFilter(o)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap
                      ${orgFilter === o
                        ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                        : 'bg-white/[0.06] text-white/45 hover:bg-white/10 hover:text-white border border-white/10'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance circles + count + sort */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex gap-2 flex-wrap">
                {distances.map(d => (
                  <button key={d}
                    onClick={() => setDistFilter(prev => prev === d ? null : d)}
                    className="w-10 h-10 rounded-full font-bold transition-all duration-200"
                    style={{
                      backgroundColor: distColor(d),
                      color: d <= 200 ? '#000' : '#fff',
                      fontSize: 11,
                      opacity: distFilter === null || distFilter === d ? 1 : 0.3,
                      transform: distFilter === d ? 'scale(1.18)' : 'scale(1)',
                      boxShadow: distFilter === d ? `0 0 14px ${distColor(d)}70` : 'none',
                    }}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/35 text-xs tabular-nums">{filtered.length} brevet</span>
                <button onClick={() => setSortAsc(s => !s)}
                  className="text-xs font-semibold text-white/45 hover:text-white
                    bg-white/[0.05] border border-white/10 px-3 py-1.5 rounded-full transition-colors">
                  {sortAsc ? '↑ Παλαιότερα' : '↓ Νεότερα'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/30 text-sm">Φόρτωση ιστορικού...</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-white/25 text-center py-16 text-sm">Δεν βρέθηκαν αποτελέσματα</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(ev => {
              const isSel = selected?.key === ev.key;
              const col   = distColor(ev.distance);
              return (
                <div key={ev.key}>
                  {/* Event card */}
                  <button
                    onClick={() => isSel ? closeDetail() : openDetail(ev)}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition-all duration-200 group"
                    style={{
                      backgroundColor: isSel ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
                      borderColor: isSel ? `${col}55` : 'rgba(255,255,255,0.08)',
                      boxShadow: isSel ? `0 0 28px ${col}18` : 'none',
                    }}>

                    {/* Distance circle */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] leading-none"
                      style={{ backgroundColor: col, color: ev.distance <= 200 ? '#000' : '#fff' }}>
                      {ev.distance}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{ev.name}</p>
                      <p className="text-white/40 text-xs mt-0.5 truncate">
                        {ev.date}{ev.organizer ? ` · ${ev.organizer}` : ''}
                      </p>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <CertBadge har={ev.har} acp={ev.acp} />
                        <span className="text-white/25 text-[10px]">{ev.participants.length} αναβάτες</span>
                      </div>
                      {ev.organizerId
                        ? <img src={`/logos/${ev.organizerId}.png`} alt="" className="w-7 h-7 object-contain"
                            style={{ opacity: isSel ? 1 : 0.5 }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        : <div className="w-7" />}
                      <span className="text-white/25 text-sm">{isSel ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Inline detail panel */}
                  {isSel && (
                    <div className="mt-1.5 rounded-2xl border border-white/10 overflow-hidden"
                      style={{
                        opacity: detailVis ? 1 : 0,
                        transform: detailVis ? 'translateY(0)' : 'translateY(10px)',
                        transition: 'opacity 0.28s ease, transform 0.28s ease',
                      }}>

                      {/* Header */}
                      <div className="bg-white/[0.035] border-b border-white/10 px-6 py-6 text-center">
                        {ev.organizerId && (
                          <div className="flex justify-center mb-4">
                            <img src={`/logos/${ev.organizerId}.png`} alt={ev.organizer}
                              className="h-14 object-contain"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px]"
                            style={{ backgroundColor: col, color: ev.distance <= 200 ? '#000' : '#fff' }}>
                            {ev.distance}
                          </div>
                          <CertBadge har={ev.har} acp={ev.acp} />
                          {ev.har && ev.har !== '' && ev.har !== 'AUR0' && (
                            <span className="text-white/30 text-[10px] font-mono">{ev.har}</span>
                          )}
                          {ev.acp && ev.acp !== '' && (
                            <span className="text-white/30 text-[10px] font-mono">{ev.acp}</span>
                          )}
                        </div>
                        <p className="text-white font-bold text-sm sm:text-base uppercase tracking-wide">{ev.name}</p>
                        <p className="text-amber-400/80 text-sm mt-2">📅 {ev.date}</p>
                        {ev.organizer && <p className="text-white/30 text-xs mt-1">{ev.organizer}</p>}
                      </div>

                      {/* Participant controls */}
                      <div className="flex items-center justify-between px-5 py-3 bg-[#0A1628] border-b border-white/[0.06]">
                        <button
                          onClick={() => { if (partSort === 'name') setPartAsc(a => !a); else { setPartSort('name'); setPartAsc(true); } }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all
                            ${partSort === 'name' ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white'}`}>
                          {partSort === 'name' ? (partAsc ? '↑' : '↓') : '⇅'} {sortedParticipants.length} Συμμετέχοντες
                        </button>
                        <button
                          onClick={() => { if (partSort === 'time') setPartAsc(a => !a); else { setPartSort('time'); setPartAsc(true); } }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all
                            ${partSort === 'time' ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white'}`}>
                          {partSort === 'time' ? (partAsc ? '↑' : '↓') : '⇅'} Χρόνος
                        </button>
                      </div>

                      {/* Participants list */}
                      <div className="bg-[#0A1628] divide-y divide-white/[0.05] max-h-80 overflow-y-auto">
                        {sortedParticipants.map((p, i) => {
                          const isHarEv = !!(ev.har && ev.har !== '' && ev.har !== 'AUR0');
                          const amLabel = isHarEv
                            ? (p.harId    ? `H.A.R. ${p.harId}`       : '')
                            : (p.lepoteId ? `ΛΕ.ΠΟ.Τ.Ε. ${p.lepoteId}` : '');
                          const hasTime = !!(p.rideTime && p.rideTime.trim() && p.rideTime !== '99:99:99');
                          return (
                            <div key={i} className="flex items-center justify-between px-5 py-3 gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-white/20 text-xs tabular-nums w-5 text-right shrink-0">{i + 1}</span>
                                <div className="min-w-0">
                                  <p className="text-white text-sm font-medium">{p.displayName}</p>
                                  {amLabel && <p className="text-white/30 text-[10px] mt-0.5">{amLabel}</p>}
                                </div>
                              </div>
                              {hasTime && (
                                <div className="flex items-center gap-1.5 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 shrink-0">
                                  <span className="text-white/30 text-[10px]">⏱</span>
                                  <span className="text-cyan-400 text-xs font-mono font-bold">{p.rideTime}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <PageViews page="brevet-history" />
      </div>
    </div>
  );
}
