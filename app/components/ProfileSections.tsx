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
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: 0.5 }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '18px 20px' }}>{children}</div>
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

  useEffect(() => {
    update();
    // re-check after images may have loaded and changed scroll width
    const t = setTimeout(update, 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Left arrow — clickable */}
      {canLeft && (
        <div
          onClick={() => { ref.current?.scrollBy({ left: -200, behavior: 'smooth' }); }}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 44, zIndex: 3,
            background: 'linear-gradient(to right, rgba(10,22,40,0.92), transparent)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
          }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 26, marginLeft: 6, fontWeight: 700 }}>‹</span>
        </div>
      )}
      {/* Right arrow — clickable */}
      {canRight && (
        <div
          onClick={() => { ref.current?.scrollBy({ left: 200, behavior: 'smooth' }); }}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 44, zIndex: 3,
            background: 'linear-gradient(to left, rgba(10,22,40,0.92), transparent)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 26, marginRight: 6, fontWeight: 700 }}>›</span>
        </div>
      )}
      {/* Scroll container */}
      <div
        ref={ref}
        onScroll={update}
        style={{
          display: 'flex', gap: 16,
          overflowX: 'auto', overflowY: 'visible',
          paddingBottom: 8, paddingLeft: 4, paddingRight: 4,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
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
      gap: 8, minWidth: 130, opacity: dimmed ? 0.3 : 1,
      filter: dimmed ? 'grayscale(100%)' : 'none',
      transition: 'opacity 0.2s',
    }}>
      <img
        src={src}
        alt={label}
        style={{ height: 130, width: 130, objectFit: 'contain' }}
        onError={ev => { (ev.target as HTMLImageElement).style.opacity = '0'; }}
      />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{sublabel}</div>
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
      gap: 8, minWidth: 130,
      opacity: done ? 1 : 0.45,
      filter: done ? 'none' : 'grayscale(80%)',
    }}>
      <div style={{ position: 'relative' }}>
        <img
          src={src}
          alt={label}
          style={{ height: 130, width: 130, objectFit: 'contain' }}
          onError={ev => { (ev.target as HTMLImageElement).style.opacity = '0'; }}
        />
        {done && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            background: '#22c55e', borderRadius: '50%',
            width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: '#fff', fontWeight: 900,
          }}>✓</div>
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{label}</div>
        <div style={{ fontSize: 12, color: done ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
          {done ? `${current}/${target} ✓` : `${current}/${target}`}
        </div>
        <div style={{
          marginTop: 5, height: 4, width: 90, background: 'rgba(255,255,255,0.1)',
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
    PBP: '1ο PBP', LRM: '1ο LRM', FLECHE: '1ο Flèche',
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 62, flexShrink: 0 }}>
                <div style={{
                  background: `${color}22`,
                  border: `2px solid ${color}`,
                  borderRadius: 6, padding: '4px 8px',
                  fontSize: 14, fontWeight: 900, color,
                  whiteSpace: 'nowrap',
                }}>
                  {year}
                </div>
                {!isLast && (
                  <div style={{
                    flex: 1, width: 2, minHeight: 28,
                    background: `linear-gradient(to bottom, ${color}88, transparent)`,
                    margin: '3px 0',
                  }} />
                )}
              </div>

              {/* Dot */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 30, flexShrink: 0 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 10px ${color}88`,
                  marginTop: 7, flexShrink: 0,
                }} />
                {!isLast && (
                  <div style={{
                    flex: 1, width: 2, minHeight: 28,
                    background: `linear-gradient(to bottom, ${color}44, transparent)`,
                    margin: '3px 0',
                  }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: isLast ? 0 : 18, paddingLeft: 10, paddingTop: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{emoji}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color }}>{label}</span>
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 3, lineHeight: 1.4 }}>
                  {event.n}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color,
                    background: `${color}18`, border: `1px solid ${color}44`,
                    padding: '2px 8px', borderRadius: 4,
                  }}>
                    {event.d}km
                  </span>
                  {formatDate(event.dt) && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Courier New' }}>
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
            gap: 10, minWidth: 130,
          }}>
            <img
              src={b.src}
              alt={b.label}
              style={{ height: 130, width: 130, objectFit: 'contain' }}
              onError={ev => { (ev.target as HTMLImageElement).style.opacity = '0.15'; }}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
                {b.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: b.color, lineHeight: 1.1 }}>
                {b.value}
                {b.unit && (
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginLeft: 3 }}>
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

// ══════════════════════════════════════════════════════════════════════════════
// 4. FOND DE CULOTTE
// Mirrors Flutter _scene6/_scene7/_scene8/_scene9 in a single static card.
// IMPORTANT: always uses ALL history — never filtered by club (Flutter does the same).
// ══════════════════════════════════════════════════════════════════════════════
export function FondDeCulotteCard({ member }: { member: MemberProfile }) {
  // Compute from ALL history (not club-filtered)
  let fdcHours = 0, fdcKm = 0, fdcElevation = 0;
  Object.values(member.history).forEach(y => y.events.forEach(e => {
    const d   = parseFloat(String(e.d))  || 0;
    const asc = parseFloat(String(e.as)) || 0;
    const rt  = (e.rt ?? '').trim();
    if (rt && rt.includes(':')) {
      const [h, m] = rt.split(':');
      fdcHours += (parseFloat(h) || 0) + (parseFloat(m) || 0) / 60;
    } else if (d > 0) {
      fdcHours += d / 15;
    }
    fdcKm       += d;
    fdcElevation += asc;
  }));

  // Level thresholds — mirrors Flutter _scene9 exactly
  let emoji    = '🌱',  label = 'Ακόμα Νωπό',     desc = 'Μόλις ξεκινάς να το νιώθεις';
  let color    = '#4CAF50', progress = fdcHours / 20;
  if (fdcHours >= 1000) {
    emoji = '💎'; label = 'Αδιαπέραστο';    desc = 'Θρυλική κατάσταση — κανείς δεν ρωτάει πια';
    color = '#FFD700'; progress = 1;
  } else if (fdcHours >= 750) {
    emoji = '🔥'; label = 'Σφυρήλατο';      desc = 'Πλαστήκηκε από τα χιλιόμετρα — ο πόνος έγινε δύναμη';
    color = '#FF6D00'; progress = (fdcHours - 750) / 250;
  } else if (fdcHours >= 500) {
    emoji = '⚡'; label = 'Ατσάλινο';       desc = 'Εντυπωσιακό ακόμα και για παλιούς λύκους';
    color = '#00BCD4'; progress = (fdcHours - 500) / 250;
  } else if (fdcHours >= 200) {
    emoji = '🪨'; label = 'Γαλλικής Κοπής'; desc = 'Αναγνωρίσιμο fond de culotte — οι Γάλλοι θα σε σέβονταν';
    color = '#9C27B0'; progress = (fdcHours - 200) / 300;
  } else if (fdcHours >= 80) {
    emoji = '💪'; label = 'Δουλεμένο';      desc = 'Σοβαρές ώρες στη σέλα — το σώμα θυμάται';
    color = '#1976D2'; progress = (fdcHours - 80) / 120;
  } else if (fdcHours >= 20) {
    emoji = '🔸'; label = 'Σε Διαμόρφωση';  desc = 'Το σώμα αρχίζει να καταλαβαίνει';
    color = '#FF9800'; progress = (fdcHours - 20) / 60;
  }
  progress = Math.min(1, Math.max(0, progress));

  const R = 44;
  const STROKE = 10;
  const CIRC = 2 * Math.PI * R;
  const dash = progress * CIRC;

  const remaining    = Math.max(0, Math.ceil(1000 - fdcHours));
  const earthTimes   = fdcKm / 40075;
  const everestTimes = fdcElevation / 8849;

  function statTile(icon: string, value: string, unit: string, sub: string, tileColor: string) {
    return (
      <div style={{
        flex: 1, background: `${tileColor}12`,
        border: `1px solid ${tileColor}30`, borderRadius: 12,
        padding: '12px 10px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
        <div style={{
          color: tileColor, fontWeight: 800, fontSize: 19,
          fontFamily: 'Courier New, monospace', lineHeight: 1,
        }}>{value}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3 }}>{unit}</div>
        {sub && <div style={{ color: tileColor, fontSize: 10, marginTop: 4, opacity: 0.75 }}>{sub}</div>}
      </div>
    );
  }

  return (
    <SectionCard title="Fond de Culotte" icon="⏱️" headerColor="rgba(103,58,183,0.85)">

      {/* Top row: ring + label/desc */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 18 }}>

        {/* SVG ring */}
        <div style={{ position: 'relative', width: 108, height: 108, flexShrink: 0 }}>
          <svg width={108} height={108} style={{ position: 'absolute', top: 0, left: 0 }}>
            {/* Track */}
            <circle cx={54} cy={54} r={R} fill="none"
              stroke="rgba(255,255,255,0.1)" strokeWidth={STROKE} />
            {/* Progress arc */}
            <circle cx={54} cy={54} r={R} fill="none"
              stroke={color} strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRC}`}
              transform="rotate(-90 54 54)"
              style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          {/* Center content — plain HTML so emoji renders reliably */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 1,
          }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>
            <span style={{
              color, fontWeight: 800, fontSize: 15, lineHeight: 1,
              textShadow: `0 0 10px ${color}`,
            }}>{Math.round(fdcHours)}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 0.5 }}>ώρες</span>
          </div>
        </div>

        {/* Label + desc */}
        <div style={{ flex: 1 }}>
          <div style={{
            color, fontWeight: 800, fontSize: 20, marginBottom: 5,
            textShadow: `0 0 12px ${color}66`,
          }}>{label}</div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.55, marginBottom: 10 }}>
            {desc}
          </div>
          {fdcHours < 1000 ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              Απομένουν{' '}
              <span style={{ color, fontWeight: 700 }}>{remaining.toLocaleString('el-GR')}</span>
              {' '}ώρες για 💎 Αδιαπέραστο
            </div>
          ) : (
            <div style={{ color: '#FFD700', fontSize: 13, fontWeight: 700 }}>
              Το κορυφαίο επίπεδο! 🎉 Συγχαρητήρια!
            </div>
          )}
        </div>
      </div>

      {/* Stats row: hours / km / elevation */}
      <div style={{ display: 'flex', gap: 10 }}>
        {statTile(
          '⏱️',
          Math.round(fdcHours).toLocaleString('el-GR'),
          'ώρες στη σέλα',
          '',
          '#CE93D8',
        )}
        {statTile(
          '🛣️',
          Math.round(fdcKm).toLocaleString('el-GR'),
          'km',
          earthTimes >= 0.1 ? `${earthTimes.toFixed(1)}× 🌍` : '',
          '#80DEEA',
        )}
        {statTile(
          '⛰️',
          Math.round(fdcElevation).toLocaleString('el-GR'),
          'm υψομετρικά',
          everestTimes >= 0.1 ? `${everestTimes.toFixed(1)}× 🏔️` : '',
          '#80CBC4',
        )}
      </div>
    </SectionCard>
  );
}
