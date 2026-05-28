'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';

const scrollStyle = `
  @keyframes scroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .logo-scroll {
    animation: scroll 30s linear infinite;
  }
  .logo-scroll:hover {
    animation-play-state: paused;
  }
`;

interface Club {
  id: string;
  shortNameGr: string;
  shortNameEn: string;
  fullNameGr: string;
}

type Mode = 'choose' | 'cyclist' | 'organizer';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('choose');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [allClubs, setAllClubs] = useState<Club[]>([]);

  // ── Fetch all clubs for logo scroller on mount ─────────────────────────
  useEffect(() => {
    getDocs(collection(db, 'clubs'))
      .then((snap) => {
        const data: Club[] = snap.docs
          .filter((d) => (d.data().last_brevet_year ?? 0) >= 2024)
          .map((doc) => ({
            id: doc.id,
            shortNameGr: doc.data().CLUB_NAME_SHORT_GR ?? '',
            shortNameEn: doc.data().ACP_CLUB_NAME_EN ?? '',
            fullNameGr: doc.data().CLUB_NAME_FULL_GR ?? '',
          }));
        setAllClubs(data);
      })
      .catch(() => {});
  }, []);

  // ── Load clubs when organizer mode selected ────────────────────────────
  useEffect(() => {
    if (mode !== 'organizer') return;
      // Pre-select first club from allClubs immediately — no waiting
  if (allClubs.length > 0 && !selectedClubId) {
    setSelectedClubId(allClubs[0].id);
  }
    setClubsLoading(true);
    getDocs(collection(db, 'clubs'))
      .then((snap) => {
        const data: Club[] = snap.docs
          .filter((doc) => (doc.data().last_brevet_year ?? 0) >= 2024)
          .map((doc) => ({
            id: doc.id,
            shortNameGr: doc.data().CLUB_NAME_SHORT_GR ?? '',
            shortNameEn: doc.data().ACP_CLUB_NAME_EN ?? '',
            fullNameGr: doc.data().CLUB_NAME_FULL_GR ?? '',
          }));
        setClubs(data);
        if (data.length > 0) setSelectedClubId(data[0].id);
      })
      .catch((err) => {
        console.error('clubs fetch error:', err);
        setError('Αδυναμία φόρτωσης συλλόγων.');
      })
      .finally(() => setClubsLoading(false));
  }, [mode]);

  const { user, isOrganizer } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isOrganizer) {
      router.replace('/organizer/dashboard');
    } else if (user) {
      router.replace('/');
    }
  }, [user, isOrganizer, router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl: '/profile' }, { prompt: 'select_account' });
  };

  const handleOrganizerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedClubId) { setError('Επέλεξε σύλλογο.'); return; }
    if (!password.trim()) { setError('Εισήγαγε κωδικό.'); return; }
    if (password.trim() !== selectedClubId) { setError('Λάθος κωδικός. Δοκίμασε ξανά.'); return; }
    setLoading(true);
    const selectedClub = clubs.find((c) => c.id === selectedClubId)!;
    localStorage.setItem('organizer_session', JSON.stringify({
      role: 'organizer',
      clubId: selectedClubId,
      clubNameGr: selectedClub.shortNameGr,
      clubNameEn: selectedClub.shortNameEn,
      clubFullNameGr: selectedClub.fullNameGr,
      loginAt: new Date().toISOString(),
    }));
    window.location.href = '/organizer/dashboard';
  };

  const handleBack = () => {
    setMode('choose');
    setError('');
    setPassword('');
    setSelectedClubId('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-lg">

        {/* ── CARD — overflow-hidden so scroller is clipped to border ── */}
        <div className="rounded-3xl border border-white/20 shadow-2xl overflow-hidden
          bg-gradient-to-t from-white/5 to-white/10">

          {/* ── LOGO SCROLLER — edge to edge, no padding ── */}
          <style>{scrollStyle}</style>
          <div className="w-full overflow-hidden">
            <div className="flex logo-scroll gap-6 w-max py-4 px-2">
              {[...allClubs, ...allClubs].map((club, i) => (
                <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
                  <img
                    src={`/logos/${club.id}.png`}
                    alt={club.shortNameGr}
                    className="h-28 w-28 object-contain drop-shadow-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logos/000000.png';
                    }}
                  />
                  <span className="text-white/50 text-xs text-center max-w-[120px] truncate">
                    {club.shortNameGr}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── TITLE — padded ── */}
          <div className="text-center px-6 pb-6">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              GRC Platform
            </h1>
            <p className="text-blue-300 text-sm mt-1">
              Greek Randonneuring Community
            </p>
          </div>

          {/* ── MODE CONTENT — padded inner card ── */}
          <div className="bg-white/10 backdrop-blur-md border-t border-white/20">

            {/* ── MODE: CHOOSE ── */}
            {mode === 'choose' && (
              <div className="p-8">
                <h2 className="text-white text-center text-lg font-semibold mb-2">
                  Καλωσόρισες
                </h2>
                <p className="text-blue-200 text-center text-sm mb-8">
                  Πώς θέλεις να συνδεθείς;
                </p>
                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => setMode('cyclist')}
                    className="group relative flex items-center gap-4 p-5 rounded-xl
                      bg-blue-600/30 border border-blue-400/40 hover:bg-blue-600/50
                      hover:border-blue-400/70 transition-all duration-200 text-left"
                  >
                    <div className="text-3xl">🚴</div>
                    <div>
                      <div className="text-white font-semibold text-base">Είμαι Αναβάτης</div>
                      <div className="text-blue-300 text-xs mt-0.5">Δες brevets, εγγράψου, παρακολούθησε ιστορικό</div>
                    </div>
                    <div className="ml-auto text-blue-300 group-hover:translate-x-1 transition-transform">→</div>
                  </button>
                  <button
                    onClick={() => setMode('organizer')}
                    className="group relative flex items-center gap-4 p-5 rounded-xl
                      bg-purple-600/30 border border-purple-400/40 hover:bg-purple-600/50
                      hover:border-purple-400/70 transition-all duration-200 text-left"
                  >
                    <div className="text-3xl">🏁</div>
                    <div>
                      <div className="text-white font-semibold text-base">Είμαι Διοργανωτής</div>
                      <div className="text-purple-300 text-xs mt-0.5">Διαχείριση brevets, εγγραφών, αποτελεσμάτων</div>
                    </div>
                    <div className="ml-auto text-purple-300 group-hover:translate-x-1 transition-transform">→</div>
                  </button>
                </div>
              </div>
            )}

            {/* ── MODE: CYCLIST ── */}
            {mode === 'cyclist' && (
              <div className="p-8">
                <button onClick={handleBack}
                  className="flex items-center gap-1 text-blue-300 hover:text-white text-sm mb-6 transition-colors">
                  ← Πίσω
                </button>
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">🚴</div>
                  <h2 className="text-white font-semibold text-lg">Σύνδεση Αναβάτη</h2>
                  <p className="text-blue-200 text-sm mt-1">Χρησιμοποίησε τον Google λογαριασμό σου</p>
                </div>
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4
                    bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl
                    shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {loading ? 'Σύνδεση...' : 'Συνέχεια με Google'}
                </button>
              </div>
            )}

            {/* ── MODE: ORGANIZER ── */}
            {mode === 'organizer' && (
              <div className="p-8">
                <button onClick={handleBack}
                  className="flex items-center gap-1 text-purple-300 hover:text-white text-sm mb-6 transition-colors">
                  ← Πίσω
                </button>
<div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
{selectedClubId && allClubs.length > 0 ? (
  <img
    src={`/logos/${selectedClubId}.png`}
    alt={allClubs.find(c => c.id === selectedClubId)?.shortNameGr ?? ''}
    className="h-40 w-40 object-contain drop-shadow-lg"
    onError={(e) => {
       (e.target as HTMLImageElement).src = '/logos/000000.png';
    }}
  />
) : (
  <div className="text-4xl">🏁</div>
)}
                  </div>
                  <h2 className="text-white font-semibold text-lg">Σύνδεση Διοργανωτή</h2>
                  <p className="text-purple-200 text-sm mt-1">Επέλεξε σύλλογο και εισήγαγε κωδικό</p>
                </div>
                <form onSubmit={handleOrganizerLogin} className="flex flex-col gap-4">
                  <div>
                    <label className="text-purple-200 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                      Σύλλογος
                    </label>
                    {clubsLoading ? (
                      <div className="flex items-center gap-2 py-3 text-purple-300 text-sm">
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        Φόρτωση συλλόγων...
                      </div>
                    ) : (
                      <select
                        value={selectedClubId}
                        onChange={(e) => { setSelectedClubId(e.target.value); setError(''); }}
                        className="w-full bg-white/10 border border-purple-400/40
                          text-white rounded-xl px-4 py-3 text-sm
                          focus:outline-none focus:border-purple-400
                          focus:ring-1 focus:ring-purple-400/50
                          [&>option]:bg-slate-800 [&>option]:text-white"
                      >
                        {clubs.map((club) => (
                          <option key={club.id} value={club.id}>
                            {club.shortNameGr}{club.shortNameEn ? ` · ${club.shortNameEn}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-purple-200 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                      Κωδικός
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full bg-white/10 border border-purple-400/40
                        text-white placeholder-purple-300/50 rounded-xl px-4 py-3
                        text-sm focus:outline-none focus:border-purple-400
                        focus:ring-1 focus:ring-purple-400/50"
                    />
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 text-red-300 text-sm
                      bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
                      <span>⚠️</span><span>{error}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading || clubsLoading || !selectedClubId}
                    className="w-full py-3.5 bg-purple-600 hover:bg-purple-500
                      text-white font-semibold rounded-xl shadow-lg
                      transition-all duration-200 disabled:opacity-50
                      disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        Σύνδεση...
                      </>
                    ) : 'Είσοδος ως Διοργανωτής'}
                  </button>
                </form>
                <p className="text-purple-300/50 text-xs text-center mt-4">
                  Προσωρινός κωδικός: ID συλλόγου
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-300/40 text-xs mt-6">
          Greek Randonneuring Community Platform © {new Date().getFullYear()}
        </p>

      </div>
    </div>
  );
}
