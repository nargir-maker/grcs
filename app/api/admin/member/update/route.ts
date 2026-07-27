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

const ACCOUNT_TYPES = ['free', 'user', 'admin'];

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

  const body = await req.json();
  const { memberId } = body;
  if (!memberId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (body.accountType !== undefined && !ACCOUNT_TYPES.includes(body.accountType)) {
    return NextResponse.json({ error: 'Invalid account type' }, { status: 400 });
  }

  const str = (v: unknown) => (v ?? '').toString().trim();

  // Dot-notation paths — mirrors the mobile admin registry-edit screen so nested
  // fields not listed here (stats, history_raw, profile_type, ...) are left untouched.
  const update = {
    surname_el: str(body.surnameEl),
    name_el: str(body.nameEl),
    surname_en: str(body.surnameEn),
    name_en: str(body.nameEn),
    father_name_el: str(body.fatherNameEl),
    father_name_en: str(body.fatherNameEn),
    'info.reg_lepote_id': str(body.regLepoteDisplayId),
    'info.reg_har_id': str(body.regHarDisplayId),
    'reg_lepote.id': str(body.lepoteKey),
    'reg_lepote.status': str(body.lepoteStatus),
    'reg_lepote.insurance': str(body.lepoteInsurance),
    'reg_har.id': str(body.harKey),
    'reg_har.status': str(body.harStatus),
    account_type: str(body.accountType) || 'user',
  };

  try {
    await adminDb.collection('members').doc(memberId.toString()).update(update);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin member update error:', e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
