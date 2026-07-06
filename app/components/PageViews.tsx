'use client';

import { useEffect, useState } from 'react';

interface Props { page: string }

export default function PageViews({ page }: Props) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/page-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page, type: 'view' }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setViews(data.views); })
      .catch(() => {});
  }, [page]);

  if (views === null) return null;

  return (
    <p className="text-white/20 text-xs text-center pb-2">
      👁️ {views.toLocaleString('el')} προβολές σελίδας
    </p>
  );
}
