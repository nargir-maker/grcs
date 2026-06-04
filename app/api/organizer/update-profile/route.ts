import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebaseAdmin';

// Allowed fields the organiser can update on their clubs document
const ALLOWED_FIELDS = [
  'contactName', 'contactPhone', 'iban',
  'DESCRIPTION', 'WEBSITE_URL',
] as const;

export async function POST(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  const body = await req.json();
  const { clubId, ...fields } = body;

  if (!clubId || typeof clubId !== 'string') {
    return NextResponse.json({ error: 'Missing clubId' }, { status: 400 });
  }

  // Only write allowed fields
  const update: Record<string, string> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in fields && typeof fields[key] === 'string') {
      update[key] = fields[key];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  await adminDb.collection('clubs').doc(clubId).update(update);

  return NextResponse.json({ ok: true });
}
