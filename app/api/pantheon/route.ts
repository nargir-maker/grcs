import { NextRequest, NextResponse } from 'next/server';
import { getCachedStats } from '@/app/lib/memberStatsCache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { pantheon } = await getCachedStats();
    const { byYearClub, ...rest } = pantheon;

    const availableYears = Object.keys(byYearClub).sort((a, b) => b.localeCompare(a));
    const year = req.nextUrl.searchParams.get('year');
    const yearData = year && byYearClub[year] ? { year, ...byYearClub[year] } : null;

    return NextResponse.json({ ...rest, availableYears, yearData });
  } catch {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }
}
