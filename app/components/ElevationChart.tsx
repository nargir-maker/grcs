'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
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

interface ElevationChartProps {
  gpxUrl: string;
  climbProfile?: ClimbSegment[];
  storedAscent?: number;
}

const CLIMB_COLORS: Record<string, string> = {
  'HC': '#9C27B0', // purple/magenta
  'C1': '#F44336', // red
  'C2': '#FF9800', // orange  
  'C3': '#FFEB3B', // yellow
  'C4': '#4CAF50', // green
};

function getCategoryColor(cat: string): string {
  return CLIMB_COLORS[cat] ?? '#06b6d4';
}

export default function ElevationChart({
  gpxUrl,
  climbProfile = [],
  storedAscent,
}: ElevationChartProps) {
  console.log('ElevationChart climbProfile:', climbProfile);
  console.log('ElevationChart climbProfile length:', climbProfile.length);
  const [points, setPoints] = useState<ElevationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalAscent, setTotalAscent] = useState(0);
  const [maxElevation, setMaxElevation] = useState(0);
  const [minElevation, setMinElevation] = useState(0);

  useEffect(() => {
    async function parseGpx() {
      try {
        const response = await fetch(gpxUrl);
        const gpxText = await response.text();

        const parser = new DOMParser();
        const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
        const trackPoints = gpxDoc.querySelectorAll('trkpt');

        if (trackPoints.length === 0) {
          setError(true);
          return;
        }

        const total = trackPoints.length;
        const step = Math.max(1, Math.floor(total / 500));

        let distanceKm = 0;
        let prevLat = 0;
        let prevLng = 0;
        let ascent = 0;
        let prevEle = 0;
        const data: ElevationPoint[] = [];

        trackPoints.forEach((pt, i) => {
          if (i % step !== 0 && i !== total - 1) return;

          const lat = parseFloat(pt.getAttribute('lat') ?? '0');
          const lng = parseFloat(pt.getAttribute('lon') ?? '0');
          const eleEl = pt.querySelector('ele');
          const ele = eleEl ? parseFloat(eleEl.textContent ?? '0') : 0;

          if (i > 0 && prevLat !== 0) {
            const R = 6371;
            const dLat = (lat - prevLat) * Math.PI / 180;
            const dLng = (lng - prevLng) * Math.PI / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(prevLat * Math.PI / 180) *
                Math.cos(lat * Math.PI / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distanceKm += R * c;

            if (ele > prevEle) ascent += ele - prevEle;
          }

          prevLat = lat;
          prevLng = lng;
          prevEle = ele;

          data.push({
            km: Math.round(distanceKm * 10) / 10,
            elevation: Math.round(ele),
          });
        });

        setPoints(data);
        setTotalAscent(Math.round(ascent));
        setMaxElevation(Math.max(...data.map((p) => p.elevation)));
        setMinElevation(Math.min(...data.map((p) => p.elevation)));
      } catch (e) {
        console.error('Elevation parse error:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    parseGpx();
  }, [gpxUrl]);

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-white/30 text-xs">Φόρτωση προφίλ υψομέτρου...</p>
        </div>
      </div>
    );
  }

  if (error || points.length === 0) return null;

  const displayAscent =
    storedAscent && storedAscent > 0 ? storedAscent : totalAscent;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;

      // Find which climb zone this point is in
      const climb = climbProfile.find(
        (c) => point.km >= c.startKm && point.km <= c.endKm
      );

      return (
        <div className="bg-[#0A1628] border border-white/20 rounded-lg px-3 py-2 text-xs">
          <p className="text-cyan-400 font-bold">{point.km} km</p>
          <p className="text-white">{point.elevation}m</p>
          {climb && (
            <p
              className="font-bold mt-1"
              style={{ color: getCategoryColor(climb.category) }}
            >
              {climb.category} — {climb.avgGrade.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-4">

      {/* ── STATS ROW ─────────────────────────────── */}
      <div className="flex gap-6 mb-4">
        <div>
          <div className="text-cyan-400 font-bold text-lg">
            {displayAscent.toLocaleString()}m
          </div>
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

      {/* ── ELEVATION CHART ───────────────────────── */}
<div style={{ width: '100%', height: '220px' }}>
  <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={points}
            margin={{ top: 10, right: 5, bottom: 5, left: 40 }}
          >
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

            {/* ── CLIMB ZONE BACKGROUNDS ────────────── */}
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

            {/* ── START OF EACH CLIMB — vertical line ── */}
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
              activeDot={{
                r: 4,
                fill: '#06b6d4',
                stroke: '#0A1628',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── CLIMB LEGEND ──────────────────────────── */}
      {climbProfile.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 mb-4">
          {['HC', 'C1', 'C2', 'C3', 'C4'].map((cat) => {
            const exists = climbProfile.some((c) => c.category === cat);
            if (!exists) return null;
            return (
              <span
                key={cat}
                className="text-xs font-bold px-2 py-1 rounded-lg"
                style={{
                  backgroundColor: getCategoryColor(cat) + '25',
                  color: getCategoryColor(cat),
                  border: `1px solid ${getCategoryColor(cat)}40`,
                }}
              >
                {cat}
              </span>
            );
          })}
        </div>
      )}

      {/* ── CLIMB CARDS ───────────────────────────── */}
      {climbProfile.length > 0 && (
        <div className="mt-4">
          <h3 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">
            Ανηφόρες
          </h3>
          <div className="flex flex-col gap-2">
            {climbProfile.map((climb, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                style={{
                  backgroundColor: getCategoryColor(climb.category) + '10',
                  borderColor: getCategoryColor(climb.category) + '30',
                }}
              >
                {/* Category badge */}
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

                {/* Info */}
                <div className="flex-1 flex items-center gap-4 text-xs">
                  <span className="text-white/60">
                    km {climb.startKm} → {climb.endKm}
                  </span>
                  <span className="text-white/40">
                    {(climb.endKm - climb.startKm).toFixed(1)}km
                  </span>
                  <span className="text-white/40">
                    ↑{climb.elevationGain}m
                  </span>
                </div>

                {/* Grade */}
                <div className="text-right shrink-0">
                  <div
                    className="text-sm font-bold"
                    style={{ color: getCategoryColor(climb.category) }}
                  >
                    {climb.avgGrade.toFixed(1)}%
                  </div>
                  <div className="text-white/30 text-xs">
                    max {climb.maxGrade.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}