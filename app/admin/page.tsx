'use client';

// app/admin/page.tsx
// Admin settings panel — only accessible to account_type === 'admin' in Firestore
// Protected by email check + accountType check from Firestore
// Stores page visibility settings in Firestore: app_content/settings

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import Link from 'next/link';

// ── Page config ────────────────────────────────────────────────────
interface PageSetting {
  key: string;
  label: string;
  path: string;
  description: string;
  icon: string;
}

const PAGES: PageSetting[] = [
  { key: 'members',  label: 'Αναβάτες',      path: '/members',  icon: '👥', description: 'Hall of fame — λίστα δημόσιων μελών' },
  { key: 'results',  label: 'Αποτελέσματα',  path: '/results',  icon: '🏅', description: 'Αποτελέσματα brevets' },
  { key: 'live',     label: 'Live',           path: '/live',     icon: '📡', description: 'Live παρακολούθηση αναβατών' },
  { key: 'about',    label: 'Σχετικά',        path: '/about',    icon: 'ℹ️', description: 'Σελίδα "Σχετικά με την πλατφόρμα"' },
  { key: 'brevets',  label: 'Brevets',        path: '/brevets',  icon: '📅', description: 'Ημερολόγιο brevets' },
  { key: 'profile',  label: 'Προφίλ',         path: '/profile',  icon: '👤', description: 'Προφίλ αναβάτη' },
];

type PagesEnabled = Record<string, boolean>;

interface UserActivity {
  email: string;
  displayName: string;
  lastSeenWeb?: string;
  firstSeenWeb?: string;
  loginCountWeb?: number;
  linkedLegacyMemberId?: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [authorized, setAuthorized]     = useState(false);
  const [checking,   setChecking]       = useState(true);
  const [pages,      setPages]          = useState<PagesEnabled>({});
  const [saving,     setSaving]         = useState<string | null>(null);
  const [savedAt,    setSavedAt]        = useState<string | null>(null);
  const [memberCount, setMemberCount]   = useState<number | null>(null);
  const [brevetCount, setBrevetCount]   = useState<number | null>(null);
  const [webUsers,   setWebUsers]       = useState<UserActivity[]>([]);

