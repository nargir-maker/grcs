import { NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebaseAdmin';

export const revalidate = 3600;

export async function GET() {
  if (!adminDb) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

  const snap = await adminDb.collection('members').get();

  let totalKm = 0, totalBrevets = 0, totalRiders = 0;
  const ridersByYear:      Record<string, number>      = {};
  const memberYearSets:    Record<string, Set<string>> = {};
  const srCounts:          Record<string, number>      = {};
  const memberEventCounts: Record<string, number>      = {};

  type MemberEntry = {
    uid: string; name: string;
    totalKm: number; totalBrevets: number;
    lepoteId: string; harId: string;
  };
  const members: MemberEntry[] = [];

  for (const doc of snap.docs) {
    const raw       = doc.data();
    const firstName = (raw.name_el    ?? '') as string;
    const lastName  = (raw.surname_el ?? '') as string;
    if (!firstName) continue;

    const uid       = doc.id;
    const stats     = raw.stats ?? {};
    const km        = parseFloat(stats.total_km ?? '0') || 0;
    const brevets   = parseInt(stats.total_brm  ?? '0') || 0;
    const lepoteId  = raw.reg_lepote?.id?.toString() ?? '';
    const harId     = raw.reg_har?.id?.toString()    ?? '';
    const lastInitial = lastName.length > 0 ? `${lastName[0]}.` : '';
    const displayName = `${firstName} ${lastInitial}`.trim();

    let history: Record<string, any> = {};
    try {
      if (stats.history_raw) {
        const parsed = JSON.parse(stats.history_raw as string);
        history = parsed.history ?? parsed;
      }
    } catch {}

    let hasEvents = false;
    for (const [year, data] of Object.entries(history)) {
      const events: any[] = Array.isArray((data as any)?.events) ? (data as any).events : [];
      if (events.length === 0) continue;
      hasEvents = true;

      ridersByYear[year] = (ridersByYear[year] ?? 0) + 1;
      (memberYearSets[uid] ??= new Set<string>()).add(year);
      memberEventCounts[uid] = (memberEventCounts[uid] ?? 0) + events.length;

      const yearDists = new Set(events.map(ev => parseInt(ev.d?.toString() ?? '0') || 0));
      if ([200, 300, 400, 600].every(d => yearDists.has(d))) {
        srCounts[uid] = (srCounts[uid] ?? 0) + 1;
      }
    }

    if (!hasEvents) continue;
    totalRiders++;
    totalKm      += km;
    totalBrevets += brevets;
    members.push({ uid, name: displayName, totalKm: km, totalBrevets: brevets, lepoteId, harId });
  }

  // Busiest year
  let busiestYear = '', busiestYearCount = 0;
  for (const [y, c] of Object.entries(ridersByYear)) {
    if (c > busiestYearCount) { busiestYearCount = c; busiestYear = y; }
  }

  // Streak record
  let streakHolderName = '', streakRecordYears = 0;
  const nameMap: Record<string, string> = Object.fromEntries(members.map(m => [m.uid, m.name]));
  for (const [uid, yearSet] of Object.entries(memberYearSets)) {
    const years = [...yearSet].map(y => parseInt(y)).sort((a, b) => a - b);
    if (years.length === 0) continue;
    let maxStreak = 1, cur = 1;
    for (let j = 1; j < years.length; j++) {
      if (years[j] === years[j - 1] + 1) { cur++; if (cur > maxStreak) maxStreak = cur; }
      else cur = 1;
    }
    if (maxStreak > streakRecordYears) {
      streakRecordYears  = maxStreak;
      streakHolderName   = nameMap[uid] ?? '';
    }
  }

  // SR ranking
  const srRanking = members
    .filter(m => (srCounts[m.uid] ?? 0) > 0)
    .map(m => ({ name: m.name, lepoteId: m.lepoteId, harId: m.harId, srCount: srCounts[m.uid] }))
    .sort((a, b) => b.srCount - a.srCount);
  const mostSrName  = srRanking[0]?.name  ?? '';
  const mostSrCount = srRanking[0]?.srCount ?? 0;

  // Km ranking
  const kmRanking = [...members]
    .sort((a, b) => b.totalKm - a.totalKm)
    .map(m => ({ name: m.name, totalKm: m.totalKm, lepoteId: m.lepoteId, harId: m.harId }));

  // Brevets ranking
  const brevetsRanking = [...members]
    .sort((a, b) => b.totalBrevets - a.totalBrevets)
    .map(m => ({ name: m.name, totalBrevets: m.totalBrevets, lepoteId: m.lepoteId, harId: m.harId }));

  // Milestone lists (top 50 per threshold for manageable payload)
  const milestoneLists: Record<number, Array<{ name: string; count: number }>> = {};
  for (const t of [10, 25, 50, 100, 200]) {
    milestoneLists[t] = members
      .filter(m => (memberEventCounts[m.uid] ?? 0) >= t)
      .map(m => ({ name: m.name, count: memberEventCounts[m.uid] ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }

  return NextResponse.json({
    totalRiders,
    totalKm:    Math.round(totalKm),
    totalBrevets,
    busiestYear, busiestYearCount,
    streakHolderName, streakRecordYears,
    mostSrName, mostSrCount,
    kmRanking, brevetsRanking, srRanking,
    milestoneLists,
  });
}
