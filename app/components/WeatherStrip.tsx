'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface RoutePoint {
  lat: number;
  lng: number;
  distKm: number;
  label: string;
  isCp: boolean;
}

interface WeatherPoint extends RoutePoint {
  temp: number;
  windSpeed: number;
  windGusts: number;
  precipitation: number;
  weatherCode: number;
  etaTime: Date;
  loading: boolean;
  error: boolean;
}

interface ControlPoint {
  km: number;
  name: string;
  lat: number;
  lng: number;
}

function weatherInfo(code: number): { emoji: string; color: string } {
  if (code === 0)  return { emoji: '☀️', color: '#FCD34D' };
  if (code <= 2)   return { emoji: '🌤️', color: '#93C5FD' };
  if (code === 3)  return { emoji: '☁️', color: '#94A3B8' };
  if (code <= 49)  return { emoji: '🌫️', color: '#94A3B8' };
  if (code <= 59)  return { emoji: '🌦️', color: '#60A5FA' };
  if (code <= 69)  return { emoji: '🌧️', color: '#3B82F6' };
  if (code <= 79)  return { emoji: '❄️', color: '#BAE6FD' };
  if (code <= 84)  return { emoji: '🌧️', color: '#2563EB' };
  return           { emoji: '⛈️', color: '#7C3AED' };
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

function defaultSpeed(distKm: number): number {
  if (distKm <= 200) return 20;
  if (distKm <= 300) return 18;
  if (distKm <= 400) return 17;
  if (distKm <= 600) return 16;
  return 14;
}

function finishTimeLabel(startDate: Date, finishEta: Date): string {
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const finishDay = new Date(finishEta.getFullYear(), finishEta.getMonth(), finishEta.getDate());
  const diffDays = Math.round((finishDay.getTime() - startDay.getTime()) / 86400000);
  const timeStr = finishEta.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays <= 0) return timeStr;
  const days = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];
  const dateStr = finishEta.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' });
  return `${timeStr} (${days[finishEta.getDay()]} ${dateStr})`;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function parseGpxPoints(
  gpxUrl: string
): Promise<{ lat: number; lng: number; distKm: number }[]> {
  const res = await fetch(gpxUrl);
  const text = await res.text();
  const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
  const pts = xmlDoc.querySelectorAll('trkpt');
  const coords: { lat: number; lng: number; distKm: number }[] = [];
  let distKm = 0;
  let prevLat = 0;
  let prevLng = 0;
  pts.forEach((pt, i) => {
    const lat = parseFloat(pt.getAttribute('lat') ?? '0');
    const lng = parseFloat(pt.getAttribute('lon') ?? '0');
    if (!lat || !lng) return;
    if (i > 0 && prevLat !== 0) {
      distKm += haversineKm(prevLat, prevLng, lat, lng);
    }
    prevLat = lat;
    prevLng = lng;
    coords.push({ lat, lng, distKm });
  });
  return coords;
}

function interpolate(
  coords: { lat: number; lng: number; distKm: number }[],
  km: number
): { lat: number; lng: number } {
  if (coords.length === 0) return { lat: 0, lng: 0 };
  if (km <= coords[0].distKm) return coords[0];
  const last = coords[coords.length - 1];
  if (km >= last.distKm) return last;
  let lo = 0;
  let hi = coords.length - 1;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (coords[mid].distKm <= km) lo = mid;
    else hi = mid;
  }
  const a = coords[lo];
  const b = coords[hi];
  const segLen = b.distKm - a.distKm;
  if (segLen === 0) return a;
  const t = (km - a.distKm) / segLen;
  return { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) };
}

