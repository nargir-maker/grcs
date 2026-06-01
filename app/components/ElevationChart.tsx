'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

interface ClimbSegment {
  startKm: number; endKm: number; category: string;
  avgGrade: number; maxGrade: number; elevationGain: number;
}
interface ElevationPoint { km: number; elevation: number; grade: number; }
interface RawPoint { lat: number; lng: number; ele: number; distKm: number; }
interface ElevationChartProps {
  gpxUrl: string; climbProfile?: ClimbSegment[]; storedAscent?: number;
  scrubberKm?: number | null; onScrub?: (km: number | null) => void;
  defaultZoomed?: boolean; zoomedPxPerKm?: number;
}

const CLIMB_COLORS: Record<string, string> = {
  HC: '#6A1B9A', C1: '#D32F2F', C2: '#E65100', C3: '#F9A825', C4: '#2E7D32',
};
const PAD = { top: 24, right: 16, bottom: 32, left: 48 };
const CHART_H = 160;

const LABEL_STYLE: React.CSSProperties = {
  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))',
};
const LABEL_FILL = 'rgba(255,255,255,0.90)';

function getCategoryColor(cat: string): string { return CLIMB_COLORS[cat] ?? '#06b6d4'; }

function gradeColor(grade: number): string {
  const abs = Math.abs(grade);
  if (abs < 3)  return '#FFFFFF';
  if (abs < 6)  return '#00E5FF';
  if (abs < 9)  return '#FFD600';
  if (abs < 12) return '#FF6D00';
  return '#FF1744';
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function savitzkyGolay(points: RawPoint[], windowM = 300): number[] {
  const n = points.length;
  const elevations = points.map(p => p.ele);
  if (n < 5) return elevations;
  const totalDistM = points[n-1].distKm * 1000;
  const avgSpacingM = totalDistM / (n-1);
  let halfW = Math.round(windowM / (2 * avgSpacingM));
  halfW = Math.max(2, halfW);
  function sgCoeffs(hw: number): number[] {
    const m = hw; const coeffs: number[] = [];
    for (let j = -m; j <= m; j++) {
      coeffs.push((3*(2*m+1)*(2*m+1)/4 - j*j*5/4)*3/((2*m+1)*(2*m-1)*(2*m+3)/3));
    }
    const sum = coeffs.reduce((a,b) => a+b, 0);
    return coeffs.map(c => c/sum);
  }
  const coeffs = sgCoeffs(halfW);
  const result: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let val = 0;
    for (let j = -halfW; j <= halfW; j++) {
      let idx = i+j;
      if (idx < 0) idx = -idx;
      if (idx >= n) idx = 2*n-2-idx;
      idx = Math.max(0, Math.min(n-1, idx));
      val += coeffs[j+halfW] * elevations[idx];
    }
    result[i] = val;
  }
  return result;
}

async function parseGpxFull(gpxUrl: string): Promise<RawPoint[]> {
  const response = await fetch(gpxUrl);
  const gpxText = await response.text();
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
  const trackPoints = gpxDoc.querySelectorAll('trkpt');
  if (trackPoints.length === 0) return [];
  const raw: RawPoint[] = [];
  let distKm = 0, prevLat = 0, prevLng = 0;
  trackPoints.forEach((pt, i) => {
    const lat = parseFloat(pt.getAttribute('lat') ?? '0');
    const lng = parseFloat(pt.getAttribute('lon') ?? '0');
    const ele = parseFloat(pt.querySelector('ele')?.textContent ?? '0');
    if (i > 0 && prevLat !== 0) distKm += haversineM(prevLat, prevLng, lat, lng) / 1000;
    prevLat = lat; prevLng = lng;
    raw.push({ lat, lng, ele, distKm });
  });
  return raw;
}

