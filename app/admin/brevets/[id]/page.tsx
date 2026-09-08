'use client';

// app/admin/brevets/[id]/page.tsx
// Edit a single brevet — all fields

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  doc, getDoc, updateDoc, collection,
  query, where, getDocs
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import Link from 'next/link';
import { decodeParam } from '@/app/lib/routeParams';

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
  allowPreRide:     boolean;
  allowPostRide:    boolean;
  allowCustomStart: boolean;
  // controls — as JSON string for easy editing
  controlsJson:  string;
}

type StringField = Exclude<keyof BrevetData, 'allowPreRide' | 'allowPostRide' | 'allowCustomStart'>;
type BoolField = 'allowPreRide' | 'allowPostRide' | 'allowCustomStart';

function certNorm(cert: unknown): string {
  return (cert?.toString() ?? '').toUpperCase().replace(/[.\s]/g, '');
}

const EMPTY: BrevetData = {
  title:'', date:'', distance:'', type:'BRM', certification:'A.C.P.',
  organizerId:'', coOrganizerId:'',
  start:'', finish:'', ascent:'', descent:'', duration:'', gpxUrl:'', mapUrl:'',
  imageUrl:'', description:'', registration:'', closeTimeIso:'',
  allowPreRide:false, allowPostRide:false, allowCustomStart:false,
  controlsJson:'[]',
};

