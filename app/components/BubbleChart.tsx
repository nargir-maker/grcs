'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface BubbleItem {
  id: string;
  label: string;
  sublabel: string;
  value: number;
  rank: number;
}

interface SimNode extends d3.SimulationNodeDatum, BubbleItem {}

const MIN_R = 18;
const MAX_R = 72;

function getStyle(rank: number) {
  if (rank === 1) return { fill: 'rgba(234,179,8,0.85)',   stroke: 'rgba(234,179,8,1)',    shadow: 'rgba(234,179,8,0.5)' };
  if (rank === 2) return { fill: 'rgba(148,163,184,0.8)',  stroke: 'rgba(148,163,184,1)',  shadow: 'rgba(148,163,184,0.4)' };
  if (rank === 3) return { fill: 'rgba(194,100,20,0.85)',  stroke: 'rgba(194,100,20,1)',   shadow: 'rgba(194,100,20,0.5)' };
  if (rank <= 5)  return { fill: 'rgba(6,182,212,0.75)',   stroke: 'rgba(6,182,212,1)',    shadow: 'rgba(6,182,212,0.4)' };
  if (rank <= 10) return { fill: 'rgba(139,92,246,0.65)',  stroke: 'rgba(139,92,246,0.9)', shadow: 'rgba(139,92,246,0.35)' };
  if (rank <= 20) return { fill: 'rgba(99,102,241,0.5)',   stroke: 'rgba(99,102,241,0.7)', shadow: 'rgba(99,102,241,0.25)' };
  return { fill: 'rgba(255,255,255,0.08)', stroke: 'rgba(255,255,255,0.2)', shadow: 'rgba(255,255,255,0.05)' };
}

interface Props {
  items: BubbleItem[];
  height?: number;
}

export default function BubbleChart({ items, height = 480 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth]           = useState(0);
  const [positions, setPositions]   = useState<(SimNode & { x: number; y: number })[]>([]);
  const [selected, setSelected]     = useState<string | null>(null);
  const [mounted, setMounted]       = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = containerRef.current;
    if (!el) return;
    // Read actual width immediately on mount
    const initial = el.getBoundingClientRect().width;
    if (initial > 0) setWidth(initial);
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w > 0) setWidth(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!items.length || !width) return;

    const maxVal = Math.max(...items.map(i => i.value), 1);
    const rScale = d3.scaleSqrt().domain([0, maxVal]).range([MIN_R, MAX_R]);

    const nodes: SimNode[] = items.map(item => ({
      ...item,
      x: width / 2 + (Math.random() - 0.5) * width * 0.4,
      y: height / 2 + (Math.random() - 0.5) * height * 0.4,
    }));

    const sim = d3
      .forceSimulation<SimNode>(nodes)
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08))
      .force('charge', d3.forceManyBody<SimNode>().strength(-15))
      .force('collide', d3.forceCollide<SimNode>().radius(n => rScale(n.value) + 3).strength(0.95))
      .stop();

    sim.tick(350);

    setPositions(
      nodes.map(n => ({
        ...n,
        x: Math.max(MAX_R + 4, Math.min(width  - MAX_R - 4, n.x ?? width / 2)),
        y: Math.max(MAX_R + 4, Math.min(height - MAX_R - 4, n.y ?? height / 2)),
      })) as (SimNode & { x: number; y: number })[]
    );
  }, [items, width, height]);

  const maxVal = items.length ? Math.max(...items.map(i => i.value), 1) : 1;
  const rScale = d3.scaleSqrt().domain([0, maxVal]).range([MIN_R, MAX_R]);

  return (
    <div ref={containerRef} className="w-full select-none" style={{ minHeight: height }}>
      {(!mounted || width === 0 || positions.length === 0) ? null : (<>
      <svg width={width} height={height}>
        <defs>
          <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-std" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {positions.map((node, idx) => {
          const r       = rScale(node.value);
          const style   = getStyle(node.rank);
          const isActive = selected === node.id;
          const glowId  = node.rank === 1 ? 'glow-gold' : node.rank <= 5 ? 'glow-cyan' : 'glow-std';
          const words   = node.label.split(/\s+/);
          const fontSize = Math.max(8, Math.min(12, r / 4.5));

          return (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              style={{
                cursor: 'pointer',
                opacity: 0,
                animation: `bubbleIn 0.5s ease forwards`,
                animationDelay: `${idx * 18}ms`,
              }}
              onClick={() => setSelected(isActive ? null : node.id)}
            >
              {/* Outer glow ring for top 10 */}
              {node.rank <= 10 && (
                <circle
                  r={r + 6}
                  fill="none"
                  stroke={style.shadow}
                  strokeWidth={isActive ? 3 : 1.5}
                  filter={`url(#${glowId})`}
                  style={{ transition: 'all 0.25s' }}
                />
              )}

              {/* Main bubble */}
              <circle
                r={isActive ? r + 5 : r}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={isActive ? 2 : 1}
                style={{ transition: 'all 0.25s ease' }}
              />

              {/* Label text */}
              {r >= 26 && (
                <text
                  textAnchor="middle"
                  fill="white"
                  fontSize={fontSize}
                  fontWeight="700"
                  style={{ pointerEvents: 'none' }}
                >
                  {words.length === 1 ? (
                    <tspan x="0" dominantBaseline="central">
                      {words[0].length > 12 ? words[0].slice(0, 11) + '…' : words[0]}
                    </tspan>
                  ) : words.length === 2 ? (
                    <>
                      <tspan x="0" dy={`-${fontSize * 0.6}px`}>{words[0].length > 9 ? words[0].slice(0, 8) + '…' : words[0]}</tspan>
                      <tspan x="0" dy={`${fontSize * 1.3}px`}>{words[1].length > 9 ? words[1].slice(0, 8) + '…' : words[1]}</tspan>
                    </>
                  ) : (
                    <>
                      <tspan x="0" dy={`-${fontSize * 0.7}px`}>{words[0].length > 8 ? words[0].slice(0, 7) + '…' : words[0]}</tspan>
                      <tspan x="0" dy={`${fontSize * 1.3}px`}>{words[1].length > 8 ? words[1].slice(0, 7) + '…' : words[1]}</tspan>
                    </>
                  )}
                </text>
              )}

              {/* Rank badge (top 5) */}
              {node.rank <= 5 && r >= 22 && (
                <>
                  <circle cx={r - 9} cy={-r + 9} r={9} fill="#0A1628" stroke={style.stroke} strokeWidth={1.5} />
                  <text x={r - 9} y={-r + 9} textAnchor="middle" dominantBaseline="central"
                    fill="white" fontSize="8" fontWeight="800" style={{ pointerEvents: 'none' }}>
                    #{node.rank}
                  </text>
                </>
              )}

              {/* Tooltip on select */}
              {isActive && (
                <g transform={`translate(0,${-r - 48})`}>
                  <rect x={-72} y={-16} width={144} height={40} rx={8}
                    fill="#0d1f3c" stroke={style.stroke} strokeWidth={1.5} />
                  <text textAnchor="middle" y={-2} fill="white" fontSize="11" fontWeight="700">
                    {node.label.length > 20 ? node.label.slice(0, 19) + '…' : node.label}
                  </text>
                  <text textAnchor="middle" y={13} fill="rgba(255,255,255,0.5)" fontSize="10">
                    {node.sublabel}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: scale(0.2); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
      </>)}
    </div>
  );
}
