'use client';

// BrevetCards.tsx
// Drop-in replacement for the YearCard component in profile/page.tsx
//
// HOW TO USE:
//   1. Copy this file into  app/components/BrevetCards.tsx
//   2. In profile/page.tsx, replace:
//        import ... YearCard ...
//      with:
//        import { YearCard } from '@/app/components/BrevetCards';
//   3. Delete the old YearCard function from page.tsx
//   4. Done — the rest of page.tsx stays unchanged.
//
// Cards match Android YearlyDetailScreen exactly:
//   • Yellow BRM card (default)
//   • Orange PBP card with watermark
//   • Blue HAR-only card
//   • Dual ACP+HAR swipeable card (two sub-cards)
//   • Flèche card
//   • SRe card
//
// Behaviour:
//   • Expand year → cards scroll horizontally, auto-play every 2.8 s
//   • Click a card  → scroll pauses, card highlights (ring + scale)
//   • Click again   → resumes auto-scroll
//   • Dot indicators at bottom; click dot to jump + pause

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface BrevetEvent {
  n:    string;
  d:    number;
  t:    string;
  as:   number;
  dt:   string;
  og:   string;
  acp:  string;
  har:  string;
  mt:   string;
  rt:   string;
  pc?:  number;
  eid?: string;
}

interface YearData {
  km:      number;
  brevets: number;
  events:  BrevetEvent[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dt: string): string {
  if (!dt || dt === 'null') return '';
  try {
    const d = new Date(dt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('el-GR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    }
  } catch {}
  // Fallback for "Sat Mar 08 2003 00:00:00 GMT+0200"
  const parts = dt.split(' ');
  if (parts.length >= 4) {
    const months: Record<string, string> = {
      Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
      Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12',
    };
    const m = months[parts[1]];
    if (m) return `${parts[2].padStart(2,'0')}/${m}/${parts[3]}`;
  }
  return dt;
}

function getOrganizerInitials(og: string): string {
  if (!og) return '?';
  const words = og.trim().split(/[\s.]+/).filter(Boolean);
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

function getOrgColor(og: string): { bg: string; text: string } {
  const u = og.toUpperCase();
  if (u.includes('ΠΕΠΑ') || u.includes('Π.Ε.Π.Α')) return { bg:'#1e3a5f', text:'#60a5fa' };
  if (u.includes('HAR') || u.includes('H.A.R') || u.includes('HELLENIC AUTO')) return { bg:'#0c3547', text:'#38bdf8' };
  if (u.includes('BLE')) return { bg:'#1e1b4b', text:'#a78bfa' };
  if (u.includes('AUDAX') || u.includes('ΕΛΛΑΔΟΣ') || u.includes('GRÈCE') || u.includes('GRECE')) return { bg:'#1a2e05', text:'#86efac' };
  if (u.includes('ΚΑΡΔΙΤΣ') || u.includes('Π.Ο.Κ')) return { bg:'#450a0a', text:'#fca5a5' };
  if (u.includes('ΑΙΟΛΟΣ')) return { bg:'#0c4a6e', text:'#7dd3fc' };
  if (u.includes('GREEK RAND')) return { bg:'#2d1b69', text:'#c4b5fd' };
  return { bg:'#1e293b', text:'#94a3b8' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DottedLine() {
  return (
    <div className="flex justify-between items-center my-1.5">
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="w-[3px] h-[3px] rounded-full" style={{ background: 'rgba(0,0,0,0.2)' }} />
      ))}
    </div>
  );
}

function AcpStamp({ code }: { code: string }) {
  return (
    <div style={{ transform: 'rotate(-12deg)' }} className="flex-shrink-0">
      <div className="border-2 border-[#1a3a7a] rounded px-2 py-1 bg-blue-50/90 text-center">
        <div className="text-[7px] font-black tracking-widest text-[#1a3a7a] font-mono">HOMOLOGATION</div>
        <div className="text-[9px] font-bold text-[#1a3a7a] font-mono">ACP</div>
        {code && code !== '---' && (
          <div className="text-[7px] text-[#1a3a7a] font-mono">{code}</div>
        )}
      </div>
    </div>
  );
}

function HarStamp({ code }: { code: string }) {
  return (
    <div style={{ transform: 'rotate(-9deg)' }} className="flex-shrink-0">
      <div className="border-2 border-[#0d47a1] rounded px-2 py-1 bg-blue-50/90 text-center">
        <div className="text-[7px] font-black tracking-widest text-[#0d47a1] font-mono">H.A.R.</div>
        <div className="text-[7px] font-black tracking-wider text-[#0d47a1] font-mono">HOMOLOGATION</div>
        {code && code !== '---' && (
          <div className="text-[7px] text-[#0d47a1] font-mono">{code}</div>
        )}
      </div>
    </div>
  );
}

function FinishStamp({ rt, isLRM }: { rt: string; isLRM?: boolean }) {
  if (!rt || rt === '00:00' || rt === '--:--') return null;
  const isDNF = rt === 'DNF';
  const isOut = rt === 'ΕΚΤΟΣ ΧΡΟΝΟΥ';
  const color = isDNF ? '#991b1b' : isOut ? 'rgba(220,38,38,0.85)' : isLRM ? 'rgba(147,51,234,0.85)' : 'rgba(30,64,175,0.85)';
  return (
    <div style={{ transform:'rotate(-11deg)', display:'inline-block', border:`2px solid ${color}`, borderRadius:3, padding:'1px 5px' }}>
      <span style={{ color, fontWeight:700, fontSize:isDNF?12:8, letterSpacing: isDNF?2:1 }}>
        {isDNF ? 'DNF' : isOut ? 'ΕΚΤΟΣ ΧΡΟΝΟΥ' : 'ΕΝΤΟΣ ΧΡΟΝΟΥ'}
      </span>
    </div>
  );
}

// ── Card types ────────────────────────────────────────────────────────────────

function BrmCard({ e }: { e: BrevetEvent }) {
  const isLRM = e.t?.toUpperCase() === 'LRM';
  const is100 = e.t?.toUpperCase() === 'BRM-100YEARS';
  const acpOk = e.acp && e.acp !== 'null' && e.acp !== '' && e.acp !== '---';
  const bg        = is100 ? '#e0d8cc' : isLRM ? '#f3e5f5' : '#f7e397';
  const headerBg  = is100 ? '#c5b9a5' : isLRM ? '#e1bee7' : '#e5d186';
  const { bg: orgBg, text: orgText } = getOrgColor(e.og);

  return (
    <div style={{ background: bg, border:'2px solid rgba(0,0,0,0.12)', borderRadius:4 }}
         className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div style={{ background: headerBg }} className="px-3 py-1.5 flex-shrink-0 text-center">
        <div className="text-[8px] font-bold tracking-wide text-black/70">
          {isLRM ? 'LES RANDONNEURS MONDIAUX' : is100 ? '1921 · BRM · 2021' : 'ΛΕΣΧΗ ΠΟΔΗΛΑΤΙΚΟΥ ΤΟΥΡΙΣΜΟΥ ΕΛΛΑΔΑΣ'}
        </div>
        <div className="text-[7px] text-black/50 tracking-wider">
          {isLRM ? 'LRM EVENT' : is100 ? '100 YEARS BRM' : 'ΔΙΑΔΡΟΜΕΣ ΜΕΓΑΛΩΝ ΑΠΟΣΤΑΣΕΩΝ'}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-3 pt-2 pb-1 flex flex-col min-h-0">
        {/* Organizer */}
        <div className="flex items-center gap-2 mb-1.5">
          <div style={{ background: orgBg }} className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0">
            <span style={{ color: orgText }} className="text-[8px] font-black leading-none text-center">
              {getOrganizerInitials(e.og)}
            </span>
          </div>
          <div className="text-[9px] font-bold text-black/70 leading-tight line-clamp-2 flex-1">
            {e.og}
          </div>
        </div>

        <DottedLine />

        {/* Event name */}
        <div className="text-[11px] font-black text-black/90 leading-tight line-clamp-2">
          {e.n.toUpperCase()}
        </div>

        <DottedLine />

        {/* Date */}
        {formatDate(e.dt) && (
          <div className="text-[12px] font-bold text-black/80">{formatDate(e.dt)}</div>
        )}

        <DottedLine />

        {/* Distance */}
        <div className="text-[16px] font-black text-black/90 leading-none">
          {e.d}km{e.as > 0 ? ` · ▲+${e.as}m` : ''}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 flex items-center justify-between flex-shrink-0 border-t border-black/10">
        <FinishStamp rt={e.rt} isLRM={isLRM} />
        {acpOk && <AcpStamp code={e.acp} />}
      </div>
    </div>
  );
}

function PbpCard({ e }: { e: BrevetEvent }) {
  return (
    <div style={{ background:'#fdd0b1', border:'2px solid rgba(180,60,0,0.2)', borderRadius:12 }}
         className="flex flex-col h-full overflow-hidden relative">

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span style={{ fontSize:72, fontWeight:900, color:'#c0392b', opacity:0.07, transform:'rotate(-20deg)' }}>
          PBP
        </span>
      </div>

      <div className="relative z-10 flex flex-col h-full p-4">
        {/* Date + ACP */}
        <div className="flex justify-between items-start mb-1">
          <div className="text-[13px] font-bold text-red-900">{formatDate(e.dt)}</div>
          {e.acp && e.acp !== 'null' && (
            <div className="text-[8px] font-bold text-orange-600 text-right leading-tight max-w-[100px]">{e.acp}</div>
          )}
        </div>
        <div className="text-[9px] text-gray-500 font-bold mb-1">{e.og}</div>

        {/* Name */}
        <div className="font-bold text-red-900 leading-tight mb-2"
             style={{ fontFamily:'Georgia,serif', fontSize:18 }}>
          {e.n.toUpperCase()}
        </div>

        {/* Distance */}
        <div className="flex justify-end mb-1">
          <div className="text-right">
            <div className="text-[8px] font-bold text-gray-500">DISTANCE</div>
            <div className="text-[20px] font-black text-red-600">{e.d}km</div>
          </div>
        </div>

        <div className="h-1 bg-red-500 rounded mb-2 ml-16" />

        <div className="flex flex-col items-end gap-0.5 mt-auto">
          {e.as > 0 && (
            <>
              <div className="text-[8px] font-bold text-gray-500">ASCENT</div>
              <div className="text-[17px] font-black text-red-600">+{e.as}m</div>
            </>
          )}
          {e.rt && e.rt !== '00:00' && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px]">⏱</span>
              <span className="text-[11px] font-bold text-gray-800">FINISH: {e.rt}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HarCard({ e }: { e: BrevetEvent }) {
  return (
    <div style={{ background:'rgba(162,229,248,0.55)', border:'1px solid rgba(30,120,180,0.35)', borderRadius:4 }}
         className="flex flex-col h-full overflow-hidden">

      {/* Title bar */}
      <div style={{ background:'#7eb5be' }} className="px-3 py-2 text-center flex-shrink-0">
        <div className="font-bold text-black text-[13px]" style={{ fontFamily:'Georgia,serif' }}>
          Hellenic Autonomous Randonneurs
        </div>
        <div className="text-[7px] font-bold text-black/70 tracking-widest">ΔΙΟΡΓΑΝΩΤΗΣ</div>
      </div>

      {/* HAR logo circle */}
      <div className="flex justify-center py-2 flex-shrink-0">
        <div className="w-12 h-12 rounded-full border-2 border-[#0d47a1] flex items-center justify-center bg-white/60">
          <span className="text-[8px] font-black text-[#0d47a1]">H.A.R.</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-3 pb-1 flex flex-col min-h-0">
        <DottedLine />
        <div className="text-[11px] font-bold text-black/90 text-center leading-tight">
          {e.n} · {e.d}km
        </div>
        <DottedLine />
        <div className="text-[11px] font-bold text-black/80 text-center">{formatDate(e.dt)}</div>
        <DottedLine />

        {/* Details */}
        <div className="mt-auto pt-1 space-y-0.5">
          {e.rt && e.rt !== '00:00' && (
            <div className="flex justify-between text-[8px] text-black/50">
              <span className="font-bold">ΧΡΟΝΟΣ</span>
              <span className="font-mono font-bold">{e.rt}</span>
            </div>
          )}
          {e.mt && e.mt !== '00:00' && (
            <div className="flex justify-between text-[8px] text-black/50">
              <span className="font-bold">ΟΡΙΟ</span>
              <span className="font-mono font-bold">{e.mt}</span>
            </div>
          )}
        </div>
      </div>

      {/* HAR stamp */}
      <div className="flex justify-center py-2 border-t border-blue-300/40 flex-shrink-0">
        <HarStamp code={e.har} />
      </div>
    </div>
  );
}

function DualCard({ e }: { e: BrevetEvent }) {
  const [page, setPage] = useState(0);
  const { bg: orgBg, text: orgText } = getOrgColor(e.og);
  const PAGES = ['ACP', 'HAR'];

  return (
    <div className="flex flex-col h-full">
      {/* Slide container */}
      <div className="flex-1 relative overflow-hidden rounded" style={{ minHeight: 0 }}>
        {/* ACP slide */}
        <div style={{
          position:'absolute', inset:0,
          transform:`translateX(${page === 0 ? '0%' : '-100%'})`,
          transition:'transform 0.35s ease',
          background:'#f7e397',
          border:'2px solid #d4b800',
          borderRadius:4,
          overflow:'hidden',
        }}>
          <div style={{ background:'linear-gradient(90deg,#e5d186,#d4b800)' }}
               className="px-3 py-1.5 flex items-center justify-between flex-shrink-0">
            <div className="text-[7px] font-bold text-black/70 flex-1 leading-tight">
              ΛΕΣΧΗ ΠΟΔΗΛΑΤΙΚΟΥ ΤΟΥΡΙΣΜΟΥ ΕΛΛΑΔΑΣ
            </div>
            <div className="text-[6px] font-bold bg-black/20 text-white px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
              ⚡ ACP+HAR
            </div>
          </div>
          <div className="p-3 flex gap-2">
            <div className="flex-1 flex flex-col min-w-0">
              <div style={{ background: orgBg }} className="w-8 h-8 rounded flex items-center justify-center mb-1.5 flex-shrink-0">
                <span style={{ color: orgText }} className="text-[7px] font-black">{getOrganizerInitials(e.og)}</span>
              </div>
              <DottedLine />
              <div className="text-[10px] font-black text-black/90 truncate">{e.n.toUpperCase()}</div>
              <DottedLine />
              <div className="text-[10px] font-bold text-black/80">{formatDate(e.dt)}</div>
              <DottedLine />
              <div className="text-[13px] font-black text-black/90">{e.d}km{e.as > 0 ? ` ▲+${e.as}m` : ''}</div>
              {e.rt && e.rt !== '00:00' && (
                <div className="text-[8px] text-black/50 mt-0.5">⏱ {e.rt}</div>
              )}
            </div>
            <div className="flex items-center justify-center flex-shrink-0">
              <AcpStamp code={e.acp} />
            </div>
          </div>
        </div>

        {/* HAR slide */}
        <div style={{
          position:'absolute', inset:0,
          transform:`translateX(${page === 1 ? '0%' : '100%'})`,
          transition:'transform 0.35s ease',
          background:'rgba(162,229,248,0.55)',
          border:'1px solid rgba(30,120,180,0.35)',
          borderRadius:4,
          overflow:'hidden',
        }}>
          <div style={{ background:'#7eb5be' }}
               className="px-3 py-1.5 flex items-center justify-between flex-shrink-0">
            <div className="text-[7px] font-bold text-black/80 flex-1">Hellenic Autonomous Randonneurs</div>
            <div className="text-[6px] font-bold bg-black/20 text-white px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
              ⚡ ACP+HAR
            </div>
          </div>
          <div className="p-3 flex gap-2">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="w-8 h-8 rounded-full border-2 border-[#0d47a1] flex items-center justify-center mb-1.5 flex-shrink-0 bg-white/60">
                <span className="text-[7px] font-black text-[#0d47a1]">HAR</span>
              </div>
              <DottedLine />
              <div className="text-[10px] font-black text-black/90 truncate">{e.n.toUpperCase()}</div>
              <DottedLine />
              <div className="text-[10px] font-bold text-black/80">{formatDate(e.dt)}</div>
              <DottedLine />
              <div className="text-[13px] font-black text-black/90">{e.d}km{e.as > 0 ? ` ▲+${e.as}m` : ''}</div>
              {e.rt && e.rt !== '00:00' && (
                <div className="text-[8px] text-black/50 mt-0.5">⏱ {e.rt}</div>
              )}
            </div>
            <div className="flex items-center justify-center flex-shrink-0">
              <HarStamp code={e.har} />
            </div>
          </div>
        </div>
      </div>

      {/* Indicators */}
      <div className="flex items-center justify-center gap-2 pt-1 pb-0.5 flex-shrink-0">
        <div className="text-[6px] font-bold text-yellow-600 tracking-wider">ΔΙΠΛΗ ΟΜΟΛΟΓΗΣΗ</div>
        {PAGES.map((_, i) => (
          <button key={i} onClick={() => setPage(i)} style={{
            width: page === i ? 14 : 5, height: 5, borderRadius: 3, border: 'none', cursor: 'pointer',
            background: page === i ? (i === 0 ? '#d4b800' : '#7eb5be') : '#9ca3af',
            transition: 'all 0.25s',
            padding: 0,
          }} />
        ))}
        {page === 0 && (
          <div className="text-[7px] text-[#7eb5be] font-bold flex items-center gap-0.5">
            HAR <span>→</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FlecheCard({ e }: { e: BrevetEvent }) {
  return (
    <div style={{ background:'#FFFDE7', border:'2px solid rgba(200,160,0,0.3)', borderRadius:8 }}
         className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between border-b border-yellow-200 flex-shrink-0"
           style={{ background:'rgba(255,245,157,0.6)' }}>
        <div className="text-[12px] font-bold text-yellow-900">⚡ Flèche Nationale</div>
        <div className="text-[8px] font-bold text-yellow-700">24h TEAM</div>
      </div>
      <div className="flex-1 p-3 flex flex-col gap-1">
        <div className="text-[8px] text-black/40 italic text-center">
          24 hours of team cycling towards a concentration
        </div>
        <div className="border-t border-yellow-200 my-1" />
        <div className="text-[12px] font-black text-amber-900 leading-tight">{e.n.toUpperCase()}</div>
        <div className="text-[9px] text-black/50">{formatDate(e.dt)}</div>
        {e.acp && e.acp !== 'null' && (
          <div className="text-[8px] text-black/40 font-mono">Homologation: {e.acp}</div>
        )}
        <div className="text-[18px] font-black text-blue-900 mt-auto">
          {e.d}km {e.as > 0 ? `+${e.as}m` : ''}
        </div>
      </div>
    </div>
  );
}

function SreCard({ e }: { e: BrevetEvent }) {
  return (
    <div style={{ background:'rgb(224,177,232)', border:'1px solid rgba(213,73,238,0.5)', borderRadius:12 }}
         className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between flex-shrink-0"
           style={{ background:'rgba(150,40,180,0.15)' }}>
        <div className="text-[9px] font-bold text-purple-900">PROVENCE Randonneurs</div>
        <div className="text-[8px] font-bold text-purple-700">Super Randonnée</div>
      </div>
      <div className="flex-1 p-3 flex flex-col gap-1">
        <div className="text-[8px] italic text-purple-700 text-center">"The route of the High Peaks"</div>
        <div className="border-t border-purple-300 my-1" />
        <div className="text-[11px] font-black text-purple-900 leading-tight">{e.n.toUpperCase()}</div>
        <div className="text-[9px] text-black/50">{formatDate(e.dt)}</div>
        {e.acp && e.acp !== 'null' && (
          <div className="text-[8px] font-mono text-black/40">Homologation: {e.acp}</div>
        )}
        <div className="flex items-end gap-2 mt-auto">
          <div className="text-[17px] font-black text-purple-700">{e.d}km</div>
          {e.as > 0 && <div className="text-[13px] font-bold text-purple-500">+{e.as}m</div>}
        </div>
        {e.rt && e.rt !== '00:00' && (
          <div className="text-[8px] text-purple-600 font-bold">⏱ {e.rt}</div>
        )}
      </div>
      <div className="px-3 py-1.5 border-t border-purple-300/40 flex-shrink-0">
        <span className="text-[7px] font-black tracking-widest text-purple-800 bg-purple-800/10 px-2 py-0.5 rounded">
          OFFICIAL FINISHER
        </span>
      </div>
    </div>
  );
}

// ── Card dispatcher ───────────────────────────────────────────────────────────
function BrevetCard({ e }: { e: BrevetEvent }) {
  const type  = (e.t  ?? '').toUpperCase();
  const name  = (e.n  ?? '').toUpperCase();
  const acpOk = e.acp && e.acp !== 'null' && e.acp !== '' && e.acp !== '---';
  const harOk = e.har && e.har !== 'null' && e.har !== '' && e.har !== '---';

  if (type === 'PBP')                              return <PbpCard    e={e} />;
  if (name.includes('FLECHE') || type === 'FLC')  return <FlecheCard e={e} />;
  if (type === 'SRE')                              return <SreCard    e={e} />;
  if (acpOk && harOk)                              return <DualCard   e={e} />;
  if (harOk && !acpOk)                             return <HarCard    e={e} />;
  return <BrmCard e={e} />;
}

// ── Horizontal scroll rail ────────────────────────────────────────────────────
const CARD_W = 222;
const CARD_H = 242;
const GAP    = 12;

function EventsScrollRail({ events }: { events: BrevetEvent[] }) {
  const railRef    = useRef<HTMLDivElement>(null);
  const [paused,    setPaused]    = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // Sort ascending by date (same as Android)
  const sorted = [...events].sort((a, b) => {
    try { return new Date(a.dt).getTime() - new Date(b.dt).getTime(); } catch { return 0; }
  });

  const scrollToIdx = useCallback((idx: number) => {
    railRef.current?.scrollTo({ left: idx * (CARD_W + GAP), behavior: 'smooth' });
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (paused || sorted.length <= 1) return;
    const timer = setInterval(() => {
      const rail = railRef.current;
      if (!rail) return;
      const maxScroll = rail.scrollWidth - rail.clientWidth;
      if (rail.scrollLeft >= maxScroll - 8) {
        rail.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        rail.scrollBy({ left: CARD_W + GAP, behavior: 'smooth' });
      }
    }, 2800);
    return () => clearInterval(timer);
  }, [paused, sorted.length]);

  function handleCardClick(idx: number) {
    if (activeIdx === idx) {
      setActiveIdx(null);
      setPaused(false);
    } else {
      setActiveIdx(idx);
      setPaused(true);
      scrollToIdx(idx);
    }
  }

  return (
    <div className="relative select-none">
      {/* Scroll rail */}
      <div
        ref={railRef}
        className="flex overflow-x-auto"
        style={{
          gap: GAP,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 12,
          paddingTop: 4,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollSnapType: 'x mandatory',
        }}
      >
        {sorted.map((e, i) => (
          <div
            key={i}
            onClick={() => handleCardClick(i)}
            style={{
              width: CARD_W,
              minWidth: CARD_W,
              height: CARD_H,
              scrollSnapAlign: 'start',
              flexShrink: 0,
              cursor: 'pointer',
              borderRadius: 6,
              outline: activeIdx === i ? '2px solid #06b6d4' : 'none',
              outlineOffset: 2,
              transform: activeIdx === i ? 'scale(1.03) translateY(-2px)' : 'scale(1)',
              boxShadow: activeIdx === i
                ? '0 8px 28px rgba(0,0,0,0.5)'
                : '0 2px 10px rgba(0,0,0,0.3)',
              opacity: activeIdx !== null && activeIdx !== i ? 0.6 : 1,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease, outline 0.15s ease',
              overflow: 'hidden',
            }}
          >
            <BrevetCard e={e} />
          </div>
        ))}
      </div>

      {/* Pause indicator */}
      {paused && (
        <div
          className="absolute top-2 right-4 flex items-center gap-1 rounded-full"
          style={{ background:'rgba(0,0,0,0.65)', padding:'3px 8px' }}
        >
          <div style={{ width:3, height:10, background:'#06b6d4', borderRadius:1.5 }} />
          <div style={{ width:3, height:10, background:'#06b6d4', borderRadius:1.5 }} />
          <span style={{ fontSize:8, color:'#06b6d4', fontWeight:700, marginLeft:3 }}>PAUSE</span>
        </div>
      )}

      {/* Dot indicators */}
      {sorted.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 pb-1">
          {sorted.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActiveIdx(i); setPaused(true); scrollToIdx(i); }}
              style={{
                width: activeIdx === i ? 16 : 5,
                height: 5,
                borderRadius: 3,
                background: activeIdx === i ? '#06b6d4' : 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* Hint */}
      {sorted.length > 1 && !paused && activeIdx === null && (
        <p className="text-center text-[9px] pb-1" style={{ color:'rgba(255,255,255,0.2)', fontStyle:'italic' }}>
          scroll · tap to pause
        </p>
      )}
    </div>
  );
}

// ── YearCard (exported — drop-in replacement) ─────────────────────────────────
export function YearCard({ year, data }: { year: string; data: YearData }) {
  const [open, setOpen] = useState(false);

  const has200 = data.events.some(e => e.d >= 200 && e.d < 300);
  const has300 = data.events.some(e => e.d >= 300 && e.d < 400);
  const has400 = data.events.some(e => e.d >= 400 && e.d < 600);
  const has600 = data.events.some(e => e.d >= 600);
  const isSR   = has200 && has300 && has400 && has600;
  const isPBP  = data.events.some(e => e.t?.toUpperCase() === 'PBP');
  const isFLC  = data.events.some(e =>
    e.t?.toUpperCase() === 'FLC' || e.n?.toUpperCase().includes('FLECHE')
  );

  return (
    <div
      className="rounded-xl overflow-hidden mb-3 transition-all duration-200"
      style={{
        background: open ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${open ? 'rgba(6,182,212,0.35)' : 'rgba(255,255,255,0.1)'}`,
      }}
    >
      {/* ── Year header (click to expand) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-4">
          <div
            className="rounded-xl px-3 py-2 text-center min-w-[56px] border transition-all duration-200"
            style={{
              background: open ? 'rgba(6,182,212,0.15)' : '#0A1628',
              borderColor: open ? 'rgba(6,182,212,0.5)' : 'rgba(6,182,212,0.3)',
            }}
          >
            <div className="text-cyan-400 font-bold text-lg leading-none">{year}</div>
          </div>
          <div className="text-left">
            <div className="text-white font-bold">{data.km.toLocaleString('el-GR')}km</div>
            <div className="text-xs" style={{ color:'rgba(255,255,255,0.4)' }}>{data.brevets} brevets</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSR  && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">SR</span>}
          {isPBP && <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">PBP</span>}
          {isFLC && <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold">FLECHE</span>}
          <span
            className="text-lg transition-transform duration-300"
            style={{
              display: 'inline-block',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              color: 'rgba(255,255,255,0.3)',
            }}
          >▼</span>
        </div>
      </button>

      {/* ── Expanded card rail ── */}
      {open && (
        <div
          className="border-t py-3"
          style={{
            borderColor:'rgba(255,255,255,0.1)',
            background:'rgba(0,0,0,0.18)',
          }}
        >
          {data.events.length === 0 ? (
            <p className="px-5 text-sm" style={{ color:'rgba(255,255,255,0.3)' }}>
              Δεν βρέθηκαν brevets.
            </p>
          ) : (
            <EventsScrollRail events={data.events} />
          )}
        </div>
      )}
    </div>
  );
}

export default YearCard;
