import { NextRequest, NextResponse } from 'next/server';

function symbolToWmo(code: string): number {
  if (code.startsWith('clearsky'))     return 0;
  if (code.startsWith('fair'))         return 1;
  if (code.startsWith('partlycloudy')) return 2;
  if (code.startsWith('cloudy'))       return 3;
  if (code.includes('fog'))            return 45;
  if (code.includes('thunder'))        return 95;
  if (code.includes('snow'))           return 71;
  if (code.includes('sleet'))          return 68;
  if (code.includes('heavyrain'))      return 63;
  if (code.includes('rain') || code.includes('shower')) return 51;
  return 0;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat  = searchParams.get('lat');
  const lon  = searchParams.get('lon');
  const time = searchParams.get('time'); // ISO UTC string

  if (!lat || !lon || !time) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'greekbrevets.gr/1.0 (nikos.argiropoulos@gmail.com)',
    },
    next: { revalidate: 1800 }, // cache 30 min server-side
  });

  if (!res.ok) {
    return NextResponse.json({ error: `met.no error ${res.status}` }, { status: 502 });
  }

  const data = await res.json();
  const timeseries: any[] = data.properties?.timeseries ?? [];

  if (timeseries.length === 0) {
    return NextResponse.json({ error: 'no data' }, { status: 502 });
  }

  const targetMs = new Date(time).getTime();
  let closest: any = null;
  let minDiff = Infinity;

  for (const entry of timeseries) {
    const diff = Math.abs(new Date(entry.time).getTime() - targetMs);
    if (diff < minDiff) { minDiff = diff; closest = entry; }
  }

  const instant  = closest.data?.instant?.details ?? {};
  const next1h   = closest.data?.next_1_hours;
  const next6h   = closest.data?.next_6_hours;
  const symbolCode  = next1h?.summary?.symbol_code ?? next6h?.summary?.symbol_code ?? '';
  const precipitation = next1h?.details?.precipitation_amount
    ?? next6h?.details?.precipitation_amount ?? 0;

  // met.no returns m/s — convert to km/h
  // wind_speed_of_gust can be in instant.details OR next_1h/next_6h details
  const windSpeed     = Math.round((instant.wind_speed ?? 0) * 3.6);
  const gustRaw =
    instant.wind_speed_of_gust ??
    next1h?.details?.wind_speed_of_gust ??
    next6h?.details?.wind_speed_of_gust ?? 0;
  const windGusts     = Math.round(gustRaw * 3.6);
  const windDirection = Math.round(instant.wind_from_direction ?? 0);

  return NextResponse.json({
    temp:          Math.round(instant.air_temperature ?? 0),
    windSpeed,
    windGusts,
    windDirection,
    precipitation: Math.round(precipitation * 10) / 10,
    weatherCode:   symbolToWmo(symbolCode),
  });
}
