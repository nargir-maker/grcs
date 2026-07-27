'use client';

// app/lib/useInterestedBrevets.ts
// Favorite/star brevets — mirrors mobile app's `interestedBrevetIds` array,
// stored on the `users/{doc found by email}` doc (NextAuth has no stable uid).

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import {
  collection, doc, getDocs, query, where,
  updateDoc, setDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';

export function useInterestedBrevets() {
  const { data: session } = useSession();
  const email = session?.user?.email ?? null;

  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const userDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    userDocIdRef.current = null;
    if (!email) { setInterestedIds(new Set()); return; }

    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
        if (!snap.empty) {
          userDocIdRef.current = snap.docs[0].id;
          const ids: string[] = snap.docs[0].data().interestedBrevetIds ?? [];
          setInterestedIds(new Set(ids));
        }
      } catch (e) {
        console.error('Failed to load interested brevets:', e);
      }
    })();
  }, [email]);

  const toggle = useCallback(async (brevetId: string) => {
    if (!email) { signIn(); return; }

    const wasIn = interestedIds.has(brevetId);
    setInterestedIds(prev => {
      const next = new Set(prev);
      if (wasIn) next.delete(brevetId); else next.add(brevetId);
      return next;
    });

    try {
      if (userDocIdRef.current) {
        await updateDoc(doc(db, 'users', userDocIdRef.current), {
          interestedBrevetIds: wasIn ? arrayRemove(brevetId) : arrayUnion(brevetId),
        });
      } else {
        const newRef = doc(collection(db, 'users'));
        await setDoc(newRef, {
          email,
          displayName: session?.user?.name ?? '',
          interestedBrevetIds: [brevetId],
          createdAt: new Date().toISOString(),
        });
        userDocIdRef.current = newRef.id;
      }
    } catch (e) {
      console.error('Failed to toggle favorite brevet:', e);
      setInterestedIds(prev => {
        const next = new Set(prev);
        if (wasIn) next.add(brevetId); else next.delete(brevetId);
        return next;
      });
    }
  }, [email, interestedIds, session]);

  return {
    isInterested: (id: string) => interestedIds.has(id),
    toggle,
  };
}
