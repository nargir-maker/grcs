'use client';

// app/organizer/brevet/new/page.tsx
// Create a new brevet — organizer form
// Saves to all_brevets/{year}_{city}_{dist}_{organizerId} in Firestore
// GPX stored in Firebase Storage under gpx/{organizerId}/{filename}

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { db, storage } from '@/app/lib/firebase';
import {
  collection, doc, getDocs, getDoc, query,
  where, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';

// ── Constants ─────────────────────────────────────────────────────────────────
const STD_DISTANCES = [200, 300, 400, 600, 1000, 1200, 1400] as const;

const STD_DURATION: Record<number, number> = {
  200: 13.5, 300: 20, 400: 27, 600: 40,
  1000: 75, 1200: 90, 1400: 116,
};

const BREVET_TYPES = ['BRM', 'LRM', 'PBP', 'FLC', 'OTHER'] as const;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Control { km: number; name: string; staffed: boolean; }

interface FormState {
  // Basic
  title: string;
  type: string;
  distancePreset: number | 'other';
  distanceCustom: string;
  certification: string;
  organizerId: string;    // club ID — who organises the event
  coOrganizerId: string;

  // Schedule
  date: string;           // YYYY-MM-DD
  startTime: string;      // HH:MM
  durationHours: string;  // editable, auto-filled from distance
  allowPreride: boolean;
  prerideDate: string;
  prerideTime: string;
  allowPostride: boolean;
  postrideDate: string;
  postrideTime: string;

  // Status
  active: boolean;
  registrationOpen: boolean;

  // Route
  startCity: string;
  finishCity: string;
  ascent: string;
  descent: string;
  realKm: string;
  gpxUrl: string;         // Firebase Storage URL after upload
  externalGpxUrl: string; // Strava / Openrunner / ridewithgps / etc.
  mapUrl: string;

  // Details
  description: string;
  hasMedal: boolean;
  medalCost: string;
  entryCost: string;

  // Controls
  controls: Control[];
}

const EMPTY: FormState = {
  title: '', type: 'BRM', distancePreset: 200, distanceCustom: '',
  certification: 'A.C.P.', organizerId: '', coOrganizerId: '',
  date: '', startTime: '07:00', durationHours: '13.5',
  allowPreride: false, prerideDate: '', prerideTime: '07:00',
  allowPostride: false, postrideDate: '', postrideTime: '07:00',
  active: true, registrationOpen: false,
  startCity: '', finishCity: '', ascent: '', descent: '', realKm: '',
  gpxUrl: '', externalGpxUrl: '', mapUrl: '',
  description: '', hasMedal: false, medalCost: '', entryCost: '',
  controls: [],
};

// ── GPX helpers ───────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

interface GpxResult {
  realKm: number;
  ascent: number;
  descent: number;
  waypoints: { km: number; name: string }[];
}

function parseGpx(text: string): GpxResult {
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  const pts  = xml.querySelectorAll('trkpt');

  let distKm = 0, ascent = 0, descent = 0;
  let prevLat = 0, prevLng = 0, prevEle = 0, first = true;

  pts.forEach(pt => {
    const lat = parseFloat(pt.getAttribute('lat') ?? '0');
    const lng = parseFloat(pt.getAttribute('lon') ?? '0');
    const ele = parseFloat(pt.querySelector('ele')?.textContent ?? '0');
    if (!lat || !lng) return;
    if (!first) {
      distKm += haversineKm(prevLat, prevLng, lat, lng);
      const diff = ele - prevEle;
      if (diff > 0) ascent  += diff;
      else          descent += Math.abs(diff);
    }
    prevLat = lat; prevLng = lng; prevEle = ele; first = false;
  });

  // Waypoints (control points embedded in GPX)
  const wpts = xml.querySelectorAll('wpt');
  const waypoints: { km: number; name: string }[] = [];
  wpts.forEach(w => {
    const name = w.querySelector('name')?.textContent?.trim() ?? '';
    // We'll store km=0 for now; the user can edit once we show them
    waypoints.push({ km: 0, name });
  });

  return {
    realKm:  Math.round(distKm * 10) / 10,
    ascent:  Math.round(ascent),
    descent: Math.round(descent),
    waypoints,
  };
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5">
      <h2 className="text-white font-bold text-base mb-4 pb-3 border-b border-white/10">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
        {label}
        {hint && <span className="ml-2 text-white/30 normal-case font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = `w-full bg-white/5 border border-white/15 text-white rounded-xl px-4 py-2.5
  text-sm focus:outline-none focus:border-cyan-500/60 placeholder-white/25`;
const selectCls = `w-full bg-[#0f1f35] border border-white/15 text-white rounded-xl px-4 py-2.5
  text-sm focus:outline-none focus:border-cyan-500/60`;

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }: {
  value: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="flex items-center gap-3 group">
      <div className={`w-11 h-6 rounded-full transition-all relative ${
        value ? 'bg-cyan-500' : 'bg-white/15'
      }`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
          value ? 'left-[22px]' : 'left-0.5'
        }`} />
      </div>
      <span className="text-white/70 text-sm group-hover:text-white transition-colors">
        {label}
      </span>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NewBrevetPage() {
  const { organizer, isOrganizer } = useAuth();
  const router = useRouter();

  const [form, setForm]           = useState<FormState>({ ...EMPTY });
  const [clubs, setClubs]         = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');
  const [gpxUploading, setGpxUploading] = useState(false);
  const [gpxFile, setGpxFile]     = useState<File | null>(null);

  // "Copy from last year" state
  const [prevBrevets, setPrevBrevets] = useState<{ id: string; title: string; date: string }[]>([]);
  const [showCopy, setShowCopy]       = useState(false);
  const gpxInputRef = useRef<HTMLInputElement>(null);

  // Guard
  useEffect(() => {
    if (!isOrganizer) { router.replace('/login'); return; }
    // Pre-fill certification + organizerId from session
    setForm(f => ({
      ...f,
      certification: organizer!.clubId.startsWith('65') ? 'H.A.R.' : 'A.C.P.',
      organizerId: organizer!.clubId,
    }));
  }, [isOrganizer, organizer]);

  // Load clubs for organizer selector
  useEffect(() => {
    getDocs(collection(db, 'clubs')).then(snap => {
      setClubs(snap.docs
        .filter(d => (d.data().last_brevet_year ?? 0) >= 2020)
        .map(d => ({
          id:   d.id,
          name: d.data().CLUB_NAME_SHORT_GR ?? d.id,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'el')));
    });
  }, []);

  // Load organizer's previous brevets for "copy" feature
  useEffect(() => {
    if (!organizer?.clubId) return;
    getDocs(query(
      collection(db, 'all_brevets'),
      where('info.organizerId', '==', organizer.clubId)
    )).then(snap => {
      const items = snap.docs.map(d => ({
        id:    d.id,
        title: d.data().info?.title ?? d.id,
        date:  d.data().info?.date  ?? '',
      })).sort((a, b) => b.date.localeCompare(a.date));
      setPrevBrevets(items);
    });
  }, [organizer]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const set = (key: keyof FormState, val: any) =>
    setForm(f => ({ ...f, [key]: val }));

  const nominalDistance = (): number => {
    if (form.distancePreset === 'other') return parseFloat(form.distanceCustom) || 0;
    return form.distancePreset as number;
  };

  // Auto-fill duration when distance changes
  const onDistanceChange = (preset: number | 'other', custom = form.distanceCustom) => {
    setForm(f => ({
      ...f,
      distancePreset: preset,
      distanceCustom: custom,
      durationHours:
        preset !== 'other' ? String(STD_DURATION[preset as number] ?? '') : f.durationHours,
    }));
  };

  // End datetime (calculated)
  const endDatetime = () => {
    if (!form.date || !form.startTime || !form.durationHours) return null;
    const start = new Date(`${form.date}T${form.startTime}`);
    const hours = parseFloat(form.durationHours);
    if (isNaN(hours)) return null;
    return new Date(start.getTime() + hours * 3_600_000);
  };

  // ── GPX upload & parse ───────────────────────────────────────────────────
  async function handleGpx(file: File) {
    setGpxFile(file);
    setGpxUploading(true);
    try {
      const text   = await file.text();
      const parsed = parseGpx(text);

      // Upload to Firebase Storage
      const path    = `gpx/${organizer!.clubId}/${Date.now()}_${file.name}`;
      const ref     = storageRef(storage, path);
      await uploadBytes(ref, file, { contentType: 'application/gpx+xml' });
      const url     = await getDownloadURL(ref);

      // Auto-fill controls from waypoints if any
      const ctrlsFromWaypoints: Control[] = parsed.waypoints.map(w => ({
        km: w.km, name: w.name, staffed: false,
      }));

      setForm(f => ({
        ...f,
        gpxUrl:   url,
        realKm:   String(parsed.realKm),
        ascent:   String(parsed.ascent),
        descent:  String(parsed.descent),
        controls: ctrlsFromWaypoints.length > 0 ? ctrlsFromWaypoints : f.controls,
      }));
    } catch (e) {
      console.error('GPX error:', e);
      setSaveError('Σφάλμα κατά την επεξεργασία/ανέβασμα του GPX.');
    } finally {
      setGpxUploading(false);
    }
  }

  // ── Copy from previous brevet ────────────────────────────────────────────
  async function copyFrom(id: string) {
    try {
      const snap = await getDoc(doc(db, 'all_brevets', id));
      if (!snap.exists()) return;
      const d     = snap.data();
      const info  = d.info   ?? {};
      const route = d.route  ?? {};
      const extra = d.extra  ?? {};
      const ctrls: Control[] = (d.controls ?? []);

      const dist = parseInt(info.distance) || 200;
      const isStd = (STD_DISTANCES as readonly number[]).includes(dist);

      setForm(f => ({
        ...f,
        title:          info.title        ?? f.title,
        type:           info.type         ?? f.type,
        distancePreset: isStd ? dist : 'other',
        distanceCustom: isStd ? '' : String(dist),
        certification:  info.certification ?? f.certification,
        organizerId:    info.organizerId   ?? f.organizerId,
        coOrganizerId:  info.coOrganizerId ?? '',
        durationHours:  String(route.duration  ?? (STD_DURATION[dist] ?? '')),
        startTime:      info.startTime    ?? f.startTime,
        startCity:      route.start       ?? f.startCity,
        finishCity:     route.finish      ?? f.finishCity,
        ascent:         String(route.ascent  ?? ''),
        descent:        String(route.descent ?? ''),
        realKm:         String(route.realKm  ?? ''),
        externalGpxUrl: route.externalGpxUrl ?? '',
        mapUrl:         route.mapUrl      ?? '',
        description:    extra.description ?? '',
        hasMedal:       extra.hasMedal    ?? false,
        medalCost:      String(extra.medalCost  ?? ''),
        entryCost:      String(extra.entryCost  ?? ''),
        controls:       ctrls,
        // Reset dates/status — the organizer must fill these for the new year
        date: '', active: true, registrationOpen: false,
        gpxUrl: '',
        allowPreride: info.allowPreride ?? false,
        allowPostride: info.allowPostride ?? false,
      }));
      setShowCopy(false);
    } catch (e) {
      console.error('Copy error:', e);
    }
  }

  // ── Control helpers ──────────────────────────────────────────────────────
  const addControl    = () => set('controls', [...form.controls, { km: 0, name: '', staffed: false }]);
  const removeControl = (i: number) => set('controls', form.controls.filter((_, j) => j !== i));
  const updateControl = (i: number, key: keyof Control, val: any) =>
    set('controls', form.controls.map((c, j) => j === i ? { ...c, [key]: val } : c));

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaveError('');
    if (!form.title.trim())  { setSaveError('Συμπλήρωσε τίτλο.'); return; }
    if (!form.date)          { setSaveError('Συμπλήρωσε ημερομηνία.'); return; }
    if (!form.organizerId)   { setSaveError('Επίλεξε διοργανωτή.'); return; }

    const dist = nominalDistance();
    if (!dist) { setSaveError('Επίλεξε απόσταση.'); return; }

    setSaving(true);
    try {
      const year     = new Date(form.date).getFullYear();
      const citySlug = form.startCity.toLowerCase()
        .replace(/\s+/g, '-').replace(/[^\w-]/g, '').slice(0, 20) || 'unknown';
      const docId    = `${year}_${citySlug}_${dist}_${form.organizerId}`;

      const endDt = endDatetime();

      await setDoc(doc(db, 'all_brevets', docId), {
        info: {
          title:          form.title.trim(),
          date:           form.date,
          startTime:      form.startTime,
          distance:       dist,
          type:           form.type,
          certification:  form.certification,
          organizerId:    form.organizerId,
          coOrganizerId:  form.coOrganizerId,
          active:         form.active,
          registrationOpen: form.registrationOpen,
          allowPreride:   form.allowPreride,
          prerideDate:    form.allowPreride ? `${form.prerideDate}T${form.prerideTime}` : null,
          allowPostride:  form.allowPostride,
          postrideDate:   form.allowPostride ? `${form.postrideDate}T${form.postrideTime}` : null,
          closeTimeIso:   endDt?.toISOString() ?? null,
        },
        route: {
          start:          form.startCity,
          finish:         form.finishCity,
          ascent:         parseFloat(form.ascent)  || 0,
          descent:        parseFloat(form.descent) || 0,
          realKm:         parseFloat(form.realKm)  || 0,
          duration:       parseFloat(form.durationHours) || 0,
          gpxUrl:         form.gpxUrl,
          externalGpxUrl: form.externalGpxUrl,
          mapUrl:         form.mapUrl,
        },
        extra: {
          description: form.description.trim(),
          hasMedal:    form.hasMedal,
          medalCost:   form.hasMedal ? (parseFloat(form.medalCost) || 0) : 0,
          entryCost:   parseFloat(form.entryCost) || 0,
          registration: '',
          imageUrl:    '',
          closeTimeIso: endDt?.toISOString() ?? '',
        },
        controls:  form.controls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push('/organizer/dashboard');
    } catch (e: any) {
      console.error('Save error:', e);
      setSaveError('Σφάλμα αποθήκευσης. Δοκίμασε ξανά.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!isOrganizer) return null;

  const endDt    = endDatetime();
  const distVal  = nominalDistance();

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/organizer/dashboard"
            className="text-white/40 hover:text-white text-sm transition-colors">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white flex-1">Νέο Brevet</h1>
        </div>

        {/* ── Copy from last year ── */}
        <div className="mb-6">
          <button type="button" onClick={() => setShowCopy(v => !v)}
            className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors flex items-center gap-2">
            📋 {showCopy ? 'Κλείσιμο' : 'Αντιγραφή από προηγούμενο brevet'}
          </button>
          {showCopy && (
            <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 max-h-60 overflow-y-auto">
              {prevBrevets.length === 0
                ? <p className="text-white/30 text-sm">Δεν υπάρχουν προηγούμενα brevets.</p>
                : prevBrevets.map(b => (
                  <button key={b.id} type="button" onClick={() => copyFrom(b.id)}
                    className="text-left px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
                    <p className="text-white text-sm font-medium">{b.title}</p>
                    <p className="text-white/40 text-xs">{b.date}</p>
                  </button>
                ))
              }
            </div>
          )}
        </div>

        {/* ── SECTION 1: Βασικά στοιχεία ── */}
        <Section title="📋 Βασικά στοιχεία">

          <Field label="Τίτλος">
            <input className={inputCls} value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="π.χ. Σαρωνικός 200" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Τύπος">
              <select className={selectCls} value={form.type}
                onChange={e => set('type', e.target.value)}>
                {BREVET_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>

            <Field label="Πιστοποίηση">
              <select className={selectCls} value={form.certification}
                onChange={e => set('certification', e.target.value)}>
                <option>A.C.P.</option>
                <option>H.A.R.</option>
              </select>
            </Field>
          </div>

          <Field label="Απόσταση">
            <div className="flex gap-2 flex-wrap">
              {STD_DISTANCES.map(d => (
                <button key={d} type="button"
                  onClick={() => onDistanceChange(d)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all ${
                    form.distancePreset === d
                      ? 'bg-cyan-500 text-black border-transparent'
                      : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                  }`}>
                  {d}km
                </button>
              ))}
              <button type="button"
                onClick={() => onDistanceChange('other')}
                className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all ${
                  form.distancePreset === 'other'
                    ? 'bg-cyan-500 text-black border-transparent'
                    : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                }`}>
                Άλλη
              </button>
            </div>
            {form.distancePreset === 'other' && (
              <input type="number" className={`${inputCls} mt-2 max-w-[150px]`}
                placeholder="km" value={form.distanceCustom}
                onChange={e => onDistanceChange('other', e.target.value)} />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Διοργανωτής">
              <select className={selectCls} value={form.organizerId}
                onChange={e => set('organizerId', e.target.value)}>
                <option value="">— επίλεξε —</option>
                {clubs.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Συνδιοργανωτής" hint="(προαιρετικό)">
              <select className={selectCls} value={form.coOrganizerId}
                onChange={e => set('coOrganizerId', e.target.value)}>
                <option value="">—</option>
                {clubs.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* ── SECTION 2: Χρονοδιάγραμμα ── */}
        <Section title="📅 Χρονοδιάγραμμα">

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ημερομηνία">
              <input type="date" className={inputCls} value={form.date}
                onChange={e => set('date', e.target.value)} />
            </Field>
            <Field label="Ώρα εκκίνησης">
              <input type="time" className={inputCls} value={form.startTime}
                onChange={e => set('startTime', e.target.value)} />
            </Field>
          </div>

          <Field label="Διάρκεια (ώρες)" hint="προσυμπληρώνεται από την απόσταση">
            <input type="number" step="0.5" className={`${inputCls} max-w-[150px]`}
              value={form.durationHours}
              onChange={e => set('durationHours', e.target.value)} />
            {endDt && (
              <p className="text-white/40 text-xs mt-1.5">
                Λήξη: {endDt.toLocaleDateString('el-GR', {
                  weekday:'short', day:'numeric', month:'short'
                })} στις {endDt.toLocaleTimeString('el-GR', {
                  hour:'2-digit', minute:'2-digit'
                })}
              </p>
            )}
          </Field>

          <div className="space-y-3">
            <Toggle value={form.allowPreride} onChange={v => set('allowPreride', v)}
              label="Επιτρέπεται Pre-ride" />
            {form.allowPreride && (
              <div className="grid grid-cols-2 gap-4 pl-14">
                <Field label="Ημ/νία Pre-ride">
                  <input type="date" className={inputCls} value={form.prerideDate}
                    onChange={e => set('prerideDate', e.target.value)} />
                </Field>
                <Field label="Ώρα">
                  <input type="time" className={inputCls} value={form.prerideTime}
                    onChange={e => set('prerideTime', e.target.value)} />
                </Field>
              </div>
            )}

            <Toggle value={form.allowPostride} onChange={v => set('allowPostride', v)}
              label="Επιτρέπεται Post-ride" />
            {form.allowPostride && (
              <div className="grid grid-cols-2 gap-4 pl-14">
                <Field label="Ημ/νία Post-ride">
                  <input type="date" className={inputCls} value={form.postrideDate}
                    onChange={e => set('postrideDate', e.target.value)} />
                </Field>
                <Field label="Ώρα">
                  <input type="time" className={inputCls} value={form.postrideTime}
                    onChange={e => set('postrideTime', e.target.value)} />
                </Field>
              </div>
            )}
          </div>
        </Section>

        {/* ── SECTION 3: Κατάσταση ── */}
        <Section title="🔘 Κατάσταση">
          <div className="space-y-4">
            <Toggle value={form.active} onChange={v => set('active', v)}
              label="Ενεργό (εμφανίζεται στους αναβάτες)" />
            <Toggle value={form.registrationOpen} onChange={v => set('registrationOpen', v)}
              label="Ανοιχτές εγγραφές" />
          </div>
        </Section>

        {/* ── SECTION 4: Διαδρομή & GPX ── */}
        <Section title="🗺️ Διαδρομή & GPX">

          <Field label="GPX αρχείο" hint="ανεβάζει αυτόματα στη Firebase Storage">
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => gpxInputRef.current?.click()}
                disabled={gpxUploading}
                className="bg-white/10 border border-white/20 text-white/80 hover:text-white
                  px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                  disabled:opacity-50 flex items-center gap-2">
                {gpxUploading
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Ανέβασμα...</>
                  : '📁 Επιλογή GPX'}
              </button>
              {gpxFile && !gpxUploading && (
                <span className="text-green-400 text-sm">✓ {gpxFile.name}</span>
              )}
              {form.gpxUrl && (
                <a href={form.gpxUrl} target="_blank" rel="noopener"
                  className="text-cyan-400 text-xs hover:text-cyan-300">
                  Προβολή ↗
                </a>
              )}
            </div>
            <input ref={gpxInputRef} type="file" accept=".gpx" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleGpx(e.target.files[0]); }} />
          </Field>

          <Field label="Εξωτερικό GPX URL" hint="Strava, Openrunner, RideWithGPS κλπ.">
            <input className={inputCls} value={form.externalGpxUrl}
              onChange={e => set('externalGpxUrl', e.target.value)}
              placeholder="https://www.strava.com/routes/..." />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Πόλη εκκίνησης">
              <input className={inputCls} value={form.startCity}
                onChange={e => set('startCity', e.target.value)}
                placeholder="π.χ. Αθήνα" />
            </Field>
            <Field label="Πόλη τερματισμού">
              <input className={inputCls} value={form.finishCity}
                onChange={e => set('finishCity', e.target.value)}
                placeholder="π.χ. Αθήνα" />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Πραγματικά km" hint="από GPX">
              <input type="number" className={inputCls} value={form.realKm}
                onChange={e => set('realKm', e.target.value)} />
            </Field>
            <Field label="Ανηφόρα (m)" hint="από GPX">
              <input type="number" className={inputCls} value={form.ascent}
                onChange={e => set('ascent', e.target.value)} />
            </Field>
            <Field label="Κατηφόρα (m)" hint="από GPX">
              <input type="number" className={inputCls} value={form.descent}
                onChange={e => set('descent', e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* ── SECTION 5: Σημεία Ελέγχου ── */}
        <Section title="📍 Σημεία Ελέγχου (Controls)">
          {form.controls.length === 0
            ? <p className="text-white/30 text-sm mb-3">
                Δεν έχουν οριστεί σημεία ελέγχου.
                {gpxFile ? ' (Δεν βρέθηκαν waypoints στο GPX.)' : ''}
              </p>
            : (
              <div className="space-y-3 mb-4">
                {form.controls.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/3 rounded-xl p-3">
                    <span className="text-white/40 text-xs font-mono w-5">{i+1}</span>
                    <input type="number" placeholder="km"
                      className={`${inputCls} w-20 shrink-0`}
                      value={c.km || ''} onChange={e => updateControl(i, 'km', parseFloat(e.target.value)||0)} />
                    <input placeholder="Περιγραφή (π.χ. Πλατεία Συντάγματος)"
                      className={`${inputCls} flex-1`}
                      value={c.name} onChange={e => updateControl(i, 'name', e.target.value)} />
                    <label className="flex items-center gap-1.5 text-white/50 text-xs shrink-0 cursor-pointer">
                      <input type="checkbox" checked={c.staffed}
                        onChange={e => updateControl(i, 'staffed', e.target.checked)}
                        className="accent-cyan-500" />
                      Επανδρωμένο
                    </label>
                    <button type="button" onClick={() => removeControl(i)}
                      className="text-white/25 hover:text-red-400 transition-colors text-lg shrink-0">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )
          }
          <button type="button" onClick={addControl}
            className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
            + Προσθήκη σημείου
          </button>
        </Section>

        {/* ── SECTION 6: Λεπτομέρειες ── */}
        <Section title="💬 Λεπτομέρειες">

          <Field label="Περιγραφή" hint="(μέχρι 300 χαρακτήρες)">
            <textarea className={`${inputCls} resize-none`} rows={3}
              maxLength={300} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Σύντομη περιγραφή του brevet..." />
            <p className="text-white/25 text-xs mt-1 text-right">
              {form.description.length}/300
            </p>
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Κόστος συμμετοχής (€)">
              <input type="number" min="0" className={inputCls}
                value={form.entryCost}
                onChange={e => set('entryCost', e.target.value)}
                placeholder="0" />
            </Field>

            <Field label="Μετάλλιο">
              <div className="flex items-center h-[42px]">
                <Toggle value={form.hasMedal}
                  onChange={v => set('hasMedal', v)} label="Ναι" />
              </div>
            </Field>

            {form.hasMedal && (
              <Field label="Κόστος μεταλλίου (€)">
                <input type="number" min="0" className={inputCls}
                  value={form.medalCost}
                  onChange={e => set('medalCost', e.target.value)}
                  placeholder="0" />
              </Field>
            )}
          </div>
        </Section>

        {/* ── Error & Save ── */}
        {saveError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3
            text-red-400 text-sm mb-4">
            ⚠️ {saveError}
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
              py-3 rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/>}
            {saving ? 'Αποθήκευση...' : '✓ Δημιουργία Brevet'}
          </button>
        </div>

      </div>
    </div>
  );
}
