'use client';
// app/lib/usePageEnabled.ts
// Hook that checks if a page is enabled in app_content/settings
// Usage in any page:
//
//   const enabled = usePageEnabled('members');
//   if (enabled === false) return <ComingSoon />;
//   if (enabled === null) return <LoadingSpinner />;

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';

// Module-level cache — one Firestore read serves all pages in the same browser session
let cachedPagesEnabled: Record<string, boolean> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function usePageEnabled(pageKey: string): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (cachedPagesEnabled !== null && Date.now() - cacheTimestamp < CACHE_TTL) {
      setEnabled(cachedPagesEnabled[pageKey] !== false);
      return;
    }

    getDoc(doc(db, 'app_content', 'settings'))
      .then(snap => {
        const pagesEnabled: Record<string, boolean> = snap.exists()
          ? (snap.data().pagesEnabled ?? {})
          : {};
        cachedPagesEnabled = pagesEnabled;
        cacheTimestamp = Date.now();
        setEnabled(pagesEnabled[pageKey] !== false);
      })
      .catch(() => {
        cachedPagesEnabled = {};
        cacheTimestamp = Date.now();
        setEnabled(true); // fail open
      });
  }, [pageKey]);

  return enabled;
}

// ── ComingSoon component — use when page is disabled ──────────────
export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">🚧</div>
        <h1 className="text-white font-bold text-2xl mb-2">{label}</h1>
        <p className="text-white/40 text-sm">
          Η σελίδα αυτή είναι προσωρινά απενεργοποιημένη.
          <br />Θα είναι σύντομα διαθέσιμη.
        </p>
      </div>
    </div>
  );
}