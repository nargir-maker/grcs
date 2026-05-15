'use client';

import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// ── T&C sources ───────────────────────────────────────────────────────────
const TC = {
  LEPOTE: {
    url: 'https://brevets.gr/brevets/%CE%B8%CE%AD%CE%BB%CE%B5%CF%84%CE%B5-%CE%BD%CE%B1-%CF%80%CE%AC%CF%81%CE%B5%CF%84%CE%B5-%CE%BC%CE%AD%CF%81%CE%BF%CF%82-%CF%83%E2%80%99-%CE%AD%CE%BD%CE%B1-brevet.html',
    name: 'ΛΕ.ΠΟ.Τ.Ε.',
    logo: '/logos/650000.png',
    color: '#0077B6',
  },
  HAR: {
    url: 'https://www.hellenic-autonomous-randonneur.com/kanonismos/',
    name: 'H.A.R.',
    logo: '/logos/659999.png',
    color: '#6A1B9A',
  },
};

// ── Types ─────────────────────────────────────────────────────────────────
interface RegistrationFormProps {
  brevet: {
    id: string;
    title: string;
    distance: number;
    date: string;
    organizer: string;
    organizerId: string;
    coOrganizerId: string;     // ← key field — drives homologation mode
    certification: string;
  };
  session: {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  };
  onClose: () => void;
}

