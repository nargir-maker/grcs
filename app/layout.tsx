import type { Metadata } from 'next';
import './globals.css';
import Nav from './components/Nav';
import { AuthProvider } from './lib/AuthContext';
import { SessionProviderWrapper } from './lib/SessionProviderWrapper';
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: 'GRC — Greek Randonneuring Community',
  description: 'Η πλατφόρμα του Ελληνικού Randonneuring. Brevets, αποτελέσματα, ιστορικό αναβατών και διοργανωτές.',
  metadataBase: new URL('https://grcs-vert.vercel.app'),
  openGraph: {
    title: 'GRC — Greek Randonneuring Community',
    description: 'Brevets, αποτελέσματα, ιστορικό αναβατών.',
    url: 'https://grcs-vert.vercel.app',
    siteName: 'GRC Platform',
    locale: 'el_GR',
    type: 'website',
    images: [{ url: '/grc-logo.png', width: 512, height: 512, alt: 'GRC Logo' }],
  },
  twitter: {
    card: 'summary',
    title: 'GRC — Greek Randonneuring Community',
    description: 'Brevets, αποτελέσματα, ιστορικό αναβατών.',
    images: ['/grc-logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0A1628]">
        <SessionProviderWrapper>
          <AuthProvider>
            <Nav />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t border-white/10 px-6 py-8">
              <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <img src="/grc-logo.png" alt="GRC" className="w-12 h-12 object-contain" />
                  <span className="text-white/40 text-sm">
                    GRC — Greek Randonneuring Community
                  </span>
                </div>
                <div className="flex items-center gap-3">
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
                    ☕ Κεράστε μας έναν καφέ
                  </a>
                </div>
                <div className="text-white/30 text-xs">
                  © 2026 GRC. Greek Randonneuring Community. Υπό κατασκευή.
                </div>
              </div>
            </footer>
          </AuthProvider>
        </SessionProviderWrapper>
      <Analytics /> 
      </body>
    </html>
  );
}