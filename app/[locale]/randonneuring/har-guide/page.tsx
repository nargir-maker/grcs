import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import UsefulButton from '@/app/components/UsefulButton';
import PageViews from '@/app/components/PageViews';

export const metadata: Metadata = {
  title: 'Οδηγός H.A.R. Randonneuring — GRC',
  description: 'Ποιοι είναι η H.A.R., κανονισμός συμμετοχής, Super Randonneur, Super Randonnée, PostRide brevets και το H.A.R. Challenge.',
};

interface Topic {
  id: string;
  icon: string;
  color: string;
  title: string;
  shortDesc: string;
  content: string;
  url?: string;
}

const LADDER = [
  { icon: '🚴',  label: 'Πρώτο Brevet H.A.R.',      sublabel: 'Η αρχή',                                   color: '#FF7043' },
  { icon: '🏆',  label: 'H.A.R. Super Randonneur',   sublabel: '200+300+400+600 / έτος',                   color: '#FFC107' },
  { icon: '🏔️', label: 'Super Randonnée',            sublabel: '600χλμ+ · 10.000μ+ ανάβαση · αυτόνομα',    color: '#26A69A' },
  { icon: '🌟',  label: 'H.A.R. Challenge',          sublabel: 'Ετήσιος θεσμός — 3 κατηγορίες',            color: '#AB47BC' },
];

