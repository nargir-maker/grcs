'use client';

// app/admin/brevets/[id]/page.tsx
// Edit a single brevet — all fields

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  doc, getDoc, updateDoc, collection,
  query, where, getDocs
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import Link from 'next/link';

interface BrevetData {
  // info
  title:         string;
  date:          string;
  distance:      string;
  type:          string;
  certification: string;
  organizerId:   string;
  coOrganizerId: string;
  // route
  start:         string;
  finish:        string;
  ascent:        string;
  descent:       string;
  duration:      string;
  gpxUrl:        string;
  mapUrl:        string;
  // extra
  imageUrl:      string;
  description:   string;
  registration:  string;
  closeTimeIso:  string;
  // controls — as JSON string for easy editing
  controlsJson:  string;
}

const EMPTY: BrevetData = {
  title:'', date:'', distance:'', type:'BRM', certification:'A.C.P.',
  organizerId:'', coOrganizerId:'',
  start:'', finish:'', ascent:'', descent:'', duration:'', gpxUrl:'', mapUrl:'',
  imageUrl:'', description:'', registration:'', closeTimeIso:'',
  controlsJson:'[]',
};

export default function EditBrevetPage() {
  const { data: session, status } = useSession();
  const router  = useRouter();
  const params  = useParams();
  const id      = params?.id as string;

  const [authorized, setAuthorized] = useState(false);
  const [checking,   setChecking]   = useState(true);
  const [form,       setForm]       = useState<BrevetData>(EMPTY);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState('');

  // ── Auth check ─────────────────────────────────────────────────────
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
      const memberSnap = await getDoc(doc(db, 'members', linkedId));
      if (!memberSnap.exists() || memberSnap.data().account_type !== 'admin') {
        router.replace('/'); return;
      }
      setAuthorized(true);
      await loadBrevet();
    } catch { router.replace('/'); }
    finally { setChecking(false); }
  }

  // ── Load brevet ────────────────────────────────────────────────────
  async function loadBrevet() {
    try {
      const snap = await getDoc(doc(db, 'all_brevets', id));
      if (!snap.exists()) { setError('Brevet not found'); setLoading(false); return; }
      const d     = snap.data();
      const info  = d.info   ?? {};
      const route = d.route  ?? {};
      const extra = d.extra  ?? {};
      const ctrls = d.controls ?? [];

      setForm({
        title:         info.title?.toString()         ?? '',
        date:          info.date?.toString()           ?? '',
        distance:      info.distance?.toString()       ?? '',
        type:          info.type?.toString()           ?? 'BRM',
        certification: info.certification?.toString()  ?? 'A.C.P.',
        organizerId:   info.organizerId?.toString()    ?? '',
        coOrganizerId: info.coOrganizerId?.toString()  ?? '',
        start:         route.start?.toString()         ?? '',
        finish:        route.finish?.toString()        ?? '',
        ascent:        route.ascent?.toString()        ?? '',
        descent:       route.descent?.toString()       ?? '',
        duration:      route.duration?.toString()      ?? '',
        gpxUrl:        route.gpxUrl?.toString()        ?? '',
        mapUrl:        route.mapUrl?.toString()        ?? '',
        imageUrl:      extra.imageUrl?.toString()      ?? '',
        description:   extra.description?.toString()   ?? '',
        registration:  extra.registration?.toString()  ?? '',
        closeTimeIso:  extra.closeTimeIso?.toString()  ?? '',
        controlsJson:  JSON.stringify(ctrls, null, 2),
      });
    } catch (e) { setError('Failed to load brevet'); }
    finally { setLoading(false); }
  }

  // ── Save ───────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setSaved(false); setError('');
    try {
      // Validate controls JSON
      let controls = [];
      try { controls = JSON.parse(form.controlsJson); }
      catch { setError('Τα Controls δεν είναι έγκυρο JSON'); setSaving(false); return; }

      await updateDoc(doc(db, 'all_brevets', id), {
        'info.title':           form.title,
        'info.date':            form.date,
        'info.distance':        parseInt(form.distance) || 0,
        'info.type':            form.type,
        'info.certification':   form.certification,
        'info.organizerId':     form.organizerId,
        'info.coOrganizerId':   form.coOrganizerId,
        'route.start':          form.start,
        'route.finish':         form.finish,
        'route.ascent':         parseInt(form.ascent)  || 0,
        'route.descent':        parseInt(form.descent) || 0,
        'route.duration':       form.duration,
        'route.gpxUrl':         form.gpxUrl,
        'route.mapUrl':         form.mapUrl,
        'extra.imageUrl':       form.imageUrl,
        'extra.description':    form.description,
        'extra.registration':   form.registration,
        'extra.closeTimeIso':   form.closeTimeIso,
        'controls':             controls,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      setError('Αποτυχία αποθήκευσης. Δοκίμασε ξανά.');
    } finally { setSaving(false); }
  }

  function set(key: keyof BrevetData, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  // ── UI helpers ─────────────────────────────────────────────────────
  function Field({ label, field, type = 'text', placeholder = '' }: {
    label: string; field: keyof BrevetData;
    type?: string; placeholder?: string;
  }) {
    return (
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase
          tracking-wider mb-1.5 block">{label}</label>
        <input
          type={type}
          value={form[field]}
          onChange={e => set(field, e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 text-white
            rounded-xl px-4 py-2.5 text-sm focus:outline-none
            focus:border-cyan-500/50 placeholder-white/20"
        />
      </div>
    );
  }

  function SelectField({ label, field, options }: {
    label: string; field: keyof BrevetData;
    options: { value: string; label: string }[];
  }) {
    return (
      <div>
        <label className="text-white/50 text-xs font-semibold uppercase
          tracking-wider mb-1.5 block">{label}</label>
        <select
          value={form[field]}
          onChange={e => set(field, e.target.value)}
          className="w-full bg-white/5 border border-white/10 text-white
            rounded-xl px-4 py-2.5 text-sm focus:outline-none
            focus:border-cyan-500/50 [&>option]:bg-slate-800"
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-white/10 bg-white/3">
          <h2 className="text-white font-semibold text-sm">{title}</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {children}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  if (checking || status === 'loading') return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-[#0A1628] px-6 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/brevets"
              className="text-white/40 hover:text-white text-sm transition-colors">
              ← Brevets
            </Link>
            <h1 className="text-xl font-bold text-white truncate max-w-xs">
              {loading ? '...' : form.title || id}
            </h1>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400
              disabled:opacity-50 text-black font-bold px-5 py-2.5
              rounded-xl transition-colors text-sm"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-black/30
                border-t-black rounded-full animate-spin" />
            ) : saved ? '✓ Αποθηκεύτηκε' : '💾 Αποθήκευση'}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400
            rounded-xl px-4 py-3 text-sm mb-4">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-500
              border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── INFO ── */}
            <Section title="📋 Βασικά Στοιχεία">
              <Field label="Τίτλος" field="title" placeholder="ΝΕΜΕΑ" />
              <Field label="Ημερομηνία" field="date" type="datetime-local" />
              <Field label="Απόσταση (km)" field="distance" type="number" placeholder="200" />
              <SelectField label="Τύπος" field="type" options={[
                { value:'BRM',   label:'BRM' },
                { value:'LRM',   label:'LRM' },
                { value:'FLC',   label:'Flèche' },
                { value:'PBP',   label:'PBP' },
                { value:'SRE',   label:'SRe' },
                { value:'BRM-100YEARS', label:'100 Years BRM' },
              ]} />
              <SelectField label="Πιστοποίηση" field="certification" options={[
                { value:'A.C.P.',       label:'A.C.P.' },
                { value:'H.A.R.',       label:'H.A.R.' },
                { value:'A.C.P./H.A.R.',label:'A.C.P. + H.A.R.' },
              ]} />
              <Field label="Organizer ID" field="organizerId" placeholder="650001" />
              <Field label="Co-Organizer ID" field="coOrganizerId" placeholder="(προαιρετικό)" />
            </Section>

            {/* ── ROUTE ── */}
            <Section title="🗺️ Διαδρομή">
              <Field label="Εκκίνηση" field="start" placeholder="ΕΛΕΥΣΙΝΑ" />
              <Field label="Τερματισμός" field="finish" placeholder="ΕΛΕΥΣΙΝΑ" />
              <Field label="Ανάβαση (m)" field="ascent" type="number" placeholder="1526" />
              <Field label="Κατάβαση (m)" field="descent" type="number" placeholder="0" />
              <Field label="Μέγιστος χρόνος" field="duration" placeholder="13:30" />
              <Field label="GPX URL" field="gpxUrl" placeholder="https://..." />
              <div className="sm:col-span-2">
                <Field label="Map URL (RideWithGPS / Komoot)" field="mapUrl" placeholder="https://ridewithgps.com/routes/..." />
              </div>
            </Section>

            {/* ── EXTRA ── */}
            <Section title="📸 Επιπλέον Στοιχεία">
              <div className="sm:col-span-2">
                <Field label="Image URL" field="imageUrl" placeholder="https://i.ibb.co/..." />
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="preview"
                    className="mt-2 h-24 w-full object-cover rounded-lg opacity-70" />
                )}
              </div>
              <Field label="Registration URL / Link" field="registration" placeholder="https://forms.gle/..." />
              <Field label="Λήξη εγγραφών (ISO)" field="closeTimeIso" placeholder="2026-02-11T23:59:00+02:00" />
              <div className="sm:col-span-2">
                <label className="text-white/50 text-xs font-semibold uppercase
                  tracking-wider mb-1.5 block">Περιγραφή</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={6}
                  className="w-full bg-white/5 border border-white/10 text-white
                    rounded-xl px-4 py-2.5 text-sm focus:outline-none
                    focus:border-cyan-500/50 resize-none"
                />
              </div>
            </Section>

            {/* ── CONTROLS ── */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
              <div className="px-5 py-3 border-b border-white/10">
                <h2 className="text-white font-semibold text-sm">🚩 Control Points (JSON)</h2>
                <p className="text-white/30 text-xs mt-0.5">
                  Επεξεργασία απευθείας σε JSON — πρόσεξε τη σύνταξη
                </p>
              </div>
              <div className="p-5">
                <textarea
                  value={form.controlsJson}
                  onChange={e => set('controlsJson', e.target.value)}
                  rows={10}
                  className="w-full bg-black/30 border border-white/10 text-green-400
                    rounded-xl px-4 py-3 text-xs font-mono focus:outline-none
                    focus:border-cyan-500/50 resize-none"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Bottom save */}
            <div className="flex justify-end gap-3 mt-6">
              <Link href="/admin/brevets"
                className="px-5 py-2.5 rounded-xl border border-white/10
                  text-white/60 hover:text-white text-sm transition-colors">
                Ακύρωση
              </Link>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400
                  disabled:opacity-50 text-black font-bold px-6 py-2.5
                  rounded-xl transition-colors text-sm"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-black/30
                    border-t-black rounded-full animate-spin" />
                ) : saved ? '✓ Αποθηκεύτηκε' : '💾 Αποθήκευση'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}