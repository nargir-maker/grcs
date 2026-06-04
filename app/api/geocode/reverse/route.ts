import { NextRequest, NextResponse } from 'next/server';

// Proxy to Nominatim (OpenStreetMap) reverse geocoding
// Nominatim requires a valid User-Agent — browsers cannot set it, so we proxy server-side
// Rate limit: 1 req/sec max (enforced by Nominatim ToS)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${lat}&lon=${lng}&format=json&accept-language=el,en`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'GRC-Platform/1.0 (Greek Randonneuring Community; gbt.app.support@gmail.com)',
      'Accept-Language': 'el,en',
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
  }

  const data = await res.json();

  // Extract most specific available place name (Greek convention: uppercase)
  const addr = data.address ?? {};
  const name =
    addr.village  ??
    addr.hamlet   ??
    addr.town     ??
    addr.city     ??
    addr.suburb   ??
    addr.county   ??
    addr.state    ??
    '';

  return NextResponse.json({
    name:         name.toUpperCase(),
    display_name: data.display_name ?? '',
    address:      addr,
  });
}
