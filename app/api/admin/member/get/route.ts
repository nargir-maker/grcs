import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { adminDb } from '@/app/lib/firebaseAdmin';

async function isAdmin(email: string): Promise<boolean> {
  if (!adminDb) return false;
  const usersSnap = await adminDb
    .collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();
  if (usersSnap.empty) return false;
  const linkedId = usersSnap.docs[0].data().linkedLegacyMemberId?.toString() ?? '';
  if (!linkedId) return false;
  const memberSnap = await adminDb.collection('members').doc(linkedId).get();
  if (!memberSnap.exists) return false;
  return (memberSnap.data()?.account_type?.toString() ?? '') === 'admin';
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!adminDb) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }
  if (!(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { memberId } = await req.json();
  if (!memberId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const snap = await adminDb.collection('members').doc(memberId.toString()).get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const raw = snap.data() ?? {};
  const info = raw.info ?? {};
  const lepote = raw.reg_lepote ?? {};
  const har = raw.reg_har ?? {};

  return NextResponse.json({
    member: {
      id: snap.id,
      surnameEl: raw.surname_el?.toString() ?? '',
      nameEl: raw.name_el?.toString() ?? '',
      surnameEn: raw.surname_en?.toString() ?? '',
      nameEn: raw.name_en?.toString() ?? '',
      fatherNameEl: raw.father_name_el?.toString() ?? '',
      fatherNameEn: raw.father_name_en?.toString() ?? '',
      regLepoteDisplayId: info.reg_lepote_id?.toString() ?? '',
      regHarDisplayId: info.reg_har_id?.toString() ?? '',
      lepoteKey: lepote.id?.toString() ?? '',
      lepoteStatus: lepote.status?.toString() ?? '',
      lepoteInsurance: lepote.insurance?.toString() ?? '',
      harKey: har.id?.toString() ?? '',
      harStatus: har.status?.toString() ?? '',
      accountType: raw.account_type?.toString() ?? 'user',
      profileType: raw.profile_type?.toString() ?? 'private',
    },
  });
}
