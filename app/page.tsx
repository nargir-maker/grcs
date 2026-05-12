export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A1628] font-sans">

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        {/* Floating logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/grc-logo.png"
            alt="GRC Logo"
            className="w-32 h-32 object-contain drop-shadow-2xl"
          />
        </div>
        <div className="inline-block bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold px-4 py-2 rounded-full mb-8 tracking-widest">
          ΕΛΛΗΝΙΚΟ RANDONNEURING — ΜΙΑ ΠΛΑΤΦΟΡΜΑ ΓΙΑ ΟΛΟΥΣ
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
          Όλα τα Brevets.<br />
          <span className="text-cyan-400">Μια πλατφόρμα.</span>
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
          Εγγραφές, αποτελέσματα, live tracking και ιστορικό
          για κάθε αναβάτη και διοργανωτή του ελληνικού randonneuring.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/brevets" className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-4 rounded-full text-base transition-colors">
            Δες τα Brevets →
          </a>
          <a href="/about" className="border border-white/20 hover:border-white/40 text-white px-8 py-4 rounded-full text-base transition-colors">
            Μάθε περισσότερα
          </a>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

          <a href="/brevets" className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/40 transition-colors">
            <div className="text-3xl mb-4">📅</div>
            <h3 className="text-white font-bold text-lg mb-2">
              Ημερολόγιο Brevet
            </h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Όλα τα προγραμματισμένα brevets σε ένα μέρος.
              Εγγραφή με ένα κλικ.
            </p>
            <div className="mt-4 text-cyan-400 text-xs font-bold tracking-wider">
              ΣΎΝΤΟΜΑ →
            </div>
          </a>

          <a href="/live" className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/40 transition-colors">
            <div className="text-3xl mb-4">🗺️</div>
            <h3 className="text-white font-bold text-lg mb-2">
              Live Tracking
            </h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Παρακολούθηση σε πραγματικό χρόνο.
              Για αναβάτες, διοργανωτές και θεατές.
            </p>
            <div className="mt-4 text-cyan-400 text-xs font-bold tracking-wider">
              ΣΎΝΤΟΜΑ →
            </div>
          </a>

          <a href="/members" className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/40 transition-colors">
            <div className="text-3xl mb-4">🏆</div>
            <h3 className="text-white font-bold text-lg mb-2">
              Ιστορικό & Στατιστικά
            </h3>
            <p className="text-white/50 text-sm leading-relaxed">
              20+ χρόνια ιστορικού του ελληνικού randonneuring.
              Το προφίλ κάθε αναβάτη.
            </p>
            <div className="mt-4 text-cyan-400 text-xs font-bold tracking-wider">
              ΣΎΝΤΟΜΑ →
            </div>
          </a>

        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────────── */}
      <section className="border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-cyan-400">20+</div>
              <div className="text-white/50 text-sm mt-1">Χρόνια ιστορικού</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-400">500+</div>
              <div className="text-white/50 text-sm mt-1">Αναβάτες</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-400">1000+</div>
              <div className="text-white/50 text-sm mt-1">Brevets</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-400">10</div>
              <div className="text-white/50 text-sm mt-1">Διοργανωτές</div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}