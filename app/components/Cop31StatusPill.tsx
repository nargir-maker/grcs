'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getCop31Status, type Cop31Status } from '@/app/lib/cop31';

export default function Cop31StatusPill() {
  const t = useTranslations('cop31');
  const [state, setState] = useState<{ status: Cop31Status; days: number } | null>(null);

  useEffect(() => {
    setState(getCop31Status());
  }, []);

  if (!state) return null;

  const label = state.status === 'active'
    ? t('statusActive')
    : state.status === 'ended'
      ? t('statusEnded')
      : state.days === 0
        ? t('statusUpcomingToday')
        : t('statusUpcoming', { days: state.days });

  const color = state.status === 'active'
    ? 'bg-red-500/15 text-red-300 border-red-400/30'
    : state.status === 'ended'
      ? 'bg-white/10 text-white/50 border-white/15'
      : 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${color}`}>
      {label}
    </span>
  );
}
