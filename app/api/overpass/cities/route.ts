import { NextRequest, NextResponse } from 'next/server';

// Proxy για Overpass API — βρίσκει πόλεις/κωμοπόλεις κατά μήκος GPX track
// Μία μόνο request με όλα τα track points — πολύ πιο γρήγορο από reverse geocoding

export async function POST(req: NextRequest) {
  try {
    const { trackPoints } = await req.json() as {
      trackPoints: { lat: number; lng: number }[];
    };

    if (!trackPoints || trackPoints.length < 2) {
      return NextResponse.json({ cities: [] });
    }

    // Downsample — 1 σημείο ανά ~2km αρκεί για Overpass
    // Κρατάμε max 300 σημεία για να μην φουσκώσει το query
    const step = Math.max(1, Math.floor(trackPoints.length / 300));
    const sampled = trackPoints.filter((_, i) => i % step === 0);

    // Φτιάχνουμε το around polyline: "lat1,lng1,lat2,lng2,..."
    const polyline = sampled.map(p => `${p.lat},${p.lng}`).join(',');

    // Ζητάμε city + town εντός 400m από τη διαδρομή
    const query = `
      [out:json][timeout:25];
      node["place"~"^(city|town)$"](around:400,${polyline});
      out body;
    `;

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      return NextResponse.json({ cities: [] }, { status: 502 });
    }

    const data = await res.json();

    // Κάθε node έχει lat/lon και tags.name
    const nodes = (data.elements ?? []) as {
      lat: number; lon: number;
      tags: { name?: string; 'name:el'?: string; place?: string };
    }[];

    // Κρατάμε μόνο αυτά με ελληνικό ή λατινικό όνομα
    const withName = nodes.filter(n => n.tags?.name);

    // Ταξινόμηση κατά σειρά εμφάνισης στη διαδρομή:
    // Για κάθε πόλη βρίσκουμε το κοντινότερο track point και παίρνουμε το index του
    function haversineKm(la1: number, lo1: number, la2: number, lo2: number) {
      const R = 6371, d2r = Math.PI / 180;
      const dLa = (la2-la1)*d2r, dLo = (lo2-lo1)*d2r;
      const a = Math.sin(dLa/2)**2 +
        Math.cos(la1*d2r)*Math.cos(la2*d2r)*Math.sin(dLo/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    const withOrder = withName.map(node => {
      let minDist = Infinity, nearestIdx = 0;
      sampled.forEach((pt, i) => {
        const d = haversineKm(node.lat, node.lon, pt.lat, pt.lng);
        if (d < minDist) { minDist = d; nearestIdx = i; }
      });
      return { ...node, nearestIdx, minDist };
    });

    // Ταξινόμηση κατά σειρά εμφάνισης
    withOrder.sort((a, b) => a.nearestIdx - b.nearestIdx);

    // Αφαίρεση duplicates (ίδιο όνομα — π.χ. αν ξαναπεράσει)
    const seen = new Set<string>();
    const cities = withOrder
      .filter(n => {
        const name = n.tags['name:el'] || n.tags.name || '';
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .map(n => ({
        name:    n.tags['name:el'] || n.tags.name || '',
        place:   n.tags.place,
        lat:     n.lat,
        lng:     n.lon,
        orderIdx: n.nearestIdx,
      }));

    return NextResponse.json({ cities });

  } catch (e) {
    console.error('Overpass error:', e);
    return NextResponse.json({ cities: [] }, { status: 500 });
  }
}