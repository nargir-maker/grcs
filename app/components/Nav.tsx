'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/AuthContext';

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    user,
    signInWithGoogle,
    logout,
    loading,
    organizer,
    isOrganizer,
    logoutOrganizer,
  } = useAuth();

  // ── ORGANIZER NAV ─────────────────────────────────
  if (isOrganizer && organizer) {
    return (
      <nav className="border-b border-white/10 px-6 py-4 bg-[#0A1628] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">

          {/* Logo */}
          <Link href="/organizer/dashboard" className="flex items-center gap-3">
            <img src="/grc-logo.png" alt="GRC Logo" className="w-12 h-12 object-contain" />
          </Link>

          {/* Club identity */}
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-xs text-purple-300 bg-purple-500/20
              border border-purple-400/30 px-2.5 py-1 rounded-full font-semibold">
              🏁 Διοργανωτής
            </span>
            <span className="text-white/60 text-sm">{organizer.clubNameGr}</span>
          </div>

          {/* Organizer nav links */}
          <div className="hidden sm:flex items-center gap-6">
            <Link href="/organizer/dashboard"
              className="text-white/60 hover:text-white text-sm transition-colors">
              Dashboard
            </Link>
            <Link href="/organizer/dashboard"
              className="text-white/60 hover:text-white text-sm transition-colors">
              Τα Brevets μου
            </Link>
          </div>

          {/* Logout */}
          <div className="hidden sm:flex items-center gap-3">
            <button onClick={logoutOrganizer}
              className="text-white/40 hover:text-white text-sm transition-colors flex items-center gap-1.5">
              <span>↩</span> Αποσύνδεση
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="sm:hidden text-white/60 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile organizer menu */}
        {menuOpen && (
          <div className="sm:hidden mt-4 pb-4 border-t border-white/10 pt-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-2">
              <span className="text-xs text-purple-300 bg-purple-500/20
                border border-purple-400/30 px-2.5 py-1 rounded-full font-semibold">
                🏁 Διοργανωτής
              </span>
              <span className="text-white/60 text-sm">{organizer.clubNameGr}</span>
            </div>
            <Link href="/organizer/dashboard"
              className="text-white/60 hover:text-white text-sm transition-colors"
              onClick={() => setMenuOpen(false)}>
              Dashboard
            </Link>
            <Link href="/organizer/dashboard"
              className="text-white/60 hover:text-white text-sm transition-colors"
              onClick={() => setMenuOpen(false)}>
              Τα Brevets μου
            </Link>
            <button onClick={logoutOrganizer}
              className="text-white/40 hover:text-white text-sm transition-colors text-left">
              ↩ Αποσύνδεση
            </button>
          </div>
        )}
      </nav>
    );
  }

  // ── CYCLIST / GUEST NAV ───────────────────────────
  return (
    <nav className="border-b border-white/10 px-6 py-4 bg-[#0A1628] sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <img src="/grc-logo.png" alt="GRC Logo" className="w-12 h-12 object-contain" />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-8">
          <Link href="/brevets" className="text-white/60 hover:text-white text-sm transition-colors">
            Brevets
          </Link>
          <Link href="/live" className="text-white/60 hover:text-white text-sm transition-colors">
            Live
          </Link>
          <Link href="/results" className="text-white/60 hover:text-white text-sm transition-colors">
            Αποτελέσματα
          </Link>
          <Link href="/members" className="text-white/60 hover:text-white text-sm transition-colors">
            Αναβάτες
          </Link>
          <Link href="/about" className="text-white/60 hover:text-white text-sm transition-colors">
            Σχετικά
          </Link>
        </div>

        {/* Desktop auth */}
        <div className="hidden sm:flex items-center gap-3">
          {loading ? (
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-3">

              {/*── Admin Cog ───────────────────────────────── */}    
                {user?.email === 'your.actual@gmail.com' && (
                <Link href="/admin"
                  className="text-white/30 hover:text-white text-xs transition-colors">
                ⚙️
                </Link>
              )}

              {/* Profile pill — click goes straight to profile */}
              <Link
                href="/profile"
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10
                  border border-white/10 hover:border-cyan-500/40
                  px-3 py-1.5 rounded-full transition-all"
              >
                {user.image ? (
                  <img
                    src={user.image}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-cyan-500/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-cyan-400 text-sm font-bold w-9 h-9 rounded-full
                    bg-cyan-500/20 flex items-center justify-center">
                    {user.name?.[0]}
                  </span>
                )}
                <div className="flex flex-col leading-tight">
                  <span className="text-white/50 text-xs">Το προφίλ μου</span>
                  <span className="text-white text-sm font-semibold">
                    {user.name?.split(' ')[0]}
                  </span>
                </div>
                <span className="text-cyan-400 text-xs ml-1">→</span>
              </Link>

              {/* Sign out */}
              <button
                onClick={logout}
                className="text-white/40 hover:text-white text-sm transition-colors"
              >
                Έξοδος
              </button>
            </div>
          ) : (
            <>
              <Link href="/login"
                className="text-white/60 hover:text-white text-sm px-4 py-2 transition-colors">
                Σύνδεση
              </Link>
              <Link href="/login"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold
                  text-sm px-4 py-2 rounded-full transition-colors">
                Εγγραφή
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="sm:hidden text-white/60 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile cyclist menu */}
      {menuOpen && (
        <div className="sm:hidden mt-4 pb-4 border-t border-white/10 pt-4 flex flex-col gap-4">
          <Link href="/brevets"
            className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Brevets
          </Link>
          <Link href="/live"
            className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Live
          </Link>
          <Link href="/results"
            className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Αποτελέσματα
          </Link>
          <Link href="/members"
            className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Αναβάτες
          </Link>
          <Link href="/about"
            className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Σχετικά
          </Link>

          {/* Mobile auth section */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
            {user ? (
              <>
                {/* Profile link with avatar */}
                <Link
                  href="/profile"
                  className="flex items-center gap-3 text-white font-semibold text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-white/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40
                      flex items-center justify-center text-cyan-400 text-sm font-bold">
                      {user.name?.[0]}
                    </span>
                  )}
                  <span>👤 Το Προφίλ μου</span>
                  <span className="text-cyan-400 text-xs ml-auto">→</span>
                </Link>

                {/* Sign out */}
                <button
                  onClick={logout}
                  className="text-white/40 hover:text-white text-sm transition-colors text-left"
                >
                  ↩ Έξοδος
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold
                  text-sm px-4 py-2 rounded-full transition-colors text-center"
                onClick={() => setMenuOpen(false)}
              >
                Σύνδεση με Google
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
