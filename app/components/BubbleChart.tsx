'use client';

import { useEffect, useState } from 'react';
import { resolveOrganizerLogoId } from '../lib/organizerLogo';

export interface BubbleItem {
  id: string;
  label: string;
  sublabel: string;
  value: number;
  rank: number;
}

const VW = 800;
const VH = 480;
const MIN_R = 20;
const MAX_R = 80;

function sqrtScale(v: number, maxVal: number) {
  return MIN_R + (MAX_R - MIN_R) * Math.sqrt(v / Math.max(maxVal, 1));
}

function seeded(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

interface Circle { id: string; r: number; x: number; y: number; }

function packCircles(items: BubbleItem[], maxVal: number): Circle[] {
  const circles: Circle[] = items.map((item, i) => ({
    id: item.id,
    r:  sqrtScale(item.value, maxVal),
    x:  VW / 2 + (seeded(i * 3)     - 0.5) * VW * 0.3,
    y:  VH / 2 + (seeded(i * 3 + 1) - 0.5) * VH * 0.3,
  }));
  for (let iter = 0; iter < 250; iter++) {
    for (const c of circles) {
      c.x += (VW / 2 - c.x) * 0.01;
      c.y += (VH / 2 - c.y) * 0.01;
    }
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i], b = circles[j];
        const dx = b.x - a.x || 0.001, dy = b.y - a.y || 0.001;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minD = a.r + b.r + 4;
        if (dist < minD) {
          const push = (minD - dist) / dist / 2;
          a.x -= dx * push; a.y -= dy * push;
          b.x += dx * push; b.y += dy * push;
        }
      }
      circles[i].x = Math.max(circles[i].r + 4, Math.min(VW - circles[i].r - 4, circles[i].x));
      circles[i].y = Math.max(circles[i].r + 4, Math.min(VH - circles[i].r - 4, circles[i].y));
    }
  }
  return circles;
}

function getStyle(rank: number) {
  if (rank === 1) return { fill: 'rgba(234,179,8,0.85)',  stroke: '#eab308', glow: 'rgba(234,179,8,0.5)' };
  if (rank === 2) return { fill: 'rgba(148,163,184,0.8)', stroke: '#94a3b8', glow: 'rgba(148,163,184,0.4)' };
  if (rank === 3) return { fill: 'rgba(194,100,20,0.85)', stroke: '#c26414', glow: 'rgba(194,100,20,0.5)' };
  if (rank <= 5)  return { fill: 'rgba(6,182,212,0.75)',  stroke: '#06b6d4', glow: 'rgba(6,182,212,0.4)' };
  if (rank <= 10) return { fill: 'rgba(139,92,246,0.65)', stroke: '#8b5cf6', glow: 'rgba(139,92,246,0.35)' };
  if (rank <= 20) return { fill: 'rgba(99,102,241,0.5)',  stroke: '#6366f1', glow: 'rgba(99,102,241,0.25)' };
  return { fill: 'rgba(255,255,255,0.08)', stroke: 'rgba(255,255,255,0.2)', glow: 'transparent' };
}

interface Props { items: BubbleItem[] }