function buildDisplayPoints(raw: RawPoint[], smoothed: number[], targetCount: number): ElevationPoint[] {
  const n = raw.length;
  if (n === 0) return [];
  const step = Math.max(1, Math.floor(n / targetCount));
  const result: ElevationPoint[] = [];
  for (let i = 0; i < n; i += step) {
    const prevI = Math.max(0, i - step);
    const dM = (raw[i].distKm - raw[prevI].distKm) * 1000;
    const grade = i > 0 && dM > 0
      ? Math.round(Math.max(-30, Math.min(30, ((smoothed[i] - smoothed[prevI]) / dM) * 100)) * 10) / 10
      : 0;
    result.push({ km: Math.round(raw[i].distKm * 10) / 10, elevation: Math.round(smoothed[i]), grade });
  }
  const lastRaw = raw[n - 1];
  const lastKm = Math.round(lastRaw.distKm * 10) / 10;
  if (result.length === 0 || result[result.length - 1].km !== lastKm) {
    result.push({ km: lastKm, elevation: Math.round(smoothed[n - 1]), grade: 0 });
  }
  return result;
}

interface SvgElevationProps {
  points: ElevationPoint[]; width: number; height: number;
  climbSegments?: ClimbSegment[]; showClimbLabels?: boolean;
  scrubberKm: number | null; onScrub: (km: number | null) => void;
}

function SvgElevationChart({ points, width, height, climbSegments = [], showClimbLabels = true, scrubberKm, onScrub }: SvgElevationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cw = width - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;
  if (points.length < 2) return null;

  const minElev = Math.min(...points.map(p => p.elevation));
  const maxElev = Math.max(...points.map(p => p.elevation));
  const elevRange = Math.max(1, maxElev - minElev);
  const minKm = points[0].km;
  const maxKm = points[points.length - 1].km;
  const kmRange = Math.max(0.1, maxKm - minKm);

  const toX = (km: number) => PAD.left + ((km - minKm) / kmRange) * cw;
  const toY = (elev: number) => PAD.top + ch - ((elev - minElev) / elevRange) * ch;
  const yBase = toY(minElev);

  const segments: React.ReactElement[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i-1], curr = points[i];
    const x1 = toX(prev.km), y1 = toY(prev.elevation);
    const x2 = toX(curr.km), y2 = toY(curr.elevation);
    const col = gradeColor(curr.grade);
    segments.push(
      <polygon key={i}
        points={`${x1},${yBase} ${x1},${y1} ${x2},${y2} ${x2},${yBase}`}
        fill={col} fillOpacity={0.55} stroke={col} strokeWidth={1.2} strokeOpacity={0.9}
      />
    );
  }

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    elev: Math.round(minElev + elevRange * f),
    y: toY(minElev + elevRange * f),
  }));

  const xStep = kmRange <= 5 ? 1 : kmRange <= 20 ? 5 : kmRange <= 100 ? 10 : kmRange <= 300 ? 25 : kmRange <= 600 ? 50 : 100;
  const xLabels: { km: number; x: number }[] = [];
  for (let km = Math.ceil(minKm / xStep) * xStep; km <= maxKm; km += xStep) {
    xLabels.push({ km: Math.round(km * 10) / 10, x: toX(km) });
  }

  const climbZones = climbSegments.map((c, i) => {
    const zx1 = toX(Math.max(c.startKm, minKm));
    const zx2 = toX(Math.min(c.endKm, maxKm));
    if (zx2 <= zx1) return null;
    const col = getCategoryColor(c.category);
    return (
      <g key={`zone-${i}`}>
        <rect x={zx1} y={PAD.top} width={zx2-zx1} height={ch} fill={col} fillOpacity={0.10} />
        <line x1={zx1} y1={PAD.top} x2={zx1} y2={PAD.top+ch} stroke={col} strokeWidth={1.5} strokeOpacity={0.7} strokeDasharray="4 2" />
        {showClimbLabels && zx2-zx1 > 18 && (
          <text x={zx1+(zx2-zx1)/2} y={PAD.top-6} textAnchor="middle"
            fill={col} fontSize={10} fontWeight="bold" style={LABEL_STYLE}>
            {c.category}
          </text>
        )}
      </g>
    );
  });

  const scrubberX = scrubberKm !== null ? toX(scrubberKm) : null;
  const scrubPoint = scrubberKm !== null
    ? points.reduce((best, p) => Math.abs(p.km - scrubberKm) < Math.abs(best.km - scrubberKm) ? p : best)
    : null;

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const xPx = (e.clientX - rect.left) * scaleX - PAD.left;
    const km = minKm + (xPx / cw) * kmRange;
    onScrub(Math.max(minKm, Math.min(maxKm, km)));
  }, [width, minKm, maxKm, kmRange, cw, onScrub]);

  const handlePointerLeave = useCallback(() => onScrub(null), [onScrub]);

  return (
    <svg ref={svgRef}
      viewBox={`0 0 ${width} ${height}`} width={width} height={height}
      style={{ display: 'block', cursor: 'crosshair', touchAction: 'pan-x' }}
      onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}
    >
      <defs>
        <clipPath id={`chart-clip-${width}`}>
          <rect x={PAD.left} y={PAD.top} width={cw} height={ch} />
        </clipPath>
        <filter id="text-shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="black" floodOpacity="0.9" />
        </filter>
      </defs>
      {yLabels.map(({ y }, i) => (
        <line key={i} x1={PAD.left} y1={y} x2={PAD.left+cw} y2={y}
          stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      ))}
      <g clipPath={`url(#chart-clip-${width})`}>
        {climbZones}
        {segments}
      </g>
      <line x1={PAD.left} y1={yBase} x2={PAD.left+cw} y2={yBase}
        stroke="rgba(255,255,255,0.20)" strokeWidth={1} />
      {yLabels.map(({ elev, y }) => (
        <text key={elev} x={PAD.left-5} y={y+4}
          textAnchor="end" fill={LABEL_FILL} fontSize={11} fontWeight="600"
          filter="url(#text-shadow)">
          {elev}m
        </text>
      ))}
      {xLabels.map(({ km, x }) => (
        <text key={km} x={x} y={height-PAD.bottom+14}
          textAnchor="middle" fill={LABEL_FILL} fontSize={11} fontWeight="600"
          filter="url(#text-shadow)">
          {km}km
        </text>
      ))}
      {scrubberX !== null && scrubPoint && (() => {
        const dotX = toX(scrubPoint.km);
        const dotY = toY(scrubPoint.elevation);
        const col = gradeColor(scrubPoint.grade);
        return (
          <g>
            <line x1={scrubberX} y1={PAD.top} x2={scrubberX} y2={PAD.top+ch}
              stroke="rgba(255,255,255,0.85)" strokeWidth={1.5} strokeDasharray="3 2" />
            <circle cx={dotX} cy={dotY} r={5} fill="white" />
            <circle cx={dotX} cy={dotY} r={3.5} fill={col} />
          </g>
        );
      })()}
    </svg>
  );
}

