'use client';

import { useEffect, useState } from 'react';
import { resolveOrganizerLogoId } from '../lib/organizerLogo';

export interface SpotlightRoute {
  key: string;
  name: string;
  distance: number;
  organizer: string;
  participants: number;
  editions: number;
  firstYear: string;
  lastYear: string;
}

interface Category { bucket: number; title: string; color: string }

// Mirrors _BrevetSpotlightCarouselState._cats in the Flutter app's
// brevet_universe_screen.dart — same copy, same colors, same order.
const CATEGORIES: Category[] = [
  { bucket: -1,   title: '🏆 Πιο δημοφιλές\nΜπρεβέ',  color: '#00D4FF' },
  { bucket: 200,  title: '🔵 Πιο δημοφιλές\n200άρι',  color: '#42A5F5' },
  { bucket: 300,  title: '🟢 Πιο δημοφιλές\n300άρι',  color: '#66BB6A' },
  { bucket: 400,  title: '🟣 Πιο δημοφιλές\n400άρι',  color: '#7986CB' },
  { bucket: 600,  title: '🟠 Πιο δημοφιλές\n600άρι',  color: '#FF8A65' },
  { bucket: 1000, title: '🔴 Πιο δημοφιλές\n1000άρι+', color: '#EF5350' },
];

function bucketOf(dist: number) {
  if (dist <= 200) return 200;
  if (dist <= 300) return 300;
  if (dist <= 400) return 400;
  if (dist <= 600) return 600;
  return 1000;
}

function distLabel(dist: number) {
  if (dist <= 200)  return '200';
  if (dist <= 300)  return '300';
  if (dist <= 400)  return '400';
  if (dist <= 600)  return '600';
  if (dist <= 1000) return '1000';
  return '1200+';
}

const INTERVAL_MS = 5000;

interface Slide { route: SpotlightRoute; title: string; color: string }

interface Props { routes: SpotlightRoute[] }

export default function BrevetSpotlightCarousel({ routes }: Props) {
  // routes is already sorted by participants desc (same as Flutter's `ranked`),
  // so the first match per bucket is the most popular route in that bucket.
  const slides: Slide[] = [];
  for (const cat of CATEGORIES) {
    const top = cat.bucket === -1 ? routes[0] : routes.find(r => bucketOf(r.distance) === cat.bucket);
    if (top) slides.push({ route: top, title: cat.title, color: cat.color });
  }

  const count = slides.length;
  const [idx, setIdx]     = useState(0);
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

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

  const slide    = slides[idx];
  const { route, color } = slide;
  const logoId   = resolveOrganizerLogoId(route.organizer);

  const slideStyle: React.CSSProperties = {
    transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.5s ease',
    transform:  phase === 'in'  ? 'translateY(0)' :
                phase === 'out' ? 'translateY(-60px)' : 'translateY(0)',
    opacity:    phase === 'hold' ? 1 : phase === 'in' ? 0 : 0,
  };

  const yearRange = route.firstYear
    ? route.firstYear === route.lastYear ? route.firstYear : `${route.firstYear}–${route.lastYear}`
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
      {/* Dots */}
      <div className="flex justify-center gap-1.5 mb-3">
        {slides.map((s, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className="rounded-full transition-all"
            style={{
              width: i === idx ? 16 : 6, height: 6,
              background: i === idx ? s.color : `${s.color}55`,
            }} />
        ))}
      </div>

      <div style={{ overflow: 'hidden', minHeight: 150 }}>
        <div style={slideStyle}>
          {/* Title */}
          <p className="font-bold text-sm leading-tight mb-4 whitespace-pre-line" style={{ color }}>
            {slide.title}
          </p>

          {/* Distance badge + name row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0 w-16 h-16 rounded-full flex flex-col items-center justify-center"
              style={{ border: `2.5px solid ${color}`, boxShadow: `0 0 16px ${color}80`,
                       background: `${color}18` }}>
              <span className="font-bold text-lg leading-none" style={{ color }}>{distLabel(route.distance)}</span>
              <span className="text-[9px] mt-0.5" style={{ color: `${color}A0` }}>km</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px] leading-tight truncate" style={{ color }}>
                {route.name}
              </p>
              <p className="text-white/35 text-xs mt-0.5">{yearRange}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 text-center">
              <div className="font-bold text-xl" style={{ color }}>{route.participants.toLocaleString('el')}</div>
              <div className="text-white/35 text-[10px]">Αναβάτες</div>
            </div>
            <div className="flex-1 text-center">
              <div className="font-bold text-xl" style={{ color: `${color}CC` }}>{route.editions}</div>
              <div className="text-white/35 text-[10px]">Εκδόσεις</div>
            </div>
            {route.organizer && (
              <div className="flex-1 flex flex-col items-center min-w-0">
                {logoId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/logos/${logoId}.png`} alt={route.organizer} className="h-14 object-contain"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span style={{ color }} className="text-lg">🚴</span>
                )}
                <p className="text-white/35 text-[9px] mt-0.5 truncate max-w-full">{route.organizer}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
