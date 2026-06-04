'use client';

// app/organizer/profile/page.tsx
// Organiser profile — edits their clubs/{clubId} document

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { db } from '@/app/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

interface ClubProfile {
  // Read-only (managed by admin)
  CLUB_NAME_FULL_GR:  string;
  CLUB_NAME_SHORT_GR: string;
  CLUB_NAME_SHORT_EN: string;
  ACP_CLUB_NAME_EN:   string;
  COUNTRY_CODE:       string;
  total_brevets:      number;
  last_brevet_year:   number;
  // Editable by organiser
  DESCRIPTION:        string;
  WEBSITE_URL:        string;
  contactName:        string;
  contactPhone:       string;
  iban:               string;
}

const EMPTY: Omit<ClubProfile, 'CLUB_NAME_FULL_GR' | 'CLUB_NAME_SHORT_GR' |
  'CLUB_NAME_SHORT_EN' | 'ACP_CLUB_NAME_EN' | 'COUNTRY_CODE' |
  'total_brevets' | 'last_brevet_year'> = {
  DESCRIPTION: '', WEBSITE_URL: '',
  contactName: '', contactPhone: '', iban: '',
};

// ── UI helpers ────────────────────────────────────────────────────────────────
const inp = `w-full bg-white/5 border border-white/15 text-white rounded-xl px-4 py-2.5
  text-sm focus:outline-none focus:border-cyan-500/60 placeholder-white/25`;

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-white/60 text-xs font-semibold uppercase
        tracking-wider mb-1.5">
        {label}
        {hint && <span className="ml-2 text-white/30 normal-case font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="mb-3">
      <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-white/80 text-sm">{value || '—'}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OrganizerProfilePage() {
  const { organizer, isOrganizer, organizerLoaded } = useAuth();
  const router = useRouter();

  const [profile, setProfile]   = useState<ClubProfile | null>(null);
  const [form, setForm]         = useState({ ...EMPTY });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saveError, setSaveError] = useState('');

  // Guard
  useEffect(() => {
    if (!organizerLoaded) return;
    if (!isOrganizer) { router.replace('/login'); return; }
  }, [organizerLoaded, isOrganizer]);

  // Load club data
  useEffect(() => {
    if (!organizer?.clubId) return;
    getDoc(doc(db, 'clubs', organizer.clubId)).then(snap => {
      if (!snap.exists()) { setLoading(false); return; }
      const d = snap.data();
      const p: ClubProfile = {
        CLUB_NAME_FULL_GR:  d.CLUB_NAME_FULL_GR  ?? '',
        CLUB_NAME_SHORT_GR: d.CLUB_NAME_SHORT_GR ?? '',
        CLUB_NAME_SHORT_EN: d.CLUB_NAME_SHORT_EN ?? '',
        ACP_CLUB_NAME_EN:   d.ACP_CLUB_NAME_EN   ?? '',
        COUNTRY_CODE:       d.COUNTRY_CODE        ?? '',
        total_brevets:      d.total_brevets       ?? 0,
        last_brevet_year:   d.last_brevet_year    ?? 0,
        DESCRIPTION:        d.DESCRIPTION         ?? '',
        WEBSITE_URL:        d.WEBSITE_URL         ?? '',
        contactName:        d.contactName         ?? '',
        contactPhone:       d.contactPhone        ?? '',
        iban:               d.iban                ?? '',
      };
      setProfile(p);
      setForm({
        DESCRIPTION: p.DESCRIPTION,
        WEBSITE_URL: p.WEBSITE_URL,
        contactName: p.contactName,
        contactPhone: p.contactPhone,
        iban:         p.iban,
      });
    }).finally(() => setLoading(false));
  }, [organizer]);

  const set = (key: keyof typeof EMPTY, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  async function handleSave() {
    if (!organizer?.clubId) return;
    setSaveError(''); setSaved(false); setSaving(true);
    try {
      const res = await fetch('/api/organizer/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: organizer.clubId, ...form }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setSaveError('Σφάλμα αποθήκευσης. Δοκίμασε ξανά.');
    } finally {
      setSaving(false);
    }
  }

  if (!organizerLoaded || loading) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isOrganizer) return null;

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/organizer/dashboard"
            className="text-white/40 hover:text-white text-sm transition-colors">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white flex-1">Προφίλ Διοργανωτή</h1>
        </div>

        {/* Club identity — read only */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5">
          <div className="flex items-center gap-4 mb-5">
            <img
              src={`/logos/${organizer?.clubId}.png`}
              alt={profile?.CLUB_NAME_SHORT_GR}
              className="w-20 h-20 object-contain rounded-full bg-white/5"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div>
              <p className="text-white font-bold text-lg">
                {profile?.CLUB_NAME_SHORT_GR || organizer?.clubNameGr}
              </p>
              <p className="text-white/50 text-sm">{profile?.CLUB_NAME_FULL_GR}</p>
              <p className="text-white/30 text-xs mt-0.5">ID: {organizer?.clubId}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-1 border-t border-white/10 pt-4">
            <ReadOnlyField label="Σύντομο όνομα EN" value={profile?.CLUB_NAME_SHORT_EN ?? ''} />
            <ReadOnlyField label="ACP Όνομα" value={profile?.ACP_CLUB_NAME_EN ?? ''} />
            <ReadOnlyField label="Χώρα" value={profile?.COUNTRY_CODE ?? ''} />
            <ReadOnlyField label="Συνολικά brevets" value={profile?.total_brevets ?? 0} />
            <ReadOnlyField label="Τελευταίο έτος" value={profile?.last_brevet_year ?? ''} />
          </div>

          <p className="text-white/25 text-xs mt-4">
            Τα παραπάνω στοιχεία διαχειρίζονται από τη διοίκηση — δεν μπορούν να αλλαχτούν εδώ.
          </p>
        </div>

        {/* Editable fields */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5">
          <h2 className="text-white font-bold text-base mb-4 pb-3 border-b border-white/10">
            ✏️ Στοιχεία επικοινωνίας
          </h2>

          <Field label="Υπεύθυνος επικοινωνίας">
            <input className={inp} value={form.contactName}
              onChange={e => set('contactName', e.target.value)}
              placeholder="Όνομα Επώνυμο" />
          </Field>

          <Field label="Τηλέφωνο επικοινωνίας">
            <input type="tel" className={inp} value={form.contactPhone}
              onChange={e => set('contactPhone', e.target.value)}
              placeholder="+30 6xx xxx xxxx" />
          </Field>

          <Field label="IBAN" hint="για είσπραξη κόστους συμμετοχής">
            <input className={`${inp} font-mono tracking-wider`}
              value={form.iban}
              onChange={e => set('iban', e.target.value.toUpperCase())}
              placeholder="GR00 0000 0000 0000 0000 0000 000"
              maxLength={34} />
          </Field>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5">
          <h2 className="text-white font-bold text-base mb-4 pb-3 border-b border-white/10">
            🌐 Παρουσίαση
          </h2>

          <Field label="Ιστοσελίδα">
            <input type="url" className={inp} value={form.WEBSITE_URL}
              onChange={e => set('WEBSITE_URL', e.target.value)}
              placeholder="https://..." />
          </Field>

          <Field label="Περιγραφή" hint="(εμφανίζεται στη σελίδα brevets)">
            <textarea className={`${inp} resize-none`} rows={5}
              value={form.DESCRIPTION}
              onChange={e => set('DESCRIPTION', e.target.value)}
              placeholder="Περιγραφή του συλλόγου..." />
          </Field>
        </div>

        {/* Feedback & Save */}
        {saveError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3
            text-red-400 text-sm mb-4">
            ⚠️ {saveError}
          </div>
        )}
        {saved && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3
            text-green-400 text-sm mb-4">
            ✓ Αποθηκεύτηκε
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/organizer/dashboard"
            className="flex-1 text-center bg-white/5 border border-white/10 text-white/60
              hover:text-white py-3 rounded-xl text-sm font-bold transition-all">
            Ακύρωση
          </Link>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold
              py-3 rounded-xl text-sm transition-all disabled:opacity-50
              flex items-center justify-center gap-2">
            {saving && (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/>
            )}
            {saving ? 'Αποθήκευση...' : '✓ Αποθήκευση'}
          </button>
        </div>

      </div>
    </div>
  );
}
