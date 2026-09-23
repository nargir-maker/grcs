// Shared server-side stats cache.
// One Firestore fetch, one unstable_cache key, revalidated every 24h.
// Both /api/community and /api/pantheon call getCachedStats() —
// they share the same underlying data pull and pay 1× the read cost,
// not 2×. At ~500 members that's ≤500 reads/day vs ≤24,000/day before.

import { unstable_cache } from 'next/cache';
import { adminDb } from './firebaseAdmin';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseMonth(dt: string): number | null {
  if (dt.length >= 7 && dt[4] === '-') {
    const m = parseInt(dt.substring(5, 7));
    return m >= 1 && m <= 12 ? m : null;
  }
  const parts = dt.split(/[/\-.]/);
  if (parts.length >= 3) {
    const m = parseInt(parts[1]);
    if (m >= 1 && m <= 12) return m;
  }
  return null;
}

// An event's `acp`/`har` field holds that club's homologation number, "" if none.
// Same truthiness rule used elsewhere in the app (ProfileDashboard's `ok()`).
function isCertified(s: unknown): boolean {
  const v = (s ?? '').toString();
  return v !== '' && v !== 'null' && v !== '---';
}

// Fond de Culotte hours-in-saddle for one event — mirrors Flutter's
// _RankStats.compute and the web's own FondDeCulotteCard exactly: real
// finish time (`rt`, "HH:MM") when recorded, else a 15km/h estimate.
// Club-agnostic — every event counts, same as the profile's own FdC card.
function fdcHoursFromEvent(ev: any): number {
  const d = parseFloat(ev.d?.toString() ?? '0') || 0;
  const rt = (ev.rt ?? '').toString().trim();
  if (rt && rt.includes(':')) {
    const [h, m] = rt.split(':');
    return (parseFloat(h) || 0) + (parseFloat(m) || 0) / 60;
  }
  return d > 0 ? d / 15 : 0;
}

type YearClubAgg = {
  km:      Record<string, number>;
  ascent:  Record<string, number>;
  brevets: Record<string, number>;
  srHit:   Set<string>;
};
function mkYearClubAgg(): YearClubAgg {
  return { km: {}, ascent: {}, brevets: {}, srHit: new Set<string>() };
}
type YearClubRankings = {
  kmRanking:      { name: string; totalKm: number; lepoteId: string; harId: string }[];
  ascentRanking:  { name: string; totalAscent: number; lepoteId: string; harId: string }[];
  brevetsRanking: { name: string; totalBrevets: number; lepoteId: string; harId: string }[];
  srRanking:      { name: string; lepoteId: string; harId: string; srCount: number }[];
};

function resolveLastBrevet(hist: Record<string, any>): { name: string; year: string } {
  const sortedYrs = Object.keys(hist).sort((a, b) => b.localeCompare(a));
  for (const y of sortedYrs) {
    const evs = hist[y]?.events;
    if (Array.isArray(evs) && evs.length > 0) {
      return { name: evs[evs.length - 1].n?.toString() ?? '', year: y };
    }
  }
  return { name: '', year: '' };
}

// ── Main computation (runs once per 24h) ─────────────────────────────────────

