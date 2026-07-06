// app/randonneuring/page.tsx
// Static educational page — history & structure of Randonneuring

import type { Metadata } from 'next';
import Link from 'next/link';
import UsefulButton from '../components/UsefulButton';
import PageViews from '../components/PageViews';

export const metadata: Metadata = {
  title: 'Ιστορία & Δομή του Randonneuring — GRC',
  description: 'Η ιστορία του randonneuring από τις απαρχές του ως σήμερα: ACP, UAF, LRM, Provence Randonneurs, Paris-Brest-Paris και η παγκόσμια δομή των brevets.',
};

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

const TIMELINE: TimelineEvent[] = [
  {
    year: '1891',
    title: 'Γέννηση του Paris-Brest-Paris',
    accent: 'bg-white/30',
    body: (
      <>
        Η εφημερίδα <em>Le Petit Journal</em> διοργανώνει το πρώτο PBP ως άγριο
        αγώνα επαγγελματιών — 1.200 χλμ. χωρίς σταθμό, χωρίς υποστήριξη.
        Γίνεται κάθε 10 χρόνια λόγω της εξοντωτικής φύσης του.
      </>
    ),
  },
  {
    year: '1904',
    title: 'Ίδρυση του Audax Club Parisien (ACP)',
    accent: 'bg-cyan-500',
    body: (
      <>
        Στις <strong>30 Νοεμβρίου 1904</strong> ιδρύεται στο Παρίσι το Audax Club
        Parisien. Την ίδια χρονιά, ο <strong>Henri Desgrange</strong> — διευθυντής
        της εφημερίδας <em>L'Auto</em> και ιδρυτής του Tour de France — διοργανώνει
        το πρώτο brevet 200 χλμ. υπό το στυλ <strong>Audax</strong>: οι αναβάτες
        κινούνται ως ενιαίο γκρουπ με σταθερή μέση ταχύτητα 18 χλμ./ώρα, υπό
        έναν «αρχηγό δρόμου» (road captain). Το 1906, ο Desgrange αναθέτει
        επίσημα στο ACP τη διαχείριση αυτών των brevets.
      </>
    ),
    link: { href: 'https://www.audax-club-parisien.com', label: 'audax-club-parisien.com' },
  },
  {
    year: '1921',
    title: 'Η Μεγάλη Ρήξη — Γέννηση του "Allure Libre"',
    accent: 'bg-amber-400',
    body: (
      <>
        Μια διπλή σύγκρουση ανατρέπει τα πάντα: το ACP συνεργάζεται με τον
        εμπορικό αντίπαλο της <em>L'Auto</em>, και κατηγορείται ότι παρέβη τη
        σταθερή ταχύτητα των 18 χλμ./ώρα. Ο Desgrange, εξοργισμένος, αφαιρεί
        τα δικαιώματα Audax από το ACP.
        <br /><br />
        Αποτέλεσμα — δύο δρόμοι χωρίζονται:
        <ul className="mt-3 space-y-2 text-white/70 text-sm">
          <li className="flex gap-2">
            <span className="text-amber-400 mt-0.5">▸</span>
            <span>Οι πιστοί στον Desgrange αποχωρούν και ιδρύουν (Απρίλιος 1922) την
            <strong className="text-white"> Union des Audax Clubs Parisiens (UACP)</strong>, που
            από 1 Ιανουαρίου 1956 μετονομάζεται σε <strong className="text-white">Union des
            Audax Français (UAF)</strong>. Κρατούν το ομαδικό στυλ μέχρι σήμερα.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-400 mt-0.5">▸</span>
            <span>Το ACP, στις <strong className="text-white">11 Σεπτεμβρίου 1921</strong>,
            διοργανώνει το πρώτο <strong className="text-white">Brevet de Randonneur à
            Allure Libre</strong> — ελεύθερου ρυθμού, χωρίς αρχηγούς και γκρουπ,
            αρκεί ο καθένας να τερματίσει εντός του χρονικού ορίου.
            <strong className="text-white"> Αυτή είναι η μορφή που κάνουμε σήμερα.</strong></span>
          </li>
        </ul>
      </>
    ),
  },
  {
    year: '1931',
    title: 'Το PBP ανοίγει στους ερασιτέχνες',
    accent: 'bg-purple-400',
    body: (
      <>
        Στην 5η έκδοση του PBP, το ACP και η UACP πείθουν τον Desgrange να
        επιτρέψει παράλληλη ερασιτεχνική συμμετοχή. Για πρώτη φορά τρέχουν
        ταυτόχρονα: επαγγελματίες, ερασιτέχνες Audax (ομαδικό στυλ, UAF) και
        ερασιτέχνες Randonneurs (allure libre, ACP).
        <br /><br />
        Το <strong>1951</strong> είναι η τελευταία χρονιά επαγγελματιών στο PBP —
        το Tour de France έχει αναδειχθεί σε απόλυτο βασιλιά. Το <strong>1975</strong>{' '}
        η UAF σταματά και το δικό της ομαδικό PBP λόγω έλλειψης συμμετοχών.
        Το ACP μένει ο <strong>μοναδικός και αδιαμφισβήτητος διοργανωτής</strong>{' '}
        του PBP Randonneur.
      </>
    ),
  },
  {
    year: '1983',
    title: 'Ίδρυση Les Randonneurs Mondiaux (LRM)',
    accent: 'bg-cyan-500',
    body: (
      <>
        Στις <strong>26 Αυγούστου 1983</strong> — την επόμενη ακριβώς μέρα από
        το 10ο PBP — το ACP μαζί με εκπροσώπους από 8 χώρες ιδρύει τους
        <strong> Les Randonneurs Mondiaux (LRM)</strong>, την παγκόσμια ομοσπονδία
        του randonneuring.
        <br /><br />
        Ο σκοπός: να αναλάβει η LRM την πιστοποίηση και εποπτεία των
        <strong> Super Brevets</strong> (διοργανώσεις 1200 χλμ. και άνω) παγκοσμίως,
        αφήνοντας στο ACP την κλασική σειρά BRM (200-1000 χλμ.) και το PBP.
        Χαρακτηριστικά LRM events: <em>London–Edinburgh–London (LEL)</em> στη
        Μ. Βρετανία, <em>Rocky Mountain 1200</em> στον Καναδά.
      </>
    ),
    link: { href: 'https://www.randonneursmondiaux.org', label: 'randonneursmondiaux.org' },
  },
  {
    year: '2009',
    title: 'Γέννηση των Super Randonnées (SR600)',
    accent: 'bg-emerald-400',
    body: (
      <>
        Η Randonneuse <strong>Sophie Matter</strong>, που ζει στην Προβηγκία, αναζητά
        ένα format που να συνδυάζει 600 χλμ. με τουλάχιστον 10.000 μέτρα υψομετρικό
        σε καθεστώς απόλυτης αυτονομίας — κάτι που δεν υπάρχει ακόμα στη Γαλλία.
        Παρουσιάζει την ιδέα στο ACP, που την εγκρίνει και ορίζει την ίδια
        αποκλειστικά υπεύθυνη.
        <br /><br />
        Έτσι γεννιούνται τα <strong>Super Randonnées (SR600)</strong>: μόνιμες
        διαδρομές (permanents) 600 χλμ. / 10.000+ μ. υψόμετρο, χωρίς ημερομηνία
        εκκίνησης, ανά πάσα στιγμή.
      </>
    ),
  },
  {
    year: '2011',
    title: 'Ίδρυση Provence Randonneurs',
    accent: 'bg-emerald-400',
    body: (
      <>
        Στις <strong>7 Νοεμβρίου 2011</strong>, η Sophie Matter ιδρύει τους
        <strong> Provence Randonneurs</strong> στο Carcès της Νότιας Γαλλίας —
        ένα νομικό και οργανωτικό «σπίτι» για να τρέχει τα δικά της extreme events.
        Το 2012 ξεκινά το <em>1000 du Sud</em>, ένα απίστευτα σκληρό 1000άρι στα
        βουνά της Νότιας Γαλλίας.
      </>
    ),
    link: { href: 'https://www.superrandonnees.org/welcome', label: 'superrandonnees.org' },
  },
  {
    year: '2021',
    title: 'Τα SR600 περνούν αποκλειστικά στους Provence Randonneurs',
    accent: 'bg-emerald-400',
    body: (
      <>
        Το ACP, πιεσμένο από τον γραφειοκρατικό όγκο της κλασικής σειράς BRM και
        του PBP, αποφασίζει να απεμπλακεί από τα SR600. Τον <strong>Δεκέμβριο
        του 2021</strong>, παραδίδει επίσημα στους Provence Randonneurs την
        αποκλειστική παγκόσμια διαχείριση, τον έλεγχο και την πιστοποίηση όλων
        των SR600. Από το <strong>2022</strong>, το ACP αποσύρεται πλήρως από
        αυτό το κομμάτι.
        <br /><br />
        Ένας μικρός σύλλογος μιας παθιασμένης Randonneuse εξελίσσεται σε
        παγκόσμιο θεσμό.
      </>
    ),
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RandonneuringPage() {
  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Back */}
        <Link href="/" className="text-white/30 hover:text-white text-sm transition-colors mb-8 inline-block">
          ← Αρχική
        </Link>

        {/* Hero */}
        <div className="mb-12">
          <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Οδηγός</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Ιστορία & Δομή του Randonneuring
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            Η ποδηλασία υπερ-αποστάσεων δεν είναι απλώς ένα άθλημα αντοχής — είναι μια ζωντανή
            παράδοση με περισσότερο από έναν αιώνα ιστορίας, γεμάτη ρήξεις, εμπορικές
            αντιπαραθέσεις και θεσμούς που διαμόρφωσαν αυτό που κάνουμε σήμερα.
          </p>
        </div>

        {/* ── 1. Τι είναι το Randonneuring ── */}
        <section className="mb-12">
          <SectionTitle>🚴 Τι είναι το Randonneuring;</SectionTitle>
          <Card>
            <p className="text-white/70 leading-relaxed mb-4">
              Οι όροι <strong className="text-white">Randonneuring</strong>,{' '}
              <strong className="text-white">Randonnée</strong> και{' '}
              <strong className="text-white">Randonneur</strong> προέρχονται από τη γαλλική
              γλώσσα και σημαίνουν «μεγάλη περιήγηση/πορεία». Στο ποδηλατικό πλαίσιο
              περιγράφουν την οδήγηση μεγάλων αποστάσεων σε καθεστώς{' '}
              <strong className="text-white">πλήρους αυτονομίας (unsupported)</strong>, με
              συγκεκριμένα χρονικά όρια, αλλά χωρίς ανταγωνιστικό χαρακτήρα — δεν υπάρχει
              κατάταξη ή νικητής.
            </p>
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 text-sm text-white/60">
              💡 <strong className="text-white/80">Νομική σημείωση:</strong> Ο όρος «Randonneuring»
              είναι κοινόχρηστη περιγραφική λέξη της γαλλικής γλώσσας — δεν αποτελεί εμπορικό
              σήμα κανενός συλλόγου.
            </div>
          </Card>
        </section>

        {/* ── 2. Χρονολόγιο ── */}
        <section className="mb-12">
          <SectionTitle>📅 Χρονολόγιο</SectionTitle>
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
          <SectionTitle>🗺️ Η Έννοια «Province» — Πώς επεκτάθηκε το άθλημα</SectionTitle>
          <Card>
            <p className="text-white/70 leading-relaxed mb-5">
              Στα γαλλικά, <em>province</em> σημαίνει οποιαδήποτε περιοχή εκτός της
              περιφέρειας του Παρισιού (Île-de-France). Το ACP διοργάνωνε αρχικά
              brevets αποκλειστικά γύρω από την πρωτεύουσα. Όταν το άθλημα εξαπλώθηκε,
              άρχισε να δίνει δικαίωμα σε τοπικούς συλλόγους της υπόλοιπης Γαλλίας
              — τα λεγόμενα <strong className="text-white">Brevets des Provinces</strong> —
              κρατώντας όμως κεντρικό έλεγχο και την τελική πιστοποίηση (homologation)
              από το Παρίσι.
            </p>

            <div className="border-l-2 border-cyan-500/40 pl-4 mb-5">
              <p className="text-white/60 text-sm leading-relaxed">
                Αυτό ακριβώς το μοντέλο «Παρίσι + επαρχία» εφαρμόστηκε αυτούσιο στη
                διεθνή επέκταση. Κάθε χώρα ορίστηκε ως ένα είδος «επαρχίας»: έχει
                έναν επίσημο{' '}
                <strong className="text-white">ACP Representative</strong> που συγκεντρώνει
                τα αποτελέσματα των τοπικών brevets και τα στέλνει στο Παρίσι για τον
                επίσημο αριθμό homologation.
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 text-sm text-white/60">
              Όταν ολοκληρώνεις ένα brevet 200 χλμ. στην Ελλάδα, η κάρτα σου ταξιδεύει
              (ψηφιακά) στο Παρίσι για επίσημη πιστοποίηση — συνεχίζοντας μια παράδοση
              που ξεκίνησε από τους ποδηλάτες της γαλλικής επαρχίας.
            </div>
          </Card>
        </section>

        {/* ── 4. Σημερινή ιεραρχία ── */}
        <section className="mb-12">
          <SectionTitle>🏛️ Ποιος Διαχειρίζεται Τι Σήμερα</SectionTitle>

          <div className="grid gap-4">

            {/* ACP */}
            <Card className="border-cyan-500/25">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🇫🇷</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold">Audax Club Parisien (ACP)</h3>
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30
                      px-2 py-0.5 rounded-full font-semibold">ιδρ. 1904</span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed mb-2">
                    Το «μητρικό» κλαμπ. Διαχειρίζεται την κλασική σειρά BRM
                    (200, 300, 400, 600, 1000 χλμ.) και το{' '}
                    <strong className="text-white">Paris-Brest-Paris</strong> — το
                    μεγαλύτερο ποδηλατικό event υπερ-αποστάσεων στον κόσμο.
                    Στυλ: <strong className="text-white">Allure Libre</strong>.
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
                      px-2 py-0.5 rounded-full font-semibold">ιδρ. 1922</span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed mb-2">
                    Διατηρεί αυτόνομα τη δική της σειρά brevets στη Γαλλία και την Ευρώπη,
                    αποκλειστικά υπό το ομαδικό <strong className="text-white">στυλ Audax</strong>{' '}
                    (σταθερά 18 χλμ./ώρα με αρχηγό δρόμου) — το πρωτότυπο format
                    που το ACP εγκατέλειψε το 1921.
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
                      px-2 py-0.5 rounded-full font-semibold">ιδρ. 1983</span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed mb-2">
                    Η παγκόσμια ομοσπονδία. Εποπτεύει τα{' '}
                    <strong className="text-white">Super Brevets</strong> — διοργανώσεις
                    1200 χλμ. και άνω εκτός PBP. Χαρακτηριστικά events:{' '}
                    <em>London–Edinburgh–London (LEL)</em>,{' '}
                    <em>Rocky Mountain 1200</em>.
                    Στυλ: <strong className="text-white">Allure Libre</strong>.
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
                      px-2 py-0.5 rounded-full font-semibold">ιδρ. 2011</span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed mb-2">
                    Ο σύλλογος της <strong className="text-white">Sophie Matter</strong> —
                    δημιουργού των SR600. Από το 2022 έχει την αποκλειστική παγκόσμια
                    διαχείριση των{' '}
                    <strong className="text-white">Super Randonnées (SR600)</strong>:{' '}
                    μόνιμες διαδρομές 600 χλμ. / 10.000+ μ. υψομετρικό, χωρίς
                    συγκεκριμένη ημερομηνία εκκίνησης.
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
                ιδρ. 1904 · Παρίσι, Γαλλία
              </text>

              {/* ── BRM ── */}
              <rect x="55" y="130" width="250" height="76" rx="12"
                fill="rgba(6,182,212,0.07)" stroke="rgba(6,182,212,0.3)" strokeWidth="1.5"/>
              <text x="180" y="162" textAnchor="middle" fill="white"
                fontSize="14" fontWeight="600" fontFamily="system-ui,sans-serif">
                BRM 200 – 1000 χλμ.
              </text>
              <text x="180" y="185" textAnchor="middle" fill="rgba(255,255,255,0.4)"
                fontSize="12" fontFamily="system-ui,sans-serif">
                Κλασική σειρά brevets
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
                Το κορυφαίο event παγκοσμίως
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
                LRM · ιδρ. 1983
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
                ιδρ. 2011 · Sophie Matter
              </text>

              {/* ── Super Brevets ── */}
              <rect x="30" y="366" width="300" height="76" rx="12"
                fill="rgba(168,85,247,0.06)" stroke="rgba(168,85,247,0.25)" strokeWidth="1.5"/>
              <text x="180" y="398" textAnchor="middle" fill="white"
                fontSize="14" fontWeight="500" fontFamily="system-ui,sans-serif">
                Super Brevets 1200+ χλμ.
              </text>
              <text x="180" y="421" textAnchor="middle" fill="rgba(255,255,255,0.38)"
                fontSize="12" fontFamily="system-ui,sans-serif">
                π.χ. London–Edinburgh–London
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
                600 χλμ. / 10.000+ μ. ↑
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
                ιδρ. 1922 · αυτόνομος · ομαδικό στυλ 18 χλμ./ώρα
              </text>

              {/* UAF "αυτόνομος" pill label */}
              <rect x="344" y="462" width="76" height="18" rx="9"
                fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
              <text x="382" y="475" textAnchor="middle" fill="rgba(255,255,255,0.45)"
                fontSize="10" fontFamily="system-ui,sans-serif">
                αυτόνομος
              </text>

            </svg>
          </div>
        </section>

        {/* ── 5. Πίνακας ── */}
        <section className="mb-12">
          <SectionTitle>📋 Συνοπτικός Πίνακας</SectionTitle>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-left text-white/50 font-semibold px-4 py-3 text-xs uppercase tracking-wider">Οργανισμός</th>
                  <th className="text-left text-white/50 font-semibold px-4 py-3 text-xs uppercase tracking-wider">Ίδρυση</th>
                  <th className="text-left text-white/50 font-semibold px-4 py-3 text-xs uppercase tracking-wider">Αρμοδιότητα σήμερα</th>
                  <th className="text-left text-white/50 font-semibold px-4 py-3 text-xs uppercase tracking-wider">Στυλ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  ['ACP', '1904', 'BRM (200-1000 χλμ.) + PBP', 'Allure Libre'],
                  ['UAF', '1922', 'Brevets Audax (Γαλλία/Ευρώπη)', 'Ομαδικό 18χλμ/ώρα'],
                  ['LRM', '1983', 'Super Brevets (1200+ χλμ.)', 'Allure Libre'],
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
                Πρακτικός Οδηγός
              </div>
              <div className="text-white font-bold text-lg leading-tight mb-1 group-hover:text-cyan-100 transition-colors">
                Από το Μηδέν στο Πρώτο σου 200άρι
              </div>
              <div className="text-white/40 text-sm">
                Ποδήλατο, εξοπλισμός, προπόνηση, διατροφή, στρατηγική & η ελληνική κοινότητα
              </div>
            </div>
            <div className="text-white/30 group-hover:text-cyan-400 text-xl transition-colors flex-shrink-0">
              →
            </div>
          </Link>
        </section>

        <UsefulButton page="history" />

        {/* Footer note */}
        <div className="text-white/20 text-xs text-center pb-2">
          Πηγές: ACP, LRM, Provence Randonneurs, Union des Audax Français
        </div>
        <PageViews page="history" />

      </div>
    </div>
  );
}
