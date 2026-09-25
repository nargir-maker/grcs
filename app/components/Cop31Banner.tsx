'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getCop31Status, isCop31BannerVisible, type Cop31Status } from '@/app/lib/cop31';

const DISMISS_KEY = 'grc_cop31_banner_dismissed';

export default function Cop31Banner() {
  const t = useTranslations('cop31Banner');
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<{ status: Cop31Status; days: number }>({ status: 'upcoming', days: 0 });

  useEffect(() => {
    const now = new Date();
    if (!isCop31BannerVisible(now)) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch { /* private browsing */ }
    const s = getCop31Status(now);
    if (s.status === 'ended') return;
    setState(s);
    setVisible(true);
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <span className="text-xl shrink-0" aria-hidden>🚴🌍</span>
        <div className="flex-1 min-w-0 text-white text-xs sm:text-sm leading-snug">
          <span className="font-bold">{t('title')}</span>{' '}
          <span className="text-white/90">
            {state.status === 'active'
              ? t('activeText')
              : state.days === 0
                ? t('upcomingTextToday')
                : t('upcomingText', { days: state.days })}
          </span>
        </div>
        <Link
          href="/cop31"
          className="shrink-0 bg-white text-emerald-700 hover:bg-white/90 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
        >
          {t('cta')}
        </Link>
        <button
          onClick={dismiss}
          aria-label={t('close')}
          className="shrink-0 text-white/70 hover:text-white text-lg leading-none px-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}
