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

        {/* Logo — πηγαίνει στην κεντρική όπως όλοι */}
        <Link href="/" className="flex items-center gap-3">
          <img src="/grc-logo.png" alt="GRC Logo" className="w-12 h-12 object-contain" />
        </Link>

        {/* Desktop nav links — ίδια με αναβάτη */}
        <div className="hidden sm:flex items-center gap-8">
          <Link href="/brevets" className="text-white/60 hover:text-white text-sm transition-colors">
            Brevets
          </Link>
          <Link href="/history" className="text-white/60 hover:text-white text-sm transition-colors">
            Ιστορικό
          </Link>
          <Link href="/live" className="text-white/60 hover:text-white text-sm transition-colors">
            Live
          </Link>
          <Link href="/results" className="text-white/60 hover:text-white text-sm transition-colors">
            Στατιστικά
          </Link>
          <Link href="/community" className="text-white/60 hover:text-white text-sm transition-colors">
            Κοινότητα
          </Link>
          <Link href="/pantheon" className="text-white/60 hover:text-white text-sm transition-colors">
            Πάνθεον
          </Link>
          <Link href="/members" className="text-white/60 hover:text-white text-sm transition-colors">
            Αναβάτες
          </Link>
          <Link href="/about" className="text-white/60 hover:text-white text-sm transition-colors">
            Σχετικά
          </Link>
        </div>

        {/* Desktop right: organizer pill + dashboard + logout */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Dashboard cog */}
          <Link href="/organizer/dashboard"
            className="text-white/30 hover:text-white text-xs transition-colors"
            title="Organizer Dashboard">
            ⚙️
          </Link>

          {/* Organizer pill */}
          <Link
            href="/organizer/dashboard"
            className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20
              border border-purple-400/30 hover:border-purple-400/60
              px-3 py-1.5 rounded-full transition-all"
          >
            <span className="text-purple-300 text-xs font-semibold">🏁</span>
            <div className="flex flex-col leading-tight">
              <span className="text-white/50 text-xs">Διοργανωτής</span>
              <span className="text-white text-sm font-semibold">{organizer.clubNameGr}</span>
            </div>
            <span className="text-purple-300 text-xs ml-1">→</span>
          </Link>

          {/* Logout */}
          <button onClick={logoutOrganizer}
            className="text-white/40 hover:text-white text-sm transition-colors">
            Έξοδος
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
          <Link href="/brevets" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>Brevets</Link>
          <Link href="/history" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>Ιστορικό</Link>
          <Link href="/live" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>Live</Link>
          <Link href="/results" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>Στατιστικά</Link>
          <Link href="/community" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>Κοινότητα</Link>
          <Link href="/pantheon" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>Πάνθεον</Link>
          <Link href="/members" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>Αναβάτες</Link>
          <Link href="/about" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>Σχετικά</Link>
          <Link href="/randonneuring" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>Randonneuring</Link>

          <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
            <Link href="/organizer/dashboard"
              className="flex items-center gap-2 text-purple-300 text-sm font-semibold"
              onClick={() => setMenuOpen(false)}>
              ⚙️ Dashboard Διοργανωτή
            </Link>
            <span className="text-white/40 text-xs">{organizer.clubNameGr}</span>
            <button onClick={logoutOrganizer}
              className="text-white/40 hover:text-white text-sm transition-colors text-left">
              ↩ Έξοδος
            </button>
          </div>
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
          <Link href="/history" className="text-white/60 hover:text-white text-sm transition-colors">
            Ιστορικό
          </Link>
          <Link href="/live" className="text-white/60 hover:text-white text-sm transition-colors">
            Live
          </Link>
          <Link href="/results" className="text-white/60 hover:text-white text-sm transition-colors">
            Στατιστικά
          </Link>
          <Link href="/community" className="text-white/60 hover:text-white text-sm transition-colors">
            Κοινότητα
          </Link>
          <Link href="/pantheon" className="text-white/60 hover:text-white text-sm transition-colors">
            Πάνθεον
          </Link>
          <Link href="/members" className="text-white/60 hover:text-white text-sm transition-colors">
            Αναβάτες
          </Link>
          <Link href="/about" className="text-white/60 hover:text-white text-sm transition-colors">
            Σχετικά
          </Link>
          <Link href="/randonneuring" className="text-white/60 hover:text-white text-sm transition-colors">
            Randonneuring
          </Link>
        </div>

        {/* Desktop auth */}
        <div className="hidden sm:flex items-center gap-3">
          {loading ? (
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-3">

              {/*── Admin Cog ───────────────────────────────── */}    
                {user?.email === 'nikos.argiropoulos@gmail.com' && (
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
          <Link href="/history"
            className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Ιστορικό
          </Link>
          <Link href="/live"
            className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Live
          </Link>
          <Link href="/results"
            className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Στατιστικά
          </Link>
          <Link href="/community"
            className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Κοινότητα
          </Link>
          <Link href="/pantheon"
            className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Πάνθεον
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
