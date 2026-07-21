import { NextRequest, NextResponse } from 'next/server';

// When a brevet is too far in the future for any forecast to reach, we fall
// back to a historical climatology summary: how many of the last N years
// had rain/wind/heat around this calendar date, at this location.
const YEARS_BACK = 5;
const WINDOW_DAYS = 3;
const RAIN_THRESHOLD_MM = 1;

interface DailyBlock {
  time: string[];
  precipitation_sum: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  windspeed_10m_max: number[];
  windgusts_10m_max: number[];
  weathercode: number[];
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat   = searchParams.get('lat');
  const lon   = searchParams.get('lon');
  const month = searchParams.get('month'); // 1-12
  const day   = searchParams.get('day');   // 1-31

  if (!lat || !lon || !month || !day) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: YEARS_BACK }, (_, i) => currentYear - 1 - i);

  const results = await Promise.all(years.map(async (year) => {
    const anchor = new Date(Date.UTC(year, Number(month) - 1, Number(day)));
    const start = fmt(addDays(anchor, -WINDOW_DAYS));
    const end   = fmt(addDays(anchor, WINDOW_DAYS));
    const url =
      `https://archive-api.open-meteo.com/v1/archive?` +
      `latitude=${lat}&longitude=${lon}` +
      `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,windspeed_10m_max,windgusts_10m_max,weathercode` +
      `&start_date=${start}&end_date=${end}&timezone=UTC`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.daily ?? null) as DailyBlock | null;
  }));

  const days: { precip: number; tMax: number; tMin: number; wind: number; gust: number; code: number }[] = [];
  results.forEach(daily => {
    if (!daily) return;
    daily.time.forEach((_, i) => {
      days.push({
        precip: daily.precipitation_sum?.[i] ?? 0,
        tMax:   daily.temperature_2m_max?.[i] ?? 0,
        tMin:   daily.temperature_2m_min?.[i] ?? 0,
        wind:   daily.windspeed_10m_max?.[i] ?? 0,
        gust:   daily.windgusts_10m_max?.[i] ?? 0,
        code:   daily.weathercode?.[i] ?? 0,
      });
    });
  });

  if (days.length === 0) {
    return NextResponse.json({ error: 'no data' }, { status: 502 });
  }

  const rainyDays = days.filter(d => d.precip >= RAIN_THRESHOLD_MM).length;
  const avg = (fn: (d: typeof days[0]) => number) =>
    days.reduce((sum, d) => sum + fn(d), 0) / days.length;

  const codeCounts = new Map<number, number>();
  days.forEach(d => codeCounts.set(d.code, (codeCounts.get(d.code) ?? 0) + 1));
  let dominantCode = days[0].code;
  let maxCount = 0;
  codeCounts.forEach((count, code) => { if (count > maxCount) { maxCount = count; dominantCode = code; } });

  return NextResponse.json({
    years,
    sampleDays: days.length,
    rainProbability: Math.round((rainyDays / days.length) * 100),
    avgTempMax: Math.round(avg(d => d.tMax) * 10) / 10,
    avgTempMin: Math.round(avg(d => d.tMin) * 10) / 10,
    avgWindSpeed: Math.round(avg(d => d.wind)),
    avgWindGusts: Math.round(avg(d => d.gust)),
    dominantWeatherCode: dominantCode,
  });
}
