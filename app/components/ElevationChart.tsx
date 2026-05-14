'use client';

import { useEffect, useState, useCallback } from 'react';
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

interface ElevationChartProps {
  gpxUrl: string;
  climbProfile?: ClimbSegment[];
  storedAscent?: number;
}

const CLIMB_COLORS: Record<string, string> = {
  'HC': '#6A1B9A',
  'C1': '#D32F2F',
  'C2': '#E65100',
  'C3': '#F9A825',
  'C4': '#2E7D32',
};

function getCategoryColor(cat: string): string {
  return CLIMB_COLORS[cat] ?? '#06b6d4';
}

async function parseGpxPoints(gpxUrl: string): Promise<ElevationPoint[]> {
  const response = await fetch(gpxUrl);
  const gpxText = await response.text();
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
  const trackPoints = gpxDoc.querySelectorAll('trkpt');
  if (trackPoints.length === 0) return [];

  const total = trackPoints.length;
  const step = Math.max(1, Math.floor(total / 500));
  let distanceKm = 0;
  let prevLat = 0, prevLng = 0;
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
      const a = Math.sin(dLat/2)**2 +
        Math.cos(prevLat * Math.PI/180) * Math.cos(lat * Math.PI/180) *
        Math.sin(dLng/2)**2;
      distanceKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    prevLat = lat; prevLng = lng;
    data.push({ km: Math.round(distanceKm * 10) / 10, elevation: Math.round(ele) });
  });

  return data;
}

// ── Mini chart inside modal ───────────────────────────────────────────────
function ClimbModal({
  climb,
  allPoints,
  onClose,
}: {
  climb: ClimbSegment;
  allPoints: ElevationPoint[];
  onClose: () => void;
}) {
  const color = getCategoryColor(climb.category);

  // Slice points for this climb with buffer
  const buffer = climb.endKm - climb.startKm;
  const fromKm = Math.max(0, climb.startKm - buffer * 0.15);
  const toKm = climb.endKm + buffer * 0.15;
  const points = allPoints.filter(p => p.km >= fromKm && p.km <= toKm);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const pt = payload[0].payload;
      return (
        <div className="bg-[#0A1628] border border-white/20 rounded-lg px-3 py-2 text-xs">
          <p className="text-cyan-400 font-bold">{pt.km} km</p>
          <p className="text-white">{pt.elevation}m</p>
        </div>
      );
    }
    return null;
  };

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
        <div style={{ width: '100%', height: '220px' }}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={points} margin={{ top: 10, right: 5, bottom: 5, left: 40 }}>
              <defs>
                <linearGradient id="climbGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
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
              <ReferenceArea
                x1={climb.startKm}
                x2={climb.endKm}
                fill={color}
                fillOpacity={0.15}
                stroke={color}
                strokeOpacity={0.4}
                strokeWidth={1}
              />
              <Area
                type="monotone"
                dataKey="elevation"
                stroke={color}
                strokeWidth={2}
                fill="url(#climbGradient)"
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: '#0A1628', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="text-white/30 text-xs text-center mt-3">
          Κλείσιμο με κλικ έξω από το παράθυρο
        </p>
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
  const [points, setPoints] = useState<ElevationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalAscent, setTotalAscent] = useState(0);
  const [maxElevation, setMaxElevation] = useState(0);
  const [minElevation, setMinElevation] = useState(0);
  const [selectedClimb, setSelectedClimb] = useState<ClimbSegment | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await parseGpxPoints(gpxUrl);
        if (data.length === 0) { setError(true); return; }

        let ascent = 0;
        for (let i = 1; i < data.length; i++) {
          if (data[i].elevation > data[i-1].elevation) {
            ascent += data[i].elevation - data[i-1].elevation;
          }
        }

        setPoints(data);
        setTotalAscent(Math.round(ascent));
        setMaxElevation(Math.max(...data.map(p => p.elevation)));
        setMinElevation(Math.min(...data.map(p => p.elevation)));
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

  if (error || points.length === 0) return null;

  return (
    <div className="mt-4">
      {/* Modal */}
      {selectedClimb && (
        <ClimbModal
          climb={selectedClimb}
          allPoints={points}
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
          <AreaChart data={points} margin={{ top: 10, right: 5, bottom: 5, left: 40 }}>
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

      {/* Count summary */}
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

      {/* Legend */}
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

      {/* Climb cards — tap to expand */}
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
                {/* Category badge */}
                <span
                  className="text-xs font-bold px-2 py-1 rounded-lg shrink-0 min-w-8 text-center text-white"
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
                    ↑{climb.elevationGain.toFixed(0)}m
                  </span>
                </div>

                {/* Grade */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold" style={{ color: getCategoryColor(climb.category) }}>
                    {climb.avgGrade.toFixed(1)}%
                  </div>
                  <div className="text-white/30 text-xs">
                    max {climb.maxGrade.toFixed(1)}%
                  </div>
                </div>

                {/* Tap indicator */}
                <span className="text-white/20 group-hover:text-white/50 transition-colors text-lg ml-1">
                  ›
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}