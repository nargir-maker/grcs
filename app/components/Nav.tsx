'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="border-b border-white/10 px-6 py-4 bg-[#0A1628] sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/grc-logo.png"
            alt="GRC Logo"
            className="w-12 h-12 object-contain"
          />
        </Link>

        {/* Desktop menu */}
        <div className="hidden sm:flex items-center gap-8">
          <Link href="/brevets" className="text-white/60 hover:text-white text-sm transition-colors">
            Brevets
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

        {/* Desktop buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <button className="text-white/60 hover:text-white text-sm px-4 py-2 transition-colors">
            Σύνδεση
          </button>
          <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm px-4 py-2 rounded-full transition-colors">
            Εγγραφή
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden text-white/60 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
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

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden mt-4 pb-4 border-t border-white/10 pt-4 flex flex-col gap-4">
          <Link href="/brevets" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Brevets
          </Link>
          <Link href="/results" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Αποτελέσματα
          </Link>
          <Link href="/members" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Αναβάτες
          </Link>
          <Link href="/about" className="text-white/60 hover:text-white text-sm transition-colors"
            onClick={() => setMenuOpen(false)}>
            Σχετικά
          </Link>
          <div className="flex gap-3 pt-2">
            <button className="text-white/60 hover:text-white text-sm transition-colors">
              Σύνδεση
            </button>
            <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm px-4 py-2 rounded-full transition-colors">
              Εγγραφή
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}