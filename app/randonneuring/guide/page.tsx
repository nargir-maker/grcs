// app/randonneuring/guide/page.tsx
// Practical beginner's guide to randonneuring — from zero to first 200 km brevet

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Οδηγός Αρχαρίου Randonneur — GRC',
  description: 'Πλήρης, πρακτικός οδηγός για το randonneuring: ποδήλατο, εξοπλισμός, προπόνηση, διατροφή, στρατηγική και η ελληνική κοινότητα. Από το μηδέν στο πρώτο σου 200άρι.',
};

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

// ── Distance table data ───────────────────────────────────────────────────────

const DISTANCES = [
  {
    dist:   '200 χλμ',
    limit:  '13,5 ώρες',
    prep:   '2–3 μήνες (από το μηδέν)',
    change: 'Διαχείριση σταθερού ρυθμού και συνεχούς τροφοδοσίας.',
    accent: 'border-cyan-500/40 bg-cyan-500/5',
    badge:  'text-cyan-300 bg-cyan-500/15 border-cyan-400/30',
  },
  {
    dist:   '300 χλμ',
    limit:  '20 ώρες',
    prep:   '+1–2 μήνες μετά το 200',
    change: 'Πρώτη επαφή με την οδήγηση στο σκοτάδι.',
    accent: 'border-white/10 bg-white/3',
    badge:  'text-white/60 bg-white/8 border-white/15',
  },
  {
    dist:   '400 χλμ',
    limit:  '27 ώρες',
    prep:   '+2 μήνες μετά το 300',
    change: 'Έντονη νυχτερινή οδήγηση. Διαχείριση υπνηλίας.',
    accent: 'border-white/10 bg-white/3',
    badge:  'text-white/60 bg-white/8 border-white/15',
  },
  {
    dist:   '600 χλμ',
    limit:  '40 ώρες',
    prep:   '+2–3 μήνες (ίδια σεζόν)',
    change: 'Στρατηγική ύπνου. Power-nap 2–4 ωρών.',
    accent: 'border-purple-500/30 bg-purple-500/5',
    badge:  'text-purple-300 bg-purple-500/15 border-purple-400/30',
  },
  {
    dist:   '1000 χλμ',
    limit:  '75 ώρες',
    prep:   '1–2 χρόνια συστηματικής τριβής',
    change: 'Πλήρης αυτονομία, logistics, πολυήμερη κόπωση.',
    accent: 'border-amber-500/30 bg-amber-500/5',
    badge:  'text-amber-300 bg-amber-500/15 border-amber-400/30',
  },
];

// ── Greek clubs ───────────────────────────────────────────────────────────────

