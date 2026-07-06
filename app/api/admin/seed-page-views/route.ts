import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/app/lib/firebaseAdmin';

// One-off migration: seed page_feedback view counters with historical totals
// from Vercel Analytics (last 30 days), so future counts add on top of them.
// Remove this route once it has been run once.
const BASELINE: Record<string, number> = {
  home: 574,
  about: 125,
  'brevet-history': 110,
  community: 64,
  members: 98,
  results: 121,
  pantheon: 52,
  'brevet-universe': 18,
  'organizer-universe': 28,
  brevets: 306,
  live: 59,
  randonneuring: 52,
  guide: 51,
  'acp-guide': 8,
};

export async function POST(req: NextRequest) {
  if (req.headers.get('x-seed-secret') !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!adminDb) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  const results: Record<string, { before: number; added: number; after: number }> = {};

  for (const [page, baseline] of Object.entries(BASELINE)) {
    const ref = adminDb.collection('page_feedback').doc(page);
    const before = (await ref.get()).data()?.views ?? 0;
    await ref.set({ views: FieldValue.increment(baseline) }, { merge: true });
    const after = (await ref.get()).data()?.views ?? 0;
    results[page] = { before, added: baseline, after };
  }

  return NextResponse.json(results);
}
