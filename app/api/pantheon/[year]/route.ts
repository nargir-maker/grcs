import { NextResponse } from 'next/server';
import { getCachedStats } from '@/app/lib/memberStatsCache';

export const revalidate = 86400;

export async function generateStaticParams() {
  try {
    const { pantheon } = await getCachedStats();
    return Object.keys(pantheon.byYearClub).map((year) => ({ year }));
  } catch {
    return [];
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  try {
    const { year } = await params;
    const { pantheon } = await getCachedStats();
    const yearData = pantheon.byYearClub[year] ? { year, ...pantheon.byYearClub[year] } : null;
    return NextResponse.json({ yearData });
  } catch {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }
}