const TOPICS: Topic[] = [
  {
    id: 'who',
    icon: '🏛️',
    color: '#FF7043',
    title: 'Ποιοι Είμαστε',
    shortDesc: 'Ανεξάρτητος ελληνικός φορέας αυτόνομου randonneuring',
    content:
      'Η Hellenic Autonomous Randonneurs (H.A.R.) είναι μη κερδοσκοπικό σωματείο, ' +
      'επίσημα «Αυτόνομοι Ποδηλάτες Μεγάλων Αποστάσεων Ελλάδας». Απαρτίζεται από ' +
      'ενεργούς αναβάτες και διοργανωτές — παλιούς και νέους, άντρες και γυναίκες — ' +
      'λάτρεις του long-distance cycling, με στόχο να ξαναδώσουν στην ελληνική ' +
      'ποδηλατική κοινότητα «τη χαρά, το γέλιο, την ευτυχία του ταξιδιού και της ' +
      'συντροφικότητας, την αρμονία και την απόλαυση του αγνού randonneuring».\n\n' +
      'Σε αντίθεση με το ΛΕ.ΠΟ.Τ.Ε., που λειτουργεί υπό την ομπρέλα της γαλλικής ACP ' +
      '(Audax Club Parisien), η H.A.R. είναι ανεξάρτητος εθνικός φορέας: ακολουθεί ένα ' +
      '«υβριδικό μοντέλο», αντίστοιχο με Ιταλία και Γερμανία, πιστοποιώντας η ίδια τα ' +
      'αποτελέσματα των διοργανώσεών της και διατηρώντας πλήρη αυτονομία σε ' +
      'κανονισμούς, καινοτομίες και άμεση ανταπόκριση στην κοινότητα.\n\n' +
      'Διοικητικό Συμβούλιο: Πρόεδρος Έλενα Ζερβού (Αθήνα), Αντιπρόεδρος Στράτος ' +
      'Παΐσιος (Κατερίνη), Γραμματέας Βασίλης Οικονόμου (Ιωάννινα), Ταμίας Γιάννης ' +
      'Λιάτσος (Αγρίνιο), Μέλος Γιάννης Στεφανίδης (Κατερίνη).',
    url: 'https://www.hellenic-autonomous-randonneur.com/poioi-eimaste2/',
  },
  {
    id: 'rules',
    icon: '📋',
    color: '#42A5F5',
    title: 'Κανονισμός Συμμετοχής',
    shortDesc: 'Εγγραφή, υποχρεωτικός εξοπλισμός, έλεγχος διέλευσης & ομολογία',
    content:
      'Εγγραφή: απαιτείται εφάπαξ εγγραφή στο Μητρώο της H.A.R., ηλεκτρονική δήλωση ' +
      'συμμετοχής σε κάθε brevet ξεχωριστά και αποδοχή όρων ευθύνης. Ανήλικοι ' +
      'χρειάζονται γραπτή συναίνεση κηδεμόνα.\n\n' +
      'Υποχρεωτικός εξοπλισμός: κράνος πάντα, επαρκής φωτισμός εμπρός/πίσω για ' +
      'νυχτερινή διαδρομή, ανακλαστικό γιλέκο υψηλής ορατότητας, τήρηση του Κ.Ο.Κ. ' +
      'Συνιστάται εφεδρικός φωτισμός σε brevet 300χλμ+ ή με κακές καιρικές συνθήκες. ' +
      'Ποινή 2 ωρών για νυχτερινή διαδρομή χωρίς φώτα· αποκλεισμός αν κάποιος ' +
      'ξεκινήσει νυχτερινή εκκίνηση χωρίς τον απαιτούμενο εξοπλισμό.\n\n' +
      'Έλεγχος διέλευσης: κάρτα brevet με σφραγίδες στα σημεία ελέγχου· αν χαθεί, ' +
      'εναλλακτική επαλήθευση μέσω Strava ή φωτογραφιών, με την προϋπόθεση ότι ' +
      'πρόκειται για μία ενιαία καταγεγραμμένη δραστηριότητα.\n\n' +
      'Χρονικό όριο: ακολουθεί το διεθνές πρότυπο του randonneuring ανά απόσταση (η ' +
      'H.A.R. παραπέμπει σε εξωτερικό calculator για τον ακριβή υπολογισμό). Για ' +
      'διαδρομές με συνολική ανάβαση άνω των 4.000μ. εφαρμόζεται αναπροσαρμογή:\n' +
      'ΧΡΟΝΙΚΟ ΟΡΙΟ = (συνολικά πραγματικά χλμ. / ελάχιστη μέση ταχύτητα) + χρονική ' +
      'διεύρυνση.\n\n' +
      'Ομολογία: πρωτογενής έλεγχος από τον διοργανωτή στον τερματισμό, δευτερογενής ' +
      'έλεγχος από τον φορέα εντός μίας εβδομάδας μέσω φωτογραφιών/GPS, με έκδοση ' +
      'μοναδικού αριθμού ομολογίας. Η τήρηση διαδρομής και χρονικού ορίου θεωρούνται ' +
      'θεμελιώδεις κανόνες — τυχόν καταγγελίες για ατασθαλίες εξετάζονται κατά ' +
      'περίπτωση.',
    url: 'https://www.hellenic-autonomous-randonneur.com/kanonismos/',
  },
  {
    id: 'sr_year',
    icon: '🏆',
    color: '#FFC107',
    title: 'H.A.R. Super Randonneur (ετήσιο)',
    shortDesc: '200+300+400+600 χλμ πιστοποιημένα H.A.R., μέσα στο ίδιο έτος',
    content:
      'Όπως και στο ΛΕ.ΠΟ.Τ.Ε., η διάκριση Super Randonneur απονέμεται σε όποιον ' +
      'ολοκληρώσει, μέσα στο ίδιο ημερολογιακό έτος, και τα τέσσερα βασικά brevet — ' +
      '200, 300, 400 και 600 χλμ — με έγκυρη πιστοποίηση H.A.R. στο κάθε ένα.\n\n' +
      'Η εφαρμογή υπολογίζει αυτόματα το H.A.R. SR σου με βάση το ιστορικό διαδρομών ' +
      'σου (πεδίο H.A.R. σε κάθε brevet) και το εμφανίζει στο προφίλ σου.',
  },
  {
    id: 'super_randonnee',
    icon: '🏔️',
    color: '#26A69A',
    title: 'Super Randonnée',
    shortDesc: 'Μόνιμη διαδρομή 600χλμ+ με 10.000μ+ ανάβαση, εντελώς αυτόνομα',
    content:
      'Η Super Randonnée είναι μια permanent διαδρομή που εκτελείται με πρωτοβουλία ' +
      'του ίδιου του συμμετέχοντα — ο ίδιος επιλέγει ημερομηνία, ώρα εκκίνησης, ' +
      'στρατηγική υποστήριξης και διαμονή.\n\n' +
      'Απαιτεί τουλάχιστον 600 χλμ. (έως ~620 χλμ.) και τουλάχιστον 10.000 μ. συνολική ' +
      'ανάβαση, σε ορεινό συνήθως ανάγλυφο — σημαντικά πιο απαιτητική σωματικά και ' +
      'ψυχολογικά από ένα κλασικό brevet. Support vehicles απαγορεύονται πλήρως· ο ' +
      'αναβάτης είναι εντελώς αυτόνομος.\n\n' +
      'Υπάρχουν δύο κατηγορίες χρόνου: Tourist (ελάχιστος ρυθμός 75 χλμ./ημέρα) και ' +
      'Randonneur (όριο 60 ωρών). Ο συμμετέχων πρέπει να φωτογραφίζει το ποδήλατό του ' +
      'σε καθορισμένα σημεία ελέγχου (ή να παίρνει σφραγίδα από κατάστημα) και να ' +
      'καταγράφει τις ακριβείς ώρες στην προσωπική του κάρτα SR. Μετά την έγκριση, ο ' +
      'αναβάτης λαμβάνει αριθμό ομολογίας (homologation) και καταχωρείται στο ' +
      'superrandonnees.org — οι Super Randonnées δεν είναι αγωνιστικές εκδηλώσεις.',
    url: 'https://www.hellenic-autonomous-randonneur.com/super-randonnee/',
  },
  {
    id: 'postride',
    icon: '📮',
    color: '#7E57C2',
    title: 'PostRide Brevets (Άρθρο 9)',
    shortDesc: 'Ολοκλήρωσε ένα brevet μόνος/η σου, οποιαδήποτε μέρα μετά την επίσημη',
    content:
      'Ο Κανονισμός της H.A.R. προβλέπει ρητά (Άρθρο 9):\n' +
      '«κάθε ποδηλάτης θα μπορεί να συμμετάσχει στο brevet που επιθυμεί οποιαδήποτε ' +
      'ημέρα μετά την επίσημη ημέρα διοργάνωσής του και για όσες φορές επιθυμεί».\n\n' +
      'Η διαδρομή πρέπει να καταγράφεται ως μία ενιαία δραστηριότητα, με φωτογραφική ' +
      'τεκμηρίωση στα σημεία ελέγχου, ακριβώς όπως και σε επίσημη εκδήλωση.\n\n' +
      'Η εφαρμογή υποστηρίζει ήδη αυτή τη λειτουργία: από τη σελίδα ενός brevet ' +
      'μπορείς να ξεκινήσεις σε λειτουργία Post-ride (ή Pre-ride, πριν την επίσημη ' +
      'ημερομηνία) και, αν το brevet το επιτρέπει, με Ελεύθερη Εκκίνηση από όποιο ' +
      'σημείο της διαδρομής θέλεις — αρκεί να τερματίσεις εκεί που ξεκίνησες.\n\n' +
      'Σχετικό είναι και το Άρθρο 16.2 «Mini Brevets»: διαδρομές μεταξύ 80 και 120 ' +
      'χλμ., με τα ίδια πρότυπα ομολόγησης, που προσμετρούνται κανονικά στο ετήσιο ' +
      'Challenge.',
    url: 'https://www.hellenic-autonomous-randonneur.com/kanonismos/',
  },
  {
    id: 'challenge',
    icon: '🌟',
    color: '#AB47BC',
    title: 'H.A.R. Challenge',
    shortDesc: '3 κατηγορίες ετήσιας διάκρισης: χιλιόμετρα, ανάβαση, συμμετοχές',
    content:
      'Το Challenge είναι ο ετήσιος θεσμός βράβευσης της H.A.R., με τρεις κατηγορίες ' +
      'κατάταξης βάσει των brevet H.A.R. που ολοκληρώνει κανείς μέσα στο έτος:\n\n' +
      '🥇 Ο Χιλιομετροφάγος — τα περισσότερα συνολικά χιλιόμετρα σε brevet H.A.R.\n' +
      '⛰️ Ο Γητευτής των Βουνών — η μεγαλύτερη συνολική ανάβαση σε brevet H.A.R.\n' +
      '🧭 Ο Ταξιδευτής — οι περισσότερες συμμετοχές σε brevet H.A.R.\n\n' +
      'Ο πρώτος κάθε κατηγορίας, στην τελική κατάταξη στο τέλος του έτους, βραβεύεται ' +
      'από τον φορέα με ειδικό έπαθλο και δώρα.',
    url: 'https://www.hellenic-autonomous-randonneur.com/challenge-2026/',
  },
  {
    id: 'cop31',
    icon: '🌍',
    color: '#66BB6A',
    title: 'COP Bike Ride — Το Ελληνικό Σκέλος',
    shortDesc: 'Ετήσια παγκόσμια ποδηλατική σκυταλοδρομία· η H.A.R. φέρνει την Ελλάδα στον παγκόσμιο χάρτη',
    content:
      'Το «COP Bike Ride» είναι ένα διαρκές, επαναλαμβανόμενο κάθε χρόνο διεθνές ' +
      'εγχείρημα, με στόχο να προωθήσει προτάσεις για την καθημερινή ποδηλασία ως ' +
      'εργαλείο μείωσης των εκπομπών άνθρακα, ταξιδεύοντας προς τη Διάσκεψη του ΟΗΕ ' +
      'για την Κλιματική Αλλαγή (COP) κάθε έτος: πραγματοποιήθηκε ήδη στην COP29 ' +
      '(2024) και στην COP30 (2025, με αφετηρία το Belém της Βραζιλίας), και ' +
      'συνεχίζεται φέτος προς την COP31 στην Antalya της Τουρκίας (9–20 Νοεμβρίου ' +
      '2026).\n\n' +
      'Τον συντονισμό του ελληνικού σκέλους για το 2026 έχει αναλάβει η H.A.R. — ' +
      'φέρνοντας ουσιαστικά την Ελλάδα στον παγκόσμιο χάρτη αυτής της πρωτοβουλίας. ' +
      'Στόχος είναι η συμμετοχή να είναι υπόθεση όλης της ελληνικής ποδηλατικής ' +
      'κοινότητας — συλλόγων, ομάδων και ανεξάρτητων αναβατών, χωρίς να χρειάζεται ' +
      'κανείς να κάνει ολόκληρη τη διαδρομή.\n\n' +
      'Η ελληνική διαδρομή ξεκινά 30/9 από την Αθήνα και φτάνει 7/10 στο Pınarhisar ' +
      'της Τουρκίας:\n' +
      '30/9 Αθήνα → Αταλάντη · 1/10 Αταλάντη → Καρδίτσα · 2/10 Καρδίτσα → Κατερίνη · ' +
      '3/10 Κατερίνη → Θεσσαλονίκη · 4/10 Θεσσαλονίκη → Σέρρες · 5/10 Σέρρες → ' +
      'Κομοτηνή · 6/10 Κομοτηνή → Ορεστιάδα · 7/10 Ορεστιάδα → Pınarhisar.',
    url: 'https://copbikeride.org/',
  },
];

export default function HarGuidePage() {
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
          <Link href="/" className="hover:text-white transition-colors">Αρχική</Link>
          <span>/</span>
          <Link href="/randonneuring" className="hover:text-white transition-colors">Randonneuring</Link>
          <span>/</span>
          <span className="text-white/60">Οδηγός H.A.R.</span>
        </div>

        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="text-5xl mb-4">🚴</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
            Οδηγός H.A.R. Randonneuring
          </h1>
          <p className="text-white/40 text-sm">Autonomous Randonneuring — ο ελληνικός δρόμος</p>
        </div>

        {/* Progression Ladder */}
        <section className="mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-base text-center mb-6">🏅 Η Πορεία στο H.A.R.</h2>
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
                    Επίσημη πηγή ↗
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
            ← Πρακτικός Οδηγός
          </Link>
        </div>

        <UsefulButton page="har-guide" />
        <PageViews page="har-guide" />

      </div>
    </div>
  );
}
