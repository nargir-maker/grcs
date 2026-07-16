// Approximate mid-month sunset clock-time for Greece (DST-aware,
// Athens-representative). A brevet starting at/after this time is
// flagged as a night start for the moon icon. Deliberately a fixed
// lookup rather than a real per-coordinate sunrise/sunset calculation —
// this only drives a small UI glyph, not the lights-timing logic.
// Ported from the Flutter app's UIHelpers.isNightStart().
const SUNSET_MINUTES_BY_MONTH = [
  17 * 60 + 25, // Jan
  18 * 60,      // Feb
  18 * 60 + 30, // Mar
  20 * 60 + 15, // Apr
  20 * 60 + 40, // May
  20 * 60 + 50, // Jun
  20 * 60 + 45, // Jul
  20 * 60 + 20, // Aug
  19 * 60 + 35, // Sep
  18 * 60 + 40, // Oct
  17 * 60 + 15, // Nov
  17 * 60 + 5,  // Dec
];

export function isNightStart(date: Date): boolean {
  const startMinutes = date.getHours() * 60 + date.getMinutes();
  return startMinutes >= SUNSET_MINUTES_BY_MONTH[date.getMonth()];
}
