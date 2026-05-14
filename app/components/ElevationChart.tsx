'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';

interface ClimbSegment {
  startKm: number;
  endKm: number;
  category: string;
  avgGrade: number;
  maxGrade: number;
  elevationGain: number;
}

interface ElevationPoint {
  km: number;
  elevation: number;
}

interface RawPoint {
  lat: number;
  lng: number;
  ele: number;
  distKm: number; // cumulative distance from start
}

interface ElevationChartProps {
  gpxUrl: string;
  climbProfile?: ClimbSegment[];
  storedAscent?: number;
}

const CLIMB_COLORS: Record<string, string> = {
  HC: '#6A1B9A',
  C1: '#D32F2F',
  C2: '#E65100',
  C3: '#F9A825',
  C4: '#2E7D32',
};

function getCategoryColor(cat: string): string {
  return CLIMB_COLORS[cat] ?? '#06b6d4';
}

function gradeColor(grade: number): string {
  const abs = Math.abs(grade);
  if (abs < 3)  return '#FFFFFF';
  if (abs < 6)  return '#00E5FF';
  if (abs < 9)  return '#FFD600';
  if (abs < 12) return '#FF6D00';
  return '#FF1744';
}

// ── Haversine distance in metres ─────────────────────────────────────────
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Savitzky-Golay smoothing ──────────────────────────────────────────────
// Fits a polynomial of degree `poly` over a sliding window of `window` points
// (window must be odd). Uses the standard SG convolution coefficients for
// a 2nd-degree polynomial, which is the standard choice for elevation profiles:
// it preserves peak/valley shapes (unlike a moving average) while killing noise.
//
// windowM: target window size in METRES of track distance (not fixed point count)
// This is critical because GPX point density varies between files.
function savitzkyGolay(points: RawPoint[], windowM = 300): number[] {
  const n = points.length;
  const elevations = points.map(p => p.ele);

  if (n < 5) return elevations;

  // Compute average spacing in metres over the whole track
  const totalDistM = points[n - 1].distKm * 1000;
  const avgSpacingM = totalDistM / (n - 1);

  // Convert target window in metres to number of points (must be odd, min 5)
  let halfW = Math.round(windowM / (2 * avgSpacingM));
  halfW = Math.max(2, halfW); // at least window=5
  const w = 2 * halfW + 1;

  // Precompute SG coefficients for degree-2 polynomial, window w
  // These are the exact Gram polynomial convolution weights.
  // For a 2nd-order SG filter the coefficients are:
  //   c_j = (3*(2m+1)^2 - 4*(5j^2)) / ((2m+3)*(2m+1)*(2m-1))  ×  normalizer
  // where m = halfW and j ranges from -halfW to +halfW.
  // We use the standard formula here:
  function sgCoeffs(hw: number): number[] {
    const m = hw;
    const coeffs: number[] = [];
    const norm = (2 * m + 1) * (2 * m + 3) * (2 * m - 1) / 3;
    for (let j = -m; j <= m; j++) {
      coeffs.push((3 * (2 * m + 1) * (2 * m + 1) / 4 - j * j * 5 / 4) *
        3 / ((2 * m + 1) * (2 * m - 1) * (2 * m + 3) / 3));
    }
    // Normalise so coefficients sum to 1
    const sum = coeffs.reduce((a, b) => a + b, 0);
    return coeffs.map(c => c / sum);
  }

  const coeffs = sgCoeffs(halfW);
  const result: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    let val = 0;
    for (let j = -halfW; j <= halfW; j++) {
      // Mirror boundary: reflect index at edges
      let idx = i + j;
      if (idx < 0) idx = -idx;
      if (idx >= n) idx = 2 * n - 2 - idx;
      idx = Math.max(0, Math.min(n - 1, idx));
      val += coeffs[j + halfW] * elevations[idx];
    }
    result[i] = val;
  }

  return result;
}

