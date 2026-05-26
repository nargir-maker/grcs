'use client';

// app/profile/page.tsx
// Shows the logged-in rider's profile fetched from Firestore
// Flow:
//   1. User logs in with Google (NextAuth)
//   2. Query users/{} by email → get linkedLegacyMemberId
//   3. Fetch members/{id} → display profile
//   4. If no link → show member ID form → link → display profile

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import { YearCard } from '@/app/components/BrevetCards';
import { auth } from '@/app/lib/firebase';

// ── Types ──────────────────────────────────────────────────────────────────────
interface YearData {
  km: number;
  brevets: number;
  events: BrevetEvent[];
}

interface BrevetEvent {
  n: string;   // name
  d: number;   // distance
  t: string;   // type
  as: number;  // ascent
  dt: string;  // date
  og: string;  // organizer
  acp: string;
  har: string;
  mt: string;  // time limit
  rt: string;  // ride time
}

interface MemberProfile {
  id: string;
  firstName: string;
  lastName: string;
  firstNameEn: string;
  lastNameEn: string;
  fatherNameEl: string;
  gender: string;
  lepoteId: string;
  harId: string;
  profileType: string;
  accountType: string;
  isInsured: boolean;
  insuranceValue: string;
  totalKm: number;
  totalBrevets: number;
  pbpCount: number;
  lrmCount: number;
  flcCount: number;
  maxDist: number;
  history: Record<string, YearData>;
}

// ── Parse Firestore member document ───────────────────────────────────────────
function parseMember(id: string, data: any): MemberProfile {
  const regLepote = data.reg_lepote ?? {};
  const regHar    = data.reg_har    ?? {};
  const stats     = data.stats      ?? {};

  // Parse history
  let history: Record<string, YearData> = {};
  try {
    if (stats.history_raw) {
      const decoded = JSON.parse(stats.history_raw);
      const raw = decoded.history ?? decoded;
      Object.entries(raw).forEach(([year, val]: [string, any]) => {
        history[year] = {
          km:      parseFloat(val.km ?? '0') || 0,
          brevets: (val.events ?? []).length,
          events:  (val.events ?? []).map((e: any) => ({
            n:   e.n  ?? '',
            d:   parseFloat(e.d  ?? '0') || 0,
            t:   e.t  ?? '',
            as:  parseFloat(e.as ?? '0') || 0,
            dt:  e.dt ?? '',
            og:  e.og ?? '',
            acp: e.acp ?? '',
            har: e.har ?? '',
            mt:  e.mt ?? '',
            rt:  e.rt ?? '',
          })),
        };
      });
    }
  } catch { history = {}; }

  const insVal = regLepote.insurance?.toString().trim() ?? '';

  return {
    id,
    firstName:      data.name_el    ?? '',
    lastName:       data.surname_el ?? '',
    firstNameEn:    data.name_en    ?? '',
    lastNameEn:     data.surname_en ?? '',
    fatherNameEl:   data.father_name_el ?? '',
    gender:         data.gender ?? 'M',
    lepoteId:       regLepote.id?.toString() ?? '',
    harId:          regHar.id?.toString()    ?? '',
    profileType:    data.profile_type  ?? 'private',
    accountType:    data.account_type  ?? 'user',
    isInsured:      insVal.length > 0,
    insuranceValue: insVal,
    totalKm:        parseFloat(stats.total_km  ?? '0') || 0,
    totalBrevets:   parseInt(stats.total_brm   ?? '0') || 0,
    pbpCount:       parseInt(stats.pbp         ?? '0') || 0,
    lrmCount:       parseInt(stats.lrm         ?? '0') || 0,
    flcCount:       parseInt(stats.flc         ?? '0') || 0,
    maxDist:        parseInt(stats.max_dist    ?? '0') || 0,
    history,
  };
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ emoji, value, label, unit, color }: {
  emoji: string; value: string; label: string; unit: string; color: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="font-bold text-xl" style={{ color }}>
        {value} <span className="text-xs text-white/40">{unit}</span>
      </div>
      <div className="text-white/40 text-xs mt-1">{label}</div>
    </div>
  );
}

