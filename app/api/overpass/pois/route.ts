import { NextRequest, NextResponse } from 'next/server';
import { classifyOsmTags, OVERPASS_AMENITY, OVERPASS_SHOP, OVERPASS_TOURISM, type PoiCategory } from '@/app/lib/poiCategories';

// Proxy για Overpass API — βρίσκει σταθμούς (νερό, φαγητό, πρώτες βοήθειες, κλπ.)
// σε corridor γύρω από τη διαδρομή ενός brevet. Mirrors app/api/overpass/cities/route.ts's
// downsampling/"around" approach, με classification αντίστοιχη του mobile app's "Στάσεις".

const CORRIDOR_M = 1000;

function haversineKm(la1: number, lo1: number, la2: number, lo2: number) {
  const R = 6371, d2r = Math.PI / 180;
  const dLa = (la2 - la1) * d2r, dLo = (lo2 - lo1) * d2r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * d2r) * Math.cos(la2 * d2r) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  try {
    const { trackPoints } = await req.json() as {
      trackPoints: { lat: number; lng: number }[];
    };

    if (!trackPoints || trackPoints.length < 2) {
      return NextResponse.json({ pois: [] });
    }

    // Downsample — 1 σημείο ανά ~5km, με cumulative km για το κάθε sampled point
    const sampled: { lat: number; lng: number; km: number }[] = [{ ...trackPoints[0], km: 0 }];
    let cumKm = 0;
    let distSinceLastSample = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const stepKm = haversineKm(
        trackPoints[i - 1].lat, trackPoints[i - 1].lng,
        trackPoints[i].lat, trackPoints[i].lng,
      );
      cumKm += stepKm;
      distSinceLastSample += stepKm;
      if (distSinceLastSample >= 5) {
        sampled.push({ ...trackPoints[i], km: cumKm });
        distSinceLastSample = 0;
      }
    }
    const last = trackPoints[trackPoints.length - 1];
    if (sampled[sampled.length - 1].lat !== last.lat || sampled[sampled.length - 1].lng !== last.lng) {
      sampled.push({ ...last, km: cumKm });
    }

    const polyline = sampled.map(p => `${p.lat},${p.lng}`).join(',');

    const query = `
      [out:json][timeout:20];
      (
        nwr["amenity"~"^(${OVERPASS_AMENITY})$"](around:${CORRIDOR_M},${polyline});
        nwr["shop"~"^(${OVERPASS_SHOP})$"](around:${CORRIDOR_M},${polyline});
        nwr["tourism"~"^(${OVERPASS_TOURISM})$"](around:${CORRIDOR_M},${polyline});
        nwr["healthcare"](around:${CORRIDOR_M},${polyline});
        nwr["natural"="spring"](around:${CORRIDOR_M},${polyline});
        nwr["man_made"="water_tap"](around:${CORRIDOR_M},${polyline});
      );
      out center tags;
    `;

    // Public Overpass mirror — bound the wait so a hung/overloaded mirror fails
    // fast instead of holding the serverless function open until platform timeout.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22000);
    let res: Response;
    try {
      res = await fetch('https://overpass.kumi.systems/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'GRC-Platform/1.0 (https://grcs-vert.vercel.app; contact: nikos.argiropoulos@gmail.com)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      console.error('Overpass fetch failed/timed out:', e);
      return NextResponse.json({ pois: [] }, { status: 502 });
    }
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ pois: [] }, { status: 502 });
    }

    const data = await res.json();
    const elements = (data.elements ?? []) as {
      id: number; type: string;
      lat?: number; lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }[];

    const seen = new Set<string>();
    const pois = elements
      .map(el => {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        const tags = el.tags ?? {};
        if (lat == null || lng == null) return null;
        const category = classifyOsmTags(tags);
        if (!category) return null;

        const key = `${el.type}/${el.id}`;
        if (seen.has(key)) return null;
        seen.add(key);

        // Κοντινότερο sampled point -> εκτίμηση km κατά μήκος διαδρομής + offset από αυτή
        let minDist = Infinity, nearest = sampled[0];
        for (const pt of sampled) {
          const d = haversineKm(lat, lng, pt.lat, pt.lng);
          if (d < minDist) { minDist = d; nearest = pt; }
        }

        return {
          id: key,
          category: category as PoiCategory,
          name: tags.name ?? null,
          lat, lng,
          kmAlongRoute: Math.round(nearest.km * 10) / 10,
          offsetM: Math.round(minDist * 1000),
          openingHours: tags.opening_hours ?? null,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .filter(p => p.offsetM <= CORRIDOR_M)
      .sort((a, b) => a.kmAlongRoute - b.kmAlongRoute);

    return NextResponse.json({ pois });
  } catch (e) {
    console.error('Overpass POI error:', e);
    return NextResponse.json({ pois: [] }, { status: 500 });
  }
}