// ── Parse ALL GPX trackpoints at full resolution ──────────────────────────
// Returns RawPoint[] with cumulative distance already computed.
// No subsampling here — SG must run on full data first.
async function parseGpxFull(gpxUrl: string): Promise<RawPoint[]> {
  const response = await fetch(gpxUrl);
  const gpxText = await response.text();
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
  const trackPoints = gpxDoc.querySelectorAll('trkpt');
  if (trackPoints.length === 0) return [];

  const raw: RawPoint[] = [];
  let distKm = 0;
  let prevLat = 0, prevLng = 0;

  trackPoints.forEach((pt, i) => {
    const lat = parseFloat(pt.getAttribute('lat') ?? '0');
    const lng = parseFloat(pt.getAttribute('lon') ?? '0');
    const eleEl = pt.querySelector('ele');
    const ele = eleEl ? parseFloat(eleEl.textContent ?? '0') : 0;

    if (i > 0 && prevLat !== 0) {
      distKm += haversineM(prevLat, prevLng, lat, lng) / 1000;
    }
    prevLat = lat;
    prevLng = lng;
    raw.push({ lat, lng, ele, distKm });
  });

  return raw;
}

// ── Downsample to targetCount points after smoothing ─────────────────────
// Takes every Nth point to reduce rendering load while keeping smooth shape.
function downsample(points: RawPoint[], smoothed: number[], targetCount: number): ElevationPoint[] {
  const n = points.length;
  if (n <= targetCount) {
    return points.map((p, i) => ({
      km: Math.round(p.distKm * 10) / 10,
      elevation: Math.round(smoothed[i]),
    }));
  }
  const step = Math.floor(n / targetCount);
  const result: ElevationPoint[] = [];
  for (let i = 0; i < n; i += step) {
    result.push({
      km: Math.round(points[i].distKm * 10) / 10,
      elevation: Math.round(smoothed[i]),
    });
  }
  // Always include the last point
  const last = points[n - 1];
  result.push({
    km: Math.round(last.distKm * 10) / 10,
    elevation: Math.round(smoothed[n - 1]),
  });
  return result;
}

// ── Parse detailed GPX slice for climb modal ─────────────────────────────
// Fetches raw points in [fromKm, toKm] range, applies SG smoothing,
// returns at high resolution for the modal SVG chart.
async function parseGpxSliceSmoothed(
  gpxUrl: string,
  allRaw: RawPoint[],       // pass in already-fetched full dataset to avoid refetch
  fromKm: number,
  toKm: number
): Promise<{ km: number; elevation: number; grade: number }[]> {
  // Slice the already-parsed full dataset
  const slice = allRaw.filter(p => p.distKm >= fromKm && p.distKm <= toKm);
  if (slice.length < 5) return [];

  // Build a mini RawPoint array with distances re-zeroed from slice start
  const sliceRelative: RawPoint[] = slice.map(p => ({
    ...p,
    distKm: p.distKm - slice[0].distKm,
  }));

  // Apply SG with a tighter window for the modal (150m = fine detail)
  const smoothedEle = savitzkyGolay(sliceRelative, 150);

  // Compute grades from smoothed elevations
  return sliceRelative.map((p, i) => {
    let grade = 0;
    if (i > 0) {
      const dM = (p.distKm - sliceRelative[i - 1].distKm) * 1000;
      const dE = smoothedEle[i] - smoothedEle[i - 1];
      grade = dM > 0 ? Math.max(-30, Math.min(30, (dE / dM) * 100)) : 0;
    }
    return {
      km: slice[0].distKm + p.distKm, // absolute km along route
      elevation: smoothedEle[i],
      grade,
    };
  });
}

