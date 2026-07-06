'use client';

import { useEffect, useState } from 'react';

interface Props { page: string }

export default function UsefulButton({ page }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    setVoted(localStorage.getItem(`useful_${page}`) === '1');
    fetch(`/api/page-feedback?page=${page}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCount(data.count); })
      .catch(() => {});
  }, [page]);

  const handleClick = async () => {
    if (voted) return;
    setVoted(true);
    localStorage.setItem(`useful_${page}`, '1');
    setCount(c => (c ?? 0) + 1);
    try {
      const res = await fetch('/api/page-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page }),
      });
      if (res.ok) {
        const data = await res.json();
        setCount(data.count);
      }
    } catch { /* optimistic update stands */ }
  };

  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <button
        onClick={handleClick}
        disabled={voted}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold transition-all
          ${voted
            ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 cursor-default'
            : 'bg-white/5 border-white/15 text-white/70 hover:border-cyan-400/40 hover:text-white'}`}>
        <span>👍</span>
        <span>Σου φάνηκε χρήσιμο;</span>
      </button>
      {count !== null && count > 0 && (
        <p className="text-white/30 text-xs">
          {count.toLocaleString('el')} {count === 1 ? 'άτομο το βρήκε' : 'άτομα το βρήκαν'} χρήσιμο
        </p>
      )}
    </div>
  );
}
