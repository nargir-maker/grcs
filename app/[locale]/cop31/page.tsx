import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Cop31StatusPill from '@/app/components/Cop31StatusPill';
import PageViews from '@/app/components/PageViews';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cop31' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function Cop31Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('cop31');

  const route = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => t(`route${n}`));

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-16">
      <div className="max-w-2xl mx-auto">

        {/* ── HERO ── */}
        <div className="mb-16 text-center">
          <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest mb-3">
            {t('heroKicker')}
          </p>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            {t('heroTitle')}
          </h1>
          <p className="text-cyan-400 text-lg font-medium mb-5">
            {t('heroSubtitle')}
          </p>
          <Cop31StatusPill />
        </div>

        {/* ── WHAT IS COP BIKE RIDE ── */}
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-emerald-400">🌍</span>
            {t('section01Heading')}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-white/70 leading-relaxed">{t('section01P1')}</p>
            <p className="text-white/70 leading-relaxed">{t('section01P2')}</p>
          </div>
        </section>

        {/* ── WHAT IS COP31 ── */}
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-emerald-400">🏛️</span>
            {t('section00Heading')}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-white/70 leading-relaxed">{t('section00P')}</p>
          </div>
        </section>

        {/* ── GREEK LEG ── */}
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-emerald-400">🇬🇷</span>
            {t('section02Heading')}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-white/70 leading-relaxed">{t('section02P1')}</p>
            <p className="text-white/70 leading-relaxed">{t('section02P2')}</p>
          </div>
        </section>

        {/* ── ROUTE ── */}
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-emerald-400">🗺️</span>
            {t('routeHeading')}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-white/50 text-sm mb-5">{t('routeIntro')}</p>
            <ol className="space-y-2">
              {route.map((line, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 text-sm rounded-xl px-4 py-3 ${
                    i === route.length - 1
                      ? 'bg-emerald-500/10 border border-emerald-400/25 text-emerald-200 font-medium'
                      : 'bg-[#0A1628]/40 border border-white/10 text-white/75'
                  }`}
                >
                  <span className="text-white/30 font-mono text-xs w-5 shrink-0">{i + 1}</span>
                  {line}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── HOW TO JOIN ── */}
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-emerald-400">🚴</span>
            {t('joinHeading')}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-white/70 leading-relaxed">{t('joinP1')}</p>
            <p className="text-white/70 leading-relaxed">{t('joinP2')}</p>
            <p className="text-white/70 leading-relaxed">{t('joinP3')}</p>
          </div>
        </section>

        {/* ── SUPPORT ── */}
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-emerald-400">🤝</span>
            {t('supportHeading')}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
            <p className="text-white/70 leading-relaxed">{t('supportP1')}</p>
            <p className="text-white/50 text-sm">{t('supportSponsor')}</p>
          </div>
        </section>

        {/* ── LINKS ── */}
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-emerald-400">🔗</span>
            {t('linksHeading')}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
            <a
              href="https://www.hellenic-autonomous-randonneur.com/#cop31-bike-ride"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 bg-[#0A1628]/40 border border-white/10
                hover:border-cyan-500/40 rounded-xl px-4 py-3 transition-colors group"
            >
              <span className="text-white/80 text-sm group-hover:text-white">{t('linkHar')}</span>
              <span className="text-cyan-400 text-xs">→</span>
            </a>
            <a
              href="https://www.copbikeride.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 bg-[#0A1628]/40 border border-white/10
                hover:border-cyan-500/40 rounded-xl px-4 py-3 transition-colors group"
            >
              <span className="text-white/80 text-sm group-hover:text-white">{t('linkGlobal')}</span>
              <span className="text-cyan-400 text-xs">→</span>
            </a>
            <div>
              <a
                href="https://www.facebook.com/events/1976816766310283/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 bg-[#0A1628]/40 border border-white/10
                  hover:border-cyan-500/40 rounded-xl px-4 py-3 transition-colors group"
              >
                <span className="text-white/80 text-sm group-hover:text-white">{t('linkFacebook')}</span>
                <span className="text-cyan-400 text-xs">→</span>
              </a>
              <p className="text-white/35 text-xs mt-1.5 px-1">{t('linkFacebookNote')}</p>
            </div>
            <a
              href="https://drive.google.com/file/d/1BYwERe_5dhW3STEyIwcSVcl5_pe13omm/view"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 bg-[#0A1628]/40 border border-white/10
                hover:border-cyan-500/40 rounded-xl px-4 py-3 transition-colors group"
            >
              <span className="text-white/80 text-sm group-hover:text-white">{t('linkPdf')}</span>
              <span className="text-cyan-400 text-xs">→</span>
            </a>
            <a
              href="mailto:info@hellenic-autonomous-randonneur.com"
              className="flex items-center justify-between gap-3 bg-[#0A1628]/40 border border-white/10
                hover:border-cyan-500/40 rounded-xl px-4 py-3 transition-colors group"
            >
              <span className="text-white/80 text-sm group-hover:text-white">info@hellenic-autonomous-randonneur.com</span>
              <span className="text-cyan-400 text-xs">→</span>
            </a>
          </div>
        </section>

        {/* ── FOOTER QUOTE ── */}
        <div className="text-center pt-8 border-t border-white/10">
          <p className="text-white/50 text-sm italic">
            {t('footerQuote')}
          </p>
          <p className="text-white/30 text-xs mt-1">
            {t('footerQuoteAttribution')}
          </p>
        </div>

        <PageViews page="cop31" />
      </div>
    </div>
  );
}