// ── Climb Modal ───────────────────────────────────────────────────────────
function ClimbModal({
  climb,
  allRaw,
  onClose,
}: {
  climb: ClimbSegment;
  allRaw: RawPoint[];
  onClose: () => void;
}) {
  const [points, setPoints] = useState<{ km: number; elevation: number; grade: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const color = getCategoryColor(climb.category);

  // Buffer = 15% of climb distance on each side
  const buffer = (climb.endKm - climb.startKm) * 0.15;
  const fromKm = Math.max(0, climb.startKm - buffer);
  const toKm = climb.endKm + buffer;

  useEffect(() => {
    if (allRaw.length === 0) return;
    parseGpxSliceSmoothed('', allRaw, fromKm, toKm)
      .then(setPoints)
      .finally(() => setLoading(false));
  }, [allRaw, fromKm, toKm]);

  const W = 600, H = 200, PAD = 40;
  const cw = W - PAD * 2;
  const ch = H - PAD * 2;

  const minElev = points.length > 0 ? Math.min(...points.map(p => p.elevation)) : 0;
  const maxElev = points.length > 0 ? Math.max(...points.map(p => p.elevation)) : 100;
  const elevRange = Math.max(1, maxElev - minElev);
  const minKm = points.length > 0 ? points[0].km : fromKm;
  const maxKm = points.length > 0 ? points[points.length - 1].km : toKm;
  const kmRange = Math.max(0.1, maxKm - minKm);

  const toX = (km: number) => PAD + ((km - minKm) / kmRange) * cw;
  const toY = (elev: number) => PAD + ch - ((elev - minElev) / elevRange) * ch;

  const segments: React.ReactElement[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const x1 = toX(prev.km), y1 = toY(prev.elevation);
    const x2 = toX(curr.km), y2 = toY(curr.elevation);
    const yBase = toY(minElev);
    const col = gradeColor(curr.grade);
    segments.push(
      <polygon
        key={i}
        points={`${x1},${yBase} ${x1},${y1} ${x2},${y2} ${x2},${yBase}`}
        fill={col}
        fillOpacity={0.6}
        stroke={col}
        strokeWidth={1.5}
        strokeOpacity={0.9}
      />
    );
  }

  const zoneX1 = toX(climb.startKm);
  const zoneX2 = toX(climb.endKm);

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    elev: Math.round(minElev + elevRange * f),
    y: toY(minElev + elevRange * f),
  }));

  const xLabels = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    km: (minKm + kmRange * f).toFixed(1),
    x: toX(minKm + kmRange * f),
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0A1628] border border-white/10 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: color }}
            >
              {climb.category}
            </span>
            <div>
              <p className="text-white font-bold">
                km {climb.startKm.toFixed(1)} → {climb.endKm.toFixed(1)}
              </p>
              <p className="text-white/50 text-xs">
                {(climb.endKm - climb.startKm).toFixed(1)}km ·
                +{climb.elevationGain.toFixed(0)}m ·
                avg {climb.avgGrade.toFixed(1)}% ·
                max {climb.maxGrade.toFixed(1)}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Chart */}
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: 'transparent' }}>
            {/* Climb zone highlight */}
            <rect
              x={zoneX1} y={PAD} width={Math.max(0, zoneX2 - zoneX1)} height={ch}
              fill={color} fillOpacity={0.08}
            />
            <line x1={zoneX1} y1={PAD} x2={zoneX1} y2={PAD + ch}
              stroke={color} strokeWidth={1} strokeOpacity={0.5} strokeDasharray="4 2" />
            <line x1={zoneX2} y1={PAD} x2={zoneX2} y2={PAD + ch}
              stroke={color} strokeWidth={1} strokeOpacity={0.5} strokeDasharray="4 2" />

            {/* Grade-coloured elevation fill */}
            {segments}

            {/* Y axis labels */}
            {yLabels.map(({ elev, y }) => (
              <text key={elev} x={PAD - 4} y={y + 4} textAnchor="end"
                fill="rgba(255,255,255,0.4)" fontSize={10}>{elev}m</text>
            ))}

            {/* X axis labels */}
            {xLabels.map(({ km, x }) => (
              <text key={km} x={x} y={H - PAD + 14} textAnchor="middle"
                fill="rgba(255,255,255,0.4)" fontSize={10}>{km}km</text>
            ))}

            {/* Baseline */}
            <line x1={PAD} y1={PAD + ch} x2={PAD + cw} y2={PAD + ch}
              stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          </svg>
        )}

        {/* Grade legend */}
        <div className="flex gap-4 justify-center mt-3 flex-wrap">
          {[
            { label: '0-3%', color: '#FFFFFF' },
            { label: '3-6%', color: '#00E5FF' },
            { label: '6-9%', color: '#FFD600' },
            { label: '9-12%', color: '#FF6D00' },
            { label: '>12%', color: '#FF1744' },
          ].map(({ label, color: c }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: c, boxShadow: `0 0 4px ${c}80` }} />
              <span className="text-white/50 text-xs">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-white/20 text-xs text-center mt-3">Κλικ έξω για κλείσιμο</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function ElevationChart({
  gpxUrl,
  climbProfile = [],
  storedAscent,
}: ElevationChartProps) {
  const [chartPoints, setChartPoints] = useState<ElevationPoint[]>([]);
  const [allRaw, setAllRaw] = useState<RawPoint[]>([]); // full res, for modal slicing
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalAscent, setTotalAscent] = useState(0);
  const [maxElevation, setMaxElevation] = useState(0);
  const [minElevation, setMinElevation] = useState(0);
  const [selectedClimb, setSelectedClimb] = useState<ClimbSegment | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // 1. Parse full resolution
        const raw = await parseGpxFull(gpxUrl);
        if (raw.length === 0) { setError(true); return; }

        // 2. Apply Savitzky-Golay smoothing at 300m window for main chart
        const smoothed = savitzkyGolay(raw, 300);

        // 3. Compute stats from smoothed data
        let ascent = 0;
        for (let i = 1; i < smoothed.length; i++) {
          const diff = smoothed[i] - smoothed[i - 1];
          if (diff > 0) ascent += diff;
        }

        const maxE = Math.max(...smoothed);
        const minE = Math.min(...smoothed);

        // 4. Downsample to 800 points for rendering (after smoothing)
        const display = downsample(raw, smoothed, 800);

        setAllRaw(raw);           // keep full data for modal
        setChartPoints(display);  // smoothed + downsampled for Recharts
        setTotalAscent(Math.round(ascent));
        setMaxElevation(Math.round(maxE));
        setMinElevation(Math.round(minE));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [gpxUrl]);

  const displayAscent = storedAscent && storedAscent > 0 ? storedAscent : totalAscent;

  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload?.length) {
      const pt = payload[0].payload;
      const climb = climbProfile.find(c => pt.km >= c.startKm && pt.km <= c.endKm);
      return (
        <div className="bg-[#0A1628] border border-white/20 rounded-lg px-3 py-2 text-xs">
          <p className="text-cyan-400 font-bold">{pt.km} km</p>
          <p className="text-white">{pt.elevation}m</p>
          {climb && (
            <p className="font-bold mt-1" style={{ color: getCategoryColor(climb.category) }}>
              {climb.category} · avg {climb.avgGrade.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  }, [climbProfile]);

  if (loading) return (
    <div className="h-48 flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-white/30 text-xs">Φόρτωση προφίλ υψομέτρου...</p>
      </div>
    </div>
  );

  if (error || chartPoints.length === 0) return null;

  return (
    <div className="mt-4">
      {/* Modal — now gets allRaw instead of gpxUrl, no second fetch */}
      {selectedClimb && (
        <ClimbModal
          climb={selectedClimb}
          allRaw={allRaw}
          onClose={() => setSelectedClimb(null)}
        />
      )}

      {/* Stats row */}
      <div className="flex gap-6 mb-4">
        <div>
          <div className="text-cyan-400 font-bold text-lg">{displayAscent.toLocaleString()}m</div>
          <div className="text-white/40 text-xs">Συνολική ανάβαση</div>
        </div>
        <div>
          <div className="text-cyan-400 font-bold text-lg">{maxElevation}m</div>
          <div className="text-white/40 text-xs">Μέγιστο υψόμετρο</div>
        </div>
        <div>
          <div className="text-cyan-400 font-bold text-lg">{minElevation}m</div>
          <div className="text-white/40 text-xs">Ελάχιστο υψόμετρο</div>
        </div>
      </div>

      {/* Main chart */}
      <div style={{ width: '100%', height: '220px' }}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartPoints} margin={{ top: 10, right: 5, bottom: 5, left: 40 }}>
            <defs>
              <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="km"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}km`}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}m`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            {climbProfile.map((climb, i) => (
              <ReferenceArea
                key={`zone-${i}`}
                x1={climb.startKm}
                x2={climb.endKm}
                fill={getCategoryColor(climb.category)}
                fillOpacity={0.15}
                stroke={getCategoryColor(climb.category)}
                strokeOpacity={0.4}
                strokeWidth={1}
                label={{
                  value: climb.category,
                  fill: getCategoryColor(climb.category),
                  fontSize: 9,
                  fontWeight: 'bold',
                  position: 'insideTop',
                }}
              />
            ))}
            {climbProfile.map((climb, i) => (
              <ReferenceLine
                key={`line-${i}`}
                x={climb.startKm}
                stroke={getCategoryColor(climb.category)}
                strokeOpacity={0.6}
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
            ))}
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#elevGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#06b6d4', stroke: '#0A1628', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Category pill summary */}
      {climbProfile.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 mb-3">
          {['HC', 'C1', 'C2', 'C3', 'C4'].map((cat) => {
            const count = climbProfile.filter(c => c.category === cat).length;
            if (count === 0) return null;
            return (
              <span
                key={cat}
                className="text-xs font-bold px-3 py-1 rounded-full text-white"
                style={{ backgroundColor: getCategoryColor(cat) }}
              >
                {count}×{cat}
              </span>
            );
          })}
        </div>
      )}

      {/* Category legend */}
      {climbProfile.length > 0 && (
        <div className="bg-white/5 rounded-xl p-3 mb-4">
          <p className="text-white/40 text-xs font-bold mb-2">Κατηγορίες ανηφόρων:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { cat: 'HC', label: 'Hors Catégorie — Ακραία' },
              { cat: 'C1', label: 'Cat. 1 — Πολύ δύσκολη' },
              { cat: 'C2', label: 'Cat. 2 — Δύσκολη' },
              { cat: 'C3', label: 'Cat. 3 — Μέτρια' },
              { cat: 'C4', label: 'Cat. 4 — Μικρή' },
            ].map(({ cat, label }) => (
              <div key={cat} className="flex items-center gap-2">
                <span
                  className="text-white text-xs font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: getCategoryColor(cat) }}
                >
                  {cat}
                </span>
                <span className="text-white/50 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Climb cards */}
      {climbProfile.length > 0 && (
        <div className="mt-2">
          <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">
            Ανηφόρες — κλικ για ανάλυση
          </h3>
          <div className="flex flex-col gap-2">
            {climbProfile.map((climb, i) => (
              <button
                key={i}
                onClick={() => setSelectedClimb(climb)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 border text-left w-full transition-all hover:scale-[1.01] hover:brightness-110 group"
                style={{
                  backgroundColor: getCategoryColor(climb.category) + '10',
                  borderColor: getCategoryColor(climb.category) + '30',
                }}
              >
                <span
                  className="text-xs font-bold px-2 py-1 rounded-lg shrink-0 min-w-8 text-center"
                  style={{
                    backgroundColor: getCategoryColor(climb.category) + '25',
                    color: getCategoryColor(climb.category),
                    border: `1px solid ${getCategoryColor(climb.category)}50`,
                  }}
                >
                  {climb.category}
                </span>
                <div className="flex-1 flex items-center gap-4 text-xs">
                  <span className="text-white/60">km {climb.startKm} → {climb.endKm}</span>
                  <span className="text-white/40">{(climb.endKm - climb.startKm).toFixed(1)}km</span>
                  <span className="text-white/40">↑{climb.elevationGain.toFixed(0)}m</span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold" style={{ color: getCategoryColor(climb.category) }}>
                    {climb.avgGrade.toFixed(1)}%
                  </div>
                  <div className="text-white/30 text-xs">max {climb.maxGrade.toFixed(1)}%</div>
                </div>
                <span className="text-white/20 group-hover:text-white/50 transition-colors text-lg ml-1">›</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
