// app/randonneuring/guide/page.tsx
// Practical beginner's guide to randonneuring — from zero to first 200 km brevet


import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import UsefulButton from '@/app/components/UsefulButton';
import PageViews from '@/app/components/PageViews';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'guide' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

// ── Reusable components ───────────────────────────────────────────────────────

function SectionTitle({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-3">
      <span className="text-2xl">{emoji}</span>
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

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 text-sm text-white/70 leading-relaxed mt-4">
      💡 {children}
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-white font-semibold text-base mb-3 mt-5 first:mt-0">{children}</h3>
  );
}

function BulletList({ items }: { items: { label: string; body: React.ReactNode }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-white/70 leading-relaxed">
          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan-500/60 flex-shrink-0" />
          <span>
            <strong className="text-white/90">{item.label}</strong>{' '}
            {item.body}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function GuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('guide');

  const richTags = {
    b: (chunks: React.ReactNode) => <strong className="text-white">{chunks}</strong>,
    i: (chunks: React.ReactNode) => <em>{chunks}</em>,
  };

  // ── Distance table data ───────────────────────────────────────────────────
  const DISTANCES = [
    {
      dist:   t('distance1Dist'),
      limit:  t('distance1Limit'),
      prep:   t('distance1Prep'),
      change: t('distance1Change'),
      accent: 'border-cyan-500/40 bg-cyan-500/5',
      badge:  'text-cyan-300 bg-cyan-500/15 border-cyan-400/30',
    },
    {
      dist:   t('distance2Dist'),
      limit:  t('distance2Limit'),
      prep:   t('distance2Prep'),
      change: t('distance2Change'),
      accent: 'border-white/10 bg-white/3',
      badge:  'text-white/60 bg-white/8 border-white/15',
    },
    {
      dist:   t('distance3Dist'),
      limit:  t('distance3Limit'),
      prep:   t('distance3Prep'),
      change: t('distance3Change'),
      accent: 'border-white/10 bg-white/3',
      badge:  'text-white/60 bg-white/8 border-white/15',
    },
    {
      dist:   t('distance4Dist'),
      limit:  t('distance4Limit'),
      prep:   t('distance4Prep'),
      change: t('distance4Change'),
      accent: 'border-purple-500/30 bg-purple-500/5',
      badge:  'text-purple-300 bg-purple-500/15 border-purple-400/30',
    },
    {
      dist:   t('distance5Dist'),
      limit:  t('distance5Limit'),
      prep:   t('distance5Prep'),
      change: t('distance5Change'),
      accent: 'border-amber-500/30 bg-amber-500/5',
      badge:  'text-amber-300 bg-amber-500/15 border-amber-400/30',
    },
  ];

  // ── Greek clubs ────────────────────────────────────────────────────────────
  const CLUBS = [
    {
      name:    'ΛΕ.Π.Ο.Τ.Ε. / Audax Randonneurs Grece',
      site:    'brevets.gr',
      href:    'https://www.brevets.gr',
      accent:  'border-cyan-500/40',
      dot:     'bg-cyan-500',
      body:    t('club1Body'),
    },
    {
      name:    'Hellenic Autonomous Randonneur (H.A.R.)',
      site:    'hellenic-autonomous-randonneur.com',
      href:    'https://www.hellenic-autonomous-randonneur.com',
      accent:  'border-white/10',
      dot:     'bg-white/40',
      body:    t('club2Body'),
    },
    {
      name:    'Ble Cycling Club',
      site:    'blecyclingclub.gr',
      href:    'https://www.blecyclingclub.gr',
      accent:  'border-blue-500/40',
      dot:     'bg-blue-400',
      body:    t('club3Body'),
    },
    {
      name:    'Π.Ε.Π.Α.',
      site:    'pepa.gr',
      href:    'https://www.pepa.gr',
      accent:  'border-white/10',
      dot:     'bg-white/40',
      body:    t('club4Body'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/30 mb-8">
          <Link href="/" className="hover:text-white transition-colors">{t('breadcrumbHome')}</Link>
          <span>/</span>
          <Link href="/randonneuring" className="hover:text-white transition-colors">Randonneuring</Link>
          <span>/</span>
          <span className="text-white/60">{t('breadcrumbGuide')}</span>
        </div>

        {/* Hero */}
        <div className="mb-12">
          <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">{t('heroKicker')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            {t('heroTitleLine1')}<br/>{t('heroTitleLine2')}
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            {t('heroSubtitle')}
          </p>
        </div>

        {/* ── 0. Ιατρικός Έλεγχος ── */}
        <section className="mb-12">
          <SectionTitle emoji="🩺">{t('section0Heading')}</SectionTitle>
          <Card>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              {t('section0P1')}
            </p>
            <Tip>
              <strong className="text-white/90">{t('section0TipBold')}</strong>{' '}
              {t('section0TipBody')}
            </Tip>
            <p className="text-white/60 text-sm leading-relaxed mt-4">
              {t('section0P2')}
            </p>
          </Card>
        </section>

        {/* ── 1. Ποδήλατο ── */}
        <section className="mb-12">
          <SectionTitle emoji="🚲">{t('section1Heading')}</SectionTitle>
          <Card>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {t.rich('section1P1', richTags)}
            </p>

            <BulletList items={[
              { label: t('bikeItem1Label'), body: t('bikeItem1Body') },
              { label: t('bikeItem2Label'), body: t('bikeItem2Body') },
              { label: t('bikeItem3Label'), body: t('bikeItem3Body') },
            ]} />

            <SubTitle>{t('subtitleBikeFit')}</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              {t('section1P2')}
            </p>
            <BulletList items={[
              { label: t('fitItem1Label'), body: t('fitItem1Body') },
              { label: t('fitItem2Label'), body: t('fitItem2Body') },
              { label: t('fitItem3Label'), body: t('fitItem3Body') },
              { label: t('fitItem4Label'), body: t('fitItem4Body') },
            ]} />
            <Tip>
              <strong className="text-white/90">{t('tipBikeFitBold')}</strong>{' '}
              {t('tipBikeFitBody')}
            </Tip>
          </Card>
        </section>

        {/* ── 2. Εξοπλισμός ── */}
        <section className="mb-12">
          <SectionTitle emoji="🎒">{t('section2Heading')}</SectionTitle>
          <Card>
            <p className="text-white/60 text-sm leading-relaxed mb-5">
              {t.rich('section2P1', richTags)}
            </p>

            <SubTitle>{t('subtitleClothing')}</SubTitle>
            <BulletList items={[
              { label: t('clothingItem1Label'), body: t('clothingItem1Body') },
              { label: t('clothingItem2Label'), body: t('clothingItem2Body') },
              { label: t('clothingItem3Label'), body: t('clothingItem3Body') },
              { label: t('clothingItem4Label'), body: t('clothingItem4Body') },
            ]} />

            <SubTitle>{t('subtitleSafety')}</SubTitle>
            <BulletList items={[
              { label: t('safetyItem1Label'), body: t('safetyItem1Body') },
              { label: t('safetyItem2Label'), body: t('safetyItem2Body') },
              { label: t('safetyItem3Label'), body: t('safetyItem3Body') },
            ]} />

            <SubTitle>{t('subtitleBags')}</SubTitle>
            <BulletList items={[
              { label: t('bagsItem1Label'), body: t('bagsItem1Body') },
              { label: t('bagsItem2Label'), body: t('bagsItem2Body') },
            ]} />
          </Card>
        </section>

        {/* ── 3. Πώς να Ξεκινήσεις ── */}
        <section className="mb-12">
          <SectionTitle emoji="🛣️">{t('section3Heading')}</SectionTitle>
          <Card>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {t.rich('section3P1', richTags)}
            </p>

            <SubTitle>{t('subtitleWhatItTakes')}</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {t('section3P2')}
            </p>

            <SubTitle>{t('subtitleWhereToStart')}</SubTitle>
            <BulletList items={[
              { label: t('startItem1Label'), body: t('startItem1Body') },
              { label: t('startItem2Label'), body: t('startItem2Body') },
              { label: t('startItem3Label'), body: t('startItem3Body') },
              { label: t('startItem4Label'), body: t('startItem4Body') },
            ]} />

            <SubTitle>{t('subtitleNeedCoach')}</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed">
              {t('section3P3')}
            </p>
          </Card>
        </section>

        {/* ── 4. Χρονοδιάγραμμα Αποστάσεων ── */}
        <section className="mb-12">
          <SectionTitle emoji="📈">{t('section4Heading')}</SectionTitle>
          <p className="text-white/50 text-sm mb-5 leading-relaxed">
            {t('section4P1')}
          </p>

          <div className="space-y-3">
            {DISTANCES.map((d) => (
              <div key={d.dist}
                className={`rounded-2xl border p-4 sm:p-5 ${d.accent}`}>
                <div className="flex flex-wrap items-start gap-3 mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${d.badge}`}>
                    {d.dist}
                  </span>
                  <span className="text-white/40 text-xs mt-1">
                    {t('distanceLimitLabel')} <span className="text-white/70 font-medium">{d.limit}</span>
                  </span>
                  <span className="text-white/40 text-xs mt-1">
                    {t('distancePrepLabel')} <span className="text-white/70 font-medium">{d.prep}</span>
                  </span>
                </div>
                <p className="text-white/55 text-sm leading-relaxed">{d.change}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Προπόνηση ── */}
        <section className="mb-12">
          <SectionTitle emoji="💪">{t('section5Heading')}</SectionTitle>
          <Card>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {t.rich('section5P1', richTags)}
            </p>

            <SubTitle>{t('subtitlePlan')}</SubTitle>
            <BulletList items={[
              { label: t('planItem1Label'), body: t('planItem1Body') },
              { label: t('planItem2Label'), body: t('planItem2Body') },
            ]} />

            <SubTitle>{t('subtitleElevation')}</SubTitle>
            <p className="text-white/60 text-sm leading-relaxed mb-3">
              {t('section5P2')}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: t('elevation1Label'), value: t('elevation1Value'), color: 'text-green-300' },
                { label: t('elevation2Label'), value: t('elevation2Value'), color: 'text-amber-300' },
              ].map((r) => (
                <div key={r.label}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
                  <div className="text-white/40 text-xs mb-1">{r.label}</div>
                  <div className={`font-semibold ${r.color}`}>{r.value}</div>
                </div>
              ))}
            </div>
            <Tip>
              {t.rich('tipElevation', richTags)}
            </Tip>

            <SubTitle>{t('subtitleTapering')}</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              {t.rich('section5P3', richTags)}
            </p>
            <BulletList items={[
              { label: t('taperItem1Label'), body: t('taperItem1Body') },
              { label: t('taperItem2Label'), body: t('taperItem2Body') },
              { label: t('taperItem3Label'), body: t('taperItem3Body') },
            ]} />
          </Card>
        </section>

        {/* ── 5. Διατροφή ── */}
        <section className="mb-12">
          <SectionTitle emoji="🍌">{t('section6Heading')}</SectionTitle>
          <Card>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {t.rich('section6P1', richTags)}
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mb-5">
              {[
                { icon: '🍞', label: t('food1Label'), value: t('food1Value'), note: t('food1Note') },
                { icon: '💧', label: t('food2Label'), value: t('food2Value'), note: t('food2Note') },
                { icon: '🥪', label: t('food3Label'), value: t('food3Value'), note: t('food3Note') },
              ].map((f) => (
                <div key={f.label}
                  className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-2xl mb-2">{f.icon}</div>
                  <div className="text-white/40 text-xs mb-1">{f.label}</div>
                  <div className="text-white font-semibold text-sm mb-2">{f.value}</div>
                  <div className="text-white/40 text-xs leading-relaxed">{f.note}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ── 6. Στρατηγική ── */}
        <section className="mb-12">
          <SectionTitle emoji="🧠">{t('section7Heading')}</SectionTitle>
          <Card>
            <p className="text-white/60 text-sm leading-relaxed mb-5">
              {t.rich('section7P1', richTags)}
            </p>

            <div className="space-y-4">
              {[
                { n: '01', title: t('strategy1Title'), body: t('strategy1Body') },
                { n: '02', title: t('strategy2Title'), body: t('strategy2Body') },
                { n: '03', title: t('strategy3Title'), body: t('strategy3Body') },
              ].map((s) => (
                <div key={s.n} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/8 border border-white/15
                    flex items-center justify-center text-white/30 text-xs font-bold tabular-nums">
                    {s.n}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm mb-1">{s.title}</div>
                    <div className="text-white/55 text-sm leading-relaxed">{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ── 7. Πώς Λειτουργεί ένα Brevet ── */}
        <section className="mb-12">
          <SectionTitle emoji="🗂️">{t('section8Heading')}</SectionTitle>
          <Card>
            <SubTitle>{t('subtitleBrevetCard')}</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {t.rich('section8P1', richTags)}
            </p>

            <SubTitle>{t('subtitlePhotoControls')}</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {t('section8P2')}
            </p>

            <SubTitle>{t('subtitleOutOfTime')}</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              {t('section8P3')}
            </p>

            <SubTitle>{t('subtitleStuck')}</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed">
              {t.rich('section8P4', richTags)}
            </p>
          </Card>
        </section>

        {/* ── 8. Εγγραφή & Κόστη ── */}
        <section className="mb-12">
          <SectionTitle emoji="📋">{t('section9Heading')}</SectionTitle>
          <Card>
            <SubTitle>{t('subtitleClubRegistration')}</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              {t.rich('section9P1', richTags)}
            </p>
            <BulletList items={[
              {
                label: t('registration1Label'),
                body: <a href="https://brevets.gr/brevets/%CE%B8%CE%AD%CE%BB%CE%B5%CF%84%CE%B5-%CE%BD%CE%B1-%CF%80%CE%AC%CF%81%CE%B5%CF%84%CE%B5-%CE%BC%CE%AD%CF%81%CE%BF%CF%82-%CF%83%E2%80%99-%CE%AD%CE%BD%CE%B1-brevet.html" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors">{t('registration1LinkText')} ↗</a>,
              },
              {
                label: t('registration2Label'),
                body: <a href="https://www.hellenic-autonomous-randonneur.com/eggrafes-podilaton-mitroo/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors">{t('registration2LinkText')} ↗</a>,
              },
            ]} />
            <p className="text-white/55 text-sm leading-relaxed mt-4">
              {t('section9P2')}
            </p>

            <SubTitle>{t('subtitleCosts')}</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed">
              {t('section9P3')}
            </p>

            <SubTitle>{t('subtitleInsurance')}</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed">
              {t.rich('section9P4', richTags)}
            </p>

            <SubTitle>{t('subtitleTransport')}</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed">
              {t('section9P5')}
            </p>
          </Card>
        </section>

        {/* ── 9. Κοινότητα στην Ελλάδα ── */}
        <section className="mb-12">
          <SectionTitle emoji="🇬🇷">{t('section10Heading')}</SectionTitle>
          <p className="text-white/50 text-sm mb-5 leading-relaxed">
            {t.rich('section10P1', richTags)}
          </p>

          <div className="space-y-3">
            {CLUBS.map((c) => (
              <div key={c.name}
                className={`bg-white/4 border rounded-2xl p-5 ${c.accent}`}>
                <div className="flex items-start gap-3 mb-2">
                  <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                  <div className="flex-1">
                    <div className="text-white font-semibold text-sm">{c.name}</div>
                    {c.href && (
                      <a href={c.href} target="_blank" rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors">
                        {c.site} ↗
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-white/55 text-sm leading-relaxed pl-5">{c.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 bg-white/3 border border-white/8 rounded-2xl p-5">
            <div className="text-white font-semibold text-sm mb-2">
              {t('regionalClubsTitle')}
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              {t('regionalClubsBody')}
            </p>
          </div>

          <Tip>
            <strong className="text-white/90">{t('tipFirstContactBold')}</strong>{' '}
            {t('tipFirstContactBody')}
          </Tip>

          <div className="mt-5 bg-white/3 border border-white/8 rounded-2xl p-5">
            <div className="text-white font-semibold text-sm mb-3">
              {t('groupRidesTitle')}
            </div>
            <ul className="space-y-3">
              {[
                { label: t('groupRide1Label'), note: t('groupRide1Note'), href: 'https://www.facebook.com/groups/484265904937327' },
                { label: t('groupRide2Label'), note: t('groupRide2Note'), href: 'https://blecyclingclub.gr/workouts/team-meetings/' },
                { label: t('groupRide3Label'), note: t('groupRide3Note'), href: 'https://www.facebook.com/profile.php?id=61574825438429' },
              ].map((g) => (
                <li key={g.label} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500/60 flex-shrink-0" />
                  <span>
                    <a href={g.href} target="_blank" rel="noopener noreferrer"
                      className="text-white font-medium hover:text-cyan-400 transition-colors">
                      {g.label}
                    </a>
                    <span className="text-white/40"> — {g.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── 8. Checklist ── */}
        <section className="mb-12">
          <SectionTitle emoji="✅">{t('section11Heading')}</SectionTitle>
          <Card>
            <ul className="space-y-3">
              {[
                t('checklist1'),
                t('checklist2'),
                t('checklist3'),
                t('checklist4'),
                t('checklist5'),
                t('checklist6'),
                t('checklist7'),
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border border-white/20
                    flex items-center justify-center text-white/20 text-xs">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* ── Footer CTA ── */}
        <div className="rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10
          border border-white/10 p-8 text-center mb-8">
          <div className="text-3xl mb-3">🏅</div>
          <h3 className="text-white font-bold text-lg mb-2">
            {t('footerCtaTitle')}
          </h3>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
            {t('footerCtaBody')}
          </p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Link href="/brevets"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold
                text-sm px-5 py-2.5 rounded-full transition-colors">
              {t('footerCtaButton')}
            </Link>
            <Link href="/randonneuring"
              className="text-white/40 hover:text-white text-sm transition-colors">
              ← {t('footerCtaBack')}
            </Link>
          </div>
        </div>

        <UsefulButton page="guide" />
        <PageViews page="guide" />

      </div>
    </div>
  );
}
