// ── riderMotion.ts ────────────────────────────────────────────────────────────
// Mirrors the Flutter app's lib/utils/rider_motion.dart — a shared "is this
// rider actually moving" state derived from the same RTDB participant fields
// both trackers publish (speed, stopped_sec, timestamp, alive_ts, online,
// battery). Used by the Friendly Ride and Live Brevet pages and by LiveMap.

export type RiderMotionState = 'moving' | 'stopped' | 'noGps' | 'noSignal';

export interface RiderMotion {
  state: RiderMotionState;
  speedKmh: number;
  stoppedForSec: number | null;
  sinceUpdateSec: number | null;
  battery: number | null;
  // true when the source also reports an explicit online/presence flag
  // (vs. only inferring staleness from the last GPS timestamp).
  presenceAware: boolean;
}

const MOVING_KMH = 3;
const NO_SIGNAL_AFTER_SEC = 5 * 60;
const OFFLINE_GRACE_SEC = 60;
export const LOW_BATTERY_PERCENT = 20;

export const DEFAULT_SUPPRESS_STATUSES = new Set(['FINISHED', 'DNF', 'OVT', 'left']);

export interface RiderMotionSource {
  status?: string;
  speed?: string | number;
  stoppedSec?: number | string | null;
  timestamp?: number | string | null;
  aliveTs?: number | string | null;
  online?: boolean | null;
  battery?: number | string | null;
}

function toNum(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function computeRiderMotion(input: {
  speedKmh: number;
  stoppedSec?: number | null;
  timestampMs?: number | null;
  aliveMs?: number | null;
  online?: boolean | null;
  battery?: number | null;
  now?: number;
}): RiderMotion {
  const now = input.now ?? Date.now();
  const agoSec = (ms: number | null | undefined) =>
    ms == null || ms <= 0 ? null : Math.max(0, (now - ms) / 1000);

  const sincePos = agoSec(input.timestampMs);
  const aliveMark = Math.max(input.timestampMs ?? 0, input.aliveMs ?? 0) || null;
  const sinceAlive = agoSec(aliveMark);
  const battery = input.battery != null && input.battery > 0 ? input.battery : null;
  const presenceAware = input.online != null;

  if (sinceAlive == null || sinceAlive > NO_SIGNAL_AFTER_SEC ||
      (input.online === false && sinceAlive > OFFLINE_GRACE_SEC)) {
    return { state: 'noSignal', speedKmh: 0, stoppedForSec: null, sinceUpdateSec: sinceAlive, battery, presenceAware };
  }
  if (sincePos == null || sincePos > NO_SIGNAL_AFTER_SEC) {
    return { state: 'noGps', speedKmh: 0, stoppedForSec: null, sinceUpdateSec: sincePos, battery, presenceAware };
  }
  if (input.speedKmh >= MOVING_KMH) {
    return { state: 'moving', speedKmh: input.speedKmh, stoppedForSec: null, sinceUpdateSec: sincePos, battery, presenceAware };
  }
  const stoppedFor = input.stoppedSec == null ? sincePos : input.stoppedSec + (sincePos ?? 0);
  return { state: 'stopped', speedKmh: input.speedKmh, stoppedForSec: stoppedFor, sinceUpdateSec: sincePos, battery, presenceAware };
}

// `suppressStatuses` lets callers treat ride-progress states (finished/DNF/
// not-started-yet) as "no motion to show" without baking those status
// strings into this shared module.
export function riderMotionFromRider(
  rider: RiderMotionSource,
  opts?: { suppressStatuses?: Set<string>; now?: number },
): RiderMotion | null {
  const suppress = opts?.suppressStatuses ?? DEFAULT_SUPPRESS_STATUSES;
  if (rider.status && suppress.has(rider.status)) return null;

  return computeRiderMotion({
    speedKmh: toNum(rider.speed) ?? 0,
    stoppedSec: toNum(rider.stoppedSec),
    timestampMs: toNum(rider.timestamp),
    aliveMs: toNum(rider.aliveTs),
    online: rider.online ?? null,
    battery: toNum(rider.battery),
    now: opts?.now,
  });
}

export function formatMotionDuration(sec: number): string {
  const mins = Math.floor(sec / 60);
  if (mins < 1) return '<1′';
  if (mins < 60) return `${mins}′`;
  const h = Math.floor(mins / 60);
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}ω${m}′`;
}

export const RIDER_MOTION_COLOR: Record<RiderMotionState, string> = {
  moving:   '#22c55e',
  stopped:  '#fb923c',
  noGps:    '#a855f7',
  noSignal: '#ef4444',
};

export const RIDER_MOTION_TEXT_CLASS: Record<RiderMotionState, string> = {
  moving:   'text-green-400',
  stopped:  'text-orange-400',
  noGps:    'text-purple-400',
  noSignal: 'text-red-400',
};

export const RIDER_MOTION_EMOJI: Record<RiderMotionState, string> = {
  moving:   '🚴',
  stopped:  '⏸',
  noGps:    '📡',
  noSignal: '📵',
};

// `t` is next-intl's translate function from the calling page's own
// namespace — callers must provide motionMoving/motionStopped/motionNoGps/
// motionNoSignal/motionNoConnection keys in that namespace.
export function motionLabel(
  t: (key: string) => string,
  motion: RiderMotion,
): string {
  const emoji = RIDER_MOTION_EMOJI[motion.state];
  const batterySuffix = motion.battery != null && motion.battery <= LOW_BATTERY_PERCENT
    ? ` 🔋${motion.battery}%` : '';

  switch (motion.state) {
    case 'moving':
      return `${emoji} ${t('motionMoving')}${batterySuffix}`;
    case 'stopped': {
      const dur = motion.stoppedForSec != null ? ` · ${formatMotionDuration(motion.stoppedForSec)}` : '';
      return `${emoji} ${t('motionStopped')}${dur}${batterySuffix}`;
    }
    case 'noGps': {
      const dur = motion.sinceUpdateSec != null ? ` · ${formatMotionDuration(motion.sinceUpdateSec)}` : '';
      return `${emoji} ${t('motionNoGps')}${dur}${batterySuffix}`;
    }
    case 'noSignal': {
      const dur = motion.sinceUpdateSec != null ? ` · ${formatMotionDuration(motion.sinceUpdateSec)}` : '';
      const key = motion.presenceAware ? 'motionNoConnection' : 'motionNoSignal';
      return `${emoji} ${t(key)}${dur}${batterySuffix}`;
    }
  }
}
