import { NextResponse } from 'next/server';
import { getCachedStats } from '@/app/lib/memberStatsCache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { community } = await getCachedStats();
    return NextResponse.json(community);
  } catch {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }
}