// ── Year card ──────────────────────────────────────────────────────────────────
/*function YearCard({ year, data }: { year: string; data: YearData }) {
  const [open, setOpen] = useState(false);

  // SR check
  const has200 = data.events.some(e => e.d >= 200 && e.d < 300);
  const has300 = data.events.some(e => e.d >= 300 && e.d < 400);
  const has400 = data.events.some(e => e.d >= 400 && e.d < 600);
  const has600 = data.events.some(e => e.d >= 600);
  const isSR   = has200 && has300 && has400 && has600;
  const isPBP  = data.events.some(e => e.t?.toUpperCase() === 'PBP');
  const isFLC  = data.events.some(e => e.t?.toUpperCase() === 'FLC' || e.n?.toUpperCase().includes('FLECHE'));

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="bg-[#0A1628] border border-cyan-500/30 rounded-xl px-3 py-2 text-center min-w-[56px]">
            <div className="text-cyan-400 font-bold text-lg leading-none">{year}</div>
          </div>
          <div className="text-left">
            <div className="text-white font-bold">
              {data.km.toLocaleString('el-GR')}km
            </div>
            <div className="text-white/40 text-xs">{data.brevets} brevets</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSR  && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">SR</span>}
          {isPBP && <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">PBP</span>}
          {isFLC && <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold">FLECHE</span>}
          <span className="text-white/30 text-lg">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 divide-y divide-white/5">
          {data.events.map((e, i) => (
            <div key={i} className="px-5 py-3 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{e.n}</p>
                <p className="text-white/40 text-xs mt-0.5">{e.og} · {e.dt}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-cyan-400 font-bold text-sm">{e.d}km</span>
                {e.rt && <p className="text-white/30 text-xs">{e.rt}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}*/

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [member, setMember]         = useState<MemberProfile | null>(null);
  const [loading, setLoading]       = useState(true);
  const [needsLink, setNeedsLink]   = useState(false);
  const [lepoteInput, setLepoteInput] = useState('');
  const [harInput, setHarInput]     = useState('');
  const [linking, setLinking]       = useState(false);
  const [linkError, setLinkError]   = useState('');




  // ── Fetch profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.email) { setLoading(false); return; }
    fetchProfile(session.user.email);
  }, [session, status]);

 
  async function fetchProfile(email: string) {
      console.log('Firebase auth user:', auth.currentUser);
  console.log('Firebase auth uid:', auth.currentUser?.uid);
    setLoading(true);
    try {
      // 1. Find users doc by email
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('email', '==', email))
      );

      if (!usersSnap.empty) {
        const userDoc  = usersSnap.docs[0].data();
        const linkedId = userDoc.linkedLegacyMemberId?.toString() ?? '';

        if (linkedId) {
          // 2. Fetch member document
          const memberSnap = await getDoc(doc(db, 'members', linkedId));
          if (memberSnap.exists()) {
            setMember(parseMember(linkedId, memberSnap.data()));
            setLoading(false);
            return;
          }
        }
      }

      // No link found — ask for member ID
      setNeedsLink(true);
    } catch (e) {
      console.error('Profile fetch error:', e);
      setNeedsLink(true);
    } finally {
      setLoading(false);
    }
  }

  // ── Link member ID ───────────────────────────────────────────────────────────
  async function handleLink() {
    if (!session?.user?.email) return;
    if (!lepoteInput.trim() && !harInput.trim()) {
      setLinkError('Εισήγαγε τουλάχιστον έναν αριθμό μητρώου.');
      return;
    }

    setLinking(true);
    setLinkError('');

    try {
      let memberSnap = null;

      // Search by lepoteId first
      if (lepoteInput.trim()) {
        const q = await getDocs(
          query(collection(db, 'members'),
            where('reg_lepote.id', '==', lepoteInput.trim()))
        );
        if (!q.empty) memberSnap = q.docs[0];
      }

      // Then by harId
      if (!memberSnap && harInput.trim()) {
        const q = await getDocs(
          query(collection(db, 'members'),
            where('reg_har.id', '==', harInput.trim()))
        );
        if (!q.empty) memberSnap = q.docs[0];
      }

      if (!memberSnap) {
        setLinkError('Δεν βρέθηκε μέλος με αυτά τα στοιχεία.');
        setLinking(false);
        return;
      }

      const memberId = memberSnap.id;
      const email    = session.user.email!;
      const today    = new Date().toISOString().split('T')[0];

      // Check if already claimed by someone else
      const claimKeys = [];
      if (lepoteInput.trim()) claimKeys.push(lepoteInput.trim());
      if (harInput.trim())    claimKeys.push(`har_${harInput.trim()}`);

      for (const key of claimKeys) {
        const claimDoc = await getDoc(doc(db, 'claimed_members', key));
        if (claimDoc.exists()) {
          const existingEmail = claimDoc.data().googleEmail ?? '';
          if (existingEmail !== email) {
            setLinkError(
              'Αυτό το μητρώο έχει ήδη συνδεθεί με άλλο λογαριασμό.\n' +
              'Επικοινώνησε μαζί μας: gbt.app.support@gmail.com'
            );
            setLinking(false);
            return;
          }
        }
      }

      // Write claims
      for (const key of claimKeys) {
        await setDoc(doc(db, 'claimed_members', key), {
          googleEmail: email,
          claimedAt:   today,
        }, { merge: true });
      }

      // Upsert users doc
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('email', '==', email))
      );

      if (!usersSnap.empty) {
        await updateDoc(usersSnap.docs[0].ref, {
          linkedLegacyMemberId: memberId,
          lepoteId: lepoteInput.trim(),
          harId:    harInput.trim(),
          lastSeen: today,
        });
      } else {
        await setDoc(doc(collection(db, 'users')), {
          email,
          displayName:          session.user.name ?? '',
          linkedLegacyMemberId: memberId,
          lepoteId:             lepoteInput.trim(),
          harId:                harInput.trim(),
          createdAt:            today,
          lastSeen:             today,
        });
      }

      // Show profile
      setMember(parseMember(memberId, memberSnap.data()));
      setNeedsLink(false);
    } catch (e) {
      console.error('Link error:', e);
      setLinkError('Σφάλμα σύνδεσης. Δοκίμασε ξανά.');
    } finally {
      setLinking(false);
    }
  }

  // ── Not logged in ────────────────────────────────────────────────────────────
  if (status !== 'loading' && !session) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🚴</div>
          <h1 className="text-white font-bold text-xl mb-2">Το Προφίλ μου</h1>
          <p className="text-white/50 text-sm mb-6">
            Συνδέσου με Google για να δεις το προφίλ σου
          </p>
          <button
            onClick={() => signIn('google')}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold
              px-6 py-3 rounded-full transition-colors"
          >
            Σύνδεση με Google
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent
            rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Φόρτωση προφίλ...</p>
        </div>
      </div>
    );
  }

  // ── Needs link ───────────────────────────────────────────────────────────────
  if (needsLink) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔗</div>
            <h1 className="text-white font-bold text-xl mb-2">
              Σύνδεση Μητρώου
            </h1>
            <p className="text-white/50 text-sm">
              Εισήγαγε τον αριθμό μητρώου σου για να συνδέσεις το προφίλ σου
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <label className="text-white/60 text-xs font-semibold uppercase
                tracking-wider mb-1.5 block">
                ΛΕ.ΠΟ.Τ.Ε. Αριθμός Μέλους
              </label>
              <input
                type="number"
                value={lepoteInput}
                onChange={e => setLepoteInput(e.target.value)}
                placeholder="π.χ. 3557"
                className="w-full bg-white/10 border border-white/20 text-white
                  rounded-xl px-4 py-3 text-sm focus:outline-none
                  focus:border-cyan-500/50 placeholder-white/30"
              />
            </div>
            <div>
              <label className="text-white/60 text-xs font-semibold uppercase
                tracking-wider mb-1.5 block">
                H.A.R. Αριθμός Μέλους
              </label>
              <input
                type="number"
                value={harInput}
                onChange={e => setHarInput(e.target.value)}
                placeholder="π.χ. 352"
                className="w-full bg-white/10 border border-white/20 text-white
                  rounded-xl px-4 py-3 text-sm focus:outline-none
                  focus:border-cyan-500/50 placeholder-white/30"
              />
            </div>

            {linkError && (
              <div className="bg-red-500/10 border border-red-500/30
                rounded-xl px-4 py-3 text-red-400 text-sm whitespace-pre-line">
                ⚠️ {linkError}
              </div>
            )}

            <button
              onClick={handleLink}
              disabled={linking}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black
                font-bold py-3 rounded-xl transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {linking ? (
                <div className="w-4 h-4 border-2 border-black/30
                  border-t-black rounded-full animate-spin" />
              ) : null}
              {linking ? 'Αναζήτηση...' : 'Σύνδεση Προφίλ →'}
            </button>

            <p className="text-white/25 text-xs text-center">
              Αρκεί ένας από τους δύο αριθμούς
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Profile ──────────────────────────────────────────────────────────────────
  if (!member) return null;

  const sortedYears = Object.keys(member.history).sort((a, b) => b.localeCompare(a));
  const totalElevation = Object.values(member.history).reduce((sum, y) =>
    sum + y.events.reduce((s, e) => s + (e.as || 0), 0), 0);

  // SR count
  let srCount = 0;
  Object.values(member.history).forEach(y => {
    const has200 = y.events.some(e => e.d >= 200 && e.d < 300);
    const has300 = y.events.some(e => e.d >= 300 && e.d < 400);
    const has400 = y.events.some(e => e.d >= 400 && e.d < 600);
    const has600 = y.events.some(e => e.d >= 600);
    if (has200 && has300 && has400 && has600) srCount++;
  });

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-3xl mx-auto">

        {/* ── HEADER ── */}
        <div className="bg-gradient-to-br from-[#0D3B5E] to-[#1a1a4e]
          rounded-2xl p-8 mb-6 text-center border border-white/10">
          <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2
            border-cyan-500/40 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold text-cyan-400">
              {member.firstName[0]}{member.lastName[0]}
            </span>
          </div>
          <h1 className="text-white font-bold text-2xl">
            {member.firstName} {member.lastName}
          </h1>
          {member.fatherNameEl && (
            <p className="text-white/40 text-sm mt-1">
              του {member.fatherNameEl}
            </p>
          )}
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            {member.lepoteId && (
              <span className="bg-blue-900/40 border border-blue-500/30
                text-blue-300 text-xs font-bold px-3 py-1.5 rounded-full">
                ΛΕ.ΠΟ.Τ.Ε. {member.lepoteId}
              </span>
            )}
            {member.harId && (
              <span className="bg-purple-900/40 border border-purple-500/30
                text-purple-300 text-xs font-bold px-3 py-1.5 rounded-full">
                H.A.R. {member.harId}
              </span>
            )}
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
              member.isInsured
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {member.isInsured ? '🛡️ Ασφαλισμένος' : '⚠️ Ανασφάλιστος'}
            </span>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard
            emoji="🚲"
            value={member.totalKm.toLocaleString('el-GR')}
            label="Χιλιόμετρα"
            unit="km"
            color="#06B6D4"
          />
          <StatCard
            emoji="🏅"
            value={member.totalBrevets.toString()}
            label="Brevets"
            unit="BRM"
            color="#F59E0B"
          />
          <StatCard
            emoji="⛰️"
            value={Math.round(totalElevation).toLocaleString('el-GR')}
            label="Υψομετρικά"
            unit="m+"
            color="#A78BFA"
          />
          <StatCard
            emoji="🏆"
            value={srCount.toString()}
            label="Super Randonneur"
            unit="SR"
            color="#EF4444"
          />
        </div>

        {/* ── ACHIEVEMENTS ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-4">🎖️ Επιτεύγματα</h2>
          <div className="flex flex-wrap gap-3">
            {member.pbpCount > 0 && (
              <div className="flex items-center gap-2 bg-blue-500/10
                border border-blue-500/30 rounded-xl px-4 py-2">
                <span className="text-xl">🗼</span>
                <div>
                  <div className="text-blue-400 font-bold text-sm">PBP</div>
                  <div className="text-white/40 text-xs">{member.pbpCount}×</div>
                </div>
              </div>
            )}
            {member.lrmCount > 0 && (
              <div className="flex items-center gap-2 bg-purple-500/10
                border border-purple-500/30 rounded-xl px-4 py-2">
                <span className="text-xl">🌍</span>
                <div>
                  <div className="text-purple-400 font-bold text-sm">LRM</div>
                  <div className="text-white/40 text-xs">{member.lrmCount}×</div>
                </div>
              </div>
            )}
            {member.flcCount > 0 && (
              <div className="flex items-center gap-2 bg-orange-500/10
                border border-orange-500/30 rounded-xl px-4 py-2">
                <span className="text-xl">⚡</span>
                <div>
                  <div className="text-orange-400 font-bold text-sm">Flèche</div>
                  <div className="text-white/40 text-xs">{member.flcCount}×</div>
                </div>
              </div>
            )}
            {member.maxDist > 0 && (
              <div className="flex items-center gap-2 bg-cyan-500/10
                border border-cyan-500/30 rounded-xl px-4 py-2">
                <span className="text-xl">📏</span>
                <div>
                  <div className="text-cyan-400 font-bold text-sm">
                    Max {member.maxDist}km
                  </div>
                  <div className="text-white/40 text-xs">Μεγαλύτερη απόσταση</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── HISTORY ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">
            📜 Ιστορικό ({sortedYears.length} χρόνια)
          </h2>
          {sortedYears.length === 0 ? (
            <p className="text-white/30 text-sm">Δεν βρέθηκε ιστορικό.</p>
          ) : (
            sortedYears.map(year => (
              <YearCard
                key={year}
                year={year}
                data={member.history[year]}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}
