'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('language');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: string) {
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      className={compact ? 'flex items-center gap-1' : 'flex items-center gap-1'}
      role="group"
      aria-label={t('label')}
    >
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchTo(loc)}
          disabled={loc === locale}
          className={
            loc === locale
              ? 'text-xs font-bold px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'text-xs px-2 py-1 rounded-full text-white/40 hover:text-white hover:bg-white/5 border border-transparent transition-colors'
          }
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
