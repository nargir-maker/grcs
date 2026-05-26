'use client';

// ProfileSections.tsx
// Three rich sections to add to profile/page.tsx:
//   1. Ορόσημα Διαδρομών  — anniversary medals + brevet count awards
//   2. Ταξίδι πίσω στο Χρόνο — milestone timeline
//   3. Επιτεύγματα (enhanced) — medal images instead of plain text
//
// INSTALL in profile/page.tsx:
//   import { OrosimaDiadomon, TaksidiXrono, Epiteugmata } from '@/app/components/ProfileSections';
//
//   Replace the existing "🎖️ Επιτεύγματα" section with <Epiteugmata member={member} />
//   Add before the history section:
//     <OrosimaDiadomon member={member} />
//     <TaksidiXrono member={member} />
//
// All images from /public/logos/ — same filenames as the Flutter app assets.

import { useRef, useState, useEffect } from 'react';

// ── Types (mirror what parseMember already produces) ──────────────────────────
interface BrevetEvent {
  n: string; d: number; t: string; as: number;
  dt: string; og: string; acp: string; har: string;
  mt: string; rt: string; pc?: number;
}
interface YearData { km: number; brevets: number; events: BrevetEvent[]; }
interface MemberProfile {
  totalKm: number; totalBrevets: number; pbpCount: number;
  lrmCount: number; flcCount: number; maxDist: number;
  sreCount?: number;  // super randonnée étoile count
  history: Record<string, YearData>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function img(name: string) { return `/logos/${name}`; }

function formatDate(dt: string): string {
  if (!dt || dt === 'null') return '';
  try {
    const d = new Date(dt);
    if (!isNaN(d.getTime()))
      return d.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {}
  const parts = dt.split(' ');
  if (parts.length >= 4) {
    const m: Record<string,string> = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
    if (m[parts[1]]) return `${parts[2].padStart(2,'0')}/${m[parts[1]]}/${parts[3]}`;
  }
  return dt;
}

function getYear(dt: string): number {
  if (!dt) return 0;
  const m = dt.match(/\d{4}/);
  return m ? parseInt(m[0]) : 0;
}

// ── Collect all events flat, sorted by date ───────────────────────────────────
function allEventsSorted(history: Record<string, YearData>): BrevetEvent[] {
  const all: BrevetEvent[] = [];
  Object.values(history).forEach(y => all.push(...y.events));
  all.sort((a, b) => getYear(a.dt) - getYear(b.dt));
  return all;
}

// ── Calculate milestones (same logic as Flutter _calculateMilestones) ─────────
interface MilestoneMap { [key: string]: BrevetEvent }

function calcMilestones(history: Record<string, YearData>): MilestoneMap {
  const all = allEventsSorted(history);
  const result: MilestoneMap = {};
  if (!all.length) return result;

  result['first_ever'] = all[0];

  for (const dist of ['200','300','400','600','1000','1200','1400']) {
    const found = all.find(e => String(e.d) === dist);
    if (found) result[dist] = found;
  }
  const lrm = all.find(e => e.d >= 1200 && e.t?.toUpperCase() !== 'PBP');
  if (lrm) result['LRM'] = lrm;
  const flc = all.find(e => e.n?.toUpperCase().includes('FLECHE') || e.t?.toUpperCase() === 'FLC');
  if (flc) result['FLECHE'] = flc;
  const pbp = all.find(e => e.t?.toUpperCase() === 'PBP');
  if (pbp) result['PBP'] = pbp;

  return result;
}

// ── Has a 100-YEARS anniversary completion? ────────────────────────────────────
// Matches Flutter exactly: e['t'] == "BRM-100YEARS" && e['d'] == distance
// (has nothing to do with year 2021 — that was a wrong assumption)
function hasAnniversary(history: Record<string, YearData>, dist: number): boolean {
  return Object.values(history).some(y =>
    y.events.some(e =>
      e.t?.toString() === 'BRM-100YEARS' &&
      String(e.d) === String(dist)
    )
  );
}

// ── Total brevets across all years ────────────────────────────────────────────
function totalBrevetsAllYears(history: Record<string, YearData>): number {
  return Object.values(history).reduce((s, y) => s + y.brevets, 0);
}

// ── SR count ─────────────────────────────────────────────────────────────────
function srCount(history: Record<string, YearData>): number {
  return Object.values(history).filter(y => {
    const ds = y.events.map(e => e.d);
    return ds.some(d => d>=200&&d<300) && ds.some(d => d>=300&&d<400) &&
           ds.some(d => d>=400&&d<600) && ds.some(d => d>=600);
  }).length;
}

// ══════════════════════════════════════════════════════════════════════════════
// Shared UI primitives
// ══════════════════════════════════════════════════════════════════════════════

// Section card wrapper
function SectionCard({ title, icon, headerColor, children }: {
  title: string; icon: string; headerColor: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        background: headerColor,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );
}

// Horizontal scroll rail with fade edges
function ScrollRail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

  function update() {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }

  useEffect(() => { update(); }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Left fade */}
      {canLeft && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 40, zIndex: 2,
          background: 'linear-gradient(to right, rgba(10,22,40,0.9), transparent)',
          pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, marginLeft: 4 }}>‹</span>
        </div>
      )}
      {/* Right fade */}
      {canRight && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, zIndex: 2,
          background: 'linear-gradient(to left, rgba(10,22,40,0.9), transparent)',
          pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, marginRight: 4 }}>›</span>
        </div>
      )}
      <div
        ref={ref}
        onScroll={update}
        style={{
          display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8,
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Medal / award tile ────────────────────────────────────────────────────────
function MedalTile({ src, label, sublabel, dimmed = false }: {
  src: string; label: string; sublabel?: string; dimmed?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 6, minWidth: 110, opacity: dimmed ? 0.3 : 1,
      filter: dimmed ? 'grayscale(100%)' : 'none',
      transition: 'opacity 0.2s',
    }}>
      <img
        src={src}
        alt={label}
        style={{ height: 110, width: 110, objectFit: 'contain' }}
        onError={ev => { (ev.target as HTMLImageElement).style.opacity = '0'; }}
      />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{sublabel}</div>
        )}
      </div>
    </div>
  );
}

