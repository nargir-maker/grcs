import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { adminDb } from '@/app/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  // 1. Verify NextAuth session
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { memberId, profileType } = await req.json();

  if (!memberId || !['public', 'private'].includes(profileType)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  // 2. Verify the requesting user actually owns this member document
  //    by checking the users collection for their linkedLegacyMemberId
  const usersSnap = await adminDb
    .collection('users')
    .where('email', '==', session.user.email)
    .limit(1)
    .get();

  if (usersSnap.empty) {
    return NextResponse.json({ error: 'User not found' }, { status: 403 });
  }

  const linkedId = usersSnap.docs[0].data().linkedLegacyMemberId?.toString() ?? '';
  if (linkedId !== memberId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Update profile_type via Admin SDK (bypasses Firestore rules)
  await adminDb.collection('members').doc(memberId).update({ profile_type: profileType });

  return NextResponse.json({ ok: true });
}