  // ── Auth check ─────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.email) { router.replace('/'); return; }
    checkAdmin(session.user.email);
  }, [session, status]);

  async function checkAdmin(email: string) {
    try {
      // Find user doc by email → get linkedLegacyMemberId
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('email', '==', email))
      );
      if (usersSnap.empty) { router.replace('/'); return; }

      const linkedId = usersSnap.docs[0].data().linkedLegacyMemberId?.toString() ?? '';
      if (!linkedId) { router.replace('/'); return; }

      // Check account_type on member document
      const memberSnap = await getDoc(doc(db, 'members', linkedId));
      if (!memberSnap.exists()) { router.replace('/'); return; }

      const accountType = memberSnap.data().account_type?.toString() ?? 'user';
      if (accountType !== 'admin') { router.replace('/'); return; }

      // Authorized — load settings
      setAuthorized(true);
      await loadSettings();
      await loadStats();
    } catch (e) {
      console.error('Admin check error:', e);
      router.replace('/');
    } finally {
      setChecking(false);
    }
  }

  async function loadSettings() {
    try {
      const snap = await getDoc(doc(db, 'app_content', 'settings'));
      if (snap.exists()) {
        const data = snap.data();
        setPages(data.pagesEnabled ?? {});
      } else {
        // Default — all enabled
        const defaults: PagesEnabled = {};
        PAGES.forEach(p => { defaults[p.key] = true; });
        setPages(defaults);
      }
    } catch (e) {
      console.error('Settings load error:', e);
    }
  }

  async function loadStats() {
    try {
      // Member count (public profiles)
      const membersSnap = await getDocs(
        query(collection(db, 'members'), where('profile_type', '==', 'public'))
      );
      setMemberCount(membersSnap.size);

      // Brevet count current year
      const year = new Date().getFullYear();
      const brevetsSnap = await getDocs(
        query(
          collection(db, 'all_brevets'),
          where('info.date', '>=', `${year}-01-01`),
          where('info.date', '<=', `${year}-12-31`)
        )
      );
      setBrevetCount(brevetsSnap.size);
    } catch {}

    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('lastSeenWeb', 'desc'), limit(50)));
      const list: UserActivity[] = snap.docs.map(d => {
        const x = d.data();
        return {
          email: x.email ?? '',
          displayName: x.displayName ?? x.email ?? '',
          lastSeenWeb: x.lastSeenWeb,
          firstSeenWeb: x.firstSeenWeb,
          loginCountWeb: x.loginCountWeb,
          linkedLegacyMemberId: x.linkedLegacyMemberId,
        };
      });
      setWebUsers(list);
    } catch {}
  }

  async function togglePage(key: string, value: boolean) {
    setSaving(key);
    try {
      const updated = { ...pages, [key]: value };
      setPages(updated);
      await setDoc(doc(db, 'app_content', 'settings'), {
        pagesEnabled: updated,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setSavedAt(new Date().toLocaleTimeString('el-GR'));
    } catch (e) {
      console.error('Save error:', e);
      setPages(prev => ({ ...prev, [key]: !value })); // revert
    } finally {
      setSaving(null);
    }
  }

  // ── Loading / auth states ──────────────────────────────────────────
  if (checking || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) return null;

  // ── Admin UI ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔧</span>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30
              px-2 py-1 rounded-full font-bold">ADMIN</span>
          </div>
          <p className="text-white/40 text-sm">
            {session?.user?.email} · Μόνο για εσένα
          </p>
          {savedAt && (
            <p className="text-green-400 text-xs mt-1">✓ Αποθηκεύτηκε στις {savedAt}</p>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {memberCount ?? '—'}
            </div>
            <div className="text-white/40 text-xs mt-1">Δημόσια προφίλ</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {brevetCount ?? '—'}
            </div>
            <div className="text-white/40 text-xs mt-1">Brevets {new Date().getFullYear()}</div>
          </div>
        </div>

        {/* Page visibility toggles */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-white font-bold">Ορατότητα Σελίδων</h2>
            <p className="text-white/40 text-xs mt-1">
              Απενεργοποίησε μια σελίδα για να εμφανίζει "Coming soon" στους επισκέπτες
            </p>
          </div>

          <div className="divide-y divide-white/5">
            {PAGES.map((page) => {
              const isEnabled = pages[page.key] !== false; // default true
              const isSaving  = saving === page.key;

              return (
                <div key={page.key}
                  className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{page.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm">{page.label}</span>
                        <span className="text-white/30 text-xs font-mono">{page.path}</span>
                      </div>
                      <p className="text-white/40 text-xs">{page.description}</p>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => togglePage(page.key, !isEnabled)}
                    disabled={isSaving}
                    className={`relative w-12 h-6 rounded-full transition-all duration-200
                      focus:outline-none ${isSaving ? 'opacity-50' : ''}
                      ${isEnabled ? 'bg-cyan-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white
                      transition-all duration-200 shadow-sm
                      ${isEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Web activity */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-white font-bold">Δραστηριότητα Web</h2>
            <p className="text-white/40 text-xs mt-1">
              Μέλη που έχουν επισκεφτεί το site — ταξινομημένα κατά τελευταία επίσκεψη
            </p>
          </div>
          {webUsers.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">Δεν υπάρχουν δεδομένα ακόμη</p>
          ) : (
            <div className="divide-y divide-white/5">
              {webUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3 gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{u.displayName || u.email}</p>
                    <p className="text-white/35 text-xs truncate">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {u.lastSeenWeb ? (
                      <>
                        <p className="text-cyan-400 text-xs font-mono">
                          {new Date(u.lastSeenWeb).toLocaleDateString('el-GR')}
                        </p>
                        <p className="text-white/30 text-xs">
                          {u.loginCountWeb ?? 0} επισκέψεις
                        </p>
                      </>
                    ) : (
                      <p className="text-white/20 text-xs">—</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-4">Γρήγορες Ενέργειες</h2>
          <div className="flex flex-col gap-3">
            <Link href="/admin/brevets"
  className="flex items-center justify-between px-4 py-3
    bg-white/5 hover:bg-white/10 rounded-xl transition-colors group">
  <span className="text-white/70 text-sm group-hover:text-white">📅 Επεξεργασία Brevets</span>
  <span className="text-white/30 text-xs">→</span>
</Link>
            <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3
                bg-white/5 hover:bg-white/10 rounded-xl transition-colors group">
              <span className="text-white/70 text-sm group-hover:text-white">Firebase Console</span>
              <span className="text-white/30 text-xs">→</span>
            </a>
            <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3
                bg-white/5 hover:bg-white/10 rounded-xl transition-colors group">
              <span className="text-white/70 text-sm group-hover:text-white">Vercel Dashboard</span>
              <span className="text-white/30 text-xs">→</span>
            </a>            
          </div>
        </div>
        
        <p className="text-white/20 text-xs text-center mt-8">
          /admin · GRC Platform Admin
        </p>

      </div>
    </div>
  );
}
