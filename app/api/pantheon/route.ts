import { NextResponse } from 'next/server';
import { getCachedStats } from '@/app/lib/memberStatsCache';

export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET() {
  try {
    const { pantheon } = await getCachedStats();
    const { byYearClub, ...rest } = pantheon;

    const availableYears = Object.keys(byYearClub).sort((a, b) => b.localeCompare(a));

    return NextResponse.json({ ...rest, availableYears });
  } catch {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }
}