export default function BubbleChart({ items }: Props) {
  const [circles, setCircles]   = useState<(Circle & BubbleItem)[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!items.length) return;
    const maxVal = Math.max(...items.map(i => i.value), 1);
    const packed  = packCircles(items, maxVal);
    setCircles(items.map((item, i) => ({ ...item, ...packed[i] })));
  }, [items]);

  if (!circles.length) return <div style={{ paddingBottom: '60%' }} className="w-full" />;

  return (
    <div className="w-full select-none">
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <filter id="bc-glow-a" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="bc-glow-b" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* SVG pattern per bubble — fills a circle with the logo image, no clipPath needed.
              Pattern id is index-based (not the raw org id) since ids like
              "BLE CYCLING CLUB" contain spaces that break url(#...) references. */}
          {circles.map((c, idx) => {
            const logoId = resolveOrganizerLogoId(c.id);
            if (!logoId) return null;
            return (
              <pattern key={c.id} id={`logo-${idx}`}
                x="0" y="0" width="1" height="1"
                patternUnits="objectBoundingBox"
                patternContentUnits="objectBoundingBox">
                <image href={`/logos/${logoId}.png`} x="0" y="0" width="1" height="1"
                  preserveAspectRatio="xMidYMid meet" />
              </pattern>
            );
          })}
        </defs>

        {circles.map((c, idx) => {
          const style    = getStyle(c.rank);
          const isActive = selected === c.id;
          const words    = c.label.split(/\s+/);
          const fs       = Math.max(8, Math.min(13, c.r / 4));
          const filterId = c.rank === 1 ? 'bc-glow-a' : c.rank <= 5 ? 'bc-glow-b' : undefined;
          const hasLogo  = resolveOrganizerLogoId(c.id) !== null;

          return (
            <g key={c.id} transform={`translate(${c.x},${c.y})`}
              onClick={() => setSelected(isActive ? null : c.id)}
              style={{ cursor: 'pointer' }}>

              {/* Animation wrapper */}
              <g style={{ opacity: 0, animation: `bc-in 0.45s ease forwards`, animationDelay: `${idx * 20}ms`,
                transformBox: 'fill-box', transformOrigin: 'center' }}>

                {c.rank <= 10 && (
                  <circle r={c.r + 7} fill="none" stroke={style.glow} strokeWidth={isActive ? 2.5 : 1.5}
                    filter={filterId ? `url(#${filterId})` : undefined} />
                )}

                {/* Main bubble */}
                <circle r={isActive ? c.r + 4 : c.r} fill={style.fill} stroke={style.stroke}
                  strokeWidth={isActive ? 2 : 1} style={{ transition: 'r 0.2s, stroke-width 0.2s' }} />

                {/* Logo circle filled via pattern — covers name text when image loads */}
                {c.r >= 26 && hasLogo && (
                  <circle r={c.r * 0.64} fill={`url(#logo-${idx})`} style={{ pointerEvents: 'none' }} />
                )}

                {/* Name text — rendered whenever there's no known logo for this organizer */}
                {c.r >= 26 && !hasLogo && (
                  <text textAnchor="middle" fill="white" fontSize={fs} fontWeight="700"
                    style={{ pointerEvents: 'none', mixBlendMode: 'difference' }}>
                    {words.slice(0, 2).map((w, wi, arr) => (
                      <tspan key={wi} x="0"
                        dy={arr.length === 1 ? '0' : wi === 0 ? `-${fs * 0.55}` : `${fs * 1.25}`}
                        dominantBaseline={arr.length === 1 ? 'central' : undefined}>
                        {w.length > 9 ? w.slice(0, 8) + '…' : w}
                      </tspan>
                    ))}
                  </text>
                )}

                {/* Rank badge */}
                {c.rank <= 5 && c.r >= 24 && (
                  <>
                    <circle cx={c.r - 10} cy={-c.r + 10} r={10} fill="#0A1628" stroke={style.stroke} strokeWidth={1.5} />
                    <text x={c.r - 10} y={-c.r + 10} textAnchor="middle" dominantBaseline="central"
                      fill="white" fontSize="8" fontWeight="800" style={{ pointerEvents: 'none' }}>#{c.rank}</text>
                  </>
                )}

                {/* Tooltip on select */}
                {isActive && (
                  <g transform={`translate(0,${-c.r - 52})`}>
                    <rect x={-75} y={-18} width={150} height={44} rx={8}
                      fill="#0d1f3c" stroke={style.stroke} strokeWidth={1.5} />
                    <text textAnchor="middle" y={-4} fill="white" fontSize="11" fontWeight="700">
                      {c.label.length > 22 ? c.label.slice(0, 21) + '…' : c.label}
                    </text>
                    <text textAnchor="middle" y={14} fill="rgba(255,255,255,0.5)" fontSize="10">{c.sublabel}</text>
                  </g>
                )}
              </g>
            </g>
          );
        })}
      </svg>

      <style>{`
        @keyframes bc-in {
          from { opacity: 0; transform: scale(0.15); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