// ── T&C Modal ─────────────────────────────────────────────────────────────
function TCModal({
  org,
  onAccept,
  onClose,
}: {
  org: typeof TC.LEPOTE | typeof TC.HAR;
  onAccept: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0A1628] border border-white/10 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl flex flex-col"
        style={{ height: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-white/10 shrink-0">
          <img
            src={org.logo}
            alt={org.name}
            className="w-10 h-10 object-contain rounded-full bg-white/10"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Κανονισμός {org.name}</p>
            <p className="text-white/40 text-xs">
              Διαβάστε τον κανονισμό και αποδεχτείτε για να συνεχίσετε
            </p>
          </div>
          <button onClick={onClose}
            className="text-white/40 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        {/* iframe */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={org.url}
            className="w-full h-full border-0"
            title={`Κανονισμός ${org.name}`}
            sandbox="allow-same-origin allow-scripts allow-popups"
          />
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 shrink-0 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <p className="text-white/40 text-xs text-center sm:text-left">
            Με την αποδοχή δηλώνετε ότι έχετε διαβάσει και αποδέχεστε πλήρως
            τον κανονισμό της {org.name}.
          </p>
          <div className="flex gap-3 shrink-0">
            <button onClick={onClose}
              className="px-4 py-2 border border-white/10 text-white/50 rounded-xl text-sm hover:text-white transition-colors">
              Ακύρωση
            </button>
            <button
              onClick={() => { onAccept(); onClose(); }}
              className="px-6 py-2 text-white font-bold rounded-xl text-sm transition-colors"
              style={{ backgroundColor: org.color }}
            >
              ✓ Αποδέχομαι
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────
export default function RegistrationForm({
  brevet,
  session,
  onClose,
}: RegistrationFormProps) {

  // ── Determine homologation mode ────────────────────────────────────
  // mode 'both'   → coOrganizerId has value
  // mode 'har'    → certification contains HAR, no co-org
  // mode 'lepote' → everything else (ACP / ΛΕΠΟΤΕ)
  const cert     = brevet.certification?.toUpperCase().replaceAll('.', '').trim() ?? '';
  const hasCoOrg = !!(brevet.coOrganizerId && brevet.coOrganizerId !== '' && brevet.coOrganizerId !== '0');
  const isHAR    = cert.includes('HAR');
  const mode: 'lepote' | 'har' | 'both' =
    hasCoOrg ? 'both' : isHAR ? 'har' : 'lepote';

  // ── Form state ─────────────────────────────────────────────────────
  const nameParts = session.user?.name?.split(' ') ?? [];
  const [form, setForm] = useState({
    firstName:      nameParts[0] ?? '',
    lastName:       nameParts.slice(1).join(' ') ?? '',
    email:          session.user?.email ?? '',
    mobile:         '',
    emergency:      '',
    homologation:   mode === 'both' ? 'ΛΕΠΟΤΕ' : mode === 'har' ? 'HAR' : 'ΛΕΠΟΤΕ',
    lepoteId:       '',
    harId:          '',
    acceptedLepote: mode === 'har',    // pre-accepted when not relevant
    acceptedHAR:    mode === 'lepote', // pre-accepted when not relevant
    acceptedSafety: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');
  const [tcModal, setTcModal]       = useState<'lepote' | 'har' | null>(null);

  // ── Derived active flags ───────────────────────────────────────────
  const showLepote   = mode === 'lepote' || mode === 'both';
  const showHAR      = mode === 'har'    || mode === 'both';
  const lepoteActive = showLepote && (mode !== 'both' || form.homologation === 'ΛΕΠΟΤΕ' || form.homologation === 'ΚΑΙ ΤΟΥΣ ΔΥΟ');
  const harActive    = showHAR    && (mode !== 'both' || form.homologation === 'HAR'    || form.homologation === 'ΚΑΙ ΤΟΥΣ ΔΥΟ');

  // ── Validation & submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.mobile.trim()) {
      setError('Παρακαλώ συμπληρώστε το κινητό σας'); return;
    }
    if (!form.emergency.trim()) {
      setError('Παρακαλώ συμπληρώστε τηλέφωνο έκτακτης ανάγκης'); return;
    }
    if (lepoteActive && !form.lepoteId.trim()) {
      setError('Παρακαλώ συμπληρώστε τον αριθμό μητρώου ΛΕ.ΠΟ.Τ.Ε.'); return;
    }
    if (harActive && !form.harId.trim()) {
      setError('Παρακαλώ συμπληρώστε τον αριθμό μητρώου H.A.R.'); return;
    }
    if (lepoteActive && !form.acceptedLepote) {
      setError('Παρακαλώ αποδεχτείτε τον κανονισμό ΛΕ.ΠΟ.Τ.Ε.'); return;
    }
    if (harActive && !form.acceptedHAR) {
      setError('Παρακαλώ αποδεχτείτε τον κανονισμό H.A.R.'); return;
    }
    if (!form.acceptedSafety) {
      setError('Παρακαλώ αποδεχτείτε τη δήλωση ασφάλειας'); return;
    }

    setSubmitting(true);
    setError('');

    try {
      const regId = `${session.user?.email}_${brevet.id}`;
      const existing = await getDoc(
        doc(db, 'registrations', brevet.id, 'participants', regId)
      );
      if (existing.exists()) {
        setError('Είστε ήδη εγγεγραμμένοι σε αυτό το brevet');
        setSubmitting(false);
        return;
      }

      await setDoc(
        doc(db, 'registrations', brevet.id, 'participants', regId),
        {
          firstName:        form.firstName,
          lastName:         form.lastName,
          email:            form.email,
          mobile:           form.mobile,
          emergency:        form.emergency,
          homologation:     form.homologation,
          lepoteId:         lepoteActive ? form.lepoteId : '',
          harId:            harActive    ? form.harId    : '',
          brevetId:         brevet.id,
          brevetTitle:      brevet.title,
          distance:         brevet.distance,
          date:             brevet.date,
          organizer:        brevet.organizer,
          coOrganizerId:    brevet.coOrganizerId,
          certification:    brevet.certification,
          status:           'registered',
          paymentStatus:    'pending',
          registeredAt:     new Date().toISOString(),
          googleEmail:      session.user?.email,
          acceptedLepoteTC: form.acceptedLepote,
          acceptedHARTC:    form.acceptedHAR,
          acceptedSafety:   form.acceptedSafety,
        }
      );

      setSubmitted(true);
    } catch (e) {
      console.error('Registration error:', e);
      setError('Σφάλμα κατά την εγγραφή. Δοκιμάστε ξανά.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-white font-bold text-xl mb-2">Εγγραφή Επιτυχής!</h3>
        <p className="text-white/50 text-sm mb-6">Έχετε εγγραφεί στο {brevet.title}</p>
        <button onClick={onClose}
          className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
          Κλείσιμο
        </button>
      </div>
    );
  }

  return (
    <>
      {/* T&C Modals */}
      {tcModal === 'lepote' && (
        <TCModal
          org={TC.LEPOTE}
          onAccept={() => setForm(f => ({ ...f, acceptedLepote: true }))}
          onClose={() => setTcModal(null)}
        />
      )}
      {tcModal === 'har' && (
        <TCModal
          org={TC.HAR}
          onAccept={() => setForm(f => ({ ...f, acceptedHAR: true }))}
          onClose={() => setTcModal(null)}
        />
      )}

      <div className="mt-4 flex flex-col gap-4">

        {/* ── NAME ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/40 text-xs mb-1 block">Όνομα</label>
            <input value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Επώνυμο</label>
            <input value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* ── EMAIL ────────────────────────────────────── */}
        <div>
          <label className="text-white/40 text-xs mb-1 block">Email</label>
          <input value={form.email} disabled
            className="w-full bg-white/5 border border-white/10 text-white/40 rounded-xl px-4 py-3 text-sm cursor-not-allowed"
          />
        </div>

        {/* ── MOBILE ───────────────────────────────────── */}
        <div>
          <label className="text-white/40 text-xs mb-1 block">Κινητό τηλέφωνο *</label>
          <input value={form.mobile}
            onChange={e => setForm({ ...form, mobile: e.target.value })}
            placeholder="69XXXXXXXX"
            className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* ── EMERGENCY ────────────────────────────────── */}
        <div>
          <label className="text-white/40 text-xs mb-1 block">Τηλέφωνο έκτακτης ανάγκης *</label>
          <input value={form.emergency}
            onChange={e => setForm({ ...form, emergency: e.target.value })}
            placeholder="Όνομα & αριθμός"
            className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* ── HOMOLOGATION TOGGLE (both mode only) ─────── */}
        {mode === 'both' && (
          <div>
            <label className="text-white/40 text-xs mb-2 block">Homologation *</label>
            <div className="flex gap-3">
              {[
                { value: 'ΛΕΠΟΤΕ',       label: 'ΛΕ.ΠΟ.Τ.Ε.', logo: TC.LEPOTE.logo, color: TC.LEPOTE.color },
                { value: 'HAR',          label: 'H.A.R.',      logo: TC.HAR.logo,    color: TC.HAR.color    },
                { value: 'ΚΑΙ ΤΟΥΣ ΔΥΟ', label: 'Και τους δύο', logo: null,          color: '#06b6d4'       },
              ].map((h) => (
                <button
                  key={h.value}
                  onClick={() => setForm({ ...form, homologation: h.value })}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                    form.homologation === h.value
                      ? 'text-white border-transparent'
                      : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'
                  }`}
                  style={form.homologation === h.value ? { backgroundColor: h.color } : {}}
                >
                  {h.logo && (
                    <img src={h.logo} alt={h.label}
                      className="w-5 h-5 object-contain rounded-full bg-white/20"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── REGISTRY IDs ──────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {showLepote && (
            <div className={!lepoteActive ? 'opacity-40 pointer-events-none' : ''}>
              <label className="text-white/40 text-xs mb-1 flex items-center gap-2">
                <img src={TC.LEPOTE.logo} alt="ΛΕΠΟΤΕ"
                  className="w-4 h-4 object-contain rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                Αριθμός Μητρώου ΛΕ.ΠΟ.Τ.Ε. {lepoteActive && '*'}
              </label>
              <input value={form.lepoteId}
                onChange={e => setForm({ ...form, lepoteId: e.target.value })}
                placeholder="π.χ. 3557"
                disabled={!lepoteActive}
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 disabled:cursor-not-allowed"
              />
            </div>
          )}
          {showHAR && (
            <div className={!harActive ? 'opacity-40 pointer-events-none' : ''}>
              <label className="text-white/40 text-xs mb-1 flex items-center gap-2">
                <img src={TC.HAR.logo} alt="HAR"
                  className="w-4 h-4 object-contain rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                Αριθμός Μητρώου H.A.R. {harActive && '*'}
              </label>
              <input value={form.harId}
                onChange={e => setForm({ ...form, harId: e.target.value })}
                placeholder="π.χ. 352"
                disabled={!harActive}
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 disabled:cursor-not-allowed"
              />
            </div>
          )}
        </div>

        {/* ── T&C ACCEPTANCES ───────────────────────────── */}
        <div className="flex flex-col gap-3">
          {showLepote && lepoteActive && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <img src={TC.LEPOTE.logo} alt="ΛΕΠΟΤΕ"
                  className="w-8 h-8 object-contain rounded-full bg-white/10"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <p className="text-white/70 text-xs font-bold">Κανονισμός ΛΕ.ΠΟ.Τ.Ε.</p>
              </div>
              {form.acceptedLepote ? (
                <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Αποδεκτός — κανονισμός ΛΕ.ΠΟ.Τ.Ε.
                  <button onClick={() => setForm(f => ({ ...f, acceptedLepote: false }))}
                    className="ml-2 text-white/30 hover:text-white/60 text-xs">(αλλαγή)</button>
                </div>
              ) : (
                <button onClick={() => setTcModal('lepote')}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white border border-white/20 hover:border-cyan-500/50 transition-colors flex items-center justify-center gap-2"
                  style={{ backgroundColor: TC.LEPOTE.color + '30' }}>
                  📄 Ανάγνωση & Αποδοχή Κανονισμού ΛΕ.ΠΟ.Τ.Ε.
                </button>
              )}
            </div>
          )}
          {showHAR && harActive && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <img src={TC.HAR.logo} alt="HAR"
                  className="w-8 h-8 object-contain rounded-full bg-white/10"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <p className="text-white/70 text-xs font-bold">Κανονισμός H.A.R.</p>
              </div>
              {form.acceptedHAR ? (
                <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Αποδεκτός — κανονισμός H.A.R.
                  <button onClick={() => setForm(f => ({ ...f, acceptedHAR: false }))}
                    className="ml-2 text-white/30 hover:text-white/60 text-xs">(αλλαγή)</button>
                </div>
              ) : (
                <button onClick={() => setTcModal('har')}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white border border-white/20 hover:border-cyan-500/50 transition-colors flex items-center justify-center gap-2"
                  style={{ backgroundColor: TC.HAR.color + '30' }}>
                  📄 Ανάγνωση & Αποδοχή Κανονισμού H.A.R.
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── SAFETY DECLARATION ───────────────────────── */}
        <div
          className={`flex items-start gap-3 rounded-xl p-4 cursor-pointer border transition-colors ${
            form.acceptedSafety
              ? 'bg-red-500/10 border-red-500/40'
              : 'bg-white/5 border-white/10 hover:border-red-500/30'
          }`}
          onClick={() => setForm({ ...form, acceptedSafety: !form.acceptedSafety })}
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
            form.acceptedSafety ? 'bg-red-500 border-red-500' : 'border-white/30'
          }`}>
            {form.acceptedSafety && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-red-400 text-xs font-bold mb-1">⚠️ Δήλωση Ασφάλειας & Υγείας *</p>
            <p className="text-white/50 text-xs leading-relaxed">
              Δηλώνω ότι είμαι ενήμερος/η ότι η συμμετοχή μου σε αυτό το brevet ενέχει κινδύνους
              που μπορεί να οδηγήσουν σε σωματική βλάβη{' '}
              <strong className="text-white/70">ή και θάνατο</strong>.
              Αποδέχομαι αυτούς τους κινδύνους με πλήρη επίγνωση και δηλώνω ότι έχω
              εξεταστεί από ιατρό και κρίνομαι ικανός/η να συμμετέχω σε δραστηριότητα
              αντοχής μεγάλων αποστάσεων. Συμμετέχω αποκλειστικά με δική μου ευθύνη.
            </p>
          </div>
        </div>

        {/* ── ERROR ────────────────────────────────────── */}
        {error && (
          <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            ⚠️ {error}
          </p>
        )}

        {/* ── BUTTONS ──────────────────────────────────── */}
        <div className="flex gap-3 mt-2">
          <button onClick={onClose}
            className="flex-1 border border-white/10 text-white/50 hover:text-white py-3 rounded-xl text-sm transition-colors">
            Ακύρωση
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 text-black font-bold py-3 rounded-xl text-sm transition-colors">
            {submitting ? 'Αποστολή...' : 'ΕΓΓΡΑΦΗ →'}
          </button>
        </div>

      </div>
    </>
  );
}
