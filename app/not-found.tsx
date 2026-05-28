import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">

        <div className="text-8xl mb-6">🚴</div>

        <h1 className="text-white font-bold text-4xl mb-2">404</h1>
        <p className="text-cyan-400 font-semibold text-lg mb-2">
          Χαμένος στη διαδρομή...
        </p>
        <p className="text-white/40 text-sm mb-8">
          Η σελίδα που ψάχνεις δεν υπάρχει ή μετακινήθηκε.
          Ίσως έχασες κάποια στροφή; Ας επιστρέψουμε στην αρχή και να ξεκινήσουμε ξανά!
          (Μπορεί απλά να είναι ακόμη υπό κατασκευή 😉)
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold
              px-6 py-3 rounded-full transition-colors"
          >
            ← Αρχική
          </Link>
          <Link
            href="/brevets"
            className="bg-white/5 hover:bg-white/10 text-white font-semibold
              border border-white/10 px-6 py-3 rounded-full transition-colors"
          >
            Brevets 2026
          </Link>
        </div>

      </div>
    </div>
  );
}