async function fetchWeather(
  lat: number,
  lng: number,
  date: Date
): Promise<{ temp: number; windSpeed: number; windGusts: number; precipitation: number; weatherCode: number }> {
  const dateStr = date.toISOString().split('T')[0];
  const endDate = new Date(date.getTime() + 86400000).toISOString().split('T')[0];
  const url =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&hourly=temperature_2m,precipitation,windspeed_10m,wind_gusts_10m,weathercode` +
    `&start_date=${dateStr}&end_date=${endDate}` +
    `&models=meteofrance_seamless` +
    `&timezone=UTC`;
  const res = await fetch(url);
  const data = await res.json();
  const targetHour = date.toISOString().slice(0, 13) + ':00';
  const times: string[] = data.hourly?.time ?? [];
  let idx = times.findIndex((t) => t === targetHour);
  if (idx === -1) {
    const targetMs = date.getTime();
    let minDiff = Infinity;
    times.forEach((t, i) => {
      const diff = Math.abs(new Date(t + ':00Z').getTime() - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        idx = i;
      }
    });
  }
  if (idx === -1) idx = 0;
  return {
    temp:       Math.round(data.hourly.temperature_2m?.[idx] ?? 0),
    windSpeed:  Math.round(data.hourly.windspeed_10m?.[idx] ?? 0),
    windGusts:  Math.round(data.hourly.wind_gusts_10m?.[idx] ?? 0),
    precipitation: Math.round((data.hourly.precipitation?.[idx] ?? 0) * 10) / 10,
    weatherCode: data.hourly.weathercode?.[idx] ?? 0,
  };
}

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
  const [points, setPoints]     = useState<WeatherPoint[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState(false);
  const [avgSpeed, setAvgSpeed] = useState(() => defaultSpeed(distanceKm));
  const [sliderSpeed, setSliderSpeed] = useState(() => defaultSpeed(distanceKm));
  const abortRef = useRef<boolean>(false);

  const load = useCallback(async (speed: number) => {
    if (!gpxUrl || !startDate) return;
    abortRef.current = true; // cancel any in-progress fetch
    const myAbort = {};
    abortRef.current = false;

    try {
      setLoading(true);
      setError('');
      setPoints([]);

      const coords = await parseGpxPoints(gpxUrl);
      if (coords.length === 0) {
        setError('Αδυναμία φόρτωσης GPX');
        setLoading(false);
        return;
      }

      const totalKm = coords[coords.length - 1].distKm;
      const sampleKms = new Map<number, string>();

      sampleKms.set(0, 'START');

      const NUM_SAMPLES = 8;
      for (let i = 1; i < NUM_SAMPLES; i++) {
        const km = Math.round((totalKm / NUM_SAMPLES) * i);
        if (!sampleKms.has(km)) sampleKms.set(km, `km ${km}`);
      }

      controls.forEach((cp, i) => {
        if (cp.km > 0 && cp.km < distanceKm) {
          let found = false;
          sampleKms.forEach((_, k) => {
            if (Math.abs(k - cp.km) < 5) {
              sampleKms.set(k, `CP${i + 1}`);
              found = true;
            }
          });
          if (!found) sampleKms.set(cp.km, `CP${i + 1}: ${cp.name}`);
        }
      });

      sampleKms.set(Math.round(totalKm), 'FINISH');

      const sortedKms = Array.from(sampleKms.entries()).sort((a, b) => a[0] - b[0]);

      const routePoints: WeatherPoint[] = sortedKms.map(([km, label]) => {
        const pos = interpolate(coords, km);
        const hoursFromStart = km / speed;
        const etaTime = new Date(startDate.getTime() + hoursFromStart * 3600000);
        return {
          lat: pos.lat,
          lng: pos.lng,
          distKm: km,
          label,
          isCp: controls.some((cp) => Math.abs(cp.km - km) < 5),
          temp: 0,
          windSpeed: 0,
          windGusts: 0,
          precipitation: 0,
          weatherCode: 0,
          etaTime,
          loading: true,
          error: false,
        };
      });

      setPoints(routePoints);
      setLoading(false);

      for (let i = 0; i < routePoints.length; i++) {
        if (abortRef.current) return;
        const pt = routePoints[i];
        try {
          const w = await fetchWeather(pt.lat, pt.lng, pt.etaTime);
          setPoints((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, ...w, loading: false } : p))
          );
        } catch {
          setPoints((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, loading: false, error: true } : p))
          );
        }
        if (i < routePoints.length - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    } catch (e) {
      console.error('WeatherStrip error:', e);
      setError('Αδυναμία φόρτωσης καιρού');
      setLoading(false);
    }
  }, [gpxUrl, startDate?.toISOString(), distanceKm]);

  useEffect(() => {
    load(avgSpeed);
  }, [load]);

  const finishPoint = points.find(p => p.label === 'FINISH');

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          🌦️ Καιρός Διαδρομής
          {!loading && !error && (
            <span className="text-white/30 text-xs font-normal ml-1">
              ({points.length} σημεία · ECMWF)
            </span>
          )}
        </h2>
        <span className="text-lime-400 text-xl">{expanded ? '▲' : '☞'}</span>
      </button>

      {expanded && (
        <div className="mt-5">

          {/* Speed slider */}
          <div className="bg-white/5 rounded-xl px-4 py-3 mb-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/50 text-sm">Μέση ταχύτητα:</span>
              <span className="text-white font-bold text-base">{sliderSpeed} km/h</span>
            </div>
            {finishPoint && !loading && (
              <p className="text-orange-400 text-sm font-semibold mb-2">
                Τερματισμός: {finishTimeLabel(startDate, finishPoint.etaTime)}
              </p>
            )}
            <input
              type="range"
              min={12}
              max={30}
              step={1}
              value={sliderSpeed}
              onChange={(e) => setSliderSpeed(Number(e.target.value))}
              onMouseUp={() => { setAvgSpeed(sliderSpeed); load(sliderSpeed); }}
              onTouchEnd={() => { setAvgSpeed(sliderSpeed); load(sliderSpeed); }}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-white/30 text-xs mt-0.5">
              <span>12 km/h</span>
              <span>30 km/h</span>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 py-4 text-white/40 text-sm">
              <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              Φόρτωση GPX και καιρού...
            </div>
          )}

          {error && <p className="text-red-400 text-sm py-2">{error}</p>}

          {!loading && !error && points.length > 0 && (
            <>
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-3 min-w-max">
                  {points.map((pt, i) => {
                    const { emoji } = weatherInfo(pt.weatherCode);
                    const isStart  = pt.label === 'START';
                    const isFinish = pt.label === 'FINISH';
                    const isCp     = pt.isCp || pt.label.startsWith('CP');
                    const hasGusts = pt.windGusts > pt.windSpeed + 10;

                    return (
                      <div
                        key={i}
                        className="flex flex-col items-center rounded-xl border p-6 min-w-[140px]"
                        style={{
                          backgroundColor: isStart
                            ? 'rgba(34,197,94,0.08)'
                            : isFinish
                            ? 'rgba(245,158,11,0.08)'
                            : isCp
                            ? 'rgba(6,182,212,0.08)'
                            : 'rgba(255,255,255,0.04)',
                          borderColor: isStart
                            ? 'rgba(34,197,94,0.3)'
                            : isFinish
                            ? 'rgba(245,158,11,0.3)'
                            : isCp
                            ? 'rgba(6,182,212,0.3)'
                            : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        <span
                          className="text-base font-bold mb-1 text-center leading-tight"
                          style={{
                            color: isStart
                              ? '#22C55E'
                              : isFinish
                              ? '#F59E0B'
                              : isCp
                              ? '#06B6D4'
                              : '#94A3B8',
                          }}
                        >
                          {pt.label}
                        </span>

                        <span className="text-base text-white/50 mb-2">
                          {Math.round(pt.distKm)}km
                        </span>

                        {pt.loading ? (
                          <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin my-2" />
                        ) : pt.error ? (
                          <span className="text-white/20 text-lg">—</span>
                        ) : (
                          <>
                            <span className="text-5xl mb-2">{emoji}</span>

                            <span className="text-white font-bold text-xl">
                              {pt.temp}°C
                            </span>

                            <span
                              className="text-base mt-1 font-semibold"
                              style={{ color: windColor(pt.windSpeed) }}
                            >
                              💨 {windLabel(pt.windSpeed)}
                            </span>

                            <span
                              className="text-sm"
                              style={{ color: windColor(pt.windSpeed) }}
                            >
                              {pt.windSpeed} km/h
                            </span>

                            {hasGusts && (
                              <span
                                className="text-xs mt-0.5 font-semibold"
                                style={{ color: windColor(pt.windGusts) }}
                              >
                                ριπές {pt.windGusts} km/h
                              </span>
                            )}

                            {pt.precipitation > 0 && (
                              <span className="text-base text-blue-300 mt-0.5">
                                🌧️ {pt.precipitation}mm
                              </span>
                            )}

                            <span className="text-base text-white/70 mt-2 font-medium">
                              {pt.etaTime.toLocaleTimeString('el-GR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-sm text-white/60">
                <span>🟢 Αφετηρία</span>
                <span>🔵 Σημεία Ελέγχου</span>
                <span>🟡 Τερματισμός</span>
                <span>· Ώρα ETA με {avgSpeed}km/h μέσο όρο</span>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm">
                <span style={{ color: '#6EE7B7' }}>💨 &lt;20 Αύρα</span>
                <span style={{ color: '#FCD34D' }}>💨 20-35 Μέτριος</span>
                <span style={{ color: '#FB923C' }}>💨 35-50 Δυνατός</span>
                <span style={{ color: '#F87171' }}>💨 &gt;50 Θυελλώδης</span>
              </div>

              <p className="text-white/40 text-sm mt-3">
                Πηγή: Open-Meteo · Μοντέλο: Météo-France · Πρόγνωση με βάση τον εκτιμώμενο χρόνο άφιξης
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
