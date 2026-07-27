'use client';

// app/admin/members/[id]/page.tsx
// Admin — edit a member's registry data. Mirrors the mobile app's
// ADMIN-ONLY lib/screens/member_edit_screen.dart field set exactly.
// Writes go through /api/admin/member/update (Admin SDK, admin-role gated)
// since `members` has field-restricted client update rules.

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import Link from 'next/link';

interface FormState {
  surnameEl: string;
  nameEl: string;
  surnameEn: string;
  nameEn: string;
  fatherNameEl: string;
  fatherNameEn: string;
  regLepoteDisplayId: string;
  regHarDisplayId: string;
  lepoteKey: string;
  lepoteStatus: string;
  lepoteInsurance: string;
  harKey: string;
  harStatus: string;
  accountType: string;
}

const EMPTY: FormState = {
  surnameEl: '', nameEl: '', surnameEn: '', nameEn: '',
  fatherNameEl: '', fatherNameEn: '',
  regLepoteDisplayId: '', regHarDisplayId: '',
  lepoteKey: '', lepoteStatus: '', lepoteInsurance: '',
  harKey: '', harStatus: '',
  accountType: 'user',
};

const ACCOUNT_TYPES = [
  { value: 'free', label: 'free — βασικός χρήστης (legacy)' },
  { value: 'user', label: 'user — κανονικός χρήστης' },
  { value: 'admin', label: 'admin — διαχειριστής' },
];

export default function AdminMemberEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.email) { router.replace('/'); return; }
    checkAdmin(session.user.email);
  }, [session, status]);

  async function checkAdmin(email: string) {
    try {
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('email', '==', email))
      );
      if (usersSnap.empty) { router.replace('/'); return; }

      const linkedId = usersSnap.docs[0].data().linkedLegacyMemberId?.toString() ?? '';
      if (!linkedId) { router.replace('/'); return; }

      const memberSnap = await getDoc(doc(db, 'members', linkedId));
      if (!memberSnap.exists()) { router.replace('/'); return; }

      const accountType = memberSnap.data().account_type?.toString() ?? 'user';
      if (accountType !== 'admin') { router.replace('/'); return; }

      setAuthorized(true);
      await loadMember();
    } catch (e) {
      console.error('Admin check error:', e);
      router.replace('/');
    } finally {
      setChecking(false);
    }
  }

  async function loadMember() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/member/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Load failed');
      const m = json.member;
      setForm({
        surnameEl: m.surnameEl, nameEl: m.nameEl,
        surnameEn: m.surnameEn, nameEn: m.nameEn,
        fatherNameEl: m.fatherNameEl, fatherNameEn: m.fatherNameEn,
        regLepoteDisplayId: m.regLepoteDisplayId, regHarDisplayId: m.regHarDisplayId,
        lepoteKey: m.lepoteKey, lepoteStatus: m.lepoteStatus, lepoteInsurance: m.lepoteInsurance,
        harKey: m.harKey, harStatus: m.harStatus,
        accountType: m.accountType || 'user',
      });
    } catch (e: any) {
      console.error('Member load error:', e);
      setError(e.message ?? 'Σφάλμα φόρτωσης');
    } finally {
      setLoading(false);
    }
  }

  function set(key: keyof FormState, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/member/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      setSaved(true);
    } catch (e: any) {
      console.error('Member save error:', e);
      setError(e.message ?? 'Σφάλμα αποθήκευσης');
    } finally {
      setSaving(false);
    }
  }

  if (checking || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <Link href="/admin/members" className="text-cyan-400 text-xs hover:underline mb-2 inline-block">
            ← Αναζήτηση Μελών
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✏️</span>
            <h1 className="text-2xl font-bold text-white">Επεξεργασία Μητρώου</h1>
          </div>
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/25
            rounded-xl px-4 py-2 mt-3">
            <span className="text-orange-400">⚠️</span>
            <p className="text-white/70 text-xs">Λειτουργία Admin — master_id: {memberId}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <Section title="Ονοματεπώνυμο">
              <Field label="Επώνυμο (EL)" value={form.surnameEl} onChange={v => set('surnameEl', v)} />
              <Field label="Όνομα (EL)" value={form.nameEl} onChange={v => set('nameEl', v)} />
              <Field label="Επώνυμο (EN)" value={form.surnameEn} onChange={v => set('surnameEn', v)} />
              <Field label="Όνομα (EN)" value={form.nameEn} onChange={v => set('nameEn', v)} />
              <Field label="Πατρώνυμο (EL)" value={form.fatherNameEl} onChange={v => set('fatherNameEl', v)} />
              <Field label="Πατρώνυμο (EN)" value={form.fatherNameEn} onChange={v => set('fatherNameEn', v)} />
            </Section>

            <Section title="Αριθμοί Μητρώου (εμφάνισης)">
              <Field label="ΛΕ.ΠΟ.Τ.Ε. μητρώο (info.reg_lepote_id)" value={form.regLepoteDisplayId} onChange={v => set('regLepoteDisplayId', v)} />
              <Field label="H.A.R. μητρώο (info.reg_har_id)" value={form.regHarDisplayId} onChange={v => set('regHarDisplayId', v)} />
            </Section>

            <Section title="Κλειδιά reg & κατάσταση">
              <Field label="reg_lepote.id (κλειδί)" value={form.lepoteKey} onChange={v => set('lepoteKey', v)} />
              <Field label="reg_lepote.status" value={form.lepoteStatus} onChange={v => set('lepoteStatus', v)} />
              <Field label="reg_har.id (κλειδί)" value={form.harKey} onChange={v => set('harKey', v)} />
              <Field label="reg_har.status" value={form.harStatus} onChange={v => set('harStatus', v)} />
            </Section>

            <Section title="Ασφάλιση">
              <Field label="reg_lepote.insurance (τιμή/έτος — κενό = ΛΗΞΗ)" value={form.lepoteInsurance} onChange={v => set('lepoteInsurance', v)} />
            </Section>

            <Section title="Τύπος Λογαριασμού">
              <select
                value={form.accountType}
                onChange={e => set('accountType', e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm
                  focus:outline-none focus:border-cyan-500/50"
              >
                {ACCOUNT_TYPES.map(o => (
                  <option key={o.value} value={o.value} className="bg-[#0D2137]">{o.label}</option>
                ))}
              </select>
            </Section>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {saved && <p className="text-green-400 text-sm">✅ Αποθηκεύτηκε</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50
                text-white font-bold rounded-xl px-4 py-3.5 transition-colors"
            >
              {saving ? 'Αποθήκευση...' : '💾 Αποθήκευση στο Firebase'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-cyan-400 text-xs font-bold tracking-wide mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-white/50 text-xs mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm
          focus:outline-none focus:border-cyan-500/50"
      />
    </div>
  );
}
