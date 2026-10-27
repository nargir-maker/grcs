'use client';

// gpxDates.ts — mirrors the Flutter app's GpxDatesService: the gbt-gpx repo
// has a GitHub Action (.github/workflows/gpx-dates.yml) that rewrites a
// single gpx_dates.json manifest on every GPX upload, mapping each file's
// repo-relative path to its last-changed ISO date. One static fetch covers
// every brevet, avoiding GitHub REST API's 60 req/hour unauthenticated limit.

import { useEffect, useState } from 'react';

const OWNER = 'nargir-maker';
const REPO = 'gbt-gpx';
const DATES_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/refs/heads/main/gpx_dates.json`;
const CACHE_KEY = 'gpx_dates_json';
const REFRESH_EVERY_MS = 10 * 60 * 1000;

let dates: Record<string, string> = {};
let fetchedAt = 0;
let inFlight: Promise<void> | null = null;

function parse(body: string): Record<string, string> {
  try {
    const files = JSON.parse(body)?.files;
    if (!files || typeof files !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [path, value] of Object.entries(files)) {
      const d = new Date(String(value));
      if (!Number.isNaN(d.getTime())) out[path] = d.toISOString();
    }
    return out;
  } catch {
    return {};
  }
}

async function doLoad(fresh: boolean): Promise<void> {
  if (Object.keys(dates).length === 0) {
    try {
      const cached = window.localStorage.getItem(CACHE_KEY);
      if (cached) dates = parse(cached);
    } catch {
      // localStorage unavailable (private mode etc.) — fall through to fetch
    }
  }
  if (!fresh && fetchedAt && Date.now() - fetchedAt < REFRESH_EVERY_MS) return;
  try {
    const res = await fetch(DATES_URL);
    if (!res.ok) return;
    const body = await res.text();
    const parsed = parse(body);
    if (Object.keys(parsed).length === 0) return;
    dates = parsed;
    fetchedAt = Date.now();
    try {
      window.localStorage.setItem(CACHE_KEY, body);
    } catch {
      // ignore — in-memory cache for this session is enough
    }
  } catch {
    // network/parse failure — callers just won't get a date
  }
}

// [fresh] skips the 10' throttle — unused for now, kept for parity with the
// Flutter service in case an admin "re-check now" affordance is added later.
export function loadGpxDates(opts?: { fresh?: boolean }): Promise<void> {
  if (!inFlight) {
    inFlight = doLoad(opts?.fresh ?? false).finally(() => { inFlight = null; });
  }
  return inFlight;
}

// raw.githubusercontent.com/<owner>/<repo>/refs/heads/<branch>/<path>
// raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>
// github.com/<owner>/<repo>/(raw|blob)/<branch>/<path>
function repoPathFromGpxUrl(gpxUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(gpxUrl.trim());
  } catch {
    return null;
  }
  let seg = url.pathname.split('/').filter(Boolean);
  if (seg.length < 4 || seg[0] !== OWNER || seg[1] !== REPO) return null;
  seg = seg.slice(2);
  if (url.hostname === 'github.com') {
    if (seg[0] !== 'raw' && seg[0] !== 'blob') return null;
    seg = seg.slice(1);
  } else if (url.hostname !== 'raw.githubusercontent.com') {
    return null;
  }
  if (seg.length >= 3 && seg[0] === 'refs' && seg[1] === 'heads') {
    seg = seg.slice(3);
  } else {
    seg = seg.slice(1);
  }
  return seg.length === 0 ? null : seg.join('/');
}

// Last time [gpxUrl] changed in gbt-gpx, or null if it isn't a file from
// that repo or the manifest hasn't loaded yet.
export function gpxDateFor(gpxUrl: string): Date | null {
  const path = repoPathFromGpxUrl(gpxUrl);
  if (path == null) return null;
  const iso = dates[path];
  return iso ? new Date(iso) : null;
}

const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export interface GpxUpdatedInfo {
  date: Date | null;
  // true when [date] is within the last 14 days — mirrors the mobile app's
  // "recently updated" chip threshold.
  isRecent: boolean;
}

const NOT_UPDATED: GpxUpdatedInfo = { date: null, isRecent: false };

// Loads the manifest (cached + throttled, see loadGpxDates) and resolves the
// given GPX's last-changed date once available.
export function useGpxUpdatedDate(gpxUrl: string | undefined | null): GpxUpdatedInfo {
  const [info, setInfo] = useState<GpxUpdatedInfo>(NOT_UPDATED);

  useEffect(() => {
    let active = true;
    if (!gpxUrl) {
      queueMicrotask(() => { if (active) setInfo(NOT_UPDATED); });
      return () => { active = false; };
    }
    loadGpxDates().then(() => {
      if (!active) return;
      const date = gpxDateFor(gpxUrl);
      setInfo({
        date,
        isRecent: !!date && Date.now() - date.getTime() < RECENT_WINDOW_MS,
      });
    });
    return () => { active = false; };
  }, [gpxUrl]);

  return info;
}
