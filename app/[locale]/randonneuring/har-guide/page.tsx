import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import UsefulButton from '@/app/components/UsefulButton';
import PageViews from '@/app/components/PageViews';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'harGuide' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

interface Topic {
  id: string;
  icon: string;
  color: string;
  title: string;
  shortDesc: string;
  content: string;
  url?: string;
}

export default async function HarGuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('harGuide');

  const LADDER = [
    { icon: '🚴',  label: t('ladder1Label'), sublabel: t('ladder1Sub'), color: '#FF7043' },
    { icon: '🏆',  label: t('ladder2Label'), sublabel: t('ladder2Sub'), color: '#FFC107' },
    { icon: '🏔️', label: t('ladder3Label'), sublabel: t('ladder3Sub'), color: '#26A69A' },
    { icon: '🌟',  label: t('ladder4Label'), sublabel: t('ladder4Sub'), color: '#AB47BC' },
  ];

  const TOPICS: Topic[] = [
    {
      id: 'who',
      icon: '🏛️',
      color: '#FF7043',
      title: t('topic1Title'),
      shortDesc: t('topic1ShortDesc'),
      content: t('topic1Content'),
      url: 'https://www.hellenic-autonomous-randonneur.com/poioi-eimaste2/',
    },
    {
      id: 'rules',
      icon: '📋',
      color: '#42A5F5',
      title: t('topic2Title'),
      shortDesc: t('topic2ShortDesc'),
      content: t('topic2Content'),
      url: 'https://www.hellenic-autonomous-randonneur.com/kanonismos/',
    },
    {
      id: 'sr_year',
      icon: '🏆',
      color: '#FFC107',
      title: t('topic3Title'),
      shortDesc: t('topic3ShortDesc'),
      content: t('topic3Content'),
    },
    {
      id: 'super_randonnee',
      icon: '🏔️',
      color: '#26A69A',
      title: t('topic4Title'),
      shortDesc: t('topic4ShortDesc'),
      content: t('topic4Content'),
      url: 'https://www.hellenic-autonomous-randonneur.com/super-randonnee/',
    },
    {
      id: 'postride',
      icon: '📮',
      color: '#7E57C2',
      title: t('topic5Title'),
      shortDesc: t('topic5ShortDesc'),
      content: t('topic5Content'),
      url: 'https://www.hellenic-autonomous-randonneur.com/kanonismos/',
    },
    {
      id: 'challenge',
      icon: '🌟',
      color: '#AB47BC',
      title: t('topic6Title'),
      shortDesc: t('topic6ShortDesc'),
      content: t('topic6Content'),
      url: 'https://www.hellenic-autonomous-randonneur.com/challenge-2026/',
    },
    {
      id: 'cop31',
      icon: '🌍',
      color: '#66BB6A',
      title: t('topic7Title'),
      shortDesc: t('topic7ShortDesc'),
      content: t('topic7Content'),
      url: 'https://copbikeride.org/',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-12 relative overflow-hidden">
      {/* Ghosted H.A.R. logo watermark — same treatment as the app */}
      <div
        aria-hidden
        className="pointer-events-none select-none fixed inset-0 flex justify-center z-0"
      >
        <img
          src="/logos/har_logo3.png"
          alt=""
          className="mt-16 w-[90vw] max-w-[640px] opacity-[0.07]"
        />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/30 mb-8">
          <Link href="/" className="hover:text-white transition-colors">{t('breadcrumbHome')}</Link>
          <span>/</span>
          <Link href="/randonneuring" className="hover:text-white transition-colors">Randonneuring</Link>
          <span>/</span>
          <span className="text-white/60">{t('breadcrumbTitle')}</span>
        </div>

        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="text-5xl mb-4">🚴</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
            {t('heroTitle')}
          </h1>
          <p className="text-white/40 text-sm">{t('heroSubtitle')}</p>
        </div>

        {/* Progression Ladder */}
        <section className="mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-base text-center mb-6">{t('ladderHeading')}</h2>
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
            {t('ladderCaption')}
          </p>
        </section>

        {/* Topics */}
        <section className="space-y-3">
          {TOPICS.map(topic => (
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
                    {t('officialSourceLink')} ↗
                  </a>
                )}
              </div>
            </details>
          ))}
        </section>

        {/* Back link */}
        <div className="mt-10 text-center">
          <Link href="/randonneuring/guide"
            className="text-white/30 hover:text-white text-sm transition-colors">
            ← {t('backToGuide')}
          </Link>
        </div>

        <UsefulButton page="har-guide" />
        <PageViews page="har-guide" />

      </div>
    </div>
  );
}
