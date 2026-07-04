import type { Metadata } from 'next';
import Link from 'next/link';
import { adminDb } from '@/app/lib/firebaseAdmin';

export const metadata: Metadata = {
  title: 'Οδηγός ACP Randonneuring — GRC',
  description: 'Κανονισμοί και δομή των ACP brevets. Πιστοποίηση BRM, χρονικά όρια, controls, SR και PBP.',
};

interface Topic {
  id: string;
  icon: string;
  title: string;
  shortDesc: string;
  content: string;
  url?: string;
  color?: string;
}

const LADDER = [
  { km: '200–600',   title: 'BRM Randonneur',         desc: 'Ολοκλήρωσε τα 4 βασικά brevets (200, 300, 400, 600 χλμ).' },
  { km: '1.000',     title: 'Randonneur 1000',         desc: 'Ένα brevet 1.000 χλμ σε ένα ημερολογιακό έτος.' },
  { km: '2.000',     title: 'Randonneur 2.000',        desc: 'Συνολικά 2.000 χλμ σε homologated brevets.' },
  { km: '5.000',     title: 'Randonneur 5.000',        desc: 'Συνολικά 5.000 χλμ — ένα σημαντικό ορόσημο.' },
  { km: '10.000',    title: 'Randonneur 10.000',       desc: 'Δέκα χιλιάδες χλμ σε ACP/ΛΕ.Π.Ο.Τ.Ε. brevets.' },
  { km: '15.000',    title: 'Randonneur 15.000',       desc: 'Σπάνιο επίτευγμα.' },
  { km: '20.000',    title: 'Randonneur 20.000',       desc: 'Είκοσι χιλιάδες χλμ — ελίτ επίπεδο.' },
  { km: 'PBP',       title: 'Paris–Brest–Paris',       desc: '1.200 χλμ σε 90 ώρες. Το ιερό προσκύνημα κάθε 4 χρόνια.' },
];

