import type { Metadata } from 'next';
import Link from 'next/link';
import { adminDb } from '@/app/lib/firebaseAdmin';
import UsefulButton from '../../components/UsefulButton';
import PageViews from '../../components/PageViews';

export const metadata: Metadata = {
  title: 'Οδηγός Randonneuring — GRC',
  description: 'Από το πρώτο Brevet 200km ως το Randonneur 10000. Πορεία διακρίσεων και κανονισμοί.',
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
  { icon: '🚴', label: 'Πρώτο Brevet 200km',              sublabel: 'Η αρχή',                                    color: '#2196F3' },
  { icon: '🏆', label: 'Super Randonneur',                 sublabel: '200+300+400+600 / έτος',                    color: '#FFD600' },
  { icon: '🏔️', label: 'Super Randonnée',                  sublabel: '600km + 10,000m+',                          color: '#FF6D00' },
  { icon: '🌍', label: 'ISR / ISR (2C) / ISR (3C) / ISR (4C)', sublabel: 'SR σε 4 χώρες — έως 4 ηπείρους',     color: '#00E676' },
  { icon: '🗼', label: 'Paris-Brest-Paris',                sublabel: '1200km / 90h',                              color: '#FF1744' },
  { icon: '🌟', label: 'Challenge Lepertel',               sublabel: '4× LRM 1200km+ / 4 διαδοχικά έτη',         color: '#00E5FF' },
  { icon: '🥇', label: 'Randonneur 5000',                  sublabel: '5,000km / 4 χρόνια',                        color: '#FFD600' },
  { icon: '🏅', label: 'Randonneur 10000',                 sublabel: '10,000km / 6 χρόνια',                       color: '#ffffff' },
];

export default async function AcpGuidePage() {
  let topics: Topic[] = [];

  if (adminDb) {
    try {
      const doc = await adminDb.collection('app_content').doc('randonneuring_guide').get();
      if (doc.exists) {
        topics = (doc.data()?.topics as Topic[]) ?? [];
      }
    } catch { /* silent — dynamic topics are optional */ }
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
          <span className="text-white/60">Οδηγός Randonneuring</span>
        </div>

        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="text-5xl mb-4">🚴</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
            Οδηγός Randonneuring
          </h1>
          <p className="text-white/40 text-sm">Από το πρώτο Brevet ως το R-10000</p>
        </div>

        {/* Progression Ladder */}
        <section className="mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-base text-center mb-6">🏅 Πορεία Διακρίσεων</h2>
            <div className="flex flex-col gap-0">
              {LADDER.map((step, i) => {
                const isLast = i === LADDER.length - 1;
                return (
                  <div key={i} className="flex items-start gap-4">
                    {/* Left: circle + connector */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2"
                        style={{ borderColor: step.color, backgroundColor: step.color + '20' }}>
                        {step.icon}
                      </div>
                      {!isLast && (
                        <div className="w-0.5 h-7" style={{ backgroundColor: step.color + '40' }} />
                      )}
                    </div>
                    {/* Right: text */}
                    <div className="pb-1 pt-1.5">
                      <div className="font-bold text-sm" style={{ color: step.color }}>{step.label}</div>
                      <div className="text-white/40 text-xs mt-0.5">{step.sublabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-white/25 text-xs text-center mt-3">
            Πάτησε σε κάθε κατηγορία για να μάθεις περισσότερα
          </p>
        </section>

        {/* Dynamic Topics from Firestore */}
        {topics.length > 0 && (
          <section className="space-y-3">
            {topics.map(topic => (
              <details key={topic.id}
                className="group bg-white/4 border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-colors">
                <summary className="flex items-start gap-4 px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
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
                      Επίσημη πηγή ↗
                    </a>
                  )}
                </div>
              </details>
            ))}
          </section>
        )}

        {/* Back link */}
        <div className="mt-10 text-center">
          <Link href="/randonneuring/guide"
            className="text-white/30 hover:text-white text-sm transition-colors">
            ← Πρακτικός Οδηγός
          </Link>
        </div>

        <UsefulButton page="acp-guide" />
        <PageViews page="acp-guide" />

      </div>
    </div>
  );
}
