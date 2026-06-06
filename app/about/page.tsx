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
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Greek Randonneuring Community
          </h1>
          <p className="text-cyan-400 text-lg font-medium">
            Για όσους ξέρουν ότι ο δρόμος δεν τελειώνει ποτέ αρκετά νωρίς.
          </p>
        </div>

        {/* ── COIN IMAGE + ECOSYSTEM ── */}
        <section className="mb-14">
          {/* Coin as background — cards overlaid on top */}
          <div
            className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            style={{
              backgroundImage: 'url(/grc-coin.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628]/80 via-[#0A1628]/55 to-[#0A1628]/85" />

            {/* Content */}
            <div className="relative z-10 px-6 py-10 sm:px-10">
              <h2
                className="text-white font-bold text-2xl mb-8 flex items-center gap-3"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
              >
                <span className="text-cyan-400">01</span>
                Η πλατφόρμα &amp; η εφαρμογή
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* GRC Website */}
                <div className="bg-[#0A1628]/65 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="shrink-0 w-14 h-14">
                      <img src="/grc-logo.png" alt="GRC" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-base leading-snug">GRC Platform</p>
                      <p className="text-white/35 text-xs mt-0.5">grcs-vert.vercel.app</p>
                    </div>
                  </div>
                  <p className="text-white/75 text-sm leading-relaxed">
                    Το web platform με ημερολόγιο brevets, στατιστικά κοινότητας, ιστορικό αγώνων, live tracking και προφίλ αναβατών.
                  </p>
                </div>

                {/* Greek Brevets Tracker app */}
                <div className="bg-[#0A1628]/65 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden">
                      <img src="/GBT_logo_512c.png" alt="Greek Brevets Tracker" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-base leading-snug">Greek Brevets Tracker</p>
                      <p className="text-white/35 text-xs mt-0.5">Εφαρμογή κινητού</p>
                    </div>
                  </div>
                  <p className="text-white/75 text-sm leading-relaxed">
                    Η συνοδευτική εφαρμογή για κινητό — ιστορικό αναβάτη, live GPS tracking, ειδοποιήσεις brevets και ό,τι χρειάζεσαι στη σέλα.
                  </p>
                  <div className="mt-4">
                    <span className="text-xs font-bold px-3 py-1 rounded-full
                      bg-green-500/15 text-green-400 border border-green-500/25">
                      Android
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHAT IS RANDONNEURING ── */}
        <section className="mb-12">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">02</span>
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
            <span className="text-cyan-400">03</span>
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
            <span className="text-cyan-400">04</span>
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
            <span className="text-cyan-400">05</span>
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
            <span className="text-cyan-400">06</span>
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
          <p className="text-white/50 text-xs mt-1">
            Χρειάζεται χρόνος για να πας γρήγορα.
          </p>
        </div>

      </div>
    </div>
  );
}