function ScrubberBar({ point }: { point: ElevationPoint | null }) {
  if (!point) return (
    <div className="h-8 flex items-center justify-center">
      <span className="text-white/30 text-xs">Σύρε πάνω στο γράφημα για λεπτομέρειες</span>
    </div>
  );
  const col = gradeColor(point.grade);
  return (
    <div className="h-8 flex items-center justify-around px-4 gap-4">
      <span className="text-cyan-400 text-xs font-bold">📍 {point.km.toFixed(1)} km</span>
      <span className="text-blue-300 text-xs font-bold">⛰️ {point.elevation.toFixed(1)} m</span>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: col }} />
        <span className="text-xs font-bold" style={{ color: col }}>
          {point.grade > 0 ? '+' : ''}{point.grade.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function ClimbModal({ climb, allRaw, onClose }: { climb: ClimbSegment; allRaw: RawPoint[]; onClose: () => void; }) {
  const [points, setPoints] = useState<ElevationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrubberKm, setScrubberKm] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartW, setChartW] = useState(600);

  useEffect(() => {
    const obs = new ResizeObserver(entries => { setChartW(Math.floor(entries[0].contentRect.width)); });
    if (chartContainerRef.current) obs.observe(chartContainerRef.current);
    return () => obs.disconnect();
  }, []);

  const color = getCategoryColor(climb.category);
  const buffer = (climb.endKm - climb.startKm) * 0.15;
  const fromKm = Math.max(0, climb.startKm - buffer);
  const toKm = climb.endKm;

  useEffect(() => {
    if (allRaw.length === 0) return;
    const slice = allRaw.filter(p => p.distKm >= fromKm && p.distKm <= toKm);
    if (slice.length < 5) { setLoading(false); return; }
    const sliceRel: RawPoint[] = slice.map(p => ({ ...p, distKm: p.distKm - slice[0].distKm }));
    const smoothed = savitzkyGolay(sliceRel, 150);
    const pts: ElevationPoint[] = sliceRel.map((p, i) => {
      const dM = i > 0 ? (p.distKm - sliceRel[i-1].distKm) * 1000 : 0;
      const grade = dM > 0 ? Math.round(Math.max(-30, Math.min(30, ((smoothed[i]-smoothed[i-1])/dM)*100)) * 10) / 10 : 0;
      return { km: slice[0].distKm + p.distKm, elevation: Math.round(smoothed[i]), grade };
    });
    setPoints(pts);
    setLoading(false);
  }, [allRaw, fromKm, toKm]);

  const scrubPoint = scrubberKm !== null && points.length > 0
    ? points.reduce((best, p) => Math.abs(p.km-scrubberKm) < Math.abs(best.km-scrubberKm) ? p : best)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0A1628] border border-white/10 rounded-2xl p-6 w-full max-w-4xl mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: color }}>{climb.category}</span>
            <div>
              <p className="text-white font-bold">km {climb.startKm.toFixed(1)} → {climb.endKm.toFixed(1)}</p>
              <p className="text-white/50 text-xs">{(climb.endKm - climb.startKm).toFixed(1)}km · +{climb.elevationGain.toFixed(0)}m · avg {climb.avgGrade.toFixed(1)}% · max {climb.maxGrade.toFixed(1)}%</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="bg-white/5 rounded-lg border border-white/10 mb-2"><ScrubberBar point={scrubPoint} /></div>
        <div ref={chartContainerRef} className="w-full overflow-hidden rounded-lg">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <SvgElevationChart points={points} width={chartW} height={Math.round(chartW / 2)}
              climbSegments={[climb]} showClimbLabels={false} scrubberKm={scrubberKm} onScrub={setScrubberKm} />
          )}
        </div>
        <div className="flex gap-4 justify-center mt-3 flex-wrap">
          {[{ label: '0-3%', color: '#FFFFFF' },{ label: '3-6%', color: '#00E5FF' },{ label: '6-9%', color: '#FFD600' },{ label: '9-12%', color: '#FF6D00' },{ label: '>12%', color: '#FF1744' }].map(({ label, color: c }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c, boxShadow: `0 0 4px ${c}80` }} />
              <span className="text-white/70 text-xs">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-white/20 text-xs text-center mt-2">Κλικ έξω για κλείσιμο</p>
      </div>
    </div>
  );
}

