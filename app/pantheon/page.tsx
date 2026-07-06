'use client';

import { useEffect, useState, useMemo } from 'react';
import { usePageEnabled, ComingSoon } from '@/app/lib/usePageEnabled';
import PageViews from '@/app/components/PageViews';

// ── Types ────────────────────────────────────────────────────────────────────

interface KmEntry      { name: string; totalKm:      number; lepoteId: string; harId: string }
interface BrevetsEntry { name: string; totalBrevets: number; lepoteId: string; harId: string }
interface SrEntry      { name: string; srCount:      number; lepoteId: string; harId: string }
interface MilestoneEntry { name: string; count: number }

interface PantheonData {
  totalRiders:  number;
  totalKm:      number;
  totalBrevets: number;
  busiestYear:      string; busiestYearCount:  number;
  streakHolderName: string; streakRecordYears: number;
  mostSrName:       string; mostSrCount:       number;
  kmRanking:      KmEntry[];
  brevetsRanking: BrevetsEntry[];
  srRanking:      SrEntry[];
  milestoneLists: Record<string, MilestoneEntry[]>;
}

type TabId = 'km' | 'brevets' | 'sr' | 'milestones';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('el-GR'); }

function medalFor(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

function rankColor(rank: number): string {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#B8C6D6';
  if (rank === 3) return '#CD7F32';
  return 'rgba(255,255,255,0.5)';
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SummaryChip({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div className="flex-1 rounded-xl border p-3" style={{ borderColor: `${color}33`, background: `${color}0F` }}>
      <div className="text-lg mb-0.5">{icon}</div>
      <div className="font-bold text-base leading-tight" style={{ color }}>{value}</div>
      <div className="text-white/40 text-xs mt-0.5">{label}</div>
    </div>
  );
}

function RecordChip({ emoji, title, value, sub }: { emoji: string; title: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-2xl">{emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="text-white/40 text-xs">{title}</div>
        <div className="text-white font-bold text-sm truncate">{value}</div>
        {sub && <div className="text-white/30 text-xs">{sub}</div>}
      </div>
    </div>
  );
}

function TabBtn({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
        active ? 'bg-white text-[#0A1628]' : 'text-white/40 hover:text-white/60 border border-white/10'
      }`}>
      <span>{icon}</span>{label}
    </button>
  );
}

function RankRow({ rank, name, value, unit, lepoteId, harId }: {
  rank: number; name: string; value: string; unit: string; lepoteId: string; harId: string;
}) {
  const medal = medalFor(rank);
  const color = rankColor(rank);
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-7 text-center shrink-0">
        {medal ? (
          <span className="text-base">{medal}</span>
        ) : (
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>{rank}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white/90 text-sm font-medium truncate">{name}</div>
        <div className="flex gap-1.5 mt-0.5">
          {lepoteId && lepoteId !== '0' && (
            <span className="text-[10px] text-white/30 font-mono">ΛΕ.ΠΟ.Τ.Ε.·{lepoteId}</span>
          )}
          {harId && harId !== '0' && (
            <span className="text-[10px] text-white/30 font-mono">HAR·{harId}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-bold text-sm" style={{ color }}>{value}</div>
        <div className="text-white/30 text-xs">{unit}</div>
      </div>
    </div>
  );
}

function SrRow({ rank, entry }: { rank: number; entry: SrEntry }) {
  return (
    <RankRow
      rank={rank} name={entry.name}
      value={`×${entry.srCount}`} unit="SR"
      lepoteId={entry.lepoteId} harId={entry.harId}
    />
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PantheonPage() {
  const enabled = usePageEnabled('pantheon');
  const [data, setData]       = useState<PantheonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState<TabId>('km');
  const [search, setSearch]   = useState('');
  const [milThreshold, setMilThreshold] = useState(10);

  useEffect(() => {
    fetch('/api/pantheon')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Σφάλμα φόρτωσης.'); setLoading(false); });
  }, []);

  const filteredKm = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.kmRanking.filter(m => !q || m.name.toLowerCase().includes(q) || m.lepoteId.includes(q));
  }, [data, search]);

  const filteredBrevets = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.brevetsRanking.filter(m => !q || m.name.toLowerCase().includes(q) || m.lepoteId.includes(q));
  }, [data, search]);

  const filteredSr = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.srRanking.filter(m => !q || m.name.toLowerCase().includes(q) || m.lepoteId.includes(q));
  }, [data, search]);

  const filteredMilestones = useMemo(() => {
    if (!data) return [];
    const list = data.milestoneLists[milThreshold.toString()] ?? [];
    const q = search.toLowerCase();
    return list.filter(m => !q || m.name.toLowerCase().includes(q));
  }, [data, search, milThreshold]);

  if (enabled === false) return <ComingSoon label="Πάνθεον" />;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-white/40 text-sm">Φόρτωση Πάνθεον...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="text-white/50 text-sm">{error || 'Δεν βρέθηκαν δεδομένα.'}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A1628] pb-16">
      {/* Header */}
      <div className="px-4 pt-8 pb-5 max-w-3xl mx-auto">
        <h1 className="text-white font-bold text-2xl">Πάνθεον</h1>
        <p className="text-white/40 text-sm mt-1">Ολοκληρώσεις, αρχεία &amp; κατατάξεις</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-4">

        {/* Summary chips */}
        <div className="flex gap-2">
          <SummaryChip icon="🚴" value={fmt(data.totalRiders)} label="αναβάτες"  color="#06b6d4" />
          <SummaryChip icon="🗺️" value={`${fmt(Math.round(data.totalKm / 1000))}k`} label="km" color="#f59e0b" />
          <SummaryChip icon="🏁" value={fmt(data.totalBrevets)} label="brevets"  color="#ce93d8" />
        </div>

        {/* Records */}
        <div className="space-y-2">
          <RecordChip emoji="📅" title="Πιο Πολυάσχολη Χρονιά"
            value={`${data.busiestYear}  —  ${fmt(data.busiestYearCount)} αναβάτες`} />
          <RecordChip emoji="🔥" title="Ρεκόρ Streak"
            value={data.streakHolderName}
            sub={`${data.streakRecordYears} διαδοχικά χρόνια`} />
          <RecordChip emoji="⭐" title="Περισσότερα SR"
            value={data.mostSrName}
            sub={`${data.mostSrCount} Super Randonneur${data.mostSrCount !== 1 ? 's' : ''}`} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <TabBtn label="Χιλιόμετρα"  active={tab === 'km'}         onClick={() => setTab('km')}         icon="🗺️" />
          <TabBtn label="Brevets"      active={tab === 'brevets'}    onClick={() => setTab('brevets')}    icon="🏁" />
          <TabBtn label="SR"           active={tab === 'sr'}         onClick={() => setTab('sr')}         icon="⭐" />
          <TabBtn label="Ορόσημα"     active={tab === 'milestones'} onClick={() => setTab('milestones')} icon="🏆" />
        </div>

        {/* Search (not shown for milestones tab... actually shown for all) */}
        {tab !== 'milestones' && (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Όνομα ή ΑΜ..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:border-white/30"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-lg leading-none">
                ×
              </button>
            )}
          </div>
        )}

        {/* Ranking list */}
        <div className="bg-blue-950/40 border border-white/10 rounded-2xl divide-y divide-white/0">

          {/* KM tab */}
          {tab === 'km' && (
            <div className="px-4">
              {filteredKm.length === 0
                ? <div className="py-8 text-center text-white/30 text-sm">Δεν βρέθηκαν αποτελέσματα</div>
                : filteredKm.map((m, i) => {
                    const realRank = search ? data.kmRanking.indexOf(m) + 1 : i + 1;
                    return (
                      <RankRow key={i} rank={realRank} name={m.name}
                        value={`${fmt(Math.round(m.totalKm))} km`} unit="χλμ."
                        lepoteId={m.lepoteId} harId={m.harId} />
                    );
                  })}
            </div>
          )}

          {/* Brevets tab */}
          {tab === 'brevets' && (
            <div className="px-4">
              {filteredBrevets.length === 0
                ? <div className="py-8 text-center text-white/30 text-sm">Δεν βρέθηκαν αποτελέσματα</div>
                : filteredBrevets.map((m, i) => {
                    const realRank = search ? data.brevetsRanking.indexOf(m) + 1 : i + 1;
                    return (
                      <RankRow key={i} rank={realRank} name={m.name}
                        value={String(m.totalBrevets)} unit="brevets"
                        lepoteId={m.lepoteId} harId={m.harId} />
                    );
                  })}
            </div>
          )}

          {/* SR tab */}
          {tab === 'sr' && (
            <div className="px-4">
              {filteredSr.length === 0
                ? <div className="py-8 text-center text-white/30 text-sm">Κανένας SR</div>
                : filteredSr.map((m, i) => {
                    const realRank = search ? data.srRanking.indexOf(m) + 1 : i + 1;
                    return <SrRow key={i} rank={realRank} entry={m} />;
                  })}
            </div>
          )}

          {/* Milestones tab */}
          {tab === 'milestones' && (
            <div>
              {/* Threshold picker */}
              <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto">
                {[10, 25, 50, 100, 200].map(t => (
                  <button key={t} onClick={() => setMilThreshold(t)}
                    className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all border ${
                      milThreshold === t ? 'bg-amber-500/30 text-amber-300 border-amber-500/50' : 'text-white/40 border-white/10'
                    }`}>
                    {t}+ brevets
                  </button>
                ))}
              </div>
              <div className="px-4">
                <div className="text-white/30 text-xs mb-3 pb-2 border-b border-white/5">
                  {filteredMilestones.length} αναβάτες με {milThreshold}+ brevets
                </div>
                {filteredMilestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                    <div className="w-7 text-center shrink-0">
                      {i < 3
                        ? <span className="text-base">{medalFor(i + 1)}</span>
                        : <span className="text-xs font-mono text-white/20">{i + 1}</span>}
                    </div>
                    <div className="flex-1 text-white/90 text-sm">{m.name}</div>
                    <div className="font-bold text-sm text-amber-400">{m.count}</div>
                    <div className="text-white/30 text-xs">brevets</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <PageViews page="pantheon" />
      </div>
    </main>
  );
}
