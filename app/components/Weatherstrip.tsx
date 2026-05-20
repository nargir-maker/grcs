'use client';

// components/WeatherStrip.tsx
//
// Fetches weather at ~8 evenly spaced route points + all CPs along the GPX.
// Uses Open-Meteo API — free, no API key needed.
//
// Usage in brevet detail page:
//   import WeatherStrip from '@/app/components/WeatherStrip';
//   <WeatherStrip
//     gpxUrl={brevet.gpxUrl}
//     startDate={startDate}
//     distanceKm={brevet.distance}
//     controls={brevet.controls}
//   />

import { useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface RoutePoint {
  lat: number;
  lng: number;
  distKm: number;
  label: string;       // 'START', 'CP1', 'km 120', 'FINISH' etc
  isCp: boolean;
}

interface WeatherPoint extends RoutePoint {
  temp: number;        // °C
  windSpeed: number;   // km/h
  precipitation: number; // mm
  weatherCode: number;
  etaTime: Date;       // estimated arrival time
  loading: boolean;
  error: boolean;
}

interface ControlPoint {
  km: number;
  name: string;
  lat: number;
  lng: number;
}

// ── WMO weather code → emoji + label ──────────────────────────────────────────
function weatherInfo(code: number): { emoji: string; label: string; color: string } {
  if (code === 0)              return { emoji: '☀️', label: 'Αίθριος',     color: '#FCD34D' };
  if (code <= 2)               return { emoji: '🌤️', label: 'Λίγα σύννεφα', color: '#93C5FD' };
  if (code === 3)              return { emoji: '☁️', label: 'Συννεφιά',    color: '#94A3B8' };
  if (code <= 49)              return { emoji: '🌫️', label: 'Ομίχλη',      color: '#94A3B8' };
  if (code <= 59)              return { emoji: '🌦️', label: 'Ψιλόβροχο',  color: '#60A5FA' };
  if (code <= 69)              return { emoji: '🌧️', label: 'Βροχή',       color: '#3B82F6' };
  if (code <= 79)              return { emoji: '❄️', label: 'Χιόνι',       color: '#BAE6FD' };
  if (code <= 84)              return { emoji: '🌧️', label: 'Βροχόπτωση', color: '#2563EB' };
  if (code <= 94)              return { emoji: '⛈️', label: 'Καταιγίδα',  color: '#7C3AED' };
  return                              { emoji: '⛈️', label: 'Καταιγίδα',  color: '#7C3AED' };
}

function windLabel(kmh: number): string {
  if (kmh < 10) return 'Άπνοια';
  if (kmh < 20) return 'Αύρα';
  if (kmh < 35) return 'Μέτριος';
  if (kmh < 50) return 'Δυνατός';
  return 'Θυελλώδης';
}

function windColor(kmh: number): string {
  if (kmh < 20) return '#6EE7B7';
  if (kmh < 35) return '#FCD34D';
  if (kmh < 50) return '#FB923C';
  return '#F87171';
}

// ── Haversine distance ─────────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
          + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Parse GPX → sampled route points ──────────────────────────────────────────
async function parseGpxPoints(gpxUrl: string): Promise<{ lat: number; lng: number; distKm: number }[]> {
  const res = await fetch(gpxUrl);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const pts = doc.querySelectorAll('trkpt');

  const coords: { lat: number; lng: number; distKm: number }[] = [];
  let distKm = 0;
  let prevLat = 0, prevLng = 0;

  pts.forEach((pt, i) => {
    const lat = parseFloat(pt.getAttribute('lat') ?? '0');
    const lng = parseFloat(pt.getAttribute('lon') ?? '0');
    if (!lat || !lng) return;
    if (i > 0 && prevLat !== 0) {
      distKm += haversineKm(prevLat, prevLng, lat, lng);
    }
    prevLat = lat; prevLng = lng;
    coords.push({ lat, lng, distKm });
  });

  return coords;
}

// ── Interpolate lat/lng at a given km ─────────────────────────────────────────
function interpolate(
  coords: { lat: number; lng: number; distKm: number }[],
  km: number
): { lat: number; lng: number } {
  if (coords.length === 0) return { lat: 0, lng: 0 };
  if (km <= coords[0].distKm) return coords[0];
  const last = coords[coords.length - 1];
  if (km >= last.distKm) return last;

  let lo = 0, hi = coords.length - 1;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (coords[mid].distKm <= km) lo = mid; else hi = mid;
  }
  const a = coords[lo], b = coords[hi];
  const segLen = b.distKm - a.distKm;
  if (segLen === 0) return a;
  const t = (km - a.distKm) / segLen;
  return { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
}

// ── Fetch weather for a single point at a specific datetime ───────────────────
async function fetchWeather(lat: number, lng: number, date: Date): Promise<{
  temp: number; windSpeed: number; precipitation: number; weatherCode: number;
}> {
  const dateStr = date.toISOString().split('T')[0];
  // Fetch ±1 day to cover multi-day brevets
  const endDate = new Date(date.getTime() + 86400000).toISOString().split('T')[0];
  
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&hourly=temperature_2m,precipitation,windspeed_10m,weathercode` +
    `&start_date=${dateStr}&end_date=${endDate}` +
    `&timezone=auto`;

  const res = await fetch(url);
  const data = await res.json();

  // Find the hour index matching our ETA
  const targetHour = date.toISOString().slice(0, 13) + ':00'; // 'YYYY-MM-DDTHH:00'
  const times: string[] = data.hourly?.time ?? [];
  let idx = times.findIndex(t => t === targetHour);
  if (idx === -1) {
    // Find closest hour
    const targetMs = date.getTime();
    let minDiff = Infinity;
    times.forEach((t, i) => {
      const diff = Math.abs(new Date(t).getTime() - targetMs);
      if (diff < minDiff) { minDiff = diff; idx = i; }
    });
  }
  if (idx === -1) idx = 0;

  return {
    temp:          Math.round(data.hourly.temperature_2m?.[idx] ?? 0),
    windSpeed:     Math.round(data.hourly.windspeed_10m?.[idx] ?? 0),
    precipitation: Math.round((data.hourly.precipitation?.[idx] ?? 0) * 10) / 10,
    weatherCode:   data.hourly.weathercode?.[idx] ?? 0,
  };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WeatherStrip({
  gpxUrl,
  startDate,
  distanceKm,
  controls = [],
}: {
  gpxUrl: string;
  startDate: Date;
  distanceKm: number;
  controls?: ControlPoint[];
}) {
  const [points, setPoints] = useState<WeatherPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const avgSpeed = 15; // km/h assumed

  useEffect(() => {
    if (!gpxUrl || !startDate) return;

    async function load() {
      try {
        setLoading(true);
        setError('');

        // 1. Parse GPX
        const coords = await parseGpxPoints(gpxUrl);
        if (coords.length === 0) { setError('Αδυναμία φόρτωσης GPX'); return; }

        const totalKm = coords[coords.length - 1].distKm;

        // 2. Build sample points — 8 evenly spaced + CPs + start + finish
        const sampleKms = new Map<number, string>();

        // Start
        sampleKms.set(0, 'START');

        // Evenly spaced (exclude 0 and totalKm)
        const NUM_SAMPLES = 8;
        for (let i = 1; i < NUM_SAMPLES; i++) {
          const km = Math.round((totalKm / NUM_SAMPLES) * i);
          if (!sampleKms.has(km)) sampleKms.set(km, `km ${km}`);
        }

        // CPs — override generic label with CP name
        controls.forEach((cp, i) => {
          if (cp.km > 0 && cp.km < distanceKm) {
            // Find nearest existing key within 5km
            let found = false;
            sampleKms.forEach((_, k) => {
              if (Math.abs(k - cp.km) < 5) { sampleKms.set(k, `CP${i+1}`); found = true; }
            });
            if (!found) sampleKms.set(cp.km, `CP${i+1}: ${cp.name}`);
          }
        });

        // Finish
        sampleKms.set(Math.round(totalKm), 'FINISH');

        // 3. Sort by km and build point list
        const sortedKms = Array.from(sampleKms.entries()).sort((a, b) => a[0] - b[0]);

        const routePoints: WeatherPoint[] = sortedKms.map(([km, label]) => {
          const pos = interpolate(coords, km);
          const hoursFromStart = km / avgSpeed;
          const etaTime = new Date(startDate.getTime() + hoursFromStart * 3600000);
          return {
            lat: pos.lat, lng: pos.lng, distKm: km,
            label, isCp: controls.some(cp => Math.abs(cp.km - km) < 5),
            temp: 0, windSpeed: 0, precipitation: 0, weatherCode: 0,
            etaTime, loading: true, error: false,
          };
        });

        setPoints(routePoints);
        setLoading(false);

        // 4. Fetch weather for each point (sequential to avoid rate limiting)
        for (let i = 0; i < routePoints.length; i++) {
          const pt = routePoints[i];
          try {
            const w = await fetchWeather(pt.lat, pt.lng, pt.etaTime);
            setPoints(prev => prev.map((p, idx) =>
              idx === i ? { ...p, ...w, loading: false } : p
            ));
          } catch {
            setPoints(prev => prev.map((p, idx) =>
              idx === i ? { ...p, loading: false, error: true } : p
            ));
          }
          // Small delay between requests
          if (i < routePoints.length - 1) await new Promise(r => setTimeout(r, 200));
        }

      } catch (e) {
        console.error('WeatherStrip error:', e);
        setError('Αδυναμία φόρτωσης καιρού');
        setLoading(false);
      }
    }

    load();
  }, [gpxUrl, startDate?.toISOString(), distanceKm]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
      {/* ── HEADER ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          🌦️ Καιρός Διαδρομής
          {!loading && !error && (
            <span className="text-white/30 text-xs font-normal ml-1">
              ({points.length} σημεία · ~15km/h)
            </span>
          )}
        </h2>
        <span className="text-lime-400 text-xl">{expanded ? '▲' : '☞'}</span>
      </button>

      {expanded && (
        <div className="mt-5">
          {loading && (
            <div className="flex items-center gap-3 py-4 text-white/40 text-sm">
              <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              Φόρτωση GPX και καιρού...
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm py-2">{error}</p>
          )}

          {!loading && !error && points.length > 0 && (
            <>
              {/* ── SCROLLABLE STRIP ── */}
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-3 min-w-max">
                  {points.map((pt, i) => {
                    const { emoji, label: wxLabel, color } = weatherInfo(pt.weatherCode);
                    const isStart  = pt.label === 'START';
                    const isFinish = pt.label === 'FINISH';
                    const isCp     = pt.isCp || pt.label.startsWith('CP');

                    return (
                      <div key={i}
                        className="flex flex-col items-center rounded-xl border p-3 min-w-[80px]"
                        style={{
                          backgroundColor: isStart  ? 'rgba(34,197,94,0.08)'
                                         : isFinish ? 'rgba(245,158,11,0.08)'
                                         : isCp     ? 'rgba(6,182,212,0.08)'
                                         : 'rgba(255,255,255,0.04)',
                          borderColor:     isStart  ? 'rgba(34,197,94,0.3)'
                                         : isFinish ? 'rgba(245,158,11,0.3)'
                                         : isCp     ? 'rgba(6,182,212,0.3)'
                                         : 'rgba(255,255,255,0.1)',
                        }}>

                        {/* Label */}
                        <span className="text-[10px] font-bold mb-1 text-center leading-tight"
                          style={{
                            color: isStart  ? '#22C55E'
                                 : isFinish ? '#F59E0B'
                                 : isCp     ? '#06B6D4'
                                 : '#94A3B8'
                          }}>
                          {pt.label}
                        </span>

                        {/* km */}
                        <span className="text-[9px] text-white/30 mb-2">
                          {Math.round(pt.distKm)}km
                        </span>

                        {pt.loading ? (
                          <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin my-2" />
                        ) : pt.error ? (
                          <span className="text-white/20 text-lg">—</span>
                        ) : (
                          <>
                            {/* Weather emoji */}
                            <span className="text-2xl mb-1">{emoji}</span>

                            {/* Temperature */}
                            <span className="text-white font-bold text-sm">
                              {pt.temp}°C
                            </span>

                            {/* Wind */}
                            <span className="text-[10px] mt-1 font-semibold"
                              style={{ color: windColor(pt.windSpeed) }}>
                              💨 {pt.windSpeed}km/h
                            </span>

                            {/* Precipitation */}
                            {pt.precipitation > 0 && (
                              <span className="text-[10px] text-blue-300 mt-0.5">
                                🌧️ {pt.precipitation}mm
                              </span>
                            )}

                            {/* ETA time */}
                            <span className="text-[9px] text-white/25 mt-2">
                              {pt.etaTime.toLocaleTimeString('el-GR', {
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── LEGEND ── */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-[10px] text-white/30">
                <span>🟢 Αφετηρία</span>
                <span>🔵 Σημεία Ελέγχου</span>
                <span>🟡 Τερματισμός</span>
                <span>· Ώρα ETA με ~15km/h μέσο όρο</span>
              </div>

              {/* ── WIND LEGEND ── */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px]">
                <span style={{ color: '#6EE7B7' }}>💨 &lt;20 Αύρα</span>
                <span style={{ color: '#FCD34D' }}>💨 20-35 Μέτριος</span>
                <span style={{ color: '#FB923C' }}>💨 35-50 Δυνατός</span>
                <span style={{ color: '#F87171' }}>💨 &gt;50 Θυελλώδης</span>
              </div>

              <p className="text-white/15 text-[10px] mt-3">
                Πηγή: Open-Meteo · Πρόγνωση με βάση τον εκτιμώμενο χρόνο άφιξης
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
