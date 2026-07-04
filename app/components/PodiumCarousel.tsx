'use client';

import { useEffect, useState } from 'react';
import { resolveOrganizerLogoId } from '../lib/organizerLogo';

export interface PodiumEntry {
  id: string;
  name: string;
  participants: number;
  brevets: number;
  firstYear: string;
  lastYear: string;
}

const TITLES = [
  { emoji: '👑', line1: 'Κυρίαρχος', line2: 'του Σύμπαντος',         color: '#00D4FF' },
  { emoji: '🌌', line1: 'Άρχοντας',  line2: 'του Γαλαξία',           color: '#FF2D9B' },
  { emoji: '☀️', line1: 'Πρίγκιπας', line2: 'του Ηλιακού Συστήματος', color: '#9D4FFF' },
  { emoji: '🪐', line1: 'Κυβερνήτης',line2: 'του Πλανήτη',           color: '#00FF88' },
  { emoji: '🌙', line1: 'Έπαρχος',   line2: 'της Σελήνης',           color: '#FF6B35' },
];

const INTERVAL_MS = 4800;

interface Props { orgs: PodiumEntry[] }

export default function PodiumCarousel({ orgs }: Props) {
  const count  = Math.min(orgs.length, 5);
  const [idx, setIdx]         = useState(0);
  const [phase, setPhase]     = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    if (count === 0) return;
    let timer: ReturnType<typeof setTimeout>;

    const run = () => {
      setPhase('in');
      timer = setTimeout(() => {
        setPhase('hold');
        timer = setTimeout(() => {
          setPhase('out');
          timer = setTimeout(() => {
            setIdx(i => (i + 1) % count);
            run();
          }, 500);
        }, INTERVAL_MS - 1000);
      }, 500);
    };
    run();
    return () => clearTimeout(timer);
  }, [count]);

  if (count === 0) return null;

  const org    = orgs[idx];
  const title  = TITLES[idx];
  const color  = title.color;
  const logoId = resolveOrganizerLogoId(org.id);

  const slideStyle: React.CSSProperties = {
    transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.5s ease',
    transform:  phase === 'in'  ? 'translateY(0)' :
                phase === 'out' ? 'translateY(-60px)' : 'translateY(0)',
    opacity:    phase === 'hold' ? 1 : phase === 'in' ? 0 : 0,
  };

  const yearRange = org.firstYear
    ? org.firstYear === org.lastYear ? org.firstYear : `${org.firstYear}→${org.lastYear}`
    : '—';

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{
        background: `linear-gradient(135deg, ${color}18 0%, #0A002020 60%, #020818 100%)`,
        border: `1.5px solid ${color}55`,
        boxShadow: `0 0 24px ${color}25`,
        padding: '14px 20px 20px',
      }}
    >
      <p className="text-center text-xs font-bold tracking-widest mb-2"
        style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em' }}>
        ΟΙ 5 ΚΟΡΥΦΑΙΟΙ ΔΙΟΡΓΑΝΩΤΕΣ
      </p>

      <div style={{ overflow: 'hidden', minHeight: 120 }}>
        <div style={slideStyle}>
          {/* Title */}
          <p className="font-bold text-sm leading-tight mb-4" style={{ color }}>
            {title.emoji} {title.line1}<br />{title.line2}
          </p>

          {/* Logo + name row */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center p-1.5"
              style={{ border: `2px solid ${color}`, boxShadow: `0 0 16px ${color}80`,
                       background: 'rgba(255,255,255,0.06)' }}>
              {logoId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/logos/${logoId}.png`} alt={org.name}
                  className="w-full h-full object-contain"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span className="text-2xl">🚴</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base leading-tight truncate" style={{ color }}>
                {org.name}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { val: org.participants.toLocaleString('el'), label: 'Συμμετοχές' },
              { val: org.brevets.toString(),                label: 'Brevets'    },
              { val: yearRange,                             label: 'Χρόνια'     },
            ].map(s => (
              <div key={s.label}>
                <div className="font-bold text-xl" style={{ color }}>{s.val}</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {Array.from({ length: count }).map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className="rounded-full transition-all"
            style={{
              width: i === idx ? 18 : 6, height: 6,
              background: i === idx ? color : 'rgba(255,255,255,0.2)',
            }} />
        ))}
      </div>
    </div>
  );
}
