import { NextResponse } from 'next/server';
import { getCachedStats } from '@/app/lib/memberStatsCache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { organizerUniverse } = await getCachedStats();
    return NextResponse.json(organizerUniverse);
  } catch {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }
}
