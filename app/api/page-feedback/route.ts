import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/app/lib/firebaseAdmin';

const VALID_PAGES = [
  'randonneuring', 'guide', 'acp-guide',
  'home', 'about', 'brevet-history', 'community', 'members', 'results',
  'pantheon', 'brevet-universe', 'organizer-universe', 'brevets', 'live',
];

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page');
  if (!page || !VALID_PAGES.includes(page)) {
    return NextResponse.json({ error: 'Invalid page' }, { status: 400 });
  }
  if (!adminDb) {
    return NextResponse.json({ count: 0 });
  }

  const doc = await adminDb.collection('page_feedback').doc(page).get();
  return NextResponse.json({ count: doc.data()?.usefulCount ?? 0, views: doc.data()?.views ?? 0 });
}

export async function POST(req: NextRequest) {
  const { page, type } = await req.json();
  if (!page || !VALID_PAGES.includes(page)) {
    return NextResponse.json({ error: 'Invalid page' }, { status: 400 });
  }
  if (!adminDb) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  const field = type === 'view' ? 'views' : 'usefulCount';
  const ref = adminDb.collection('page_feedback').doc(page);
  await ref.set({ [field]: FieldValue.increment(1) }, { merge: true });
  const doc = await ref.get();
  return NextResponse.json({ count: doc.data()?.usefulCount ?? 0, views: doc.data()?.views ?? 0 });
}
