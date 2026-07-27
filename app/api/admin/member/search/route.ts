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

  const { q, mode } = await req.json();
  const term = (q ?? '').toString().trim();
  const searchMode = ['name', 'lepote', 'har'].includes(mode) ? mode : 'name';

  const base = adminDb.collection('members');
  let snap: FirebaseFirestore.QuerySnapshot;

  try {
    if (term && searchMode === 'lepote') {
      const idNum = parseInt(term);
      snap = !isNaN(idNum)
        ? await base.where('reg_lepote.id', '==', idNum).limit(20).get()
        : await base.where('reg_lepote.id', '==', term).limit(20).get();
      if (snap.empty && !isNaN(idNum)) {
        snap = await base.where('reg_lepote.id', '==', term).limit(20).get();
      }
    } else if (term && searchMode === 'har') {
      const idNum = parseInt(term);
      snap = !isNaN(idNum)
        ? await base.where('reg_har.id', '==', idNum).limit(20).get()
        : await base.where('reg_har.id', '==', term).limit(20).get();
      if (snap.empty && !isNaN(idNum)) {
        snap = await base.where('reg_har.id', '==', term).limit(20).get();
      }
    } else if (term) {
      const cap = term.charAt(0).toUpperCase() + term.slice(1);
      snap = await base
        .where('surname_el', '>=', cap)
        .where('surname_el', '<=', cap + '')
        .orderBy('surname_el')
        .limit(20)
        .get();
    } else {
      snap = await base.orderBy('surname_el').limit(20).get();
    }

    const results = snap.docs.map(d => {
      const raw = d.data();
      const lepote = raw.reg_lepote ?? {};
      const har = raw.reg_har ?? {};
      return {
        id: d.id,
        firstName: raw.name_el ?? '',
        lastName: raw.surname_el ?? '',
        lepoteId: lepote.id?.toString() ?? '',
        harId: har.id?.toString() ?? '',
        accountType: raw.account_type?.toString() ?? 'user',
        profileType: raw.profile_type?.toString() ?? 'private',
      };
    });

    return NextResponse.json({ results });
  } catch (e) {
    console.error('Admin member search error:', e);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