const CLUBS = [
  {
    name:    'ΛΕ.Π.Ο.Τ.Ε. / Audax Randonneurs Grece',
    site:    'brevets.gr',
    href:    'https://www.brevets.gr',
    accent:  'border-cyan-500/40',
    dot:     'bg-cyan-500',
    body:    'Ο επίσημος εθνικός φορέας διαχείρισης των brevets στη χώρα μας. Συντονίζει το κεντρικό ετήσιο ημερολόγιο για όλους τους διοργανωτές. Διοργανώνει εμβληματικά brevets και το κορυφαίο Giro Central Greece (1.400 χλμ).',
  },
  {
    name:    'Hellenic Autonomous Randonneur (H.A.R.)',
    site:    'hellenic-autonomous-randonneur.com',
    href:    'https://www.hellenic-autonomous-randonneur.com',
    accent:  'border-white/10',
    dot:     'bg-white/40',
    body:    'Νέα δυναμική, πανελλαδική κοινότητα διοργανωτών και ποδηλατών μεγάλων αποστάσεων. Εστιάζει στην αυθεντική κουλτούρα της αυτονομίας, της εξερεύνησης νέων διαδρομών και της αγάπης για το ταξίδι.',
  },
  {
    name:    'Ble Cycling Club',
    site:    'blecyclingclub.gr',
    href:    'https://www.blecyclingclub.gr',
    accent:  'border-blue-500/40',
    dot:     'bg-blue-400',
    body:    'Με έδρα την Αθήνα (ίδρυση 2012), μία από τις πιο ενεργές παρέες του χώρου. Εισήγαγαν τον θεσμό των Permanents (μόνιμες διαδρομές που τρέχεις οποιαδήποτε μέρα) και διοργανώνουν δημοφιλή brevets στην Αττική.',
  },
  {
    name:    'Π.Ε.Π.Α.',
    site:    'pepa.gr',
    href:    'https://www.pepa.gr',
    accent:  'border-white/10',
    dot:     'bg-white/40',
    body:    'Ποδηλατική Ένωση Παλαιμάχων Αθλητών. Διοργανώνει μερικά από τα πιο μαζικά, κλασικά και άρτια οργανωμένα brevets (κυρίως στην Αττική και την Πελοπόννησο), αποτελώντας ιδανική πύλη εισόδου για πολλούς νέους αναβάτες.',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/30 mb-8">
          <Link href="/" className="hover:text-white transition-colors">Αρχική</Link>
          <span>/</span>
          <Link href="/randonneuring" className="hover:text-white transition-colors">Randonneuring</Link>
          <span>/</span>
          <span className="text-white/60">Οδηγός</span>
        </div>

        {/* Hero */}
        <div className="mb-12">
          <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Πρακτικός Οδηγός</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
            Από το Μηδέν<br/>στο Πρώτο σου 200άρι
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            Το να περάσεις στον κόσμο των brevets είναι ένα υπέροχο ταξίδι.
            Randonneuring δεν σημαίνει αγώνας ταχύτητας· σημαίνει αντοχή, αυτονομία,
            σωστή διαχείριση ενέργειας και ψυχική δύναμη.
          </p>
        </div>

        {/* ── 1. Ποδήλατο ── */}
        <section className="mb-12">
          <SectionTitle emoji="🚲">Ο Τύπος του Ποδηλάτου</SectionTitle>
          <Card>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              Στα brevets θα περάσεις από 8 έως και πάνω από 40 ώρες συνεχόμενα πάνω
              στη σέλα. Δεν χρειάζεσαι ένα πανάκριβο carbon· χρειάζεσαι κάτι{' '}
              <strong className="text-white">άνετο και αξιόπιστο</strong>. Εδώ ισχύει
              ένας κανόνας: <strong className="text-white">Άνεση = Απόδοση</strong>.
            </p>

            <BulletList items={[
              {
                label: 'Endurance Road Bike / Gravel / Touring:',
                body: 'Ιδανικές κατηγορίες. Έχουν πιο «όρθια» γεωμετρία που ξεκουράζει τη μέση, τον αυχένα και τους ώμους, και δέχονται φαρδύτερα ελαστικά.',
              },
              {
                label: 'Ελαστικά 28–32mm:',
                body: 'Επιτρέπουν χαμηλότερες πιέσεις, απορροφούν κραδασμούς και μειώνουν δραματικά την κόπωση του σώματος χωρίς αισθητή απώλεια ταχύτητας.',
              },
              {
                label: 'Compact group + μεγάλη κασέτα:',
                body: 'π.χ. 50-34 μπροστά με 11-32 ή 11-34 πίσω. Θα σου σώσουν τα πόδια στις μεγάλες ανηφόρες όταν η κόπωση έχει συσσωρευτεί.',
              },
            ]} />

            <SubTitle>Bike Fit: το πιο κρίσιμο βήμα</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Ένα σωστό ποδήλατο με λάθος ρύθμιση είναι χειρότερο από ένα μέτριο ποδήλατο
              σωστά ρυθμισμένο. Αυτό το μαθαίνεις συνήθως μετά από κάποια χιλιόμετρα, πχ
              στα 120, με πόνο που δεν υπήρχε εκεί στα 40.
            </p>
            <BulletList items={[
              {
                label: 'Σέλα πολύ χαμηλά:',
                body: 'Βάζει πίεση στα γόνατα (μπροστινή επιφάνεια, επιγονατίδα). Επίσης προκαλεί «κουνιστή» οδήγηση που σπαταλάει ενέργεια.',
              },
              {
                label: 'Σέλα πολύ ψηλά:',
                body: 'Πόνος στο ισχίο ή πίσω μεριά του γονάτου. Σε μεγάλες αποστάσεις μπορεί να οδηγήσει σε τενοντίτιδα.',
              },
              {
                label: 'Τιμόνι πολύ χαμηλά / πολύ μακριά:',
                body: 'Ο λαιμός και οι ώμοι φορτώνονται. Στις 5–6 ώρες οδήγησης μετατρέπεται σε έντονο πόνο στον αυχένα.',
              },
              {
                label: 'Λάθος θέση ποδιών στο πεντάλ (cleat position):',
                body: 'Πόνος γονάτου λόγω επιβάρυνσης της λαγονοκνημιαίας ταινίας. Μη αναστρέψιμος χωρίς ρύθμιση του cleat ή/και πρόσθετους πάτους.',
              },
            ]} />
            <Tip>
              <strong className="text-white/90">Ζήτα bike fit από εξειδικευμένο κατάστημα.</strong>{' '}
              Κοστίζει από 50–100€ και είναι η καλύτερη επένδυση που μπορείς να κάνεις —
              πολύ πριν αγοράσεις ακριβά παπούτσια ή σέλα. Αν ψάχνεις να αγοράσεις
              ποδήλατο, μην αγοράσεις τυχαία χωρίς να το δοκιμάσεις. Ένα λάθος μέγεθος
              πλαισίου και γεωμετρίας θα σε αναγκάσει σε αγορά άλλου ποδηλάτου αργότερα.
            </Tip>
          </Card>
        </section>

        {/* ── 2. Εξοπλισμός ── */}
        <section className="mb-12">
          <SectionTitle emoji="🎒">Εξοπλισμός & Ρουχισμός</SectionTitle>
          <Card>
            <p className="text-white/60 text-sm leading-relaxed mb-5">
              Η βασική αρχή: <strong className="text-white">πλήρης αυτάρκεια</strong>.
              Πρέπει να είσαι προετοιμασμένος για κάθε αλλαγή καιρού ή τεχνικό πρόβλημα
              χωρίς εξωτερική βοήθεια.
            </p>

            <SubTitle>Ρουχισμός — το κλειδί για την άνεση</SubTitle>
            <BulletList items={[
              {
                label: 'Κολάν με Chamois (Bib Shorts):',
                body: 'Το πιο κρίσιμο κομμάτι εξοπλισμού. Επένδυσε στο καλύτερο που αντέχει η τσέπη σου.',
              },
              {
                label: 'Κρέμα Chamois:',
                body: 'Απαραίτητη για την πρόληψη τριβών και συγκάσεων μετά από ώρες στη σέλα. Εφαρμόζεται πριν φορέσεις το κολάν.',
              },
              {
                label: 'Layering (Στρώματα ρούχων):',
                body: 'Σε μια μέρα μπορεί να ξεκινήσεις με ψύχρα και να καταλήξεις σε βροχή. Αποσπώμενα μανίκια, μπατζάκια και ένα συμπιεζόμενο αδιάβροχο jacket είναι απαραίτητα.',
              },
            ]} />

            <SubTitle>Ασφάλεια & Αυτονομία — υποχρεωτικά από κανονισμούς</SubTitle>
            <BulletList items={[
              {
                label: 'Φώτα:',
                body: 'Ένα πολύ δυνατό εμπρός φως (με μεγάλη αυτονομία ή δυνατότητα φόρτισης από powerbank) και τουλάχιστον δύο πίσω κόκκινα (ένα σταθερό, ένα αναβοσβήνει).',
              },
              {
                label: 'Ανακλαστικό γιλέκο:',
                body: 'Υποχρεωτικό για τις νυχτερινές ώρες ή συνθήκες χαμηλής ορατότητας.',
              },
              {
                label: 'Κιτ επισκευής:',
                body: '2–3 σαμπρέλες, λεβιέδες, τρόμπα, patches, πολυεργαλείο. Πρέπει να αλλάζεις σαμπρέλα γρήγορα, και στο σκοτάδι αν χρειαστεί.',
              },
            ]} />

            <SubTitle>Τσάντες — όλο το βάρος στο ποδήλατο</SubTitle>
            <BulletList items={[
              {
                label: 'Top tube bag:',
                body: 'Για άμεση πρόσβαση εν κινήσει: τροφή, κινητό, powerbank.',
              },
              {
                label: 'Saddle bag (3–9 λίτρα):',
                body: 'Για τα ρούχα που αφαιρείς, το κιτ επισκευής και τα επιπλέον εφόδια. Ξέχνα τα σακίδια πλάτης — προκαλούν εφίδρωση και πόνο στους ώμους.',
              },
            ]} />
          </Card>
        </section>

        {/* ── 3. Πώς να Ξεκινήσεις ── */}
        <section className="mb-12">
          <SectionTitle emoji="🛣️">Πώς να Ξεκινήσεις</SectionTitle>
          <Card>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              Το randonneuring δεν απαιτεί «ταλέντο». Απαιτεί{' '}
              <strong className="text-white">αντοχή, διαχείριση ενέργειας και οργάνωση</strong>{' '}
              — τρία πράγματα που χτίζονται σταδιακά με χιλιόμετρα.
            </p>

            <SubTitle>Τι θέλει αυτό το είδος ποδηλασίας;</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              Δεν είναι τα πόδια μόνο. Είναι πνεύμονες (αερόβια ικανότητα), διαχείριση
              ρυθμού (να μην καείς νωρίς), σωστή ενυδάτωση και τροφοδοσία, οργάνωση
              στάσεων και ψυχολογική αντοχή όταν η κούραση έχει συσσωρευτεί. Ο πιο
              γρήγορος δεν κερδίζει — κερδίζει αυτός που τελειώνει.
            </p>

            <SubTitle>Από πού ξεκινάς;</SubTitle>
            <BulletList items={[
              {
                label: '20–30 χλμ:',
                body: 'Πρώτες βόλτες — συνηθίζεις τη σέλα, τον εξοπλισμό, τον ρυθμό αναπνοής.',
              },
              {
                label: '50 χλμ:',
                body: 'Αρχίζεις να καταλαβαίνεις τη διαχείριση ενέργειας και ενυδάτωσης.',
              },
              {
                label: '80–100 χλμ:',
                body: 'Το πρώτο μεγάλο ψυχολογικό εμπόδιο. Αν το βγάλεις άνετα, είσαι στο σωστό δρόμο.',
              },
              {
                label: '130–140 χλμ:',
                body: 'Η «πρόβα τζενεράλε» για το πρώτο 200άρι. Αν το βγάλεις με καλή αίσθηση, είσαι έτοιμος.',
              },
            ]} />

            <SubTitle>Χρειάζεσαι προπονητή;</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed">
              Για το πρώτο 200άρι, όχι. Η βάση είναι απλή: συνέπεια στις εβδομαδιαίες
              βόλτες και ένα μεγάλο ride το Σαββατοκύριακο που αυξάνεις σταδιακά. Ένας
              προπονητής βοηθάει αν θέλεις να βελτιστοποιήσεις, αλλά δεν είναι
              προαπαιτούμενο.
            </p>
          </Card>
        </section>

        {/* ── 4. Χρονοδιάγραμμα Αποστάσεων ── */}
        <section className="mb-12">
          <SectionTitle emoji="📈">Χρονοδιάγραμμα Αποστάσεων</SectionTitle>
          <p className="text-white/50 text-sm mb-5 leading-relaxed">
            Το χτίσιμο ενός randonneur γίνεται σταδιακά, βήμα–βήμα. Ένας υγιής αρχάριος
            που μπορεί ήδη να βγάλει 40–50 χλμ χωρίς πρόβλημα, μπορεί να ανέβει επίπεδο
            ακολουθώντας αυτό το χρονοδιάγραμμα.
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
                    Όριο: <span className="text-white/70 font-medium">{d.limit}</span>
                  </span>
                  <span className="text-white/40 text-xs mt-1">
                    Προετοιμασία: <span className="text-white/70 font-medium">{d.prep}</span>
                  </span>
                </div>
                <p className="text-white/55 text-sm leading-relaxed">{d.change}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Προπόνηση ── */}
        <section className="mb-12">
          <SectionTitle emoji="💪">Προπόνηση & Υψομετρικά</SectionTitle>
          <Card>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              Δεν χρειάζεσαι να κάνεις 200 χλμ στην προπόνηση για να βγάλεις το 200άρι.
              Η προπόνηση βασίζεται στη <strong className="text-white">συνέπεια</strong>{' '}
              και στη δημιουργία <strong className="text-white">αερόβιας βάσης (Zone 2)</strong>.
            </p>

            <SubTitle>Πλάνο για το πρώτο 200άρι (8–12 εβδομάδες)</SubTitle>
            <BulletList items={[
              {
                label: 'Μέσα στην εβδομάδα:',
                body: '1–2 σύντομες, σταθερές προπονήσεις (1,5–2 ώρες) σε ρυθμό που μπορείς να συζητάς άνετα χωρίς να λαχανιάζεις.',
              },
              {
                label: 'Σαββατοκύριακο (The Long Ride):',
                body: 'Το μεγάλο σου ride. Αύξηση ~10% κάθε εβδομάδα. Μόλις βγάλεις ένα ride 130–140 χλμ με ανάλογα υψομετρικά, είσαι έτοιμος.',
              },
            ]} />

            <SubTitle>Τα υψομετρικά που πρέπει να προσέξεις</SubTitle>
            <p className="text-white/60 text-sm leading-relaxed mb-3">
              Στην Ελλάδα οι διαδρομές σπάνια είναι επίπεδες. Ως γενικός κανόνας:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Φιλική', value: '< 1.000 μ./100 χλμ', color: 'text-green-300' },
                { label: 'Απαιτητική', value: '1.000–1.500 μ./100 χλμ', color: 'text-amber-300' },
              ].map((r) => (
                <div key={r.label}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm">
                  <div className="text-white/40 text-xs mb-1">{r.label}</div>
                  <div className={`font-semibold ${r.color}`}>{r.value}</div>
                </div>
              ))}
            </div>
            <Tip>
              Μην κοιτάς μόνο τα συνολικά υψομετρικά — κοίτα και τη{' '}
              <strong className="text-white/90">μέγιστη κλίση</strong> των ανηφορών.
              Προπονήσου σε παρατεταμένες ανηφόρες 6–8% για να μάθεις να κρατάς
              σταθερούς τους παλμούς χωρίς να αδειάζεις.
            </Tip>

            <SubTitle>Η τελευταία εβδομάδα — Tapering</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Η εβδομάδα πριν το brevet δεν είναι εβδομάδα προπόνησης — είναι εβδομάδα
              ξεκούρασης. Το λεγόμενο <strong className="text-white">tapering</strong>:
              μειώνεις δραστικά τα χιλιόμετρα για να φτάσεις φρέσκος στην εκκίνηση.
            </p>
            <BulletList items={[
              {
                label: 'Τελευταίες 5–7 μέρες:',
                body: 'Μέγιστο 30–40 χλμ εύκολης βόλτας, χωρίς ανηφόρες και χωρίς ένταση.',
              },
              {
                label: 'Τελευταία μέρα:',
                body: 'Ιδανικά ξεκούραση ή 15–20 λεπτά χαλαρό spinning για να ξεσκουριάσουν τα πόδια.',
              },
              {
                label: 'Μην παρασυρθείς:',
                body: 'Το άγχος οδηγεί πολλούς να «βάλουν ακόμα ένα μεγάλο ride» την τελευταία εβδομάδα — αυτό κάνει περισσότερη ζημιά από καλό.',
              },
            ]} />
          </Card>
        </section>

        {/* ── 5. Διατροφή ── */}
        <section className="mb-12">
          <SectionTitle emoji="🍌">Διατροφή & Ενυδάτωση</SectionTitle>
          <Card>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              Αν νιώσεις πείνα ή δίψα, η απόδοσή σου έχει ήδη πέσει και είναι πολύ
              δύσκολο να επανέλθεις — το λεγόμενο{' '}
              <strong className="text-white">bonking</strong>. Η τροφοδοσία ξεκινάει
              από το πρώτο λεπτό.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mb-5">
              {[
                {
                  icon: '🍞',
                  label: 'Υδατάνθρακες',
                  value: '60–90 γρ./ώρα',
                  note: 'Μπανάνες, μπάρες, τζελ, παστέλια, αποξηραμένα φρούτα',
                },
                {
                  icon: '💧',
                  label: 'Νερό',
                  value: '500–750 ml/ώρα',
                  note: 'Ένα παγούρι νερό, ένα με ηλεκτρολύτες. Μικρές γουλιές κάθε 15–20 λεπτά',
                },
                {
                  icon: '🥪',
                  label: 'Πραγματικό φαγητό',
                  value: 'Στα controls',
                  note: 'Μετά από 4–5 ώρες το στομάχι θέλει αλμυρό. Τοστ, πατάτα, μακαρονάδα',
                },
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
          <SectionTitle emoji="🧠">Στρατηγική για το Πρώτο σου 200άρι</SectionTitle>
          <Card>
            <p className="text-white/60 text-sm leading-relaxed mb-5">
              Το χρονικό όριο είναι <strong className="text-white">13,5 ώρες</strong>{' '}
              (μαζί με τις στάσεις). Μια μέση ταχύτητα κίνησης 20–22 χλμ/ώρα σου αφήνει
              υπεραρκετό χρόνο.
            </p>

            <div className="space-y-4">
              {[
                {
                  n: '01',
                  title: 'Μην παρασυρθείς στην εκκίνηση',
                  body: 'Είναι το πιο συχνό λάθος. Θα δεις γκρουπ να φεύγουν με 35+ χλμ/ώρα. Άφησέ τους. Βρες τον δικό σου ρυθμό — εκεί που μπορείς να μιλάς χωρίς να λαχανιάζεις.',
                },
                {
                  n: '02',
                  title: 'Διαχείριση Control Points',
                  body: 'Ο χρόνος χάνεται στις στάσεις, όχι στον δρόμο. Μια στάση 5 λεπτών για σφραγίδα και νερό είναι οκ. Μια στάση 45 λεπτών για καφέ θα σε «κρυώσει» και θα φάει το πλεονέκτημά σου.',
                },
                {
                  n: '03',
                  title: 'Σπάσε τη διαδρομή σε κομμάτια',
                  body: 'Μην σκέφτεσαι «έχω ακόμα 150 χλμ». Σκέψου «έχω 30 χλμ μέχρι το επόμενο control, εκεί θα φάω μια μπανάνα». Η ψυχολογία είναι το μισό βάρος.',
                },
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
          <SectionTitle emoji="🗂️">Πώς Λειτουργεί ένα Brevet</SectionTitle>
          <Card>
            <SubTitle>Η Brevet Card</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              Στην εκκίνηση παραλαμβάνεις μια κάρτα — τη <strong className="text-white">Brevet Card</strong>.
              Είναι το επίσημο αποδεικτικό της συμμετοχής σου. Σε κάθε σημείο ελέγχου (control)
              σφραγίζεται από κατάστημα ή καφετέρια της διαδρομής ή από εθελοντή της διοργάνωσης.
              Στο τέλος, ο διοργανωτής επαληθεύει την κάρτα και καταχωρεί το αποτέλεσμα.
            </p>

            <SubTitle>Photo Controls</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              Μερικά σημεία ελέγχου δεν έχουν σφραγίδα — αντ' αυτού τραβάς μια φωτογραφία σε
              συγκεκριμένο σημείο (π.χ. πινακίδα, γέφυρα, εκκλησία) ως απόδειξη ότι πέρασες
              από εκεί. Η ώρα της φωτογραφίας στο κινητό επαληθεύει ότι ήσουν εντός χρονικού ορίου.
            </p>

            <SubTitle>Αν βγεις εκτός χρόνου</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              Οι νέοι κανόνες της ACP επιτρέπουν να περάσεις ένα control και μετά την ώρα
              κλεισίματός του, τραβώντας απλώς μια φωτογραφία ως απόδειξη. Αν όμως τερματίσεις
              εκτός του συνολικού χρονικού ορίου, το brevet δεν καταχωρείται επίσημα. Μπορείς
              να συνεχίσεις για προσωπική ικανοποίηση.
            </p>

            <SubTitle>Αν ξεμείνεις στη μέση</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed">
              Το randonneuring βασίζεται στην αυτονομία — δεν υπάρχει επίσημη υποστήριξη
              που να σε «μαζέψει» αν κολλήσεις. Σε σπάνιες περιπτώσεις μπορεί να υπάρχει
              όχημα της διοργάνωσης, αλλά δεν είναι κάτι που μπορείς να υπολογίζεις.
              Πάντα να έχεις <strong className="text-white">πλάνο Β</strong>: είτε
              επικοινωνείς με κάποιον που μπορεί να έρθει να σε παραλάβει, είτε βρίσκεις
              ΚΤΕΛ ή άλλη μεταφορά από το σημείο που βρίσκεσαι.
            </p>
          </Card>
        </section>

        {/* ── 8. Εγγραφή & Κόστη ── */}
        <section className="mb-12">
          <SectionTitle emoji="📋">Εγγραφή & Κόστη</SectionTitle>
          <Card>
            <SubTitle>Πρέπει να γραφτείς σε σύλλογο;</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Για να συμμετέχεις σε επίσημο brevet και να αναγνωριστεί το αποτέλεσμά σου
              είτε διεθνώς είτε σε εθνικό επίπεδο, χρειάζεσαι{' '}
              <strong className="text-white">αριθμό μητρώου</strong> από έναν από τους δύο
              επίσημους φορείς στην Ελλάδα:
            </p>
            <BulletList items={[
              {
                label: 'ΛΕ.Π.Ο.Τ.Ε.:',
                body: <a href="https://brevets.gr/brevets/%CE%B8%CE%AD%CE%BB%CE%B5%CF%84%CE%B5-%CE%BD%CE%B1-%CF%80%CE%AC%CF%81%CE%B5%CF%84%CE%B5-%CE%BC%CE%AD%CF%81%CE%BF%CF%82-%CF%83%E2%80%99-%CE%AD%CE%BD%CE%B1-brevet.html" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors">Οδηγίες εγγραφής στο brevets.gr ↗</a>,
              },
              {
                label: 'H.A.R.:',
                body: <a href="https://www.hellenic-autonomous-randonneur.com/eggrafes-podilaton-mitroo/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 transition-colors">Εγγραφή αναβατών στο hellenic-autonomous-randonneur.com ↗</a>,
              },
            ]} />
            <p className="text-white/55 text-sm leading-relaxed mt-4">
              Μερικά clubs (π.χ. Ble Cycling Club) τηρούν επίσης δικό τους μητρώο μελών
              για τις δικές τους διοργανώσεις (π.χ. permanents) ή τις προπονήσεις τους.
            </p>

            <SubTitle>Κόστη</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed">
              Δεν υπάρχει σταθερή τιμή. Το κόστος συμμετοχής σε brevet ποικίλει ανάλογα
              με την απόσταση και τον διοργανωτή.
            </p>

            <SubTitle>Ασφάλιση</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed">
              Για brevets της ΛΕ.Π.Ο.Τ.Ε. η ασφάλιση είναι{' '}
              <strong className="text-white">υποχρεωτική</strong> — χωρίς αυτή δεν μπορείς
              να συμμετέχεις. Για brevets της H.A.R. δεν είναι απαραίτητη.
            </p>

            <SubTitle>Μεταφορά στην εκκίνηση</SubTitle>
            <p className="text-white/70 text-sm leading-relaxed">
              Η μεταφορά είναι αποκλειστικά δική σου ευθύνη — δεν προσφέρεται από τη
              διοργάνωση.
            </p>
          </Card>
        </section>

        {/* ── 9. Κοινότητα στην Ελλάδα ── */}
        <section className="mb-12">
          <SectionTitle emoji="🇬🇷">Η Κοινότητα στην Ελλάδα</SectionTitle>
          <p className="text-white/50 text-sm mb-5 leading-relaxed">
            Το randonneuring στην Ελλάδα είναι εξαιρετικά αναπτυγμένο.
            Όλες οι επίσημες εκδηλώσεις πιστοποιούνται διεθνώς από την{' '}
            <strong className="text-white">Audax Club Parisien</strong>.
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
              Περιφερειακοί Σύλλογοι
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              Εξαιρετικές τοπικές ομάδες διοργανώνουν brevets σε όλη την επικράτεια
              — Greek Randonneurs, Ποδηλάτες Χίου, Γ.Σ. Λευκάδας, Φιλαθλητικός
              Όμιλος Πύργου, Π.Ο. Καρδίτσας κ.ά. — αναδεικνύοντας τη γεωμορφία
              και την ομορφιά της κάθε περιοχής.
            </p>
          </div>

          <Tip>
            <strong className="text-white/90">Πώς να κάνεις την πρώτη επαφή:</strong>{' '}
            Ακολούθησε τις ομάδες στα Social Media — εκεί ανακοινώνονται ανοιχτές
            βόλτες και αναγνωριστικά free rides. Μη διστάσεις να πεις «Είμαι
            αρχάριος, θέλω να δοκιμάσω» — πάντα θα βρεθεί παρέα έμπειρων
            randonneurs να σε βάλει στο γκρουπ της.
          </Tip>

          <div className="mt-5 bg-white/3 border border-white/8 rounded-2xl p-5">
            <div className="text-white font-semibold text-sm mb-3">
              Οργανωμένες βόλτες & στέκια
            </div>
            <ul className="space-y-3">
              {[
                {
                  label: 'Οι Άγιοι',
                  note: 'κάθε Δευτέρα',
                  href: 'https://www.facebook.com/groups/484265904937327',
                },
                {
                  label: 'Ble Cycling Club',
                  note: 'τακτικές ομαδικές βόλτες',
                  href: 'https://blecyclingclub.gr/workouts/team-meetings/',
                },
                {
                  label: 'Ποδηλάτες της Πλατείας',
                  note: 'κάθε Πέμπτη',
                  href: 'https://www.facebook.com/profile.php?id=61574825438429',
                },
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
          <SectionTitle emoji="✅">Checklist Πριν την Εκκίνηση</SectionTitle>
          <Card>
            <ul className="space-y-3">
              {[
                'Έλεγχος ποδηλάτου: σωστή πίεση ελαστικών, καθαρή & λαδωμένη αλυσίδα, φρένα σε άριστη κατάσταση.',
                'Φόρτιση όλων των συσκευών: GPS / κινητό / εμπρός & πίσω φώτα / powerbank.',
                'Πέρασμα της διαδρομής (GPX αρχείο) στο ποδηλατικό computer ή στο κινητό.',
                'Chamois cream εφαρμοσμένη πριν φορέσεις το κολάν.',
                'Κάρτα Brevet (Brevet Card) σε αδιάβροχο σακουλάκι ziploc.',
                'Επιπλέον τρόφιμα στην τσέπη για την πρώτη ώρα (μπάρα, μπανάνα, τζελ).',
                'Ανακλαστικό γιλέκο εύκολα προσβάσιμο — όχι στον πάτο της τσάντας.',
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
            Καλό ξεκίνημα στο νέο σου ταξίδι!
          </h3>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
            Η αίσθηση όταν θα τερματίσεις το πρώτο σου 200άρι και θα πάρεις
            τη σφραγίδα δεν περιγράφεται με λόγια.
          </p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Link href="/brevets"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold
                text-sm px-5 py-2.5 rounded-full transition-colors">
              Δες τα επερχόμενα Brevets
            </Link>
            <Link href="/randonneuring"
              className="text-white/40 hover:text-white text-sm transition-colors">
              ← Ιστορία & Δομή
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
