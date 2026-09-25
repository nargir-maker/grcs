import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import './globals.css';
import { routing } from '@/i18n/routing';
import Nav from '@/app/components/Nav';
import WhatsNew from '@/app/components/WhatsNew';
import { AuthProvider } from '@/app/lib/AuthContext';
import { SessionProviderWrapper } from '@/app/lib/SessionProviderWrapper';
import { Analytics } from "@vercel/analytics/next"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEl = locale === 'el';
  return {
    title: 'GRC — Greek Randonneuring Community',
    description: isEl
      ? 'Η πλατφόρμα του Ελληνικού Randonneuring. Brevets, αποτελέσματα, ιστορικό αναβατών και διοργανωτές.'
      : 'The platform of Greek Randonneuring. Brevets, results, rider and organizer history.',
    metadataBase: new URL('https://grcs-vert.vercel.app'),
    openGraph: {
      title: 'GRC — Greek Randonneuring Community',
      description: isEl
        ? 'Brevets, αποτελέσματα, ιστορικό αναβατών.'
        : 'Brevets, results, rider history.',
      url: 'https://grcs-vert.vercel.app',
      siteName: 'GRC Platform',
      locale: isEl ? 'el_GR' : 'en_US',
      type: 'website',
      images: [{ url: '/grc-logo.png', width: 512, height: 512, alt: 'GRC Logo' }],
    },
    twitter: {
      card: 'summary',
      title: 'GRC — Greek Randonneuring Community',
      description: isEl
        ? 'Brevets, αποτελέσματα, ιστορικό αναβατών.'
        : 'Brevets, results, rider history.',
      images: ['/grc-logo.png'],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations('footer');

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0A1628]">
        <NextIntlClientProvider>
          <SessionProviderWrapper>
            <AuthProvider>
              <Nav />
              <WhatsNew />
              <main className="flex-1">
                {children}
              </main>
              <footer className="border-t border-white/10 px-6 py-8 bg-[#0A1628]">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <img src="/grc-logo.png" alt="GRC" className="w-12 h-12 object-contain" />
                    <span className="text-white/40 text-sm">
                      {t('tagline')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href="https://www.facebook.com/profile.php?id=61590386704957"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('facebookAria')}
                      className="flex items-center justify-center w-10 h-10 rounded-full
                        bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30
                        hover:border-[#1877F2]/60 transition-all duration-200"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1877F2]">
                        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
                      </svg>
                    </a>
                    <a
                      href="https://play.google.com/store/apps/details?id=com.nikos.greekbrevets"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img src="/google-play-badge.png" alt="Get it on Google Play" className="h-10 w-auto" />
                    </a>
                    <a
                      href="https://ko-fi.com/gbtapp"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-[#FF5E5B]/10 hover:bg-[#FF5E5B]/20
                        border border-[#FF5E5B]/30 hover:border-[#FF5E5B]/60
                        text-[#FF5E5B] text-xs font-semibold
                        px-4 py-2 rounded-full transition-all duration-200"
                    >
                      {t('buyUsACoffee')}
                    </a>
                  </div>
                  <div className="text-white/30 text-xs">
                    {t('copyright')}
                  </div>
                </div>
              </footer>
            </AuthProvider>
          </SessionProviderWrapper>
        </NextIntlClientProvider>
      <Analytics />
      </body>
    </html>
  );
}