// ── UI helpers ─────────────────────────────────────────────────────
// Hoisted to module scope (NOT defined inside EditBrevetPage) so they keep a
// stable component identity across re-renders. When they used to be nested
// functions, every keystroke re-rendered EditBrevetPage, which redefined
// these as brand-new function references — React then treated each one as a
// different component type and remounted its whole subtree, killing focus
// (and any DOM-only state) on every keystroke.
function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (val: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-white/50 text-xs font-semibold uppercase
        tracking-wider mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 text-white
          rounded-xl px-4 py-2.5 text-sm focus:outline-none
          focus:border-cyan-500/50 placeholder-white/20"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-white/50 text-xs font-semibold uppercase
        tracking-wider mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
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

function Toggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between w-full bg-white/5 border
        border-white/10 rounded-xl px-4 py-2.5 text-left"
    >
      <span className="text-white/70 text-sm">{label}</span>
      <span
        className="w-10 h-6 rounded-full relative transition-colors shrink-0 ml-3"
        style={{ background: value ? '#06b6d4' : 'rgba(255,255,255,0.15)' }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
          style={{ transform: value ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </span>
    </button>
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

export default function EditBrevetPage() {
  const { data: session, status } = useSession();
  const router  = useRouter();
  const params  = useParams();
  const id      = decodeParam(params?.id as string);

  const [authorized, setAuthorized] = useState(false);
  const [checking,   setChecking]   = useState(true);
  const [form,       setForm]       = useState<BrevetData>(EMPTY);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState('');
  const initializedRef = useRef(false);

  // ── Auth check ─────────────────────────────────────────────────────
  // NextAuth's useSession() refetches on window focus by default, which
  // hands us a new `session` object every time the tab regains focus and
  // re-fires this effect. Without the ref guard below, that re-ran
  // checkAdmin → loadBrevet and silently overwrote any unsaved edits with
  // the last-saved Firestore data — the "switch tabs, my text disappears" bug.
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.email) { router.replace('/'); return; }
    if (initializedRef.current) return;
    initializedRef.current = true;
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
        allowPreRide:  extra.allowPreRide  !== undefined ? !!extra.allowPreRide  : certNorm(info.certification).includes('HAR'),
        allowPostRide: extra.allowPostRide !== undefined ? !!extra.allowPostRide : certNorm(info.certification).includes('HAR'),
        allowCustomStart: !!extra.allowCustomStart,
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
        'extra.allowPreRide':     form.allowPreRide,
        'extra.allowPostRide':    form.allowPostRide,
        'extra.allowCustomStart': form.allowCustomStart,
        'controls':             controls,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      setError('Αποτυχία αποθήκευσης. Δοκίμασε ξανά.');
    } finally { setSaving(false); }
  }

  function set(key: StringField, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function setBool(key: BoolField, val: boolean) {
    setForm(prev => ({ ...prev, [key]: val }));
    setSaved(false);
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
              <Field label="Τίτλος" value={form.title} onChange={v => set('title', v)} placeholder="ΝΕΜΕΑ" />
              <Field label="Ημερομηνία" value={form.date} onChange={v => set('date', v)} type="datetime-local" />
              <Field label="Απόσταση (km)" value={form.distance} onChange={v => set('distance', v)} type="number" placeholder="200" />
              <SelectField label="Τύπος" value={form.type} onChange={v => set('type', v)} options={[
                { value:'BRM',   label:'BRM' },
                { value:'LRM',   label:'LRM' },
                { value:'FLC',   label:'Flèche' },
                { value:'PBP',   label:'PBP' },
                { value:'SRE',   label:'SRe' },
                { value:'BRM-100YEARS', label:'100 Years BRM' },
              ]} />
              <SelectField label="Πιστοποίηση" value={form.certification} onChange={v => set('certification', v)} options={[
                { value:'A.C.P.',       label:'A.C.P.' },
                { value:'H.A.R.',       label:'H.A.R.' },
                { value:'A.C.P./H.A.R.',label:'A.C.P. + H.A.R.' },
              ]} />
              <Field label="Organizer ID" value={form.organizerId} onChange={v => set('organizerId', v)} placeholder="650001" />
              <Field label="Co-Organizer ID" value={form.coOrganizerId} onChange={v => set('coOrganizerId', v)} placeholder="(προαιρετικό)" />
            </Section>

            {/* ── ROUTE ── */}
            <Section title="🗺️ Διαδρομή">
              <Field label="Εκκίνηση" value={form.start} onChange={v => set('start', v)} placeholder="ΕΛΕΥΣΙΝΑ" />
              <Field label="Τερματισμός" value={form.finish} onChange={v => set('finish', v)} placeholder="ΕΛΕΥΣΙΝΑ" />
              <Field label="Ανάβαση (m)" value={form.ascent} onChange={v => set('ascent', v)} type="number" placeholder="1526" />
              <Field label="Κατάβαση (m)" value={form.descent} onChange={v => set('descent', v)} type="number" placeholder="0" />
              <Field label="Μέγιστος χρόνος" value={form.duration} onChange={v => set('duration', v)} placeholder="13:30" />
              <Field label="GPX URL" value={form.gpxUrl} onChange={v => set('gpxUrl', v)} placeholder="https://..." />
              <div className="sm:col-span-2">
                <Field label="Map URL (RideWithGPS / Komoot)" value={form.mapUrl} onChange={v => set('mapUrl', v)} placeholder="https://ridewithgps.com/routes/..." />
              </div>
            </Section>

            {/* ── EXTRA ── */}
            <Section title="📸 Επιπλέον Στοιχεία">
              <div className="sm:col-span-2">
                <Field label="Image URL" value={form.imageUrl} onChange={v => set('imageUrl', v)} placeholder="https://i.ibb.co/..." />
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="preview"
                    className="mt-2 h-24 w-full object-cover rounded-lg opacity-70" />
                )}
              </div>
              <Field label="Registration URL / Link" value={form.registration} onChange={v => set('registration', v)} placeholder="https://forms.gle/..." />
              <Field label="Λήξη εγγραφών (ISO)" value={form.closeTimeIso} onChange={v => set('closeTimeIso', v)} placeholder="2026-02-11T23:59:00+02:00" />
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

            {/* ── RIDE WINDOW ── */}
            <Section title="🚦 Pre/Post-ride">
              <Toggle label="Επιτρέπεται Pre-ride (πριν την επίσημη ημερομηνία)" value={form.allowPreRide} onChange={v => setBool('allowPreRide', v)} />
              <Toggle label="Επιτρέπεται Post-ride (μετά τη λήξη)" value={form.allowPostRide} onChange={v => setBool('allowPostRide', v)} />
              <div className="sm:col-span-2">
                <Toggle label="Ελεύθερη αφετηρία/τερματισμός (μόνο H.A.R., όχι A.C.P.)" value={form.allowCustomStart} onChange={v => setBool('allowCustomStart', v)} />
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