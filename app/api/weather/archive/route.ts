import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat  = searchParams.get('lat');
  const lon  = searchParams.get('lon');
  const time = searchParams.get('time'); // ISO UTC string, in the past

  if (!lat || !lon || !time) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  const date = time.split('T')[0];
  const url =
    `https://archive-api.open-meteo.com/v1/archive?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,precipitation,windspeed_10m,windgusts_10m,winddirection_10m,weathercode` +
    `&start_date=${date}&end_date=${date}&timezone=UTC`;

  const res = await fetch(url, { next: { revalidate: 86400 } }); // actual history doesn't change — cache a day

  if (!res.ok) {
    return NextResponse.json({ error: `archive error ${res.status}` }, { status: 502 });
  }

  const data = await res.json();
  const times: string[] = data.hourly?.time ?? [];

  if (times.length === 0) {
    return NextResponse.json({ error: 'no data' }, { status: 502 });
  }

  const targetMs = new Date(time).getTime();
  let idx = 0;
  let minDiff = Infinity;
  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t + ':00Z').getTime() - targetMs);
    if (diff < minDiff) { minDiff = diff; idx = i; }
  });

  return NextResponse.json({
    temp:          Math.round(data.hourly.temperature_2m?.[idx] ?? 0),
    windSpeed:     Math.round(data.hourly.windspeed_10m?.[idx] ?? 0),
    windGusts:     Math.round(data.hourly.windgusts_10m?.[idx] ?? 0),
    windDirection: Math.round(data.hourly.winddirection_10m?.[idx] ?? 0),
    precipitation: Math.round((data.hourly.precipitation?.[idx] ?? 0) * 10) / 10,
    weatherCode:   data.hourly.weathercode?.[idx] ?? 0,
  });
}
