'use client';

import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface RegistrationFormProps {
  brevet: {
    id: string;
    title: string;
    distance: number;
    date: string;
    organizer: string;
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

export default function RegistrationForm({
  brevet,
  session,
  onClose,
}: RegistrationFormProps) {
  const nameParts = session.user?.name?.split(' ') ?? [];
  const firstName = nameParts[0] ?? '';
  const lastName  = nameParts.slice(1).join(' ') ?? '';

  const [form, setForm] = useState({
    firstName,
    lastName,
    email:       session.user?.email ?? '',
    mobile:      '',
    emergency:   '',
    homologation: 'ΛΕΠΟΤΕ',
    registryId:  '',
    accepted:    false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async () => {
    if (!form.mobile) {
      setError('Παρακαλώ συμπληρώστε το κινητό σας');
      return;
    }
    if (!form.registryId) {
      setError('Παρακαλώ συμπληρώστε τον αριθμό μητρώου');
      return;
    }
    if (!form.accepted) {
      setError('Παρακαλώ αποδεχτείτε τον κανονισμό');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const regId = `${session.user?.email}_${brevet.id}`;
      
      // Check if already registered
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
          firstName:    form.firstName,
          lastName:     form.lastName,
          email:        form.email,
          mobile:       form.mobile,
          emergency:    form.emergency,
          homologation: form.homologation,
          registryId:   form.registryId,
          brevetId:     brevet.id,
          brevetTitle:  brevet.title,
          distance:     brevet.distance,
          date:         brevet.date,
          organizer:    brevet.organizer,
          status:       'registered',
          paymentStatus: 'pending',
          registeredAt: new Date().toISOString(),
          googleEmail:  session.user?.email,
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

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-white font-bold text-xl mb-2">
          Εγγραφή Επιτυχής!
        </h3>
        <p className="text-white/50 text-sm mb-6">
          Έχετε εγγραφεί στο {brevet.title}
        </p>
        <button
          onClick={onClose}
          className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
        >
          Κλείσιμο
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4">

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/40 text-xs mb-1 block">Όνομα</label>
          <input
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1 block">Επώνυμο</label>
          <input
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="text-white/40 text-xs mb-1 block">Email</label>
        <input
          value={form.email}
          disabled
          className="w-full bg-white/5 border border-white/10 text-white/40 rounded-xl px-4 py-3 text-sm cursor-not-allowed"
        />
      </div>

      {/* Mobile */}
      <div>
        <label className="text-white/40 text-xs mb-1 block">
          Κινητό τηλέφωνο *
        </label>
        <input
          value={form.mobile}
          onChange={(e) => setForm({ ...form, mobile: e.target.value })}
          placeholder="69XXXXXXXX"
          className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Emergency */}
      <div>
        <label className="text-white/40 text-xs mb-1 block">
          Τηλέφωνο έκτακτης ανάγκης *
        </label>
        <input
          value={form.emergency}
          onChange={(e) => setForm({ ...form, emergency: e.target.value })}
          placeholder="Όνομα & αριθμός"
          className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Homologation */}
      <div>
        <label className="text-white/40 text-xs mb-2 block">
          Homologation *
        </label>
        <div className="flex gap-3">
          {['ΛΕΠΟΤΕ', 'HAR', 'Και τους δύο'].map((h) => (
            <button
              key={h}
              onClick={() => setForm({ ...form, homologation: h })}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                form.homologation === h
                  ? 'bg-cyan-500 text-black border-cyan-500'
                  : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Registry ID */}
      <div>
        <label className="text-white/40 text-xs mb-1 block">
          Αριθμός Μητρώου *
        </label>
        <input
          value={form.registryId}
          onChange={(e) => setForm({ ...form, registryId: e.target.value })}
          placeholder="π.χ. 3557 ή HAR:352"
          className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Declaration */}
      <div
        className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer"
        onClick={() => setForm({ ...form, accepted: !form.accepted })}
      >
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
            form.accepted
              ? 'bg-cyan-500 border-cyan-500'
              : 'border-white/30'
          }`}
        >
          {form.accepted && (
            <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <p className="text-white/50 text-xs leading-relaxed">
          Αποδέχομαι ανεπιφύλακτα τον κανονισμό των φορέων και δηλώνω ότι 
          συμμετέχω με δική μου ευθύνη στο brevet.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      {/* Buttons */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={onClose}
          className="flex-1 border border-white/10 text-white/50 hover:text-white py-3 rounded-xl text-sm transition-colors"
        >
          Ακύρωση
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 text-black font-bold py-3 rounded-xl text-sm transition-colors"
        >
          {submitting ? 'Αποστολή...' : 'ΕΓΓΡΑΦΗ →'}
        </button>
      </div>

    </div>
  );
}