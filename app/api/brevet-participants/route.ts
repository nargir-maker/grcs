import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebaseAdmin';

// Returns only privacy-safe participant info (count + "First L." names) for a
// brevet — the underlying registrations/{brevetId}/participants subcollection
// holds PII (email, mobile, emergency contact) and is not publicly readable,
// so this route strips it down to match the site's surname-initials convention.
export async function GET(req: NextRequest) {
  const brevetId = req.nextUrl.searchParams.get('brevetId');
  if (!brevetId) {
    return NextResponse.json({ error: 'Missing brevetId' }, { status: 400 });
  }
  if (!adminDb) {
    return NextResponse.json({ count: 0, names: [] });
  }

  const snap = await adminDb
    .collection('registrations')
    .doc(brevetId)
    .collection('participants')
    .where('status', '==', 'registered')
    .get();

  const names = snap.docs
    .map(doc => {
      const d = doc.data();
      const first = (d.firstName ?? '').toString().trim();
      const lastInitial = (d.lastName ?? '').toString().trim().charAt(0);
      if (!first) return null;
      return lastInitial ? `${first} ${lastInitial}.` : first;
    })
    .filter((n): n is string => !!n)
    .sort((a, b) => a.localeCompare(b, 'el'));

  return NextResponse.json({ count: names.length, names });
}
