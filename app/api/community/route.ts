import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { adminDb } from '@/app/lib/firebaseAdmin';

// Prevent Next.js from prerendering this route at build time
export const dynamic = 'force-dynamic';

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

async function computeStats() {
  if (!adminDb) throw new Error('adminDb not configured');

  const snap = await adminDb.collection('members').get();

  let totalWomen = 0, totalMen = 0;
  const womenPerDist: Record<number, Set<string>> = {};
  const menPerDist:   Record<number, Set<string>> = {};
  const womenYearSets:  Record<string, Set<string>> = {};
  const totalYearSets:  Record<string, Set<string>> = {};
  const eventMap: Record<string, { women: number; total: number; date: string; og: string }> = {};
  const womenSrByUid: Record<string, number> = {};
  const menSrByUid:   Record<string, number> = {};
  const memberYearSets:    Record<string, Set<string>> = {};
  const memberEventCounts: Record<string, number>     = {};
  const memberNames:   Record<string, string> = {};
  const eventsByMonth:       Record<number, number> = {};
  const eventsByMonthWomen:  Record<number, number> = {};
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

  for (const doc of snap.docs) {
    const raw    = doc.data();
    const gender = (raw.gender ?? 'M') as string;
    if (gender !== 'F' && gender !== 'M') continue;
    const firstName = (raw.name_el    ?? '') as string;
    const lastName  = (raw.surname_el ?? '') as string;
    if (!firstName) continue;

    let history: Record<string, any> = {};
    try {
      if (raw.stats?.history_raw) {
        const parsed = JSON.parse(raw.stats.history_raw as string);
        history = parsed.history ?? parsed;
      }
    } catch { continue; }

    const uid         = doc.id;
    const lastInitial = lastName.length > 0 ? `${lastName[0]}.` : '';
    const displayName = `${firstName} ${lastInitial}`.trim();
    memberNames[uid]  = displayName;

    let memberHasEvents = false;
    const memberDistances = new Set<number>();
    const yearsWithEvents: string[] = [];

    for (const [year, data] of Object.entries(history)) {
      const events: any[] = Array.isArray((data as any)?.events) ? (data as any).events : [];
      if (events.length === 0) continue;
      memberHasEvents = true;

      yearsWithEvents.push(year);
      (totalYearSets[year] ??= new Set<string>()).add(uid);
      if (gender === 'F') (womenYearSets[year] ??= new Set<string>()).add(uid);
      (memberYearSets[uid] ??= new Set<string>()).add(year);

      const yearDists = new Set<number>();
      for (const ev of events) {
        const d = parseInt(ev.d?.toString() ?? '0') || 0;
        memberDistances.add(d);
        yearDists.add(d);
        memberEventCounts[uid] = (memberEventCounts[uid] ?? 0) + 1;

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

        if (gender === 'F' && year < firstWomanYear) {
          firstWomanYear    = year;
          firstWomanName    = displayName;
          firstWomanEvent   = ev.n?.toString() ?? '';
          firstWomanHistory = history;
        }
        if (gender === 'M' && year < firstManYear) {
          firstManYear    = year;
          firstManName    = displayName;
          firstManEvent   = ev.n?.toString() ?? '';
          firstManHistory = history;
        }
      }

      if ([200, 300, 400, 600].every(d => yearDists.has(d))) {
        if (gender === 'F') womenSrByUid[uid] = (womenSrByUid[uid] ?? 0) + 1;
        else                menSrByUid[uid]   = (menSrByUid[uid]   ?? 0) + 1;
      }
    }

    if (!memberHasEvents) continue;

    if (gender === 'F') totalWomen++; else totalMen++;

    for (const d of memberDistances) {
      if (gender === 'F') (womenPerDist[d] ??= new Set<string>()).add(uid);
      else                (menPerDist[d]   ??= new Set<string>()).add(uid);
    }

    if (yearsWithEvents.length > 0) {
      yearsWithEvents.sort();
      const fy = yearsWithEvents[0];
      const ly = yearsWithEvents[yearsWithEvents.length - 1];
      if (gender === 'F') {
        newWomenByYear[fy]  = (newWomenByYear[fy]  ?? 0) + 1;
        lastWomenByYear[ly] = (lastWomenByYear[ly] ?? 0) + 1;
      } else {
        newMenByYear[fy]  = (newMenByYear[fy]  ?? 0) + 1;
        lastMenByYear[ly] = (lastMenByYear[ly] ?? 0) + 1;
      }
    }
  }

  if (firstWomanHistory) {
    const lb = resolveLastBrevet(firstWomanHistory);
    firstWomanLastBrevetName = lb.name; firstWomanLastBrevetYear = lb.year;
  }
  if (firstManHistory) {
    const lb = resolveLastBrevet(firstManHistory);
    firstManLastBrevetName = lb.name; firstManLastBrevetYear = lb.year;
  }

  const byDistance: Record<number, { women: number; men: number }> = {};
  for (const d of [200, 300, 400, 600, 1200]) {
    const w = womenPerDist[d]?.size ?? 0;
    const m = menPerDist[d]?.size ?? 0;
    if (w + m > 0) byDistance[d] = { women: w, men: m };
  }

  const allEvts = Object.entries(eventMap).map(([key, val]) => {
    const i = key.indexOf('__');
    return { name: i >= 0 ? key.substring(0, i) : key, date: val.date, og: val.og, women: val.women, men: val.total - val.women, total: val.total };
  });

  const womenEvts = [...allEvts].filter(e => e.women > 0).sort((a, b) => b.women - a.women);
  const topByCount = womenEvts.slice(0, 5);
  const topByPct   = [...womenEvts].filter(e => e.total >= 4).sort((a, b) => (b.women / b.total) - (a.women / a.total)).slice(0, 5);
  const menEvts    = [...allEvts].filter(e => e.men > 0).sort((a, b) => b.men - a.men);
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
    if (maxStreak > globalMaxStreak) {
      globalMaxStreak = maxStreak;
      globalMaxStreakName = memberNames[uid] ?? '';
    }
  }

  const womenWithSR = Object.entries(womenSrByUid)
    .map(([uid, srCount]) => ({ name: memberNames[uid] ?? '', srCount }))
    .sort((a, b) => a.name.localeCompare(b.name, 'el'));
  const menWithSR = Object.entries(menSrByUid)
    .map(([uid, srCount]) => ({ name: memberNames[uid] ?? '', srCount }))
    .sort((a, b) => a.name.localeCompare(b.name, 'el'));

  const milestoneCounts: Record<string, number> = { '10': 0, '25': 0, '50': 0, '100': 0, '200': 0 };
  for (const count of Object.values(memberEventCounts)) {
    if (count >= 10)  milestoneCounts['10']++;
    if (count >= 25)  milestoneCounts['25']++;
    if (count >= 50)  milestoneCounts['50']++;
    if (count >= 100) milestoneCounts['100']++;
    if (count >= 200) milestoneCounts['200']++;
  }

  const total = totalWomen + totalMen;
  return {
    totalWomen, totalMen,
    womenPct: total > 0 ? Math.round((totalWomen / total) * 1000) / 10 : 0,
    byDistance,
    sortedYears, womenByYear, totalByYear,
    newWomenByYear, newMenByYear,
    lastWomenByYear, lastMenByYear,
    topByCount, topByPct,
    menTopByCount, menTopByPct,
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
  };
}

const getCachedStats = unstable_cache(computeStats, ['community-stats'], { revalidate: 3600 });

export async function GET() {
  try {
    const data = await getCachedStats();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }
}
