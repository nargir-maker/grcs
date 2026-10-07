// app/randonneuring/page.tsx
// Static educational page — history & structure of Randonneuring

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import UsefulButton from '@/app/components/UsefulButton';
import PageViews from '@/app/components/PageViews';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'randonneuring' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

// ── Reusable components ───────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-3">
      {children}
    </h2>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300
        text-xs font-semibold transition-colors">
      {children} ↗
    </a>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────

interface TimelineEvent {
  year: string;
  title: string;
  body: React.ReactNode;
  accent?: string; // tailwind color class for the dot
  link?: { href: string; label: string };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RandonneuringPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('randonneuring');

  const richTags = {
    b: (chunks: React.ReactNode) => <strong className="text-white">{chunks}</strong>,
    i: (chunks: React.ReactNode) => <em>{chunks}</em>,
  };

  const TIMELINE: TimelineEvent[] = [
    {
      year: '1891',
      title: t('timeline1Title'),
      accent: 'bg-white/30',
      body: <>{t.rich('timeline1Body', richTags)}</>,
    },
    {
      year: '1904',
      title: t('timeline2Title'),
      accent: 'bg-cyan-500',
      body: <>{t.rich('timeline2Body', richTags)}</>,
      link: { href: 'https://www.audax-club-parisien.com', label: 'audax-club-parisien.com' },
    },
    {
      year: '1921',
      title: t('timeline3Title'),
      accent: 'bg-amber-400',
      body: (
        <>
          {t.rich('timeline3Intro', richTags)}
          <br /><br />
          {t('timeline3ListIntro')}
          <ul className="mt-3 space-y-2 text-white/70 text-sm">
            <li className="flex gap-2">
              <span className="text-amber-400 mt-0.5">▸</span>
              <span>{t.rich('timeline3Item1', richTags)}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 mt-0.5">▸</span>
              <span>{t.rich('timeline3Item2', richTags)}</span>
            </li>
          </ul>
        </>
      ),
    },
    {
      year: '1931',
      title: t('timeline4Title'),
      accent: 'bg-purple-400',
      body: (
        <>
          {t.rich('timeline4P1', richTags)}
          <br /><br />
          {t.rich('timeline4P2', richTags)}
        </>
      ),
    },
    {
      year: '1983',
      title: t('timeline5Title'),
      accent: 'bg-cyan-500',
      body: (
        <>
          {t.rich('timeline5P1', richTags)}
          <br /><br />
          {t.rich('timeline5P2', richTags)}
        </>
      ),
      link: { href: 'https://www.randonneursmondiaux.org', label: 'randonneursmondiaux.org' },
    },
    {
      year: '2009',
      title: t('timeline6Title'),
      accent: 'bg-emerald-400',
      body: (
        <>
          {t.rich('timeline6P1', richTags)}
          <br /><br />
          {t.rich('timeline6P2', richTags)}
        </>
      ),
    },
    {
      year: '2011',
      title: t('timeline7Title'),
      accent: 'bg-emerald-400',
      body: <>{t.rich('timeline7Body', richTags)}</>,
      link: { href: 'https://www.superrandonnees.org/welcome', label: 'superrandonnees.org' },
    },
    {
      year: '2021',
      title: t('timeline8Title'),
      accent: 'bg-emerald-400',
      body: (
        <>
          {t.rich('timeline8P1', richTags)}
          <br /><br />
          {t('timeline8P2')}
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Back */}
        <Link href="/" className="text-white/30 hover:text-white text-sm transition-colors mb-8 inline-block">
          ← {t('backHome')}
        </Link>

        {/* Hero */}
        <div className="mb-12">
          <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">{t('heroKicker')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            {t('heroTitle')}
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            {t('heroSubtitle')}
          </p>
        </div>

        {/* ── 1. Τι είναι το Randonneuring ── */}
        <section className="mb-12">
          <SectionTitle>{t('section1Heading')}</SectionTitle>
          <Card>
            <p className="text-white/70 leading-relaxed mb-4">
              {t.rich('section1P1', richTags)}
            </p>
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 text-sm text-white/60">
              💡 {t.rich('section1Note', {
                b: (chunks: React.ReactNode) => <strong className="text-white/80">{chunks}</strong>,
              })}
            </div>
          </Card>
        </section>

        {/* ── 2. Χρονολόγιο ── */}
        <section className="mb-12">
          <SectionTitle>{t('section2Heading')}</SectionTitle>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[23px] top-3 bottom-3 w-px bg-white/10" />

            <div className="space-y-8">
              {TIMELINE.map((ev, i) => (
                <div key={i} className="flex gap-5">
                  {/* Dot */}
                  <div className="relative flex-shrink-0 mt-1">
                    <div className={`w-[11px] h-[11px] rounded-full ring-2 ring-[#0A1628] ${ev.accent ?? 'bg-white/40'}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-1">
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="text-cyan-400 font-bold text-sm tabular-nums">{ev.year}</span>
                      <h3 className="text-white font-semibold text-sm leading-snug">{ev.title}</h3>
                    </div>
                    <div className="text-white/60 text-sm leading-relaxed">
                      {ev.body}
                    </div>
                    {ev.link && (
                      <div className="mt-2">
                        <ExternalLink href={ev.link.href}>{ev.link.label}</ExternalLink>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Η έννοια «Province» ── */}
        <section className="mb-12">
          <SectionTitle>{t('section3Heading')}</SectionTitle>
          <Card>
            <p className="text-white/70 leading-relaxed mb-5">
              {t.rich('section3P1', richTags)}
            </p>

            <div className="border-l-2 border-cyan-500/40 pl-4 mb-5">
              <p className="text-white/60 text-sm leading-relaxed">
                {t.rich('section3Quote', richTags)}
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 text-sm text-white/60">
              {t('section3Note')}
            </div>
          </Card>
        </section>

        {/* ── 4. Σημερινή ιεραρχία ── */}
        <section className="mb-12">
          <SectionTitle>{t('section4Heading')}</SectionTitle>

          <div className="grid gap-4">

            {/* ACP */}
            <Card className="border-cyan-500/25">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🇫🇷</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold">Audax Club Parisien (ACP)</h3>
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30
                      px-2 py-0.5 rounded-full font-semibold">{t('foundedBadge', { year: 1904 })}</span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed mb-2">
                    {t.rich('orgAcpDesc', richTags)}
                  </p>
                  <ExternalLink href="https://www.audax-club-parisien.com">audax-club-parisien.com</ExternalLink>
                </div>
              </div>
            </Card>

            {/* UAF */}
            <Card>
              <div className="flex items-start gap-4">
                <div className="text-3xl">🤝</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold">Union des Audax Français (UAF)</h3>
                    <span className="text-xs bg-white/10 text-white/50 border border-white/15
                      px-2 py-0.5 rounded-full font-semibold">{t('foundedBadge', { year: 1922 })}</span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed mb-2">
                    {t.rich('orgUafDesc', richTags)}
                  </p>
                  <ExternalLink href="https://www.audax-uaf.com">audax-uaf.com</ExternalLink>
                </div>
              </div>
            </Card>

            {/* LRM */}
            <Card className="border-purple-500/25">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🌍</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold">Les Randonneurs Mondiaux (LRM)</h3>
                    <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30
                      px-2 py-0.5 rounded-full font-semibold">{t('foundedBadge', { year: 1983 })}</span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed mb-2">
                    {t.rich('orgLrmDesc', richTags)}
                  </p>
                  <ExternalLink href="https://www.randonneursmondiaux.org">randonneursmondiaux.org</ExternalLink>
                </div>
              </div>
            </Card>

            {/* Provence Randonneurs */}
            <Card className="border-emerald-500/25">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⛰️</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold">Provence Randonneurs</h3>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30
                      px-2 py-0.5 rounded-full font-semibold">{t('foundedBadge', { year: 2011 })}</span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed mb-2">
                    {t.rich('orgProvenceDesc', richTags)}
                  </p>
                  <ExternalLink href="https://www.superrandonnees.org/welcome">superrandonnees.org</ExternalLink>
                </div>
              </div>
            </Card>

          </div>

          {/* Hierarchy diagram — SVG */}
          <div className="mt-6 overflow-x-auto">
            <svg viewBox="0 0 720 548" className="w-full min-w-[480px]"
              xmlns="http://www.w3.org/2000/svg" style={{ maxHeight: 548 }}>

              {/* ── Connectors ── */}
              {/* ACP → fork */}
              <line x1="360" y1="96" x2="360" y2="116" stroke="rgba(6,182,212,0.35)" strokeWidth="1.5"/>
              {/* Horizontal fork */}
              <line x1="180" y1="116" x2="540" y2="116" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
              {/* Left drop → BRM */}
              <line x1="180" y1="116" x2="180" y2="130" stroke="rgba(6,182,212,0.35)" strokeWidth="1.5"/>
              {/* Right drop → PBP */}
              <line x1="540" y1="116" x2="540" y2="130" stroke="rgba(251,191,36,0.4)" strokeWidth="1.5"/>
              {/* BRM → LRM */}
              <line x1="180" y1="206" x2="180" y2="248" stroke="rgba(168,85,247,0.4)" strokeWidth="1.5"/>
              {/* LRM → Super Brevets */}
              <line x1="180" y1="324" x2="180" y2="366" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5"/>
              {/* Provence → SR600 */}
              <line x1="540" y1="324" x2="540" y2="366" stroke="rgba(52,211,153,0.4)" strokeWidth="1.5"/>

              {/* ── ACP ── */}
              <rect x="160" y="20" width="400" height="76" rx="14"
                fill="rgba(6,182,212,0.12)" stroke="rgba(6,182,212,0.55)" strokeWidth="1.5"/>
              <text x="360" y="52" textAnchor="middle" fill="white"
                fontSize="15" fontWeight="700" fontFamily="system-ui,sans-serif">
                Audax Club Parisien (ACP)
              </text>
              <text x="360" y="75" textAnchor="middle" fill="rgba(6,182,212,0.85)"
                fontSize="12" fontFamily="system-ui,sans-serif">
                {t('svgAcpSub')}
              </text>

              {/* ── BRM ── */}
              <rect x="55" y="130" width="250" height="76" rx="12"
                fill="rgba(6,182,212,0.07)" stroke="rgba(6,182,212,0.3)" strokeWidth="1.5"/>
              <text x="180" y="162" textAnchor="middle" fill="white"
                fontSize="14" fontWeight="600" fontFamily="system-ui,sans-serif">
                {t('svgBrmTitle')}
              </text>
              <text x="180" y="185" textAnchor="middle" fill="rgba(255,255,255,0.4)"
                fontSize="12" fontFamily="system-ui,sans-serif">
                {t('svgBrmSub')}
              </text>

              {/* ── PBP ── */}
              <rect x="415" y="130" width="250" height="76" rx="12"
                fill="rgba(251,191,36,0.09)" stroke="rgba(251,191,36,0.45)" strokeWidth="1.5"/>
              <text x="540" y="162" textAnchor="middle" fill="white"
                fontSize="14" fontWeight="600" fontFamily="system-ui,sans-serif">
                Paris-Brest-Paris (PBP)
              </text>
              <text x="540" y="185" textAnchor="middle" fill="rgba(251,191,36,0.8)"
                fontSize="12" fontFamily="system-ui,sans-serif">
                {t('svgPbpSub')}
              </text>

              {/* ── LRM ── */}
              <rect x="55" y="248" width="250" height="76" rx="12"
                fill="rgba(168,85,247,0.1)" stroke="rgba(168,85,247,0.45)" strokeWidth="1.5"/>
              <text x="180" y="280" textAnchor="middle" fill="white"
                fontSize="14" fontWeight="600" fontFamily="system-ui,sans-serif">
                Les Randonneurs Mondiaux
              </text>
              <text x="180" y="303" textAnchor="middle" fill="rgba(168,85,247,0.85)"
                fontSize="12" fontFamily="system-ui,sans-serif">
                {t('svgLrmSub')}
              </text>

              {/* ── Provence Randonneurs ── */}
              <rect x="415" y="248" width="250" height="76" rx="12"
                fill="rgba(52,211,153,0.1)" stroke="rgba(52,211,153,0.45)" strokeWidth="1.5"/>
              <text x="540" y="280" textAnchor="middle" fill="white"
                fontSize="14" fontWeight="600" fontFamily="system-ui,sans-serif">
                Provence Randonneurs
              </text>
              <text x="540" y="303" textAnchor="middle" fill="rgba(52,211,153,0.85)"
                fontSize="12" fontFamily="system-ui,sans-serif">
                {t('svgProvenceSub')}
              </text>

              {/* ── Super Brevets ── */}
              <rect x="30" y="366" width="300" height="76" rx="12"
                fill="rgba(168,85,247,0.06)" stroke="rgba(168,85,247,0.25)" strokeWidth="1.5"/>
              <text x="180" y="398" textAnchor="middle" fill="white"
                fontSize="14" fontWeight="500" fontFamily="system-ui,sans-serif">
                {t('svgSuperBrevetsTitle')}
              </text>
              <text x="180" y="421" textAnchor="middle" fill="rgba(255,255,255,0.38)"
                fontSize="12" fontFamily="system-ui,sans-serif">
                {t('svgSuperBrevetsSub')}
              </text>

              {/* ── SR600 ── */}
              <rect x="415" y="366" width="250" height="76" rx="12"
                fill="rgba(52,211,153,0.06)" stroke="rgba(52,211,153,0.25)" strokeWidth="1.5"/>
              <text x="540" y="398" textAnchor="middle" fill="white"
                fontSize="14" fontWeight="500" fontFamily="system-ui,sans-serif">
                Super Randonnées SR600
              </text>
              <text x="540" y="421" textAnchor="middle" fill="rgba(255,255,255,0.38)"
                fontSize="12" fontFamily="system-ui,sans-serif">
                {t('svgSr600Sub')}
              </text>

              {/* ── UAF — αυτόνομος (dashed border) ── */}
              <rect x="30" y="462" width="300" height="72" rx="12"
                fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.22)"
                strokeWidth="1.5" strokeDasharray="6,3"/>
              <text x="180" y="492" textAnchor="middle" fill="white"
                fontSize="14" fontWeight="600" fontFamily="system-ui,sans-serif">
                Union des Audax Français (UAF)
              </text>
              <text x="180" y="515" textAnchor="middle" fill="rgba(255,255,255,0.35)"
                fontSize="11" fontFamily="system-ui,sans-serif">
                {t('svgUafSub')}
              </text>

              {/* UAF "αυτόνομος" pill label */}
              <rect x="344" y="462" width="76" height="18" rx="9"
                fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
              <text x="382" y="475" textAnchor="middle" fill="rgba(255,255,255,0.45)"
                fontSize="10" fontFamily="system-ui,sans-serif">
                {t('svgUafPill')}
              </text>

            </svg>
          </div>
        </section>

        {/* ── 5. Πίνακας ── */}
        <section className="mb-12">
          <SectionTitle>{t('section5Heading')}</SectionTitle>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-left text-white/50 font-semibold px-4 py-3 text-xs uppercase tracking-wider">{t('tableHeadOrg')}</th>
                  <th className="text-left text-white/50 font-semibold px-4 py-3 text-xs uppercase tracking-wider">{t('tableHeadFounded')}</th>
                  <th className="text-left text-white/50 font-semibold px-4 py-3 text-xs uppercase tracking-wider">{t('tableHeadScope')}</th>
                  <th className="text-left text-white/50 font-semibold px-4 py-3 text-xs uppercase tracking-wider">{t('tableHeadStyle')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  ['ACP', '1904', t('tableRow1Scope'), 'Allure Libre'],
                  ['UAF', '1922', t('tableRow2Scope'), t('tableRow2Style')],
                  ['LRM', '1983', t('tableRow3Scope'), 'Allure Libre'],
                  ['Provence Randonneurs', '2011', 'Super Randonnées SR600', 'Allure Libre (solo)'],
                ].map(([org, year, scope, style]) => (
                  <tr key={org} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{org}</td>
                    <td className="px-4 py-3 text-white/40 tabular-nums">{year}</td>
                    <td className="px-4 py-3 text-white/60">{scope}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">{style}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── CTA → Guide ── */}
        <section className="mb-8">
          <Link href="/randonneuring/guide"
            className="group flex items-center gap-5 bg-gradient-to-r from-cyan-500/10 to-purple-500/10
              border border-white/10 hover:border-cyan-500/30 rounded-2xl p-6 transition-all">
            <div className="text-4xl flex-shrink-0">🚴</div>
            <div className="flex-1 min-w-0">
              <div className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">
                {t('ctaKicker')}
              </div>
              <div className="text-white font-bold text-lg leading-tight mb-1 group-hover:text-cyan-100 transition-colors">
                {t('ctaTitle')}
              </div>
              <div className="text-white/40 text-sm">
                {t('ctaDesc')}
              </div>
            </div>
            <div className="text-white/30 group-hover:text-cyan-400 text-xl transition-colors flex-shrink-0">
              →
            </div>
          </Link>
        </section>

        <UsefulButton page="randonneuring" />

        {/* Footer note */}
        <div className="text-white/20 text-xs text-center pb-2">
          {t('footerSources')}
        </div>
        <PageViews page="randonneuring" />

      </div>
    </div>
  );
}
