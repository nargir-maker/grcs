'use client';

import { useEffect, useState } from 'react';

// Αύξησε αυτό κάθε φορά που θέλεις να ξανάεμφανιστεί το popup
const VERSION = '2026-06-27b';

const CHANGES = [
  {
    date: 'Ιούν 2026',
    items: [
      '🌬️ Βελάκια κατεύθυνσης ανέμου στον χάρτη — με legend ανά ένταση (Αύρα/Μέτριος/Δυνατός/Θυελλώδης) και chip φοράς διαδρομής (↻/↺)',
      '🌬️ Βελάκια ανέμου και στον χάρτη πλήρους οθόνης',
      '🌬️ Ένδειξη Beaufort + κατεύθυνση ανέμου στις κάρτες καιρού διαδρομής',
      '📱 Κουμπί λήψης εφαρμογής Google Play στο footer',
      '📊 Προφίλ: υψόμετρο ανά έτος, τελευταίο brevet, SR·ACP / SR·HAR ξεχωριστά',
    ],
  },
];

export default function WhatsNew() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('grc_whats_new') !== VERSION) setVisible(true);
    } catch { /* private browsing */ }
  }, []);

  function dismiss() {
    try { localStorage.setItem('grc_whats_new', VERSION); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={dismiss}
    >
      <div
        className="relative max-w-md w-full rounded-2xl border border-cyan-500/30 shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0a1628 0%,#0d2040 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Τι νέο υπάρχει</h2>
              <p className="text-white/40 text-xs mt-0.5">GRC Platform — υπό συνεχή ανάπτυξη</p>
            </div>
          </div>
        </div>

        {/* Changelog */}
        <div className="px-6 py-4 space-y-4 max-h-72 overflow-y-auto">
          {CHANGES.map(group => (
            <div key={group.date}>
              <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest">{group.date}</span>
              <ul className="mt-2 space-y-1.5">
                {group.items.map((item, i) => (
                  <li key={i} className="text-white/80 text-sm leading-snug">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
          <p className="text-white/30 text-xs">Κάνε κλικ οπουδήποτε για κλείσιμο</p>
          <button
            onClick={dismiss}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold transition-colors"
          >
            Κατάλαβα!
          </button>
        </div>
      </div>
    </div>
  );
}