export default function ElevationChart({
  gpxUrl, climbProfile = [], storedAscent,
  scrubberKm: controlledScrubberKm, onScrub: controlledOnScrub,
  defaultZoomed = false, zoomedPxPerKm = 8,
}: ElevationChartProps) {
  const [displayPoints, setDisplayPoints] = useState<ElevationPoint[]>([]);
  const [allRaw, setAllRaw] = useState<RawPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalAscent, setTotalAscent] = useState(0);
  const [maxElevation, setMaxElevation] = useState(0);
  const [minElevation, setMinElevation] = useState(0);
  const [selectedClimb, setSelectedClimb] = useState<ClimbSegment | null>(null);
  const [zoomed, setZoomed] = useState(defaultZoomed);
  const [pxPerKm, setPxPerKm] = useState(zoomedPxPerKm);

  const [internalScrubberKm, setInternalScrubberKm] = useState<number | null>(null);
  const isControlled = controlledOnScrub !== undefined;
  const scrubberKm = isControlled ? (controlledScrubberKm ?? null) : internalScrubberKm;
  const onScrub = useCallback((km: number | null) => {
    if (isControlled) { controlledOnScrub?.(km); } else { setInternalScrubberKm(km); }
  }, [isControlled, controlledOnScrub]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(600);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = Math.floor(containerRef.current.getBoundingClientRect().width);
        if (w > 0) setContainerW(w);
      }
    };
    const obs = new ResizeObserver(measure);
    if (containerRef.current) obs.observe(containerRef.current);
    const t1 = setTimeout(measure, 100);
    const t2 = setTimeout(measure, 500);
    return () => { obs.disconnect(); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const raw = await parseGpxFull(gpxUrl);
        if (raw.length === 0) { setError(true); return; }
        const smoothed = savitzkyGolay(raw, 300);
        let ascent = 0;
        for (let i = 1; i < smoothed.length; i++) {
          const diff = smoothed[i] - smoothed[i-1];
          if (diff > 0) ascent += diff;
        }
        setAllRaw(raw);
        setDisplayPoints(buildDisplayPoints(raw, smoothed, 1200));
        setTotalAscent(Math.round(ascent));
        setMaxElevation(Math.round(Math.max(...smoothed)));
        setMinElevation(Math.round(Math.min(...smoothed)));
      } catch { setError(true); }
      finally { setLoading(false); }
    }
    load();
  }, [gpxUrl]);

  const displayAscent = storedAscent && storedAscent > 0 ? storedAscent : totalAscent;
  const totalKm = displayPoints.length > 0 ? displayPoints[displayPoints.length-1].km : 0;

  const svgWidth = zoomed
    ? Math.round(totalKm * pxPerKm) + PAD.left + PAD.right
    : Math.max(containerW, 300);

  const scrubPoint = scrubberKm !== null && displayPoints.length > 0
    ? displayPoints.reduce((best, p) => Math.abs(p.km-scrubberKm) < Math.abs(best.km-scrubberKm) ? p : best)
    : null;

  if (loading) return (
    <div className="h-48 flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-white/40 text-xs">Φόρτωση προφίλ υψομέτρου...</p>
      </div>
    </div>
  );
  if (error || displayPoints.length === 0) return null;

  return (
    <div className="mt-4">
      {selectedClimb && <ClimbModal climb={selectedClimb} allRaw={allRaw} onClose={() => setSelectedClimb(null)} />}

      {/* Stats + zoom toggle */}
      <div className="flex flex-wrap gap-4 items-end mb-3">
        <div>
          <div className="text-cyan-400 font-bold text-lg">{displayAscent.toLocaleString()}m</div>
          <div className="text-white/50 text-xs">Συνολική ανάβαση</div>
        </div>
        <div>
          <div className="text-cyan-400 font-bold text-lg">{maxElevation}m</div>
          <div className="text-white/50 text-xs">Μέγιστο υψόμετρο</div>
        </div>
        <div>
          <div className="text-cyan-400 font-bold text-lg">{minElevation}m</div>
          <div className="text-white/50 text-xs">Ελάχιστο υψόμετρο</div>
        </div>
        <div className="ml-auto flex items-center gap-3 flex-wrap justify-end">
          {zoomed && (
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-xs font-semibold">Μεγέθυνση</span>
              <span className="text-white/50 text-xs">5×</span>
              <input
                type="range" min={5} max={60} step={1} value={pxPerKm}
                onChange={e => { setPxPerKm(Number(e.target.value)); onScrub(null); }}
                className="w-24 accent-cyan-500"
              />
              <span className="text-white/50 text-xs">60×</span>
              <span className="text-cyan-400 text-xs font-bold">{pxPerKm}px/km</span>
            </div>
          )}
          <button
            onClick={() => { setZoomed(z => !z); onScrub(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              zoomed ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-400' : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40 hover:text-white/80'
            }`}
          >
            {zoomed ? (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" /></svg>Fit στην οθόνη</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>Zoom</>
            )}
          </button>
        </div>
      </div>

      {/* Scrubber bar */}
      <div className="bg-white/5 rounded-lg border border-white/10 mb-2">
        <ScrubberBar point={scrubPoint} />
      </div>

      {/* Grade legend */}
      <div className="flex gap-3 flex-wrap mb-2 items-center">
        {[{ label: '0-3%', color: '#FFFFFF' },{ label: '3-6%', color: '#00E5FF' },{ label: '6-9%', color: '#FFD600' },{ label: '9-12%', color: '#FF6D00' },{ label: '>12%', color: '#FF1744' }].map(({ label, color: c }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c, boxShadow: `0 0 4px ${c}80` }} />
            <span className="text-white/70 text-xs">{label}</span>
          </div>
        ))}
        {zoomed && (
          <span className="text-white/40 text-xs ml-1">← Σύρε δεξιά-αριστερά για πλοήγηση →</span>
        )}
      </div>

      {/* Main chart */}
      <div className="relative">
        <div
          ref={containerRef}
          className="rounded-xl border border-white/10"
          style={{
            background: 'rgba(255,255,255,0.03)',
            overflowX: zoomed ? 'auto' : 'hidden',
            overflowY: 'hidden',
            height: CHART_H,
            width: '100%',
          }}
        >
          <SvgElevationChart
            points={displayPoints} width={svgWidth} height={CHART_H}
            climbSegments={climbProfile} showClimbLabels={true}
            scrubberKm={scrubberKm} onScrub={onScrub}
          />
        </div>
        {zoomed && (
          <div
            className="absolute right-0 top-0 h-full w-12 flex items-center justify-end pr-2 pointer-events-none rounded-r-xl"
            style={{ background: 'linear-gradient(to right, transparent, rgba(10,22,40,0.80))' }}
          >
            <span className="text-cyan-400/80 text-2xl font-bold" style={{ textShadow: '0 0 8px rgba(6,182,212,0.6)' }}>›</span>
          </div>
        )}
      </div>

      {/* Category pills */}
      {climbProfile.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 mb-3">
          {['HC','C1','C2','C3','C4'].map(cat => {
            const count = climbProfile.filter(c => c.category === cat).length;
            if (count === 0) return null;
            return <span key={cat} className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: getCategoryColor(cat) }}>{count}×{cat}</span>;
          })}
        </div>
      )}

      {/* Category legend */}
      {climbProfile.length > 0 && (
        <div className="bg-white/5 rounded-xl p-3 mb-4">
          <p className="text-white/50 text-xs font-bold mb-2">Κατηγορίες ανηφόρων:</p>
          <div className="flex flex-wrap gap-2">
            {[{ cat: 'HC', label: 'Hors Catégorie — Ακραία' },{ cat: 'C1', label: 'Cat. 1 — Πολύ δύσκολη' },{ cat: 'C2', label: 'Cat. 2 — Δύσκολη' },{ cat: 'C3', label: 'Cat. 3 — Μέτρια' },{ cat: 'C4', label: 'Cat. 4 — Μικρή' }].map(({ cat, label }) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-white text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: getCategoryColor(cat) }}>{cat}</span>
                <span className="text-white/60 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Climb cards */}
      {climbProfile.length > 0 && (
        <div className="mt-2">
          <h3 className="text-white/70 text-xs font-bold uppercase tracking-wider mb-3">Ανηφόρες — κλικ για ανάλυση</h3>
          <div className="flex flex-col gap-2">
            {climbProfile.map((climb, i) => (
              <button key={i} onClick={() => setSelectedClimb(climb)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 border text-left w-full transition-all hover:scale-[1.01] hover:brightness-110 group"
                style={{ backgroundColor: getCategoryColor(climb.category) + '10', borderColor: getCategoryColor(climb.category) + '30' }}>
                <span className="text-xs font-bold px-2 py-1 rounded-lg shrink-0 min-w-8 text-center"
                  style={{ backgroundColor: getCategoryColor(climb.category) + '25', color: getCategoryColor(climb.category), border: `1px solid ${getCategoryColor(climb.category)}50` }}>{climb.category}</span>
                <div className="flex-1 flex items-center gap-4 text-xs">
                  <span className="text-white/70">km {climb.startKm} → {climb.endKm}</span>
                  <span className="text-white/50">{(climb.endKm - climb.startKm).toFixed(1)}km</span>
                  <span className="text-white/50">↑{climb.elevationGain.toFixed(0)}m</span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold" style={{ color: getCategoryColor(climb.category) }}>{climb.avgGrade.toFixed(1)}%</div>
                  <div className="text-white/40 text-xs">max {climb.maxGrade.toFixed(1)}%</div>
                </div>
                <span className="text-white/30 group-hover:text-white/60 transition-colors text-lg ml-1">›</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}