import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import VideoOrImage from '@/app/components/VideoOrImage';
import PageViews from '@/app/components/PageViews';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-16">
      <div className="max-w-2xl mx-auto">

        {/* ── HERO ── */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Greek Randonneuring Community
          </h1>
          <p className="text-cyan-400 text-lg font-medium">
            {t('heroSubtitle')}
          </p>
        </div>

        {/* ── COIN IMAGE + ECOSYSTEM ── */}
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">01</span>
            {t('section01Heading')}
          </h2>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

            <VideoOrImage
              videoSrc="/grc_clip.mp4"
              imageSrc="/grc-coin.png"
              minHeight={260}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* GRC Website */}
              <div className="bg-[#0A1628]/40 backdrop-blur-sm border border-white/15 rounded-2xl p-6">
                <p className="text-white font-bold text-base leading-snug mb-1">{t('webName')}</p>
                <p className="text-white/35 text-xs mb-4">{t('webUrl')}</p>
                <p className="text-white/75 text-sm leading-relaxed">
                  {t('webDesc')}
                </p>
              </div>

              {/* Greek Brevets Tracker app */}
              <div className="bg-[#0A1628]/40 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-6">
                <p className="text-white font-bold text-base leading-snug mb-1">{t('appName')}</p>
                <p className="text-white/35 text-xs mb-4">{t('appType')}</p>
                <p className="text-white/75 text-sm leading-relaxed">
                  {t('appDesc')}
                </p>
                <div className="mt-4">
                  <p className="text-white/50 text-xs mb-2">{t('appDownloadLabel')}</p>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.nikos.greekbrevets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full
                      bg-green-500/15 text-green-400 border border-green-500/25
                      hover:bg-green-500/25 hover:border-green-500/50 transition-all duration-200"
                  >
                    {t('appAndroid')}
                  </a>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── WHAT IS RANDONNEURING ── */}
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">02</span>
            {t('section02Heading')}
          </h2>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

            <VideoOrImage
              videoSrc="/grc_group.mp4"
              imageSrc="/bg10.png"
              minHeight={280}
            />

            <div className="space-y-4">
              <p className="text-white/70 leading-relaxed">
                {t('section02P1Pre')} <span className="text-white font-medium">{t('section02P1Mid')}</span> {t('section02P1Post')}
              </p>
              <p className="text-white/70 leading-relaxed">
                {t('section02P2')}
              </p>
              <p className="text-white/70 leading-relaxed">
                {t('section02P3Pre')} <span className="text-white font-medium">{t('section02P3Km200')}</span> {t('section02P3Mid')} <span className="text-white font-medium">{t('section02P3Km1200')}</span> {t('section02P3Post')}
              </p>
            </div>

          </div>
        </section>

        {/* ── WHAT IS GRC ── */}
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">03</span>
            {t('section03Heading')}
          </h2>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

            {/* Image Box 03 */}
            <div
              className="rounded-xl border border-white/10 overflow-hidden mb-6"
              style={{
                backgroundImage: 'url(/bg11.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: '#0A1628',
                minHeight: '280px',
              }}
            />

            <div className="space-y-4">
              <p className="text-white/70 leading-relaxed">
                {t('section03P1')}
              </p>
              <p className="text-white/70 leading-relaxed">
                {t('section03P2')}
              </p>
              <p className="text-white/70 leading-relaxed">
                {t('section03P3')}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 pt-2">
                <a
                  href="https://www.brevets.gr"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('acpAria')}
                  className="flex items-center justify-center w-64 h-64 rounded-full
                    bg-white/5 border border-white/15 hover:border-cyan-500/50
                    hover:bg-white/10 transition-all duration-200"
                >
                  <img src="/logos/650000.png" alt="ΛΕ.ΠΟ.Τ.Ε." className="w-56 h-56 object-contain rounded-full" />
                </a>
                <a
                  href="https://www.hellenic-autonomous-randonneur.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('harAria')}
                  className="flex items-center justify-center w-64 h-64 rounded-full
                    bg-white/5 border border-white/15 hover:border-cyan-500/50
                    hover:bg-white/10 transition-all duration-200"
                >
                  <img src="/logos/659999.png" alt="H.A.R." className="w-56 h-56 object-contain rounded-full" />
                </a>
              </div>
            </div>

          </div>
        </section>

        {/* ── THE NUMBERS ── */}
        <section className="mb-12">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">04</span>
            {t('section04Heading')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: '20+', label: t('statYearsHistory') },
              { value: '500+', label: t('statActiveRiders') },
              { value: '30+', label: t('statClubs') },
              { value: '∞', label: t('statKmAhead') },
            ].map((s) => {
              const isInfinite = s.value === '∞';
              return (
                <div key={s.label}
                  className={`rounded-xl p-4 text-center ${
                    isInfinite
                      ? 'bg-amber-500/10 border border-amber-400/25'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                  <div className={isInfinite
                    ? 'text-amber-300 font-bold text-4xl mb-1 leading-none'
                    : 'text-cyan-400 font-bold text-2xl mb-1'}>
                    {s.value}
                  </div>
                  <div className="text-white/40 text-xs">{s.label}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── PBP ── */}
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">05</span>
            {t('section05Heading')}
          </h2>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

            {/* Image Box 05 */}
            <div
              className="rounded-xl border border-white/10 overflow-hidden mb-6"
              style={{
                backgroundImage: 'url(/bg12.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: '#0A1628',
                minHeight: '280px',
              }}
            />

            <p className="text-white/70 leading-relaxed">
              {t('section05PPre')} <span className="text-white font-medium">{t('section05PBold')}</span>{t('section05PPost')}
            </p>
          </div>
        </section>

        {/* ── CONTACT ── */}
        <section className="mb-12">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">06</span>
            {t('section06Heading')}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
            <p className="text-white/70 text-sm">
              {t('contactIntro')}
            </p>
            <a href="mailto:gbt.app.support@gmail.com"
              className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium">
              gbt.app.support@gmail.com
            </a>
            <p className="text-white/40 text-xs pt-2">
              {t('contactNote')}
            </p>
          </div>
        </section>

        {/* ── FOOTER QUOTE ── */}
        <div className="text-center pt-8 border-t border-white/10">
          <p className="text-white/30 text-sm italic">
            "Il faut du temps pour aller vite."
          </p>
          <p className="text-white/50 text-xs mt-1">
            {t('footerQuoteTranslation')}
          </p>
        </div>

        <PageViews page="about" />
      </div>
    </div>
  );
}
