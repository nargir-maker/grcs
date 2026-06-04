'use client';

// BrevetCalendarPicker — full-month calendar date picker
// Shows existing brevets on each day so the organiser can avoid conflicts

import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';

const DAY_HEADERS = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ'];
const MONTHS_GR = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

interface BrevetEntry {
  id:          string;
  title:       string;
  distance:    number;
  organizerId: string;
  clubName:    string;
}

interface Props {
  value:    string;    // YYYY-MM-DD
  onChange: (v: string) => void;
  clubs:    { id: string; name: string }[];
}

export function BrevetCalendarPicker({ value, onChange, clubs }: Props) {
  const today = new Date();
  const [open, setOpen]               = useState(false);
  const [viewYear, setViewYear]       = useState(today.getFullYear());
  const [viewMonth, setViewMonth]     = useState(today.getMonth()); // 0-11
  const [byDate, setByDate]           = useState<Record<string, BrevetEntry[]>>({});
  const [loadedKey, setLoadedKey]     = useState(''); // "YYYY-MM" already fetched
  const [fetching, setFetching]       = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Fetch when month view changes
  useEffect(() => {
    if (!open) return;
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    if (key === loadedKey) return;        // already fetched
    fetchMonth(viewYear, viewMonth, key);
  }, [open, viewYear, viewMonth]);

  async function fetchMonth(year: number, month: number, key: string) {
    setFetching(true);
    const mm   = String(month + 1).padStart(2, '0');
    const from = `${year}-${mm}-01`;
    const to   = `${year}-${mm}-31T23:59:59`;
    try {
      const snap = await getDocs(query(
        collection(db, 'all_brevets'),
        where('info.date', '>=', from),
        where('info.date', '<=', to),
      ));
      const map: Record<string, BrevetEntry[]> = {};
      snap.docs.forEach(d => {
        const info    = d.data().info ?? {};
        const dateStr = String(info.date ?? '').slice(0, 10);
        if (!dateStr.startsWith(`${year}-${mm}`)) return;
        const orgId   = info.organizerId?.toString() ?? '';
        const club    = clubs.find(c => c.id === orgId);
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push({
          id:          d.id,
          title:       info.title?.toString() ?? '',
          distance:    parseInt(info.distance?.toString() ?? '0') || 0,
          organizerId: orgId,
          clubName:    club?.name ?? orgId,
        });
      });
      setByDate(prev => ({ ...prev, ...map }));
      setLoadedKey(key);
    } catch (e) {
      console.error('Calendar fetch error:', e);
    } finally {
      setFetching(false);
    }
  }

  // Calendar grid — weeks start on Monday
  function buildGrid(year: number, month: number): (number | null)[] {
    const days = new Date(year, month + 1, 0).getDate();
    let first  = new Date(year, month, 1).getDay();
    first = first === 0 ? 6 : first - 1;           // Mon=0 … Sun=6
    return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(day: number) {
    const mm  = String(viewMonth + 1).padStart(2, '0');
    const dd  = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  }

  const cells     = buildGrid(viewYear, viewMonth);
  const mm        = String(viewMonth + 1).padStart(2, '0');
  const label     = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('el-GR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  return (
    <div className="relative" ref={wrapRef}>

      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full text-left bg-white/5 border rounded-xl px-4 py-2.5 text-sm
          flex items-center gap-2 transition-all ${
          open
            ? 'border-cyan-500/60 text-white'
            : 'border-white/15 text-white/60 hover:text-white hover:border-white/30'
        }`}
      >
        <span className="text-base">📅</span>
        {label || <span className="text-white/30">Επιλογή ημερομηνίας</span>}
      </button>

      {/* ── Calendar popover ── */}
      {open && (
        <div
          className="absolute top-full left-0 mt-2 z-50 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: 'min(640px, 95vw)',
            background: '#0D1A2D',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-3
            border-b border-white/10">
            <button type="button" onClick={prevMonth}
              className="text-white/40 hover:text-white text-2xl w-8 h-8
                flex items-center justify-center rounded-lg hover:bg-white/10
                transition-all">
              ‹
            </button>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">
                {MONTHS_GR[viewMonth]} {viewYear}
              </span>
              {fetching && (
                <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent
                  rounded-full animate-spin" />
              )}
            </div>
            <button type="button" onClick={nextMonth}
              className="text-white/40 hover:text-white text-2xl w-8 h-8
                flex items-center justify-center rounded-lg hover:bg-white/10
                transition-all">
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/10 bg-white/3">
            {DAY_HEADERS.map(d => (
              <div key={d}
                className="text-center text-white/40 text-xs font-bold py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return (
                <div key={idx}
                  className="border-r border-b border-white/5 min-h-[90px]" />
              );

              const dateStr   = `${viewYear}-${mm}-${String(day).padStart(2, '0')}`;
              const entries   = byDate[dateStr] ?? [];
              const isSelected = value === dateStr;
              const isToday    = today.getFullYear() === viewYear
                && today.getMonth() === viewMonth
                && today.getDate() === day;
              const col        = idx % 7;
              const isWeekend  = col >= 5;

              return (
                <div
                  key={idx}
                  onClick={() => selectDay(day)}
                  className={`border-r border-b border-white/5 min-h-[90px] p-1.5
                    cursor-pointer transition-colors
                    ${isSelected ? 'bg-cyan-500/15 border-cyan-500/20'
                      : 'hover:bg-white/5'}`}
                >
                  {/* Day number */}
                  <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center
                    justify-center rounded-full transition-all ${
                    isSelected ? 'bg-cyan-500 text-black'
                    : isToday  ? 'bg-white/20 text-white'
                    : isWeekend? 'text-cyan-400/80'
                    : 'text-white/50'
                  }`}>
                    {day}
                  </div>

                  {/* Brevet entries */}
                  <div className="flex flex-col gap-0.5">
                    {entries.map((b, bi) => (
                      <div
                        key={bi}
                        title={`${b.clubName} · ${b.title}`}
                        className="flex items-center gap-1 rounded px-1 py-0.5
                          bg-white/8 hover:bg-white/12 transition-colors"
                      >
                        <img
                          src={`/logos/${b.organizerId}.png`}
                          alt={b.clubName}
                          className="w-4 h-4 object-contain rounded-full flex-shrink-0"
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <span className="text-[10px] text-white/70 leading-tight truncate">
                          {b.distance}km
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="px-4 py-2.5 border-t border-white/10
            flex items-center justify-between">
            <span className="text-white/30 text-xs">
              Κλικ σε ημέρα για επιλογή
            </span>
            <span className="text-white/25 text-xs">
              Logos = ήδη προγραμματισμένα brevets
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
