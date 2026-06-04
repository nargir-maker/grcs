'use client';

// app/organizer/brevet/new/page.tsx
// Create a new brevet — organiser form
// Matches actual Firestore schema of all_brevets documents

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import { db } from '@/app/lib/firebase';
import {
  collection, doc, getDocs, getDoc,
  query, where, setDoc, serverTimestamp,
} from 'firebase/firestore';
import Link from 'next/link';

// ── Constants ─────────────────────────────────────────────────────────────────
const STD_DISTANCES = [200, 300, 400, 600, 1000, 1200, 1400] as const;

const STD_DURATION_HRS: Record<number, number> = {
  200: 13.5, 300: 20, 400: 27, 600: 40,
  1000: 75, 1200: 90, 1400: 116,
};

const BREVET_TYPES = ['BRM', 'LRM', 'PBP', 'FLC', 'OTHER'] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function hoursToHHMM(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function HHMMtoHours(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}

function haversineKm(la1: number, lo1: number, la2: number, lo2: number) {
  const R = 6371, d2r = Math.PI / 180;
  const dLa = (la2 - la1) * d2r, dLo = (lo2 - lo1) * d2r;
  const a = Math.sin(dLa/2)**2 +
    Math.cos(la1*d2r)*Math.cos(la2*d2r)*Math.sin(dLo/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

interface GpxParsed {
  realKm: number;
  ascent: number;
  descent: number;
  wcs: number;          // weighted climbing score = ascent / realKm
  startCoords: string;  // "lat,lng"
  finishCoords: string;
  waypoints: { lat: number; lng: number; name: string }[];
}

function parseGpx(text: string): GpxParsed {
  const xml  = new DOMParser().parseFromString(text, 'text/xml');
  const pts  = Array.from(xml.querySelectorAll('trkpt'));
  let distKm = 0, ascent = 0, descent = 0;
  let prevLa = 0, prevLo = 0, prevEl = 0, first = true;

  pts.forEach(pt => {
    const la  = parseFloat(pt.getAttribute('lat') ?? '0');
    const lo  = parseFloat(pt.getAttribute('lon') ?? '0');
    const ele = parseFloat(pt.querySelector('ele')?.textContent ?? '0');
    if (!la || !lo) return;
    if (!first) {
      distKm += haversineKm(prevLa, prevLo, la, lo);
      const d = ele - prevEl;
      if (d > 0) ascent += d; else descent += Math.abs(d);
    }
    prevLa = la; prevLo = lo; prevEl = ele; first = false;
  });

  const startPt  = pts[0];
  const finishPt = pts[pts.length - 1];
  const slat = parseFloat(startPt?.getAttribute('lat')  ?? '0');
  const slng = parseFloat(startPt?.getAttribute('lon')  ?? '0');
  const flat = parseFloat(finishPt?.getAttribute('lat') ?? '0');
  const flng = parseFloat(finishPt?.getAttribute('lon') ?? '0');

  const wpts = Array.from(xml.querySelectorAll('wpt')).map(w => ({
    lat:  parseFloat(w.getAttribute('lat') ?? '0'),
    lng:  parseFloat(w.getAttribute('lon') ?? '0'),
    name: w.querySelector('name')?.textContent?.trim() ?? '',
  }));

  const km = Math.round(distKm * 10) / 10;
  return {
    realKm:       km,
    ascent:       Math.round(ascent),
    descent:      Math.round(descent),
    wcs:          km > 0 ? Math.round((ascent / km) * 100) / 100 : 0,
    startCoords:  `${slat},${slng}`,
    finishCoords: `${flat},${flng}`,
    waypoints:    wpts,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Control {
  km:       number;
  name:     string;
  isManned: boolean;
  lat:      number;
  lng:      number;
}

interface FormState {
  // info
  title:          string;
  type:           string;
  distancePreset: number | 'other';
  distanceCustom: string;
  certification:  string;
  organizerId:    string;
  coOrganizerId:  string;
  // schedule — stored as single ISO datetime in info.date
  date:           string;   // YYYY-MM-DD
  startTime:      string;   // HH:MM
  // duration stored as "HH:MM" in route.duration
  durationHours:  string;   // decimal for easier input, converted on save
  allowPreride:   boolean;
  prerideDate:    string;
  prerideTime:    string;
  allowPostride:  boolean;
  postrideDate:   string;
  postrideTime:   string;
  // status
  active:           boolean;
  registrationOpen: boolean;
  // route
  start:          string;
  startCoords:    string;   // "lat,lng"
  finish:         string;
  finishCoords:   string;
  ascent:         string;
  descent:        string;
  realKm:         string;
  wcs:            string;
  gpxUrl:         string;   // GitHub raw URL — pasted manually
  mapUrl:         string;   // Strava / Openrunner etc.
  // extra
  description:    string;
  hasMedal:       boolean;
  medalCost:      string;
  entryCost:      string;
  flecheData:     string;
  // controls
  controls: Control[];
}

const EMPTY: FormState = {
  title:'', type:'BRM', distancePreset:200, distanceCustom:'',
  certification:'A.C.P.', organizerId:'', coOrganizerId:'',
  date:'', startTime:'07:00', durationHours:'13.5',
  allowPreride:false, prerideDate:'', prerideTime:'07:00',
  allowPostride:false, postrideDate:'', postrideTime:'07:00',
  active:true, registrationOpen:false,
  start:'', startCoords:'', finish:'', finishCoords:'',
  ascent:'', descent:'', realKm:'', wcs:'',
  gpxUrl:'', mapUrl:'',
  description:'', hasMedal:false, medalCost:'', entryCost:'', flecheData:'',
  controls:[],
};

// ── UI components ─────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5">
      <h2 className="text-white font-bold text-base mb-4 pb-3 border-b border-white/10">{title}</h2>
      {children}
    </div>
  );
}
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
const inp = `w-full bg-white/5 border border-white/15 text-white rounded-xl px-4 py-2.5
  text-sm focus:outline-none focus:border-cyan-500/60 placeholder-white/25`;
const sel = `w-full bg-[#0f1f35] border border-white/15 text-white rounded-xl px-4 py-2.5
  text-sm focus:outline-none focus:border-cyan-500/60`;

function Toggle({ value, onChange, label }: {
  value: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="flex items-center gap-3 group">
      <div className={`w-11 h-6 rounded-full relative transition-all ${value?'bg-cyan-500':'bg-white/15'}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value?'left-[22px]':'left-0.5'}`}/>
      </div>
      <span className="text-white/70 text-sm group-hover:text-white transition-colors">{label}</span>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NewBrevetPage() {
  const { organizer, isOrganizer, organizerLoaded } = useAuth();
  const router = useRouter();

  const [form, setForm]             = useState<FormState>({ ...EMPTY });
  const [clubs, setClubs]           = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [gpxParsed, setGpxParsed]   = useState(false);
  const [prevBrevets, setPrevBrevets] = useState<{ id: string; title: string; date: string }[]>([]);
  const [showCopy, setShowCopy]     = useState(false);
  const gpxRef = useRef<HTMLInputElement>(null);

  // Guard — wait for localStorage to be read before deciding to redirect
  useEffect(() => {
    if (!organizerLoaded) return;
    if (!isOrganizer) { router.replace('/login'); return; }
    setForm(f => ({
      ...f,
      certification: organizer!.clubId.startsWith('65') ? 'H.A.R.' : 'A.C.P.',
      organizerId:   organizer!.clubId,
    }));
  }, [organizerLoaded, isOrganizer, organizer]);

  // Load clubs
  useEffect(() => {
    getDocs(collection(db, 'clubs')).then(snap => {
      setClubs(snap.docs
        .filter(d => (d.data().last_brevet_year ?? 0) >= 2020)
        .map(d => ({ id: d.id, name: d.data().CLUB_NAME_SHORT_GR ?? d.id }))
        .sort((a, b) => a.name.localeCompare(b.name, 'el')));
    });
  }, []);

  // Load organiser's previous brevets for "copy" feature
  useEffect(() => {
    if (!organizer?.clubId) return;
    getDocs(query(
      collection(db, 'all_brevets'),
      where('info.organizerId', '==', organizer.clubId)
    )).then(snap => {
      setPrevBrevets(snap.docs
        .map(d => ({ id: d.id, title: d.data().info?.title ?? d.id, date: d.data().info?.date ?? '' }))
        .sort((a, b) => b.date.localeCompare(a.date)));
    });
  }, [organizer]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const set = (key: keyof FormState, val: any) =>
    setForm(f => ({ ...f, [key]: val }));

  const nominalDist = () =>
    form.distancePreset === 'other' ? parseFloat(form.distanceCustom) || 0 : form.distancePreset as number;

  const onDistChange = (preset: number | 'other', custom = form.distanceCustom) => {
    setForm(f => ({
      ...f,
      distancePreset: preset,
      distanceCustom: custom,
      durationHours: preset !== 'other'
        ? String(STD_DURATION_HRS[preset as number] ?? f.durationHours)
        : f.durationHours,
    }));
  };

  // Computed end datetime
  const endDatetime = () => {
    if (!form.date || !form.startTime || !form.durationHours) return null;
    const start = new Date(`${form.date}T${form.startTime}`);
    const hrs   = parseFloat(form.durationHours);
    if (isNaN(hrs)) return null;
    return new Date(start.getTime() + hrs * 3_600_000);
  };

  // ── GPX local parse (no upload — organiser pastes URL separately) ────────
  async function handleGpxFile(file: File) {
    try {
      const text   = await file.text();
      const parsed = parseGpx(text);
      setGpxParsed(true);

      const ctrlsFromWpts: Control[] = parsed.waypoints.map(w => ({
        km: 0, name: w.name, isManned: false, lat: w.lat, lng: w.lng,
      }));

      setForm(f => ({
        ...f,
        realKm:       String(parsed.realKm),
        ascent:       String(parsed.ascent),
        descent:      String(parsed.descent),
        wcs:          String(parsed.wcs),
        startCoords:  parsed.startCoords,
        finishCoords: parsed.finishCoords,
        controls:     ctrlsFromWpts.length > 0 ? ctrlsFromWpts : f.controls,
      }));
    } catch (e) {
      console.error('GPX parse error:', e);
      setSaveError('Σφάλμα ανάλυσης GPX αρχείου.');
    }
  }

  // ── Copy from previous brevet ─────────────────────────────────────────────
  async function copyFrom(id: string) {
    try {
      const snap = await getDoc(doc(db, 'all_brevets', id));
      if (!snap.exists()) return;
      const d     = snap.data();
      const info  = d.info    ?? {};
      const route = d.route   ?? {};
      const extra = d.extra   ?? {};
      const ctrls: Control[] = (d.controls ?? []).map((c: any) => ({
        km:       c.km       ?? 0,
        name:     c.name     ?? '',
        isManned: c.isManned ?? false,
        lat:      c.lat      ?? 0,
        lng:      c.lng      ?? 0,
      }));

      const dist = parseInt(info.distance) || 200;
      const isStd = (STD_DISTANCES as readonly number[]).includes(dist);
      const durStr: string = route.duration ?? '';
      const durHrs = durStr.includes(':') ? String(HHMMtoHours(durStr)) : String(STD_DURATION_HRS[dist] ?? '');

      setForm(f => ({
        ...f,
        title:          info.title          ?? f.title,
        type:           info.type           ?? f.type,
        distancePreset: isStd ? dist : 'other',
        distanceCustom: isStd ? '' : String(dist),
        certification:  info.certification  ?? f.certification,
        organizerId:    info.organizerId    ?? f.organizerId,
        coOrganizerId:  info.coOrganizerId  ?? '',
        durationHours:  durHrs,
        start:          route.start         ?? '',
        startCoords:    route.startCoords   ?? '',
        finish:         route.finish        ?? '',
        finishCoords:   route.finishCoords  ?? '',
        ascent:         String(route.ascent  ?? ''),
        descent:        String(route.descent ?? ''),
        wcs:            String(route.wcs     ?? ''),
        mapUrl:         route.mapUrl        ?? '',
        description:    extra.description   ?? '',
        hasMedal:       extra.hasMedal      ?? false,
        medalCost:      String(extra.medalCost  ?? ''),
        entryCost:      String(extra.entryCost  ?? ''),
        flecheData:     extra.flecheData    ?? '',
        controls:       ctrls,
        // Reset per-year fields
        date:'', gpxUrl:'', realKm:'', active:true, registrationOpen:false,
        allowPreride: info.allowPreride ?? false,
        allowPostride: info.allowPostride ?? false,
      }));
      setShowCopy(false);
    } catch (e) { console.error('Copy error:', e); }
  }

  // ── Control helpers ───────────────────────────────────────────────────────
  const addCtrl = () =>
    set('controls', [...form.controls, { km:0, name:'', isManned:false, lat:0, lng:0 }]);
  const removeCtrl = (i: number) =>
    set('controls', form.controls.filter((_, j) => j !== i));
  const updateCtrl = (i: number, key: keyof Control, val: any) =>
    set('controls', form.controls.map((c, j) => j===i ? {...c,[key]:val} : c));

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaveError('');
    if (!form.title.trim()) { setSaveError('Συμπλήρωσε τίτλο.'); return; }
    if (!form.date)         { setSaveError('Συμπλήρωσε ημερομηνία.'); return; }
    if (!form.organizerId)  { setSaveError('Επίλεξε διοργανωτή.'); return; }
    const dist = nominalDist();
    if (!dist) { setSaveError('Επίλεξε απόσταση.'); return; }

    setSaving(true);
    try {
      // Document ID: {year}_{citySlug}_{distance}_{organizerId}
      const year     = new Date(form.date).getFullYear();
      const citySlug = (form.start || 'unknown').toLowerCase()
        .replace(/\s+/g, '-').replace(/[^\w-]/g, '').slice(0, 20);
      const docId    = `${year}_${citySlug}_${dist}_${form.organizerId}`;

      // Full ISO datetime for info.date (Greek convention +02:00)
      const dateIso  = `${form.date}T${form.startTime}:00+02:00`;
      const endDt    = endDatetime();
      const durHHMM  = hoursToHHMM(parseFloat(form.durationHours) || 0);

      await setDoc(doc(db, 'all_brevets', docId), {
        info: {
          title:            form.title.trim(),
          date:             dateIso,
          distance:         dist,
          type:             form.type,
          certification:    form.certification,
          organizerId:      form.organizerId,
          coOrganizerId:    form.coOrganizerId,
          active:           form.active,
          registrationOpen: form.registrationOpen,
          allowPreride:     form.allowPreride,
          prerideDate:      form.allowPreride
            ? `${form.prerideDate}T${form.prerideTime}:00+02:00` : null,
          allowPostride:    form.allowPostride,
          postrideDate:     form.allowPostride
            ? `${form.postrideDate}T${form.postrideTime}:00+02:00` : null,
        },
        route: {
          start:        form.start,
          startCoords:  form.startCoords,
          finish:       form.finish,
          finishCoords: form.finishCoords,
          ascent:       parseInt(form.ascent)  || 0,
          descent:      parseInt(form.descent) || 0,
          wcs:          parseFloat(form.wcs)   || 0,
          climbCount:   0,
          climbSeverity: 0,
          duration:     durHHMM,
          gpxUrl:       form.gpxUrl,
          mapUrl:       form.mapUrl,
        },
        extra: {
          description: form.description.trim(),
          hasMedal:    form.hasMedal,
          medalCost:   form.hasMedal ? (parseFloat(form.medalCost) || 0) : 0,
          entryCost:   parseFloat(form.entryCost) || 0,
          flecheData:  form.flecheData,
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

  if (!organizerLoaded) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isOrganizer) return null;
  const endDt = endDatetime();

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

        {/* Copy from previous */}
        <div className="mb-6">
          <button type="button" onClick={() => setShowCopy(v => !v)}
            className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors flex items-center gap-2">
            📋 {showCopy ? 'Κλείσιμο' : 'Αντιγραφή από προηγούμενο brevet'}
          </button>
          {showCopy && (
            <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-4
              flex flex-col gap-2 max-h-60 overflow-y-auto">
              {prevBrevets.length === 0
                ? <p className="text-white/30 text-sm">Δεν υπάρχουν προηγούμενα brevets.</p>
                : prevBrevets.map(b => (
                  <button key={b.id} type="button" onClick={() => copyFrom(b.id)}
                    className="text-left px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
                    <p className="text-white text-sm font-medium">{b.title}</p>
                    <p className="text-white/40 text-xs">{b.date?.slice(0,10)}</p>
                  </button>
                ))
              }
            </div>
          )}
        </div>

        {/* ── SECTION 1: Βασικά ── */}
        <Section title="📋 Βασικά στοιχεία">
          <Field label="Τίτλος">
            <input className={inp} value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="π.χ. Δέλβινο 300km στη Β. Ήπειρο" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Τύπος">
              <select className={sel} value={form.type} onChange={e => set('type', e.target.value)}>
                {BREVET_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Πιστοποίηση">
              <select className={sel} value={form.certification}
                onChange={e => set('certification', e.target.value)}>
                <option>A.C.P.</option>
                <option>H.A.R.</option>
              </select>
            </Field>
          </div>

          <Field label="Απόσταση">
            <div className="flex gap-2 flex-wrap">
              {STD_DISTANCES.map(d => (
                <button key={d} type="button" onClick={() => onDistChange(d)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all ${
                    form.distancePreset === d
                      ? 'bg-cyan-500 text-black border-transparent'
                      : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                  }`}>{d}km</button>
              ))}
              <button type="button" onClick={() => onDistChange('other')}
                className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all ${
                  form.distancePreset === 'other'
                    ? 'bg-cyan-500 text-black border-transparent'
                    : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                }`}>Άλλη</button>
            </div>
            {form.distancePreset === 'other' && (
              <input type="number" className={`${inp} mt-2 max-w-[150px]`}
                placeholder="km" value={form.distanceCustom}
                onChange={e => onDistChange('other', e.target.value)} />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Διοργανωτής">
              <select className={sel} value={form.organizerId}
                onChange={e => set('organizerId', e.target.value)}>
                <option value="">— επίλεξε —</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Συνδιοργανωτής" hint="(προαιρετικό)">
              <select className={sel} value={form.coOrganizerId}
                onChange={e => set('coOrganizerId', e.target.value)}>
                <option value="">—</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        {/* ── SECTION 2: Χρονοδιάγραμμα ── */}
        <Section title="📅 Χρονοδιάγραμμα">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ημερομηνία">
              <input type="date" className={inp} value={form.date}
                onChange={e => set('date', e.target.value)} />
            </Field>
            <Field label="Ώρα εκκίνησης">
              <input type="time" className={inp} value={form.startTime}
                onChange={e => set('startTime', e.target.value)} />
            </Field>
          </div>

          <Field label="Μέγιστη διάρκεια (ώρες)" hint="προσυμπληρώνεται από απόσταση">
            <input type="number" step="0.5" className={`${inp} max-w-[140px]`}
              value={form.durationHours}
              onChange={e => set('durationHours', e.target.value)} />
            {endDt && (
              <p className="text-white/40 text-xs mt-1.5">
                Λήξη: {endDt.toLocaleDateString('el-GR', {
                  weekday:'short', day:'numeric', month:'short'
                })} {endDt.toLocaleTimeString('el-GR', { hour:'2-digit', minute:'2-digit' })}
                {' '}· {hoursToHHMM(parseFloat(form.durationHours)||0)} ώρες
              </p>
            )}
          </Field>

          <div className="space-y-4">
            <Toggle value={form.allowPreride} onChange={v => set('allowPreride', v)}
              label="Επιτρέπεται Pre-ride" />
            {form.allowPreride && (
              <div className="grid grid-cols-2 gap-4 pl-14">
                <Field label="Ημ/νία Pre-ride">
                  <input type="date" className={inp} value={form.prerideDate}
                    onChange={e => set('prerideDate', e.target.value)} />
                </Field>
                <Field label="Ώρα">
                  <input type="time" className={inp} value={form.prerideTime}
                    onChange={e => set('prerideTime', e.target.value)} />
                </Field>
              </div>
            )}
            <Toggle value={form.allowPostride} onChange={v => set('allowPostride', v)}
              label="Επιτρέπεται Post-ride" />
            {form.allowPostride && (
              <div className="grid grid-cols-2 gap-4 pl-14">
                <Field label="Ημ/νία Post-ride">
                  <input type="date" className={inp} value={form.postrideDate}
                    onChange={e => set('postrideDate', e.target.value)} />
                </Field>
                <Field label="Ώρα">
                  <input type="time" className={inp} value={form.postrideTime}
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

          {/* Local GPX parse (no upload needed) */}
          <Field label="Τοπικό GPX αρχείο"
            hint="δεν ανεβαίνει — αναλύεται τοπικά για αυτόματη συμπλήρωση">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => gpxRef.current?.click()}
                className="bg-white/10 border border-white/20 text-white/80 hover:text-white
                  px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                📁 Επιλογή GPX
              </button>
              {gpxParsed && (
                <span className="text-green-400 text-sm">✓ Αναλύθηκε</span>
              )}
            </div>
            <input ref={gpxRef} type="file" accept=".gpx" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleGpxFile(e.target.files[0]); }} />
          </Field>

          <Field label="GPX URL" hint="GitHub raw link — βάλε χειροκίνητα μετά το ανέβασμα">
            <input className={inp} value={form.gpxUrl}
              onChange={e => set('gpxUrl', e.target.value)}
              placeholder="https://raw.githubusercontent.com/..." />
          </Field>

          <Field label="Χάρτης URL" hint="Strava, Openrunner, RideWithGPS κλπ.">
            <input className={inp} value={form.mapUrl}
              onChange={e => set('mapUrl', e.target.value)}
              placeholder="https://www.strava.com/routes/..." />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Πόλη εκκίνησης">
              <input className={inp} value={form.start}
                onChange={e => set('start', e.target.value)} placeholder="π.χ. ΚΑΛΠΑΚΙ" />
            </Field>
            <Field label="Πόλη τερματισμού">
              <input className={inp} value={form.finish}
                onChange={e => set('finish', e.target.value)} placeholder="π.χ. ΚΑΛΠΑΚΙ" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Συντεταγμένες εκκίνησης" hint="lat,lng — από GPX">
              <input className={inp} value={form.startCoords}
                onChange={e => set('startCoords', e.target.value)}
                placeholder="39.885,20.624" />
            </Field>
            <Field label="Συντεταγμένες τερματισμού" hint="lat,lng — από GPX">
              <input className={inp} value={form.finishCoords}
                onChange={e => set('finishCoords', e.target.value)}
                placeholder="39.885,20.624" />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Πραγματικά km" hint="GPX">
              <input type="number" className={inp} value={form.realKm}
                onChange={e => set('realKm', e.target.value)} />
            </Field>
            <Field label="Ανηφόρα (m)" hint="GPX">
              <input type="number" className={inp} value={form.ascent}
                onChange={e => set('ascent', e.target.value)} />
            </Field>
            <Field label="Κατηφόρα (m)" hint="GPX">
              <input type="number" className={inp} value={form.descent}
                onChange={e => set('descent', e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* ── SECTION 5: Σημεία Ελέγχου ── */}
        <Section title="📍 Σημεία Ελέγχου">
          {form.controls.length === 0
            ? <p className="text-white/30 text-sm mb-3">
                Δεν υπάρχουν σημεία ελέγχου.
                {!gpxParsed ? ' Επίλεξε GPX για αυτόματη φόρτωση waypoints.' : ''}
              </p>
            : (
              <div className="space-y-2 mb-4">
                {form.controls.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/3 rounded-xl p-3">
                    <span className="text-white/40 text-xs font-mono w-5 shrink-0">{i+1}</span>
                    <input type="number" placeholder="km"
                      className={`${inp} w-20 shrink-0`}
                      value={c.km || ''}
                      onChange={e => updateCtrl(i, 'km', parseFloat(e.target.value)||0)} />
                    <input placeholder="Περιγραφή"
                      className={`${inp} flex-1`}
                      value={c.name}
                      onChange={e => updateCtrl(i, 'name', e.target.value)} />
                    <label className="flex items-center gap-1.5 text-white/50 text-xs shrink-0 cursor-pointer">
                      <input type="checkbox" checked={c.isManned}
                        onChange={e => updateCtrl(i, 'isManned', e.target.checked)}
                        className="accent-cyan-500" />
                      Επανδρωμένο
                    </label>
                    <button type="button" onClick={() => removeCtrl(i)}
                      className="text-white/25 hover:text-red-400 transition-colors text-xl shrink-0 leading-none">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )
          }
          <button type="button" onClick={addCtrl}
            className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
            + Προσθήκη σημείου
          </button>
        </Section>

        {/* ── SECTION 6: Λεπτομέρειες ── */}
        <Section title="💬 Λεπτομέρειες">
          <Field label="Περιγραφή" hint="(μέχρι 300 χαρακτήρες)">
            <textarea className={`${inp} resize-none`} rows={3}
              maxLength={300} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Σύντομη περιγραφή..." />
            <p className="text-white/25 text-xs mt-1 text-right">{form.description.length}/300</p>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Κόστος συμμετοχής (€)">
              <input type="number" min="0" className={inp}
                value={form.entryCost} placeholder="0"
                onChange={e => set('entryCost', e.target.value)} />
            </Field>
            <Field label="Μετάλλιο">
              <div className="flex items-center h-[42px]">
                <Toggle value={form.hasMedal} onChange={v => set('hasMedal', v)} label="Ναι" />
              </div>
            </Field>
          </div>
          {form.hasMedal && (
            <Field label="Κόστος μεταλλίου (€)">
              <input type="number" min="0" className={`${inp} max-w-[150px]`}
                value={form.medalCost} placeholder="0"
                onChange={e => set('medalCost', e.target.value)} />
            </Field>
          )}
        </Section>

        {/* Error & Save */}
        {saveError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3
            text-red-400 text-sm mb-4">⚠️ {saveError}</div>
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
            {saving && <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/>}
            {saving ? 'Αποθήκευση...' : '✓ Δημιουργία Brevet'}
          </button>
        </div>

      </div>
    </div>
  );
}
