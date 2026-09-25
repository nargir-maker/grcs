// COP31 Bike Ride — Greek leg: Athens (30/9) → Pınarhisar, Turkey (7/10/2026).
// Remove this file + Cop31Banner + Cop31StatusPill + app/[locale]/cop31 once the event has passed.

export const COP31_EVENT_START = '2026-09-30';
export const COP31_EVENT_END = '2026-10-07';
// Banner keeps showing a couple of days after the ride crosses into Turkey, then auto-hides.
export const COP31_BANNER_HIDE_AFTER = '2026-10-09';

export type Cop31Status = 'upcoming' | 'active' | 'ended';

export function getCop31Status(now: Date = new Date()): { status: Cop31Status; days: number } {
  const start = new Date(`${COP31_EVENT_START}T00:00:00+03:00`);
  const end = new Date(`${COP31_EVENT_END}T23:59:59+03:00`);

  if (now < start) {
    const days = Math.ceil((start.getTime() - now.getTime()) / 86400000);
    return { status: 'upcoming', days };
  }
  if (now > end) {
    return { status: 'ended', days: 0 };
  }
  return { status: 'active', days: 0 };
}

export function isCop31BannerVisible(now: Date = new Date()): boolean {
  const hideAfter = new Date(`${COP31_BANNER_HIDE_AFTER}T23:59:59+03:00`);
  return now <= hideAfter;
}
