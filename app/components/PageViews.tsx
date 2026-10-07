'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

interface Props { page: string }

export default function PageViews({ page }: Props) {
  const t = useTranslations('pageViews');
  const locale = useLocale();
  const numberLocale = locale === 'el' ? 'el-GR' : 'en-US';
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
      {t('pageViewsCount', { count: views.toLocaleString(numberLocale) })}
    </p>
  );
}