// ── Progress award tile (brevet count) ────────────────────────────────────────
function AwardTile({ src, label, current, target }: {
  src: string; label: string; current: number; target: number;
}) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const done = current >= target;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 6, minWidth: 110,
      opacity: done ? 1 : 0.45,
      filter: done ? 'none' : 'grayscale(80%)',
    }}>
      <div style={{ position: 'relative' }}>
        <img
          src={src}
          alt={label}
          style={{ height: 110, width: 110, objectFit: 'contain' }}
          onError={ev => { (ev.target as HTMLImageElement).style.opacity = '0'; }}
        />
        {done && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            background: '#22c55e', borderRadius: '50%',
            width: 20, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#fff', fontWeight: 900,
          }}>✓</div>
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{label}</div>
        <div style={{ fontSize: 10, color: done ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
          {done ? `${current}/${target} ✓` : `${current}/${target}`}
        </div>
        {/* Progress bar */}
        <div style={{
          marginTop: 4, height: 3, width: 80, background: 'rgba(255,255,255,0.1)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: done ? '#22c55e' : '#06b6d4',
            borderRadius: 2,
          }} />
        </div>
      </div>
    </div>
  );
}

// ── Vertical divider between award groups ─────────────────────────────────────
function VDivider() {
  return <div style={{ width: 1, minHeight: 80, background: 'rgba(255,255,255,0.08)', flexShrink: 0, margin: '0 4px' }} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. ΟΡΌΣΗΜΑ ΔΙΑΔΡΟΜΏΝ
// ══════════════════════════════════════════════════════════════════════════════
export function OrosimaDiadomon({ member }: { member: MemberProfile }) {
  const total = totalBrevetsAllYears(member.history);

  // Anniversary completions (BRM 100 years — rode that distance in 2021)
  const ann200 = hasAnniversary(member.history, 200);
  const ann300 = hasAnniversary(member.history, 300);
  const ann400 = hasAnniversary(member.history, 400);
  const ann600 = hasAnniversary(member.history, 600);
  const hasAnyAnniversary = ann200 || ann300 || ann400 || ann600;

  return (
    <SectionCard title="Ορόσημα Διαδρομών" icon="🏁" headerColor="rgba(205,127,50,0.85)">
      <ScrollRail>
        {/* Anniversary medals */}
        {hasAnyAnniversary && (
          <>
            {ann200 && <MedalTile src={img('200-100YEARS.png')} label="200km" sublabel="100 Years" />}
            {ann300 && <MedalTile src={img('300-100YEARS.png')} label="300km" sublabel="100 Years" />}
            {ann400 && <MedalTile src={img('400-100YEARS.png')} label="400km" sublabel="100 Years" />}
            {ann600 && <MedalTile src={img('600-100YEARS.png')} label="600km" sublabel="100 Years" />}
            <VDivider />
          </>
        )}

        {/* Brevet count awards */}
        <AwardTile src={img('100_brm2.png')}  label="100 BRM"  current={total} target={100} />
        <AwardTile src={img('200_brm1.png')}  label="200 BRM"  current={total} target={200} />
        <AwardTile src={img('400_brm.png')}   label="400 BRM"  current={total} target={400} />
        <AwardTile src={img('500_brm.png')}   label="500 BRM"  current={total} target={500} />
      </ScrollRail>
    </SectionCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. ΤΑΞΊΔΙ ΠΊΣΩ ΣΤΟ ΧΡΌΝΟ — milestone timeline
// ══════════════════════════════════════════════════════════════════════════════

function milestoneLabel(key: string): string {
  const map: Record<string,string> = {
    first_ever: '1ο Brevet',
    '200': '1ο 200άρι', '300': '1ο 300άρι',
    '400': '1ο 400άρι', '600': '1ο 600άρι',
    '1000': '1ο 1000άρι', '1200': '1ο 1200άρι',
    PBP: '1ο PBP', LRM: '1ο LRM', FLECHE: '1η Flèche',
  };
  return map[key] ?? `Ορόσημο ${key}`;
}

function milestoneColor(key: string): string {
  const map: Record<string,string> = {
    first_ever: '#4ade80', '200': '#06b6d4', '300': '#38bdf8',
    '400': '#818cf8', '600': '#a78bfa', '1000': '#f472b6',
    '1200': '#fb7185', PBP: '#fbbf24', LRM: '#c084fc', FLECHE: '#fb923c',
  };
  return map[key] ?? '#94a3b8';
}

function milestoneEmoji(key: string): string {
  const map: Record<string,string> = {
    first_ever:'🏁', '200':'🚴', '300':'🚴', '400':'🚴', '600':'🏆',
    '1000':'⭐', '1200':'🌟', PBP:'🗼', LRM:'🌍', FLECHE:'⚡',
  };
  return map[key] ?? '📍';
}

export function TaksidiXrono({ member }: { member: MemberProfile }) {
  const milestones = calcMilestones(member.history);
  const entries = Object.entries(milestones).sort((a, b) => {
    // Most recent first (reversed, "journey back in time")
    return getYear(b[1].dt) - getYear(a[1].dt);
  });

  if (!entries.length) return null;

  return (
    <SectionCard title="◄ Ταξίδι πίσω στο Χρόνο" icon="🕰️" headerColor="rgba(74,20,140,0.9)">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {entries.map(([key, event], i) => {
          const color  = milestoneColor(key);
          const emoji  = milestoneEmoji(key);
          const label  = milestoneLabel(key);
          const year   = getYear(event.dt) || '----';
          const isLast = i === entries.length - 1;

          return (
            <div key={key} style={{ display: 'flex', gap: 0 }}>
              {/* Left column: year + line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 52, flexShrink: 0 }}>
                <div style={{
                  background: `${color}22`,
                  border: `2px solid ${color}`,
                  borderRadius: 6, padding: '3px 6px',
                  fontSize: 11, fontWeight: 900, color,
                  whiteSpace: 'nowrap',
                }}>
                  {year}
                </div>
                {!isLast && (
                  <div style={{
                    flex: 1, width: 2, minHeight: 24,
                    background: `linear-gradient(to bottom, ${color}88, transparent)`,
                    margin: '2px 0',
                  }} />
                )}
              </div>

              {/* Dot */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 8px ${color}88`,
                  marginTop: 6, flexShrink: 0,
                }} />
                {!isLast && (
                  <div style={{
                    flex: 1, width: 2, minHeight: 24,
                    background: `linear-gradient(to bottom, ${color}44, transparent)`,
                    margin: '2px 0',
                  }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16, paddingLeft: 8, paddingTop: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, lineHeight: 1.4 }}>
                  {event.n}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color,
                    background: `${color}18`, border: `1px solid ${color}44`,
                    padding: '1px 6px', borderRadius: 4,
                  }}>
                    {event.d}km
                  </span>
                  {formatDate(event.dt) && (
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'Courier New' }}>
                      {formatDate(event.dt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. ΕΠΙΤΕΎΓΜΑΤΑ (enhanced — medals with images)
// Matches Flutter StatBadge list exactly:
//   max_km_medal1, pbp_medal, lrm_medal, fleche_medal, sr_medal,
//   sre_medal2, isr, lepertel
// NOTE: sreCount needs to be added to parseMember in profile/page.tsx:
//   sreCount: parseInt(stats.sre ?? '0') || 0,
// ══════════════════════════════════════════════════════════════════════════════
export function Epiteugmata({ member }: { member: MemberProfile }) {
  const sr = srCount(member.history);

  // Each badge: always rendered (like Flutter StatBadge which shows 0 too),
  // but dimmed when count is 0 so the rider can see what's possible.
  const badges = [
    { src: img('max_km_medal1.png'), label: '═╡►km◄╞═', value: member.maxDist.toLocaleString('el-GR'), unit: 'km',  color: '#06b6d4' },
    { src: img('pbp_medal.png'),     label: 'PBP',        value: String(member.pbpCount),                unit: '×',   color: '#fbbf24' },
    { src: img('lrm_medal.png'),     label: 'LRM',        value: String(member.lrmCount),                unit: '×',   color: '#c084fc' },
    { src: img('fleche_medal.png'),  label: 'Flèche',     value: String(member.flcCount),                unit: '×',   color: '#fb923c' },
    { src: img('sr_medal.png'),      label: 'SR',         value: String(sr),                             unit: '×',   color: '#f87171' },
    { src: img('sre_medal2.png'),    label: 'SRe',        value: String(member.sreCount ?? 0),           unit: '×',   color: '#e879f9' },
    { src: img('isr.png'),           label: 'ISR',        value: '1',                                    unit: '',    color: '#f87901' },
    { src: img('lepertel.png'),      label: 'Lepertel',   value: '1',                                    unit: '',    color: '#94a3b8' },
  ];

  // Only show badges where the count is > 0 (isr/lepertel are existence-based,
  // hide if member has 0 pbp etc — keep consistent with Flutter which always
  // shows them but we can filter for cleanliness on the web)
  const visible = badges.filter((b, i) => {
    if (i === 0) return member.maxDist > 0;
    if (i === 1) return member.pbpCount > 0;
    if (i === 2) return member.lrmCount > 0;
    if (i === 3) return member.flcCount > 0;
    if (i === 4) return sr > 0;
    if (i === 5) return (member.sreCount ?? 0) > 0;
    if (i === 6) return member.pbpCount > 0; // ISR — only if they've done PBP
    if (i === 7) return member.pbpCount > 0; // Lepertel — same
    return false;
  });

  if (!visible.length) return null;

  return (
    <SectionCard title="Τα επιτεύγματά μου" icon="🎖️" headerColor="rgba(180,130,0,0.9)">
      <ScrollRail>
        {visible.map((b, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 8, minWidth: 110,
          }}>
            <img
              src={b.src}
              alt={b.label}
              style={{ height: 110, width: 110, objectFit: 'contain' }}
              onError={ev => { (ev.target as HTMLImageElement).style.opacity = '0.15'; }}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                {b.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: b.color, lineHeight: 1.1 }}>
                {b.value}
                {b.unit && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginLeft: 2 }}>
                    {b.unit}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </ScrollRail>
    </SectionCard>
  );
}
