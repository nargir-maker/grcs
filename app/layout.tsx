import type { Metadata } from 'next';
import './globals.css';
import Nav from './components/Nav';
import { AuthProvider } from './lib/AuthContext';
import { SessionProviderWrapper } from './lib/SessionProviderWrapper';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'GRC — Greek Randonneuring Community',
  description: 'Η πλατφόρμα του Ελληνικού Randonneuring.',
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
                  <img src="/grc-logo.png" alt="GRC" className="w-8 h-8 object-contain" />
                  <span className="text-white/40 text-sm">
                    GRC — Greek Randonneuring Community
                  </span>
                </div>
                <div className="text-white/30 text-xs">
                  © 2026 GRC. Υπό κατασκευή.
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