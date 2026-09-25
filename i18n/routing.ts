import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['el', 'en'],
  defaultLocale: 'el',
  // 'as-needed': the default locale (el) keeps today's unprefixed URLs
  // (already live/indexed/shared, e.g. /brevets/2026_ALMOPIA_100), only
  // English gets a /en/ prefix. Avoids breaking existing links.
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