export default async function AcpGuidePage() {
  let topics: Topic[] = [];

  if (adminDb) {
    try {
      const doc = await adminDb.collection('app_content').doc('randonneuring_guide').get();
      if (doc.exists) {
        topics = (doc.data()?.topics as Topic[]) ?? [];
      }
    } catch { /* silent — static content still shows */ }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/30 mb-8">
          <Link href="/" className="hover:text-white transition-colors">Αρχική</Link>
          <span>/</span>
          <Link href="/randonneuring" className="hover:text-white transition-colors">Randonneuring</Link>
          <span>/</span>
          <span className="text-white/60">Οδηγός ACP</span>
        </div>

        {/* Hero */}
        <div className="mb-12">
          <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Κανονισμοί ACP</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Οδηγός ACP Randonneuring
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            Τα brevets πιστοποιούνται ως <strong className="text-white">BRM — Brevet de Randonneurs Mondiaux</strong>.
            Η Audax Club Parisien (ACP) είναι ο διεθνής φορέας που ορίζει τους κανονισμούς, τα χρονικά όρια
            και τη διαδικασία ομολόγησης.
          </p>
        </div>

        {/* ── BRM Distances & Time Limits ── */}
        <section className="mb-12">
          <h2 className="text-white font-bold text-xl mb-5 flex items-center gap-3">
            <span className="text-2xl">⏱️</span>
            Αποστάσεις & Χρονικά Όρια
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-3 text-white/40 font-semibold text-xs uppercase tracking-wider">Απόσταση</th>
                  <th className="text-left px-5 py-3 text-white/40 font-semibold text-xs uppercase tracking-wider">Χρονικό Όριο</th>
                  <th className="hidden sm:table-cell text-left px-5 py-3 text-white/40 font-semibold text-xs uppercase tracking-wider">Ταχύτητα Αναφοράς</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { dist: '200 χλμ', time: '13,5 ώρες', speed: '~15 χλμ/ώρα' },
                  { dist: '300 χλμ', time: '20 ώρες',   speed: '~15 χλμ/ώρα' },
                  { dist: '400 χλμ', time: '27 ώρες',   speed: '~15 χλμ/ώρα' },
                  { dist: '600 χλμ', time: '40 ώρες',   speed: '~15 χλμ/ώρα' },
                  { dist: '1.000 χλμ', time: '75 ώρες', speed: '~13 χλμ/ώρα' },
                  { dist: '1.200 χλμ (PBP)', time: '90 ώρες', speed: '~13 χλμ/ώρα' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3.5 text-white font-semibold">{row.dist}</td>
                    <td className="px-5 py-3.5 text-cyan-400 font-medium">{row.time}</td>
                    <td className="hidden sm:table-cell px-5 py-3.5 text-white/40">{row.speed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-white/35 text-xs mt-3 px-1">
            Το χρονικό όριο μετράται από την ώρα εκκίνησης — συμπεριλαμβανομένων όλων των στάσεων.
          </p>
        </section>

        {/* ── Super Randonneur ── */}
        <section className="mb-12">
          <h2 className="text-white font-bold text-xl mb-5 flex items-center gap-3">
            <span className="text-2xl">🏅</span>
            Super Randonneur (SR)
          </h2>
          <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6">
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Ο τίτλος <strong className="text-white">Super Randonneur</strong> απονέμεται σε αναβάτη
              που ολοκληρώνει και τα τέσσερα βασικά brevets (200, 300, 400 και 600 χλμ) μέσα
              στο <strong className="text-white">ίδιο ημερολογιακό έτος</strong>, εντός των επίσημων χρονικών ορίων.
            </p>
            <div className="flex flex-wrap gap-2">
              {['200 χλμ', '300 χλμ', '400 χλμ', '600 χλμ'].map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold px-3 py-1 rounded-full">
                    {d}
                  </span>
                  {i < 3 && <span className="text-white/30 text-sm">+</span>}
                </div>
              ))}
              <span className="text-white/30 text-sm self-center">=</span>
              <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold px-3 py-1 rounded-full">
                🏅 SR
              </span>
            </div>
          </div>
        </section>

        {/* ── Progression Ladder ── */}
        <section className="mb-12">
          <h2 className="text-white font-bold text-xl mb-5 flex items-center gap-3">
            <span className="text-2xl">🪜</span>
            Κλίμακα Επιτευγμάτων ACP
          </h2>
          <div className="space-y-2">
            {LADDER.map((lvl, i) => (
              <div key={i}
                className="flex items-center gap-4 bg-white/4 border border-white/8 rounded-xl px-5 py-3.5 hover:border-white/15 transition-colors">
                <div className="text-cyan-400 font-bold text-sm tabular-nums w-16 flex-shrink-0">
                  {lvl.km}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{lvl.title}</div>
                  <div className="text-white/45 text-xs mt-0.5">{lvl.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Dynamic Topics from Firestore ── */}
        {topics.length > 0 && (
          <section className="mb-12">
            <h2 className="text-white font-bold text-xl mb-5 flex items-center gap-3">
              <span className="text-2xl">📖</span>
              Κανονισμοί & Λεπτομέρειες
            </h2>
            <div className="space-y-3">
              {topics.map(topic => (
                <details key={topic.id}
                  className="group bg-white/4 border border-white/8 rounded-2xl overflow-hidden
                    hover:border-white/15 transition-colors">
                  <summary className="flex items-start gap-4 px-5 py-4 cursor-pointer list-none
                    [&::-webkit-details-marker]:hidden">
                    <span className="text-2xl flex-shrink-0 mt-0.5">{topic.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm">{topic.title}</div>
                      <div className="text-white/45 text-xs mt-0.5 leading-relaxed">{topic.shortDesc}</div>
                    </div>
                    <svg className="w-4 h-4 text-white/30 flex-shrink-0 mt-1 transition-transform group-open:rotate-180"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-5 pt-1 border-t border-white/8">
                    <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">{topic.content}</p>
                    {topic.url && (
                      <a href={topic.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors">
                        Περισσότερα ↗
                      </a>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ── Footer CTA ── */}
        <div className="rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10
          border border-white/10 p-8 text-center mb-8">
          <div className="text-3xl mb-3">🚲</div>
          <h3 className="text-white font-bold text-lg mb-2">Έτοιμος για το πρώτο σου BRM;</h3>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Link href="/brevets"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold
                text-sm px-5 py-2.5 rounded-full transition-colors">
              Δες τα επερχόμενα Brevets
            </Link>
            <Link href="/randonneuring/guide"
              className="text-white/40 hover:text-white text-sm transition-colors">
              ← Πρακτικός Οδηγός
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
