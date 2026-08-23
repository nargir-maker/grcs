import type { Metadata } from 'next';
import VideoOrImage from '../components/VideoOrImage';
import PageViews from '../components/PageViews';

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
          {/* Τίτλος ΕΞΩ από το πλαίσιο — όπως τα υπόλοιπα sections */}
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">01</span>
            Η πλατφόρμα &amp; η εφαρμογή
          </h2>

          {/* Outer card — ίδιο style με τα υπόλοιπα sections */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

            {/* Video που μετά το τέλος γίνεται εικόνα */}
            <VideoOrImage
              videoSrc="/grc_clip.mp4"
              imageSrc="/grc-coin.png"
              minHeight={260}
            />

            {/* Cards κάτω από την εικόνα */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* GRC Website */}
              <div className="bg-[#0A1628]/40 backdrop-blur-sm border border-white/15 rounded-2xl p-6">
                <p className="text-white font-bold text-base leading-snug mb-1">GRC Platform</p>
                <p className="text-white/35 text-xs mb-4">grcs-vert.vercel.app</p>
                <p className="text-white/75 text-sm leading-relaxed">
                  Το web platform με ημερολόγιο brevets, στατιστικά κοινότητας, ιστορικό αγώνων, live tracking και προφίλ αναβατών.
                </p>
              </div>

              {/* Greek Brevets Tracker app */}
              <div className="bg-[#0A1628]/40 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-6">
                <p className="text-white font-bold text-base leading-snug mb-1">Greek Brevets Tracker</p>
                <p className="text-white/35 text-xs mb-4">Εφαρμογή κινητού</p>
                <p className="text-white/75 text-sm leading-relaxed">
                  Η συνοδευτική εφαρμογή για κινητό — ιστορικό αναβάτη, live GPS tracking, ειδοποιήσεις brevets και ό,τι χρειάζεσαι στη σέλα.
                </p>
                <div className="mt-4">
                  <p className="text-white/50 text-xs mb-2">Κατέβασε την εφαρμογή τώρα:</p>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.nikos.greekbrevets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full
                      bg-green-500/15 text-green-400 border border-green-500/25
                      hover:bg-green-500/25 hover:border-green-500/50 transition-all duration-200"
                  >
                    Android
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
            Τι είναι το Randonneuring
          </h2>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            
            <VideoOrImage
              videoSrc="/grc_group.mp4"
              imageSrc="/bg10.png"
              minHeight={280}
            />

            <div className="space-y-4">
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

          </div>
        </section>

        {/* ── WHAT IS GRC ── */}
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">03</span>
            Τι είναι το GRC Platform
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
                Το GRC Platform γεννήθηκε από την ανάγκη μιας κοινότητας που αξίζει καλύτερα εργαλεία. Ένας τόπος όπου κάθε αναβάτης μπορεί να βρει τα brevets της σεζόν, να παρακολουθεί το ιστορικό του και να βλέπει την πορεία χρόνων στη σέλα.
              </p>
              <p className="text-white/70 leading-relaxed">
                Η πλατφόρμα δεν ανήκει σε κάποια εταιρεία. Φτιάχτηκε από έναν αναβάτη, για αναβάτες — με σεβασμό στην κουλτούρα του Randonneuring και αγάπη για την ελληνική ύπαιθρο που διασχίζουμε κάθε χρόνο.
              </p>
              <p className="text-white/70 leading-relaxed">
                Μπορείτε να βρείτε περισσότερες πληροφορίες σχετικά με την διοργάνωση των brevet στην Ελλάδα από τους παρακάτω φορείς:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 pt-2">
                <a
                  href="https://www.brevets.gr"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="ΛΕ.ΠΟ.Τ.Ε. — brevets.gr"
                  className="flex items-center justify-center w-[336px] h-[336px] rounded-full
                    bg-white/5 border border-white/15 hover:border-cyan-500/50
                    hover:bg-white/10 transition-all duration-200"
                >
                  <img src="/logos/650000.png" alt="ΛΕ.ΠΟ.Τ.Ε." className="w-72 h-72 object-contain rounded-full" />
                </a>
                <a
                  href="https://www.hellenic-autonomous-randonneur.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="H.A.R. — hellenic-autonomous-randonneur.com"
                  className="flex items-center justify-center w-[336px] h-[336px] rounded-full
                    bg-white/5 border border-white/15 hover:border-cyan-500/50
                    hover:bg-white/10 transition-all duration-200"
                >
                  <img src="/logos/659999.png" alt="H.A.R." className="w-72 h-72 object-contain rounded-full" />
                </a>
              </div>
            </div>

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
        <section className="mb-14">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-3">
            <span className="text-cyan-400">05</span>
            Paris — Brest — Paris
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

        <PageViews page="about" />
      </div>
    </div>
  );
}