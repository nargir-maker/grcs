import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { adminDb } from '@/app/lib/firebaseAdmin';

const PAGE_SIZES = [20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

// Full member registry search — any signed-in user (not admin-only).
// Unlike /members (opt-in "Hall of Fame"), this mirrors the mobile app's
// MembersDirectoryPage: every non-deleted member, regardless of profile_type.
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!adminDb) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  const { q, mode, cursor, pageSize } = await req.json();
  const term = (q ?? '').toString().trim();
  const searchMode = ['name', 'lepote', 'har'].includes(mode) ? mode : 'name';
  const PAGE_SIZE = PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;

  const base = adminDb.collection('members');
  let snap: FirebaseFirestore.QuerySnapshot;
  let paginated = false;

  try {
    if (term && searchMode === 'lepote') {
      const idNum = parseInt(term);
      snap = !isNaN(idNum)
        ? await base.where('reg_lepote.id', '==', idNum).limit(PAGE_SIZE).get()
        : await base.where('reg_lepote.id', '==', term).limit(PAGE_SIZE).get();
      if (snap.empty && !isNaN(idNum)) {
        snap = await base.where('reg_lepote.id', '==', term).limit(PAGE_SIZE).get();
      }
    } else if (term && searchMode === 'har') {
      const idNum = parseInt(term);
      snap = !isNaN(idNum)
        ? await base.where('reg_har.id', '==', idNum).limit(PAGE_SIZE).get()
        : await base.where('reg_har.id', '==', term).limit(PAGE_SIZE).get();
      if (snap.empty && !isNaN(idNum)) {
        snap = await base.where('reg_har.id', '==', term).limit(PAGE_SIZE).get();
      }
    } else {
      paginated = true;
      const cursorSurname = cursor?.surname ?? null;
      const cursorId = cursor?.id ?? null;

      if (term) {
        const cap = term.charAt(0).toUpperCase() + term.slice(1);
        let q2 = base
          .where('surname_el', '>=', cap)
          .where('surname_el', '<=', cap + '')
          .orderBy('surname_el')
          .orderBy('__name__');
        if (cursorSurname != null && cursorId != null) q2 = q2.startAfter(cursorSurname, cursorId);
        snap = await q2.limit(PAGE_SIZE).get();
      } else {
        let q2 = base.orderBy('surname_el').orderBy('__name__');
        if (cursorSurname != null && cursorId != null) q2 = q2.startAfter(cursorSurname, cursorId);
        snap = await q2.limit(PAGE_SIZE).get();
      }
    }

    const results = snap.docs
      .map(d => {
        const raw = d.data();
        if (raw.deleted) return null;
        const lepote = raw.reg_lepote ?? {};
        const har = raw.reg_har ?? {};
        return {
          id: d.id,
          firstName: raw.name_el ?? '',
          lastName: raw.surname_el ?? '',
          gender: raw.gender ?? 'M',
          lepoteId: lepote.id?.toString() ?? '',
          harId: har.id?.toString() ?? '',
          isInsured: !!lepote.insurance?.toString().trim(),
          profileType: raw.profile_type?.toString() ?? 'private',
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    const lastDoc = snap.docs[snap.docs.length - 1];
    const nextCursor = paginated && snap.docs.length === PAGE_SIZE && lastDoc
      ? { surname: lastDoc.data().surname_el ?? '', id: lastDoc.id }
      : null;

    return NextResponse.json({ results, nextCursor });
  } catch (e) {
    console.error('Member directory search error:', e);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
