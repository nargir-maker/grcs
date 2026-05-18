'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/app/lib/firebase';

// ── Types ─────────────────────────────────────────────
interface Brevet {
  id: string;
  name: string;
  distance: number;
  date: string;          // ISO string
  location: string;
  registrations: number;
  status: 'upcoming' | 'past' | 'today';
}

// ── Page ──────────────────────────────────────────────
export default function OrganizerDashboard() {
  const { organizer, isOrganizer, logoutOrganizer } = useAuth();
  const router = useRouter();

  const [brevets, setBrevets] = useState<Brevet[]>([]);
  const [loading, setLoading] = useState(true);

  // Guard — redirect if not organizer
  useEffect(() => {
    if (!isOrganizer) {
      router.replace('/login');
    }
  }, [isOrganizer, router]);

  // Load brevets for this club
  useEffect(() => {
    if (!organizer?.clubId) return;

    const fetchBrevets = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'all_brevets'),
          where('info.organizerId', '==', organizer.clubId),
          orderBy('info.date', 'desc'),
        );
        const snap = await getDocs(q);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const data: Brevet[] = snap.docs.map((doc) => {
          const d = doc.data();
          const dateStr: string = d.info?.date ?? '';
          const brevetDate = new Date(dateStr);
          brevetDate.setHours(0, 0, 0, 0);

          let status: Brevet['status'] = 'upcoming';
          if (brevetDate < today) status = 'past';
          else if (brevetDate.getTime() === today.getTime()) status = 'today';

          return {
            id: doc.id,
            name: d.info?.name ?? 'Χωρίς όνομα',
            distance: d.info?.distance ?? 0,
            date: dateStr,
            location: d.info?.location ?? '',
            registrations: d.registrations?.length ?? 0,
            status,
          };
        });

        setBrevets(data);
      } catch (e) {
        console.error('Failed to load brevets:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchBrevets();
  }, [organizer?.clubId]);

  if (!isOrganizer || !organizer) return null;

  const upcomingBrevets = brevets.filter((b) => b.status !== 'past');
  const pastBrevets = brevets.filter((b) => b.status === 'past');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Club logos */}
            <div className="flex gap-2">
              <img
                src={`/logos/${organizer.clubId}.png`}
                alt="logo"
                className="h-64 w-64 object-contain"
              />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">
                {organizer.clubNameGr}
              </div>
              <div className="text-slate-400 text-xs">
                {organizer.clubNameEn}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-purple-300 bg-purple-500/20
              border border-purple-400/30 px-2.5 py-1 rounded-full font-semibold">
              🏁 Διοργανωτής
            </span>
            <button
              onClick={logoutOrganizer}
              className="text-slate-400 hover:text-white text-sm transition-colors
                flex items-center gap-1.5"
            >
              <span>↩</span>
              <span className="hidden sm:inline">Αποσύνδεση</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* ── WELCOME ──────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            Καλωσόρισες 👋
          </h1>
          <p className="text-slate-400 text-sm">
            {organizer.clubFullNameGr}
          </p>
        </div>

        {/* ── STATS ROW ────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Σύνολο Brevets', value: brevets.length, emoji: '📋' },
            { label: 'Επερχόμενα', value: upcomingBrevets.length, emoji: '📅' },
            { label: 'Εγγραφές', value: brevets.reduce((s, b) => s + b.registrations, 0), emoji: '👥' },
            { label: 'Περασμένα', value: pastBrevets.length, emoji: '✅' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 border border-white/10 rounded-xl p-4
                flex flex-col items-center text-center"
            >
              <span className="text-2xl mb-1">{stat.emoji}</span>
              <span className="text-2xl font-bold text-white">
                {loading ? '—' : stat.value}
              </span>
              <span className="text-slate-400 text-xs mt-0.5">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── UPCOMING BREVETS ─────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              <span>📅</span> Επερχόμενα Brevets
            </h2>
            {/* Placeholder — add brevet button coming soon */}
            <button
              disabled
              className="text-xs bg-purple-600/30 border border-purple-400/30
                text-purple-300 px-3 py-1.5 rounded-lg opacity-50 cursor-not-allowed"
            >
              + Νέο Brevet
            </button>
          </div>

          {loading ? (
            <BrevetSkeleton />
          ) : upcomingBrevets.length === 0 ? (
            <EmptyState
              emoji="📭"
              message="Δεν υπάρχουν επερχόμενα brevets"
            />
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingBrevets.map((b) => (
                <BrevetCard key={b.id} brevet={b} />
              ))}
            </div>
          )}
        </section>

        {/* ── PAST BREVETS ─────────────────────────── */}
        {!loading && pastBrevets.length > 0 && (
          <section>
            <h2 className="text-slate-400 font-semibold text-base
              flex items-center gap-2 mb-4">
              <span>✅</span> Παρελθόν
            </h2>
            <div className="flex flex-col gap-3">
              {pastBrevets.slice(0, 5).map((b) => (
                <BrevetCard key={b.id} brevet={b} past />
              ))}
              {pastBrevets.length > 5 && (
                <p className="text-slate-500 text-xs text-center pt-1">
                  +{pastBrevets.length - 5} ακόμα παλαιότερα brevets
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── PLACEHOLDER SECTIONS ─────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4 mt-10">
          {[
            { emoji: '📊', title: 'Αναλυτικά Αποτελέσματα', soon: true },
            { emoji: '📧', title: 'Αποστολή Brevet Cards', soon: true },
            { emoji: '👥', title: 'Διαχείριση Εγγραφών', soon: true },
            { emoji: '⚙️', title: 'Ρυθμίσεις Συλλόγου', soon: true },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white/3 border border-white/8 rounded-xl p-5
                flex items-center gap-4 opacity-50"
            >
              <span className="text-2xl">{item.emoji}</span>
              <div>
                <div className="text-white text-sm font-medium">
                  {item.title}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">
                  Σύντομα διαθέσιμο
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────

function BrevetCard({ brevet, past = false }: { brevet: Brevet; past?: boolean }) {
  const dateLabel = new Date(brevet.date).toLocaleDateString('el-GR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const statusColor =
    brevet.status === 'today'
      ? 'bg-green-500/20 border-green-400/40 text-green-300'
      : brevet.status === 'upcoming'
      ? 'bg-blue-500/20 border-blue-400/40 text-blue-300'
      : 'bg-slate-500/20 border-slate-400/30 text-slate-400';

  const statusLabel =
    brevet.status === 'today'
      ? 'Σήμερα'
      : brevet.status === 'upcoming'
      ? 'Επερχόμενο'
      : 'Ολοκληρώθηκε';

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all
        ${past
          ? 'bg-white/3 border-white/8 opacity-70'
          : 'bg-white/7 border-white/15 hover:bg-white/10 cursor-pointer'
        }`}
    >
      {/* Distance badge */}
      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-blue-600/30
        border border-blue-400/30 flex flex-col items-center justify-center">
        <span className="text-white font-bold text-lg leading-none">
          {brevet.distance}
        </span>
        <span className="text-blue-300 text-xs">km</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm truncate">
          {brevet.name}
        </div>
        <div className="text-slate-400 text-xs mt-0.5 flex items-center gap-2">
          <span>📅 {dateLabel}</span>
          {brevet.location && (
            <>
              <span className="text-slate-600">·</span>
              <span>📍 {brevet.location}</span>
            </>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor}`}>
          {statusLabel}
        </span>
        <span className="text-slate-400 text-xs">
          👥 {brevet.registrations} εγγραφές
        </span>
      </div>
    </div>
  );
}

function BrevetSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-20 rounded-xl bg-white/5 border border-white/10 animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyState({ emoji, message }: { emoji: string; message: string }) {
  return (
    <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-2">
      <span className="text-3xl">{emoji}</span>
      <span className="text-sm">{message}</span>
    </div>
  );
}
