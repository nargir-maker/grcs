'use client';
// Shared cache for the public members collection query.
// Both /members and /results use the same data — this avoids a duplicate
// Firestore read when a user visits both pages in the same browser session.

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';

export interface RawMemberDoc {
  id: string;
  [key: string]: any;
}

let cachedDocs: RawMemberDoc[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getPublicMembers(): Promise<RawMemberDoc[]> {
  if (cachedDocs !== null && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedDocs;
  }

  const snap = await getDocs(
    query(collection(db, 'members'), where('profile_type', '==', 'public'))
  );

  cachedDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  cacheTimestamp = Date.now();
  return cachedDocs;
}