async function computeAllStats() {
  if (!adminDb) throw new Error('adminDb not configured');

  const snap = await adminDb.collection('members').get();

  // ── Community accumulators ────────────────────────────────────────────────
  let totalWomen = 0, totalMen = 0;
  const womenPerDist: Record<number, Set<string>> = {};
  const menPerDist:   Record<number, Set<string>> = {};
  const womenYearSets: Record<string, Set<string>> = {};
  const totalYearSets: Record<string, Set<string>> = {};
  const eventMap: Record<string, { women: number; total: number; date: string; og: string }> = {};
  const womenSrByUid: Record<string, number> = {};
  const menSrByUid:   Record<string, number> = {};
  const eventsByMonth:      Record<number, number> = {};
  const eventsByMonthWomen: Record<number, number> = {};
  const newWomenByYear:  Record<string, number> = {};
  const newMenByYear:    Record<string, number> = {};
  const lastWomenByYear: Record<string, number> = {};
  const lastMenByYear:   Record<string, number> = {};
  let firstWomanName = '', firstWomanYear = '9999', firstWomanEvent = '';
  let firstWomanLastBrevetName = '', firstWomanLastBrevetYear = '';
  let firstManName = '',   firstManYear   = '9999', firstManEvent   = '';
  let firstManLastBrevetName   = '', firstManLastBrevetYear   = '';
  let firstWomanHistory: Record<string, any> | null = null;
  let firstManHistory:   Record<string, any> | null = null;

  // ── Pantheon accumulators ─────────────────────────────────────────────────
  let totalKm = 0, totalBrevets = 0, totalRiders = 0;
  const ridersByYear: Record<string, number> = {};
  // Combined (ACP + HAR) SR achievement count per member — each club's SR years
  // counted separately, never mixing one club's 200 with another's 300/400/600.
  const srCounts:     Record<string, number> = {};
  const srCountsAcp:  Record<string, number> = {};
  const srCountsHar:  Record<string, number> = {};

  type MemberEntry = { uid: string; name: string; totalKm: number; totalAscent: number; totalBrevets: number; lepoteId: string; harId: string };
  const members:    MemberEntry[] = [];
  const membersAcp: MemberEntry[] = [];
  const membersHar: MemberEntry[] = [];

  // FdC hours-in-saddle ranking — club-agnostic, all-time (no per-club split,
  // matches the profile's own FondDeCulotteCard which always uses full history).
  type FdcMemberEntry = { uid: string; name: string; totalFdcHours: number; lepoteId: string; harId: string };
  const fdcMembers: FdcMemberEntry[] = [];

  // Per-year × per-club (ALL/ACP/HAR) rankings — powers the Πάνθεον year
  // selector. ALL sums every event regardless of certification (mirrors the
  // all-time "ALL" ranking's use of the raw Firestore totals); ACP/HAR only
  // count events certified by that club. SR per year/club follows the same
  // club-separation rule as the all-time SR fix — never a blended distance set.
  const yearClubAgg: Record<string, { ALL: YearClubAgg; ACP: YearClubAgg; HAR: YearClubAgg }> = {};

  // ── Shared accumulators ───────────────────────────────────────────────────
  const memberYearSets:    Record<string, Set<string>> = {};
  const memberEventCounts: Record<string, number>      = {};
  const memberNames:       Record<string, string>      = {};
  const memberLepoteId:    Record<string, string>      = {};
  const memberHarId:       Record<string, string>      = {};

  // ── Universe accumulators ─────────────────────────────────────────────────
  const ogParticipants:   Record<string, number>      = {};
  const ogRiders:         Record<string, Set<string>> = {};
  const ogBrevetKeys:     Record<string, Set<string>> = {};
  const ogFirstYear:      Record<string, string>      = {};
  const ogLastYear:       Record<string, string>      = {};
  const routeParticipants:  Record<string, number>      = {};
  const routeEditions:      Record<string, Set<string>> = {};
  const routeDistance:      Record<string, number>      = {};
  const routeDisplayName:   Record<string, string>      = {};
  const routeOrganizer:     Record<string, string>      = {};
  const routeFirstYear:     Record<string, string>      = {};
  const routeLastYear:      Record<string, string>      = {};

  // ── Single pass over all member documents ─────────────────────────────────
  for (const doc of snap.docs) {
    const raw       = doc.data();
    const gender    = (raw.gender    ?? 'M') as string;
    const firstName = (raw.name_el   ?? '')  as string;
    const lastName  = (raw.surname_el ?? '') as string;
    if (!firstName) continue;

    const uid         = doc.id;
    const stats       = raw.stats ?? {};
    const km          = parseFloat(stats.total_km ?? '0') || 0;
    const brevets     = parseInt(stats.total_brm  ?? '0') || 0;
    const lepoteId    = raw.reg_lepote?.id?.toString() ?? '';
    const harId       = raw.reg_har?.id?.toString()    ?? '';
    const displayName = lastName ? `${lastName} ${firstName}`.trim() : firstName;
    memberNames[uid]    = displayName;
    memberLepoteId[uid] = lepoteId;
    memberHarId[uid]    = harId;

    let history: Record<string, any> = {};
    try {
      if (stats.history_raw) {
        const parsed = JSON.parse(stats.history_raw as string);
        history = parsed.history ?? parsed;
      }
    } catch { continue; }

    let memberHasEvents = false;
    const memberDistances = new Set<number>();
    const yearsWithEvents: string[] = [];

    // Per-club (ACP / HAR) totals — an event only counts toward a club if that
    // club's homologation field on it is certified, per AGENTS.md club rules.
    let acpKm = 0, acpBrevets = 0, acpAscent = 0;
    let harKm = 0, harBrevets = 0, harAscent = 0;
    let acpSrCount = 0, harSrCount = 0;
    // Ascent has no precomputed backend total (unlike total_km/total_brm), so
    // it's always summed from the raw events — same as Flutter's _RankStats.
    let allAscent = 0;
    let fdcHoursTotal = 0;

    for (const [year, data] of Object.entries(history)) {
      const events: any[] = Array.isArray((data as any)?.events) ? (data as any).events : [];
      if (events.length === 0) continue;
      memberHasEvents = true;

      yearsWithEvents.push(year);
      ridersByYear[year] = (ridersByYear[year] ?? 0) + 1;
      (totalYearSets[year]  ??= new Set<string>()).add(uid);
      if (gender === 'F') (womenYearSets[year] ??= new Set<string>()).add(uid);
      (memberYearSets[uid] ??= new Set<string>()).add(year);
      memberEventCounts[uid] = (memberEventCounts[uid] ?? 0) + events.length;

      const yearDists = new Set<number>();
      const acpYearDists = new Set<number>();
      const harYearDists = new Set<number>();
      let yearKmAll = 0, yearAscAll = 0, yearBrevetsAll = 0;
      let yearKmAcp = 0, yearAscAcp = 0, yearBrevetsAcp = 0;
      let yearKmHar = 0, yearAscHar = 0, yearBrevetsHar = 0;
      for (const ev of events) {
        const d   = parseInt(ev.d?.toString() ?? '0') || 0;
        const asc = parseFloat(ev.as?.toString() ?? '0') || 0;
        memberDistances.add(d);
        yearDists.add(d);
        allAscent += asc;
        fdcHoursTotal += fdcHoursFromEvent(ev);
        yearKmAll += d; yearAscAll += asc; yearBrevetsAll++;
        if (isCertified(ev.acp)) { acpKm += d; acpAscent += asc; acpBrevets++; acpYearDists.add(d); yearKmAcp += d; yearAscAcp += asc; yearBrevetsAcp++; }
        if (isCertified(ev.har)) { harKm += d; harAscent += asc; harBrevets++; harYearDists.add(d); yearKmHar += d; yearAscHar += asc; yearBrevetsHar++; }

        const month = parseMonth(ev.dt?.toString() ?? '');
        if (month !== null) {
          eventsByMonth[month] = (eventsByMonth[month] ?? 0) + 1;
          if (gender === 'F') eventsByMonthWomen[month] = (eventsByMonthWomen[month] ?? 0) + 1;
        }

        const evKey = `${ev.n ?? ''}__${ev.dt ?? ''}`;
        const cur   = eventMap[evKey];
        if (!cur) {
          eventMap[evKey] = { women: gender === 'F' ? 1 : 0, total: 1, date: ev.dt?.toString() ?? '', og: ev.og?.toString() ?? '' };
        } else {
          cur.women += gender === 'F' ? 1 : 0;
          cur.total += 1;
        }

        // ── Universe accumulation ────────────────────────────────────────────
        const evOg   = ev.og?.toString() ?? '';
        const evName = (ev.n  ?? '').toString().trim();
        const evDist = parseInt(ev.d?.toString() ?? '0') || 0;
        if (evOg) {
          ogParticipants[evOg] = (ogParticipants[evOg] ?? 0) + 1;
          (ogRiders[evOg]     ??= new Set<string>()).add(uid);
          (ogBrevetKeys[evOg] ??= new Set<string>()).add(`${evName}_${year}`);
          if (!ogFirstYear[evOg] || year < ogFirstYear[evOg]) ogFirstYear[evOg] = year;
          if (!ogLastYear[evOg]  || year > ogLastYear[evOg])  ogLastYear[evOg]  = year;
        }
        if (evName && evDist > 0) {
          const rk = `${evName.toLowerCase().replace(/\s+/g, '_')}_${evDist}`;
          routeParticipants[rk]  = (routeParticipants[rk]  ?? 0) + 1;
          (routeEditions[rk]    ??= new Set<string>()).add(`${year}_${ev.dt ?? ''}`);
          routeDistance[rk]      = evDist;
          routeDisplayName[rk]   = evName;
          if (evOg) routeOrganizer[rk] = evOg;
          if (!routeFirstYear[rk] || year < routeFirstYear[rk]) routeFirstYear[rk] = year;
          if (!routeLastYear[rk]  || year > routeLastYear[rk])  routeLastYear[rk]  = year;
        }

        if (gender === 'F' && year < firstWomanYear) {
          firstWomanYear = year; firstWomanName = displayName;
          firstWomanEvent = ev.n?.toString() ?? ''; firstWomanHistory = history;
        }
        if (gender === 'M' && year < firstManYear) {
          firstManYear = year; firstManName = displayName;
          firstManEvent = ev.n?.toString() ?? ''; firstManHistory = history;
        }
      }

      // SR requires all four distances certified by the SAME club in the same
      // year (AGENTS.md: SR is computed per club, never mixing ACP with HAR).
      const isAcpSrYear = [200, 300, 400, 600].every(dd => acpYearDists.has(dd));
      const isHarSrYear = [200, 300, 400, 600].every(dd => harYearDists.has(dd));
      if (isAcpSrYear) acpSrCount++;
      if (isHarSrYear) harSrCount++;
      if (isAcpSrYear || isHarSrYear) {
        if (gender === 'F') womenSrByUid[uid] = (womenSrByUid[uid] ?? 0) + 1;
        else                menSrByUid[uid]   = (menSrByUid[uid]   ?? 0) + 1;
      }

      const yAgg = (yearClubAgg[year] ??= { ALL: mkYearClubAgg(), ACP: mkYearClubAgg(), HAR: mkYearClubAgg() });
      if (yearBrevetsAll > 0) {
        yAgg.ALL.km[uid]      = (yAgg.ALL.km[uid]      ?? 0) + yearKmAll;
        yAgg.ALL.ascent[uid]  = (yAgg.ALL.ascent[uid]  ?? 0) + yearAscAll;
        yAgg.ALL.brevets[uid] = (yAgg.ALL.brevets[uid] ?? 0) + yearBrevetsAll;
      }
      if (yearBrevetsAcp > 0) {
        yAgg.ACP.km[uid]      = (yAgg.ACP.km[uid]      ?? 0) + yearKmAcp;
        yAgg.ACP.ascent[uid]  = (yAgg.ACP.ascent[uid]  ?? 0) + yearAscAcp;
        yAgg.ACP.brevets[uid] = (yAgg.ACP.brevets[uid] ?? 0) + yearBrevetsAcp;
      }
      if (yearBrevetsHar > 0) {
        yAgg.HAR.km[uid]      = (yAgg.HAR.km[uid]      ?? 0) + yearKmHar;
        yAgg.HAR.ascent[uid]  = (yAgg.HAR.ascent[uid]  ?? 0) + yearAscHar;
        yAgg.HAR.brevets[uid] = (yAgg.HAR.brevets[uid] ?? 0) + yearBrevetsHar;
      }
      if (isAcpSrYear) yAgg.ACP.srHit.add(uid);
      if (isHarSrYear) yAgg.HAR.srHit.add(uid);
      if (isAcpSrYear || isHarSrYear) yAgg.ALL.srHit.add(uid);
    }

    if (!memberHasEvents) continue;

    if (gender === 'F') totalWomen++; else totalMen++;
    totalRiders++;
    totalKm      += km;
    totalBrevets += brevets;
    members.push({ uid, name: displayName, totalKm: km, totalAscent: allAscent, totalBrevets: brevets, lepoteId, harId });
    if (acpBrevets > 0) membersAcp.push({ uid, name: displayName, totalKm: acpKm, totalAscent: acpAscent, totalBrevets: acpBrevets, lepoteId, harId });
    if (harBrevets > 0) membersHar.push({ uid, name: displayName, totalKm: harKm, totalAscent: harAscent, totalBrevets: harBrevets, lepoteId, harId });
    if (acpSrCount > 0) srCountsAcp[uid] = acpSrCount;
    if (harSrCount > 0) srCountsHar[uid] = harSrCount;
    if (acpSrCount > 0 || harSrCount > 0) srCounts[uid] = acpSrCount + harSrCount;
    if (fdcHoursTotal > 0) fdcMembers.push({ uid, name: displayName, totalFdcHours: fdcHoursTotal, lepoteId, harId });

    for (const d of memberDistances) {
      if (gender === 'F') (womenPerDist[d] ??= new Set<string>()).add(uid);
      else                (menPerDist[d]   ??= new Set<string>()).add(uid);
    }

    if (yearsWithEvents.length > 0) {
      yearsWithEvents.sort();
      const fy = yearsWithEvents[0], ly = yearsWithEvents[yearsWithEvents.length - 1];
      if (gender === 'F') {
        newWomenByYear[fy]  = (newWomenByYear[fy]  ?? 0) + 1;
        lastWomenByYear[ly] = (lastWomenByYear[ly] ?? 0) + 1;
      } else {
        newMenByYear[fy]  = (newMenByYear[fy]  ?? 0) + 1;
        lastMenByYear[ly] = (lastMenByYear[ly] ?? 0) + 1;
      }
    }
  }

  // ── Post-processing: Community ────────────────────────────────────────────
  if (firstWomanHistory) { const lb = resolveLastBrevet(firstWomanHistory); firstWomanLastBrevetName = lb.name; firstWomanLastBrevetYear = lb.year; }
  if (firstManHistory)   { const lb = resolveLastBrevet(firstManHistory);   firstManLastBrevetName   = lb.name; firstManLastBrevetYear   = lb.year; }

  const byDistance: Record<number, { women: number; men: number }> = {};
  for (const d of [200, 300, 400, 600, 1200]) {
    const w = womenPerDist[d]?.size ?? 0; const m = menPerDist[d]?.size ?? 0;
    if (w + m > 0) byDistance[d] = { women: w, men: m };
  }

  const allEvts = Object.entries(eventMap).map(([key, val]) => {
    const i = key.indexOf('__');
    return { name: i >= 0 ? key.substring(0, i) : key, date: val.date, og: val.og, women: val.women, men: val.total - val.women, total: val.total };
  });
  const womenEvts     = [...allEvts].filter(e => e.women > 0).sort((a, b) => b.women - a.women);
  const topByCount    = womenEvts.slice(0, 5);
  const topByPct      = [...womenEvts].filter(e => e.total >= 4).sort((a, b) => (b.women / b.total) - (a.women / a.total)).slice(0, 5);
  const menEvts       = [...allEvts].filter(e => e.men > 0).sort((a, b) => b.men - a.men);
  const menTopByCount = menEvts.slice(0, 5);
  const menTopByPct   = [...menEvts].filter(e => e.total >= 4).sort((a, b) => (b.men / b.total) - (a.men / a.total)).slice(0, 5);

  const womenByYear: Record<string, number> = {};
  const totalByYear: Record<string, number> = {};
  for (const [y, s] of Object.entries(womenYearSets)) womenByYear[y] = s.size;
  for (const [y, s] of Object.entries(totalYearSets)) totalByYear[y] = s.size;
  const sortedYears = Object.keys(totalByYear).sort();

  const streakBuckets: Record<number, number> = {};
  let globalMaxStreak = 0, globalMaxStreakName = '';
  for (const [uid, yearSet] of Object.entries(memberYearSets)) {
    const years = [...yearSet].map(y => parseInt(y)).sort((a, b) => a - b);
    if (years.length === 0) continue;
    let maxStreak = 1, cur = 1;
    for (let j = 1; j < years.length; j++) {
      if (years[j] === years[j - 1] + 1) { cur++; if (cur > maxStreak) maxStreak = cur; }
      else cur = 1;
    }
    streakBuckets[maxStreak] = (streakBuckets[maxStreak] ?? 0) + 1;
    if (maxStreak > globalMaxStreak) { globalMaxStreak = maxStreak; globalMaxStreakName = memberNames[uid] ?? ''; }
  }

  const womenWithSR = Object.entries(womenSrByUid).map(([uid, srCount]) => ({ name: memberNames[uid] ?? '', srCount })).sort((a, b) => a.name.localeCompare(b.name, 'el'));
  const menWithSR   = Object.entries(menSrByUid).map(([uid, srCount])   => ({ name: memberNames[uid] ?? '', srCount })).sort((a, b) => a.name.localeCompare(b.name, 'el'));

  const milestoneCounts: Record<string, number> = { '10': 0, '25': 0, '50': 0, '100': 0, '200': 0 };
  for (const count of Object.values(memberEventCounts)) {
    if (count >= 10)  milestoneCounts['10']++;
    if (count >= 25)  milestoneCounts['25']++;
    if (count >= 50)  milestoneCounts['50']++;
    if (count >= 100) milestoneCounts['100']++;
    if (count >= 200) milestoneCounts['200']++;
  }

  const totalGender = totalWomen + totalMen;

  // ── Post-processing: Pantheon ─────────────────────────────────────────────
  let busiestYear = '', busiestYearCount = 0;
  for (const [y, c] of Object.entries(ridersByYear)) {
    if (c > busiestYearCount) { busiestYearCount = c; busiestYear = y; }
  }

  let streakHolderName = '', streakRecordYears = 0;
  for (const [uid, yearSet] of Object.entries(memberYearSets)) {
    const years = [...yearSet].map(y => parseInt(y)).sort((a, b) => a - b);
    if (years.length === 0) continue;
    let maxStreak = 1, cur = 1;
    for (let j = 1; j < years.length; j++) {
      if (years[j] === years[j - 1] + 1) { cur++; if (cur > maxStreak) maxStreak = cur; }
      else cur = 1;
    }
    if (maxStreak > streakRecordYears) { streakRecordYears = maxStreak; streakHolderName = memberNames[uid] ?? ''; }
  }

  function buildRankings(clubMembers: MemberEntry[], clubSrCounts: Record<string, number>) {
    const srRanking = clubMembers
      .filter(m => (clubSrCounts[m.uid] ?? 0) > 0)
      .map(m => ({ name: m.name, lepoteId: m.lepoteId, harId: m.harId, srCount: clubSrCounts[m.uid] ?? 0 }))
      .sort((a, b) => b.srCount - a.srCount);
    const kmRanking = [...clubMembers].sort((a, b) => b.totalKm - a.totalKm)
      .map(m => ({ name: m.name, totalKm: m.totalKm, lepoteId: m.lepoteId, harId: m.harId }));
    const ascentRanking = [...clubMembers].sort((a, b) => b.totalAscent - a.totalAscent)
      .map(m => ({ name: m.name, totalAscent: m.totalAscent, lepoteId: m.lepoteId, harId: m.harId }));
    const brevetsRanking = [...clubMembers].sort((a, b) => b.totalBrevets - a.totalBrevets)
      .map(m => ({ name: m.name, totalBrevets: m.totalBrevets, lepoteId: m.lepoteId, harId: m.harId }));
    return { kmRanking, ascentRanking, brevetsRanking, srRanking };
  }

  const allRankings = buildRankings(members, srCounts);
  const acpRankings = buildRankings(membersAcp, srCountsAcp);
  const harRankings = buildRankings(membersHar, srCountsHar);
  const { kmRanking, ascentRanking, brevetsRanking, srRanking } = allRankings;

  const fdcRanking = [...fdcMembers].sort((a, b) => b.totalFdcHours - a.totalFdcHours)
    .map(m => ({ name: m.name, totalFdcHours: Math.round(m.totalFdcHours * 10) / 10, lepoteId: m.lepoteId, harId: m.harId }));

  // ── Post-processing: Πάνθεον year selector ────────────────────────────────
  function buildYearClubRankings(agg: YearClubAgg): YearClubRankings {
    const byKm  = Object.entries(agg.km).sort((a, b) => b[1] - a[1]);
    const byAsc = Object.entries(agg.ascent).sort((a, b) => b[1] - a[1]);
    const byBrv = Object.entries(agg.brevets).sort((a, b) => b[1] - a[1]);
    const srRanking = [...agg.srHit]
      .map(uid => ({ name: memberNames[uid] ?? '', lepoteId: memberLepoteId[uid] ?? '', harId: memberHarId[uid] ?? '', srCount: 1 }))
      .sort((a, b) => a.name.localeCompare(b.name, 'el'));
    return {
      kmRanking:      byKm.map(([uid, v])  => ({ name: memberNames[uid] ?? '', totalKm: v,      lepoteId: memberLepoteId[uid] ?? '', harId: memberHarId[uid] ?? '' })),
      ascentRanking:  byAsc.map(([uid, v]) => ({ name: memberNames[uid] ?? '', totalAscent: v,  lepoteId: memberLepoteId[uid] ?? '', harId: memberHarId[uid] ?? '' })),
      brevetsRanking: byBrv.map(([uid, v]) => ({ name: memberNames[uid] ?? '', totalBrevets: v, lepoteId: memberLepoteId[uid] ?? '', harId: memberHarId[uid] ?? '' })),
      srRanking,
    };
  }

  const byYearClub: Record<string, {
    totalRiders: number; totalKm: number; totalBrevets: number;
    ALL: YearClubRankings; ACP: YearClubRankings; HAR: YearClubRankings;
  }> = {};
  for (const [year, agg] of Object.entries(yearClubAgg)) {
    byYearClub[year] = {
      totalRiders:  Object.keys(agg.ALL.brevets).length,
      totalKm:      Math.round(Object.values(agg.ALL.km).reduce((a, b) => a + b, 0)),
      totalBrevets: Object.values(agg.ALL.brevets).reduce((a, b) => a + b, 0),
      ALL: buildYearClubRankings(agg.ALL),
      ACP: buildYearClubRankings(agg.ACP),
      HAR: buildYearClubRankings(agg.HAR),
    };
  }

  const milestoneLists: Record<number, Array<{ name: string; count: number }>> = {};
  for (const t of [10, 25, 50, 100, 200]) {
    milestoneLists[t] = members
      .filter(m => (memberEventCounts[m.uid] ?? 0) >= t)
      .map(m => ({ name: m.name, count: memberEventCounts[m.uid] ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }

  // ── Post-processing: Universe ─────────────────────────────────────────────
  const clubNames: Record<string, string> = {};
  try {
    const clubsSnap = await adminDb!.collection('clubs').get();
    for (const doc of clubsSnap.docs) {
      const d = doc.data();
      clubNames[doc.id] = (d.clubNameGr || d.name || doc.id) as string;
    }
  } catch { /* optional */ }

  const organizerRanking = Object.entries(ogParticipants)
    .map(([id, participants]) => ({
      id,
      name:         clubNames[id] || id,
      participants,
      uniqueRiders: ogRiders[id]?.size    ?? 0,
      brevets:      ogBrevetKeys[id]?.size ?? 0,
      firstYear:    ogFirstYear[id]        ?? '',
      lastYear:     ogLastYear[id]         ?? '',
    }))
    .sort((a, b) => b.participants - a.participants);

  const routeRanking = Object.entries(routeParticipants)
    .map(([key, participants]) => ({
      key,
      name:      routeDisplayName[key] ?? key,
      distance:  routeDistance[key]    ?? 0,
      organizer: clubNames[routeOrganizer[key] ?? ''] || routeOrganizer[key] || '',
      participants,
      editions:  routeEditions[key]?.size ?? 0,
      firstYear: routeFirstYear[key]      ?? '',
      lastYear:  routeLastYear[key]       ?? '',
    }))
    .sort((a, b) => b.participants - a.participants);

  return {
    community: {
      totalWomen, totalMen,
      womenPct: totalGender > 0 ? Math.round((totalWomen / totalGender) * 1000) / 10 : 0,
      byDistance, sortedYears, womenByYear, totalByYear,
      newWomenByYear, newMenByYear, lastWomenByYear, lastMenByYear,
      topByCount, topByPct, menTopByCount, menTopByPct,
      womenSR: Object.keys(womenSrByUid).length,
      menSR:   Object.keys(menSrByUid).length,
      womenWithSR, menWithSR,
      firstWomanName, firstWomanYear: firstWomanYear === '9999' ? '' : firstWomanYear,
      firstWomanEvent, firstWomanLastBrevetName, firstWomanLastBrevetYear,
      firstManName,   firstManYear:   firstManYear   === '9999' ? '' : firstManYear,
      firstManEvent,  firstManLastBrevetName,   firstManLastBrevetYear,
      eventsByMonth, eventsByMonthWomen,
      streakBuckets, globalMaxStreak, globalMaxStreakName,
      milestoneCounts,
    },
    pantheon: {
      totalRiders, totalKm: Math.round(totalKm), totalBrevets,
      busiestYear, busiestYearCount,
      streakHolderName, streakRecordYears,
      mostSrName:  srRanking[0]?.name    ?? '',
      mostSrCount: srRanking[0]?.srCount ?? 0,
      kmRanking, ascentRanking, brevetsRanking, srRanking, milestoneLists, fdcRanking,
      byClub: {
        ACP: {
          kmRanking: acpRankings.kmRanking, ascentRanking: acpRankings.ascentRanking, brevetsRanking: acpRankings.brevetsRanking, srRanking: acpRankings.srRanking,
          mostSrName:  acpRankings.srRanking[0]?.name    ?? '',
          mostSrCount: acpRankings.srRanking[0]?.srCount ?? 0,
        },
        HAR: {
          kmRanking: harRankings.kmRanking, ascentRanking: harRankings.ascentRanking, brevetsRanking: harRankings.brevetsRanking, srRanking: harRankings.srRanking,
          mostSrName:  harRankings.srRanking[0]?.name    ?? '',
          mostSrCount: harRankings.srRanking[0]?.srCount ?? 0,
        },
      },
      byYearClub,
    },
    organizerUniverse: {
      totalOrganizers:    organizerRanking.length,
      totalParticipations: organizerRanking.reduce((s, o) => s + o.participants, 0),
      ranking: organizerRanking,
    },
    brevetUniverse: {
      totalRoutes:         routeRanking.length,
      totalParticipations: routeRanking.reduce((s, r) => s + r.participants, 0),
      ranking: routeRanking,
    },
  };
}

// 24-hour cache — community stats don't change by the hour,
// and both routes share this single cache entry (1× read cost, not 2×).
export const getCachedStats = unstable_cache(
  computeAllStats,
  ['member-stats'],
  { revalidate: 86400 }
);
