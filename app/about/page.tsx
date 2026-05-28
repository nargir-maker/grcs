import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Σχετικά — GRC Platform',
  description: 'Η ιστορία πίσω από την πλατφόρμα της Ελληνικής κοινότητας Randonneuring.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-16">
      <div className="max-w-2xl mx-auto">

        {/* ── HERO ── */}
        <div className="mb-16 text-center">
          <div className="text-6xl mb-6">🚴</div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Greek Randonneuring Community
          </h1>
          <p className="text-cyan-400 text-lg font-medium">
            Για όσους ξέρουν ότι ο δρόμος δεν τελειώνει ποτέ αρκετά νωρίς.
          </p>
        </div>

        {/* ── WHAT IS RANDONNEURING ── */}
        <section className="mb-12">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">01</span>
            Τι είναι το Randonneuring
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-white/70 leading-relaxed">
              Το Randonneuring — ή <span className="text-white font-medium">Audax</span> — είναι μια μορφή μακράς διαδρομής με ποδήλατο όπου ο αναβάτης πρέπει να ολοκληρώσει μια καθορισμένη απόσταση μέσα σε ένα χρονικό όριο. Δεν είναι αγώνας. Δεν υπάρχει νικητής.
            </p>
            <p className="text-white/70 leading-relaxed">
              Υπάρχουν μόνο αναβάτες που φτάνουν στον τερματισμό — και αναβάτες που δοκιμάζουν ξανά.
            </p>
            <p className="text-white/70 leading-relaxed">
              Από τα <span className="text-white font-medium">200 χιλιόμετρα</span> μέχρι τα <span className="text-white font-medium">1.200</span> — και πέρα από αυτά — κάθε brevet είναι μια προσωπική πρόκληση ενάντια στη διαδρομή, τον καιρό και τον εαυτό σου.
            </p>
          </div>
        </section>

        {/* ── WHAT IS GRC ── */}
        <section className="mb-12">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">02</span>
            Τι είναι το GRC Platform
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-white/70 leading-relaxed">
              Το GRC Platform γεννήθηκε από την ανάγκη μιας κοινότητας που αξίζει καλύτερα εργαλεία. Ένας τόπος όπου κάθε αναβάτης μπορεί να βρει τα brevets της σεζόν, να παρακολουθεί το ιστορικό του και να βλέπει την πορεία χρόνων στη σέλα.
            </p>
            <p className="text-white/70 leading-relaxed">
              Η πλατφόρμα δεν ανήκει σε κάποια εταιρεία. Φτιάχτηκε από έναν αναβάτη, για αναβάτες — με σεβασμό στην κουλτούρα του Randonneuring και αγάπη για την ελληνική ύπαιθρο που διασχίζουμε κάθε χρόνο.
            </p>
          </div>
        </section>

        {/* ── THE NUMBERS ── */}
        <section className="mb-12">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">03</span>
            Η κοινότητα σε αριθμούς
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: '20+', label: 'χρόνια ιστορίας' },
              { value: '500+', label: 'ενεργοί αναβάτες' },
              { value: '30+', label: 'σύλλογοι' },
              { value: '∞', label: 'χιλιόμετρα μπροστά' },
            ].map((s) => (
              <div key={s.label}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-cyan-400 font-bold text-2xl mb-1">{s.value}</div>
                <div className="text-white/40 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PBP ── */}
        <section className="mb-12">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">04</span>
            Paris — Brest — Paris
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-white/70 leading-relaxed">
              Κάθε τέσσερα χρόνια, εκατοντάδες Έλληνες αναβάτες στοχεύουν στο ιερό προσκύνημα του Randonneuring — το <span className="text-white font-medium">Paris-Brest-Paris</span>. 1.200 χιλιόμετρα σε 90 ώρες. Η Ελλάδα έχει ήδη γράψει τη δική της ιστορία εκεί.
            </p>
          </div>
        </section>

        {/* ── CONTACT ── */}
        <section className="mb-12">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">05</span>
            Επικοινωνία
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
            <p className="text-white/70 text-sm">
              Για θέματα της πλατφόρμας, σφάλματα ή προτάσεις:
            </p>
            <a href="mailto:gbt.app.support@gmail.com"
              className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium">
              gbt.app.support@gmail.com
            </a>
            <p className="text-white/40 text-xs pt-2">
              Η πλατφόρμα είναι υπό συνεχή ανάπτυξη. Αν κάτι δεν δουλεύει όπως πρέπει — ή αν έχεις ιδέα που θα έκανε τη ζωή του αναβάτη πιο εύκολη — γράψε μας.
            </p>
          </div>
        </section>

        {/* ── FOOTER QUOTE ── */}
        <div className="text-center pt-8 border-t border-white/10">
          <p className="text-white/30 text-sm italic">
            "Il faut du temps pour aller vite."
          </p>
          <p className="text-white text-xs mt-1">
            Χρειάζεται χρόνος για να πας γρήγορα.
          </p>
        </div>

      </div>
    </div>
  );
}
