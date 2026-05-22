export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A1628] font-sans">

      {/* ── HERO — FULL SCREEN VIDEO ───────────────────── */}
      <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">

        {/* ── VIDEO BACKGROUND ── */}
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-poster.jpg"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hero.webm" type="video/webm" />
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        {/* ── DARK OVERLAY — so text is readable ── */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628]/60 via-[#0A1628]/40 to-[#0A1628]" />

        {/* ── GRAIN OVERLAY — hides compression artifacts ── */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '128px',
          }}
        />

        {/* ── CONTENT — centered on top of video ── */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="/grc-logo.png"
              alt="GRC Logo"
              className="w-48 h-48 object-contain drop-shadow-2xl"
            />
          </div>

          {/* Badge */}
          <div className="inline-block bg-cyan-500/10 border border-cyan-500/30
            text-cyan-400 text-xs font-bold px-4 py-2 rounded-full mb-8 tracking-widest
            backdrop-blur-sm">
            ΕΛΛΗΝΙΚΟ RANDONNEURING — ΜΙΑ ΠΛΑΤΦΟΡΜΑ ΓΙΑ ΟΛΟΥΣ
          </div>

          {/* Title */}
          <h2 className="text-4xl sm:text-6xl font-bold text-white leading-tight mb-6 drop-shadow-lg">
            Όλα τα Brevets.<br />
            <span className="text-cyan-400">Μια πλατφόρμα.</span>
          </h2>

          {/* Subtitle */}
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-12 leading-relaxed drop-shadow">
            Εγγραφές, αποτελέσματα, live tracking και ιστορικό
            για κάθε αναβάτη και διοργανωτή του ελληνικού randonneuring.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/brevets"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold
                px-8 py-4 rounded-full text-base transition-colors shadow-lg
                shadow-cyan-500/25">
              Δες τα Brevets →
            </a>
            <a href="/about"
              className="border border-white/30 hover:border-white/60 text-white
                px-8 py-4 rounded-full text-base transition-colors backdrop-blur-sm
                bg-white/5">
              Μάθε περισσότερα
            </a>
          </div>
        </div>

        {/* ── SCROLL INDICATOR ── */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10
          flex flex-col items-center gap-2 text-white/30 animate-bounce">
          <span className="text-xs tracking-widest">SCROLL</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 9l-7 7-7-7" />
          </svg>
        </div>

      </section>

      {/* ── FEATURES ───────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

          <a href="/brevets" className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/40 transition-colors">
            <div className="text-3xl mb-4">📅</div>
            <h3 className="text-white font-bold text-lg mb-2">Ημερολόγιο Brevet</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Όλα τα προγραμματισμένα brevets σε ένα μέρος. Εγγραφή με ένα κλικ.
            </p>
            <div className="mt-4 text-cyan-400 text-xs font-bold tracking-wider">Δες εδώ →</div>
          </a>

          <a href="/live" className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/40 transition-colors">
            <div className="text-3xl mb-4">🗺️</div>
            <h3 className="text-white font-bold text-lg mb-2">Live Tracking</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Παρακολούθηση σε πραγματικό χρόνο. Για αναβάτες, διοργανωτές και θεατές.
            </p>
            <div className="mt-4 text-cyan-400 text-xs font-bold tracking-wider">Δες εδώ →</div>
          </a>

          <a href="/members" className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/40 transition-colors">
            <div className="text-3xl mb-4">🏆</div>
            <h3 className="text-white font-bold text-lg mb-2">Ιστορικό & Στατιστικά</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              20+ χρόνια ιστορικού του ελληνικού randonneuring. Το προφίλ κάθε αναβάτη.
            </p>
            <div className="mt-4 text-cyan-400 text-xs font-bold tracking-wider">ΣΎΝΤΟΜΑ →</div>
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
