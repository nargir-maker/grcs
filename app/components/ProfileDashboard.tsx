'use client';

// ProfileDashboard.tsx
// Three new sections for profile/page.tsx:
//
//   A) ClubFilterBar  — tappable ΛΕ.ΠΟ.Τ.Ε. / H.A.R. logo toggles that
//                       filter ALL stats, Ορόσημα, Ταξίδι, Ιστορικό.
//                       Wrap everything below the header in <FilteredProfile>.
//
//   B) ActivityCardiograph — line chart (brevets/year) with BDI + consistency
//                            index cards. Matches Flutter _buildActivityCardiograph.
//
//   C) HistoryAnalysis  — always-visible chart: KM line (cyan), elevation line
//                         (amber), brevets bars (blue). Toggle each series.
//                         Matches Flutter HistoryChartScreen (landscape mode
//                         becomes horizontal scroll on web).
//
// INSTALL:
//   1. Copy to app/components/ProfileDashboard.tsx
//   2. In profile/page.tsx:
//        import { FilteredProfile } from '@/app/components/ProfileDashboard';
//        Wrap the body (everything after the header) with <FilteredProfile member={member} />
//        Pass member prop — FilteredProfile renders stats, Ορόσημα, Ταξίδι,
//        Επιτεύγματα, Cardiograph, HistoryAnalysis, and the YearCard list
//        all filtered by club selection.
//
// DEPENDENCIES: BrevetCards.tsx (YearCard + ClubsProvider), ProfileSections.tsx
// LOGOS: /public/logos/{lepoteId}.png and /public/logos/{harId}.png

import { useState, useMemo, useRef, useEffect } from 'react';
import { YearCard, ClubsProvider } from './BrevetCards';
import { OrosimaDiadomon, TaksidiXrono, Epiteugmata } from './ProfileSections';

// ── Types ─────────────────────────────────────────────────────────────────────
interface BrevetEvent {
  n: string; d: number; t: string; as: number;
  dt: string; og: string; acp: string; har: string;
  mt: string; rt: string; pc?: number;
}
interface YearData { km: number; brevets: number; events: BrevetEvent[]; }
interface MemberProfile {
  id: string;
  firstName: string; lastName: string;
  fatherNameEl?: string;
  lepoteId: string; harId: string;
  isInsured: boolean; insuranceValue: string;
  totalKm: number; totalBrevets: number;
  pbpCount: number; lrmCount: number; flcCount: number;
  maxDist: number; sreCount?: number;
  history: Record<string, YearData>;
}

type Club = 'ALL' | 'ACP' | 'HAR';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  return n.toLocaleString('el-GR');
}

// Filter history by club, same logic as Flutter _filteredHistory
function filterHistory(history: Record<string, YearData>, club: Club): Record<string, YearData> {
  if (club === 'ALL') return history;
  const result: Record<string, YearData> = {};
  Object.entries(history).forEach(([year, y]) => {
    const filtered = y.events.filter(e =>
      club === 'ACP'
        ? (e.acp ?? '').toString().trim() !== ''
        : (e.har ?? '').toString().trim() !== ''
    );
    if (filtered.length === 0) return;
    const km = filtered.reduce((s, e) => s + (parseFloat(String(e.d)) || 0), 0);
    result[year] = { km, brevets: filtered.length, events: filtered };
  });
  return result;
}

function totalKm(history: Record<string, YearData>) {
  return Object.values(history).reduce((s, y) => s + y.km, 0);
}
function totalBrevets(history: Record<string, YearData>) {
  return Object.values(history).reduce((s, y) => s + y.brevets, 0);
}
function totalElevation(history: Record<string, YearData>) {
  return Object.values(history).reduce((s, y) =>
    s + y.events.reduce((es, e) => es + (parseFloat(String(e.as)) || 0), 0), 0);
}
function srCount(history: Record<string, YearData>) {
  return Object.values(history).filter(y => {
    const ds = y.events.map(e => parseFloat(String(e.d)));
    return ds.some(d => d>=200&&d<300) && ds.some(d => d>=300&&d<400) &&
           ds.some(d => d>=400&&d<600) && ds.some(d => d>=600);
  }).length;
}

// ══════════════════════════════════════════════════════════════════════════════
// A) CLUB FILTER BAR
// ══════════════════════════════════════════════════════════════════════════════
function ClubFilterBar({ member, active, onToggle }: {
  member: MemberProfile;
  active: Club;
  onToggle: (c: Club) => void;
}) {
  const hasLepote = member.lepoteId && member.lepoteId !== '0' && member.lepoteId !== '';
  const hasHar    = member.harId    && member.harId    !== '0' && member.harId    !== '';

  if (!hasLepote && !hasHar) return null;

  function Logo({ club, id, label, logoFile }: { club: 'ACP'|'HAR'; id: string; label: string; logoFile: string }) {
    const isActive  = active === club;
    const isOther   = active !== 'ALL' && active !== club;
    const color     = club === 'ACP' ? '#1a3a7a' : '#4a148c';
    const glow      = club === 'ACP' ? 'rgba(26,58,122,0.5)' : 'rgba(74,20,140,0.5)';

    return (
      <button
        onClick={() => onToggle(club)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          opacity: isOther ? 0.22 : 1,
          transform: isActive ? 'scale(1.08)' : isOther ? 'scale(0.92)' : 'scale(1)',
          transition: 'all 0.22s ease',
          padding: 10,
        }}
      >
        {/* Logo with glow ring when active */}
        <div style={{
          padding: 8,
          borderRadius: '50%',
          border: isActive ? `2.5px solid ${color}` : '2.5px solid transparent',
          boxShadow: isActive ? `0 0 22px ${glow}` : 'none',
          transition: 'all 0.22s ease',
          background: isActive ? `${color}12` : 'transparent',
        }}>
          <img
            src={`/logos/${logoFile}.png`}
            alt={label}
            style={{
              width: 110, height: 110, objectFit: 'contain',
              filter: isOther ? 'grayscale(100%)' : 'none',
              transition: 'filter 0.22s',
            }}
            onError={ev => {
              (ev.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Label */}
        <div style={{
          fontSize: 14, fontWeight: isActive ? 700 : 600,
          color: isActive ? color : 'rgba(255,255,255,0.75)',
          transition: 'color 0.22s',
          letterSpacing: 0.5,
        }}>{label}</div>

        {/* Member ID chip */}
        <div style={{
          padding: '5px 14px',
          borderRadius: 10,
          border: `${isActive ? 2 : 1}px solid ${isActive ? color : 'rgba(255,255,255,0.25)'}`,
          background: isActive ? `${color}18` : 'rgba(255,255,255,0.07)',
          fontSize: 18, fontWeight: 700,
          color: isActive ? color : 'rgba(255,255,255,0.7)',
          transition: 'all 0.22s',
          fontFamily: 'Courier New, monospace',
        }}>{id}</div>
      </button>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, padding: '20px 20px 14px', marginBottom: 20,
    }}>
      {/* Club logos row */}
      <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', gap: 16 }}>
        {hasLepote && <Logo club="ACP" id={member.lepoteId} label="ΛΕ.ΠΟ.Τ.Ε." logoFile="650000" />}

        {hasLepote && hasHar && (
          <div style={{ width: 1, height: 100, background: 'rgba(255,255,255,0.15)' }} />
        )}

        {hasHar && <Logo club="HAR" id={member.harId} label="H.A.R." logoFile="659999" />}
      </div>

      {/* Filter status line */}
      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13 }}>
        {active === 'ALL' ? (
          <span style={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', fontWeight: 500 }}>
            {(hasLepote || hasHar) ? '👆 Πάτα λογότυπο για φίλτρο ανά σύλλογο' : ''}
          </span>
        ) : (
          <span style={{ color: active === 'ACP' ? '#60a5fa' : '#a78bfa', fontWeight: 700, fontSize: 13 }}>
            ● Εμφάνιση: {active === 'ACP' ? 'ΛΕ.ΠΟ.Τ.Ε. / ACP brevets μόνο' : 'H.A.R. brevets μόνο'}
            {' '}
            <button onClick={() => onToggle(active)}
              style={{
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 6, padding: '2px 10px', color: 'rgba(255,255,255,0.85)',
                marginLeft: 6,
              }}>
              Όλα
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Stat card (used in the totals row)
// ══════════════════════════════════════════════════════════════════════════════
function StatCard({ emoji, value, label, unit, color }: {
  emoji: string; value: string; label: string; unit: string; color: string;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: '16px 10px', textAlign: 'center', flex: 1,
    }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 22, color }}>
        {value} <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>{unit}</span>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 5, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// B) ACTIVITY CARDIOGRAPH
// Matches Flutter _buildActivityCardiograph exactly
// ══════════════════════════════════════════════════════════════════════════════
function ActivityCardiograph({ history }: { history: Record<string, YearData> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{x:number;y:number;year:number;count:number}|null>(null);

  // Build data — all years from first to last, filling gaps with 0
  const years = useMemo(() => {
    const ys = Object.keys(history).map(Number).sort((a,b)=>a-b);
    if (!ys.length) return [];
    const all: number[] = [];
    for (let y = ys[0]; y <= ys[ys.length-1]; y++) all.push(y);
    return all;
  }, [history]);

  const counts = useMemo(() =>
    years.map(y => history[String(y)]?.brevets ?? 0),
  [years, history]);

  const maxCount   = useMemo(() => Math.max(...counts, 1), [counts]);
  const totalBrevs = useMemo(() => counts.reduce((a,b)=>a+b,0), [counts]);
  const activeYrs  = useMemo(() => counts.filter(c=>c>0).length, [counts]);
  const peakIdx    = useMemo(() => counts.indexOf(Math.max(...counts)), [counts]);
  const peakYear   = years[peakIdx] ?? 0;
  const firstYear  = years[0] ?? 0;
  const lastYear   = years[years.length-1] ?? 0;
  const nowYear    = new Date().getFullYear();
  const yearsInSport = lastYear - firstYear + 1;

  // Last active year
  let lastActiveYear = firstYear, lastActiveCount = 0;
  for (let i = years.length-1; i >= 0; i--) {
    if (counts[i] > 0) { lastActiveYear = years[i]; lastActiveCount = counts[i]; break; }
  }

  // BDI
  const bdi = yearsInSport > 0 ? totalBrevs / yearsInSport : 0;
  const bdiLabel  = bdi>=10?'Κορυφαίος':bdi>=5?'Αφοσιωμένος':bdi>=2?'Τακτικός':'Περιστασιακός';
  const bdiEmoji  = bdi>=10?'🔥':bdi>=5?'💪':bdi>=2?'🚴':'🌱';
  const bdiColor  = bdi>=10?'#FF6B35':bdi>=5?'#9C27B0':bdi>=2?'#1976D2':'#4CAF50';

  // Consistency
  const consistency = yearsInSport > 0 ? (activeYrs / yearsInSport) * 100 : 0;
  const conLabel = consistency>=80?'Σταθερός':consistency>=50?'Τακτικός':consistency>=25?'Χαλαρός':'Σποραδικός';
  const conColor = consistency>=80?'#4CAF50':consistency>=50?'#1976D2':consistency>=25?'#FF9800':'#9E9E9E';

  const CHART_H  = 160;
  const PAD_L    = 32;
  const PAD_R    = 16;
  const PAD_T    = 16;
  const PAD_B    = 40;
  const DOT_STEP = Math.max(38, Math.min(60, 800 / Math.max(years.length, 1)));
  const chartW   = PAD_L + PAD_R + years.length * DOT_STEP;

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !years.length) return;
    canvas.width  = chartW;
    canvas.height = CHART_H + PAD_T + PAD_B;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const xOf = (i: number) => PAD_L + i * DOT_STEP + DOT_STEP / 2;
    const yOf = (c: number) => PAD_T + (1 - c / maxCount) * CHART_H;

    // Grid lines
    const gridSteps = 4;
    for (let g = 0; g <= gridSteps; g++) {
      const yg = PAD_T + (g / gridSteps) * CHART_H;
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD_L, yg); ctx.lineTo(chartW - PAD_R, yg); ctx.stroke();
      const val = Math.round(maxCount * (1 - g/gridSteps));
      if (val > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(String(val), PAD_L - 4, yg + 3);
      }
    }

    // Under-line fill
    if (years.length > 1) {
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(counts[0]));
      for (let i = 1; i < years.length; i++) {
        const x0=xOf(i-1), y0=yOf(counts[i-1]);
        const x1=xOf(i),   y1=yOf(counts[i]);
        const cx=(x0+x1)/2;
        ctx.bezierCurveTo(cx,y0,cx,y1,x1,y1);
      }
      ctx.lineTo(xOf(years.length-1), PAD_T+CHART_H);
      ctx.lineTo(xOf(0), PAD_T+CHART_H);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T+CHART_H);
      grad.addColorStop(0,  'rgba(255,221,0,0.22)');
      grad.addColorStop(1,  'rgba(255,221,0,0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(counts[0]));
      for (let i = 1; i < years.length; i++) {
        const x0=xOf(i-1), y0=yOf(counts[i-1]);
        const x1=xOf(i),   y1=yOf(counts[i]);
        const cx=(x0+x1)/2;
        ctx.bezierCurveTo(cx,y0,cx,y1,x1,y1);
      }
      ctx.strokeStyle = '#FFDD00';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Dots + year labels
    years.forEach((yr, i) => {
      const x = xOf(i), y = yOf(counts[i]);
      const isPeak   = i === peakIdx;
      const isLast   = yr === lastActiveYear;
      const isEmpty  = counts[i] === 0;

      // Dot
      ctx.beginPath();
      const r = isEmpty ? 2 : isPeak ? 5 : isLast ? 6 : Math.max(2, Math.min(5, counts[i]/maxCount*5));
      ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fillStyle = isPeak ? '#f00' : isLast ? '#FFDD00' : isEmpty ? 'rgba(255,255,255,0.2)' : 'rgba(255,221,0,0.7)';
      ctx.fill();
      if (isLast && !isEmpty) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Year label — only every N years to avoid crowding
      const step = years.length > 20 ? 2 : 1;
      if (i % step === 0) {
        ctx.save();
        ctx.translate(x, PAD_T + CHART_H + 8);
        ctx.rotate(-0.5);
        ctx.fillStyle = isLast ? '#FFDD00' : 'rgba(255,255,255,0.5)';
        ctx.font = `${isLast ? 'bold ' : ''}10px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(String(yr), 0, 0);
        ctx.restore();
      }
    });
  }, [years, counts, maxCount, peakIdx, lastActiveYear, chartW]);

  // Mouse interaction for tooltip
  function handleMouseMove(ev: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current; if (!canvas || !years.length) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const DOT_STEP_actual = (canvas.width - PAD_L - PAD_R) / years.length;
    const idx = Math.round((mx - PAD_L - DOT_STEP_actual/2) / DOT_STEP_actual);
    if (idx >= 0 && idx < years.length) {
      setTooltip({ x: ev.clientX - rect.left, y: 10, year: years[idx], count: counts[idx] });
    } else {
      setTooltip(null);
    }
  }

  if (!years.length) return null;

  return (
    <div style={{
      background: '#f5f6d8', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, overflow: 'hidden', marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        background: '#0D3B5E', padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📈</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>Ενεργή Δραστηριότητα</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Brevets ανά έτος</span>
      </div>

      {/* Top stats row */}
      <div style={{
        display: 'flex', justifyContent: 'space-around', padding: '12px 16px',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}>
        {[
          { v: String(totalBrevs), l: 'Σύνολο brevets',          c: '#0D3B5E' },
          { v: `${peakYear}`,      l: `Ρεκόρ · ${counts[peakIdx]} brevets`, c: '#f00' },
          { v: String(activeYrs),  l: 'Ενεργά έτη',              c: '#4CAF50' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* BDI + Consistency cards */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 12px' }}>
        {/* BDI */}
        <div style={{
          flex: 1, border: `1px solid ${bdiColor}44`, borderRadius: 12,
          padding: 12, background: `${bdiColor}12`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>{bdiEmoji}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: bdiColor }}>Δείκτης Δραστηριότητας</span>
          </div>
          <div style={{
            fontSize: 8, fontWeight: 700, color: bdiColor,
            background: `${bdiColor}20`, border: `1px solid ${bdiColor}50`,
            borderRadius: 4, padding: '1px 5px', display: 'inline-block', marginBottom: 4,
          }}>{bdiLabel}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: bdiColor, lineHeight: 1 }}>
            {bdi.toFixed(1)}
          </div>
          <div style={{ fontSize: 10, color: '#666', marginBottom: 6 }}>brevets / έτος</div>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, bdi/15*100)}%`, height: '100%', background: bdiColor, borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#aaa', marginTop: 3 }}>
            <span>🌱 Χαλαρός</span><span>🔥 Κορυφαίος</span>
          </div>
        </div>

        {/* Consistency */}
        <div style={{
          flex: 1, border: `1px solid ${conColor}44`, borderRadius: 12,
          padding: 12, background: `${conColor}12`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>📊</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: conColor }}>Δείκτης Σταθερότητας</span>
          </div>
          <div style={{
            fontSize: 8, fontWeight: 700, color: conColor,
            background: `${conColor}20`, border: `1px solid ${conColor}50`,
            borderRadius: 4, padding: '1px 5px', display: 'inline-block', marginBottom: 4,
          }}>{conLabel}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: conColor, lineHeight: 1 }}>
            {consistency.toFixed(0)}%
          </div>
          <div style={{ fontSize: 10, color: '#666', marginBottom: 6 }}>
            {activeYrs} από {yearsInSport} έτη
          </div>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${consistency}%`, height: '100%', background: conColor, borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#aaa', marginTop: 3 }}>
            <span>Σποραδικός</span><span>Σταθερός</span>
          </div>
        </div>
      </div>

      {/* Chart label */}
      <div style={{ padding: '0 40px 4px', fontSize: 11, fontWeight: 600, color: '#555' }}>
        Ιστορικό Δραστηριότητας · {firstYear} – {lastYear}
      </div>

      {/* Chart canvas */}
      <div style={{
        margin: '0 12px 8px', borderRadius: 12, background: '#597A4F',
        overflowX: 'auto', position: 'relative',
      }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        />
        {tooltip && (
          <div style={{
            position: 'absolute', top: tooltip.y, left: Math.min(tooltip.x + 8, chartW - 100),
            background: '#162436', border: '1px solid #FFDD00',
            borderRadius: 6, padding: '4px 8px', pointerEvents: 'none', zIndex: 10,
          }}>
            <div style={{ color: '#FFDD00', fontSize: 11, fontWeight: 700 }}>{tooltip.year}</div>
            <div style={{ color: '#fff', fontSize: 11 }}>
              {tooltip.count === 0 ? 'Καμία δραστηριότητα' : `${tooltip.count} brevets`}
            </div>
          </div>
        )}
      </div>

      {/* Last activity status */}
      <div style={{
        margin: '0 12px 14px', border: `1px solid #0D3B5E44`,
        borderRadius: 8, padding: '8px 12px', background: 'rgba(13,59,94,0.08)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: lastActiveYear >= nowYear - 1 ? '#4CAF50' : '#FF9800',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: '#0D3B5E' }}>
          {lastActiveYear >= nowYear - 1
            ? `Ενεργός — τελευταία δραστηριότητα ${lastActiveYear} (${lastActiveCount} brevets)`
            : `Τελευταία δραστηριότητα: ${lastActiveYear} — ${nowYear - lastActiveYear} χρόνια αδράνειας`}
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// C) HISTORY ANALYSIS CHART
// KM line (cyan) + elevation line (amber) + brevets bars (blue), all toggleable
// Always visible on web — no button required
// ══════════════════════════════════════════════════════════════════════════════
function HistoryAnalysis({ history }: { history: Record<string, YearData> }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [showKm,   setShowKm]   = useState(true);
  const [showEl,   setShowEl]   = useState(true);
  const [showBrv,  setShowBrv]  = useState(true);
  const [tooltip,  setTooltip]  = useState<{x:number;y:number;year:string;km:number;el:number;brv:number}|null>(null);

  const sortedYears = useMemo(() =>
    Object.keys(history).sort((a,b) => a.localeCompare(b)),
  [history]);

  const data = useMemo(() => sortedYears.map(yr => {
    const y = history[yr];
    const el = y.events.reduce((s,e)=>s+(parseFloat(String(e.as))||0),0);
    return { year: yr, km: y.km, el, brv: y.brevets };
  }), [sortedYears, history]);

  const maxKm  = useMemo(() => Math.max(...data.map(d=>d.km),  1), [data]);
  const maxEl  = useMemo(() => Math.max(...data.map(d=>d.el),  1), [data]);
  const maxBrv = useMemo(() => Math.max(...data.map(d=>d.brv), 1), [data]);

  const CHART_H  = 180;
  const PAD_L    = 48;
  const PAD_R    = 16;
  const PAD_T    = 16;
  const PAD_B    = 44;
  const DOT_STEP = Math.max(44, Math.min(70, 900 / Math.max(data.length, 1)));
  const chartW   = PAD_L + PAD_R + data.length * DOT_STEP;

  const xOf  = (i: number) => PAD_L + i * DOT_STEP + DOT_STEP / 2;
  const yOfKm  = (v: number) => PAD_T + (1 - v/maxKm)  * CHART_H;
  const yOfEl  = (v: number) => PAD_T + (1 - v/maxEl)  * CHART_H;
  const yOfBrv = (v: number) => PAD_T + (1 - v/maxBrv) * CHART_H * 0.4; // bars fill bottom 40%

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    canvas.width  = chartW;
    canvas.height = CHART_H + PAD_T + PAD_B;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const totalH = CHART_H + PAD_T + PAD_B;

    // Grid
    [0,1,2,3,4].forEach(g => {
      const yg = PAD_T + (g/4) * CHART_H;
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD_L, yg); ctx.lineTo(chartW-PAD_R, yg); ctx.stroke();
    });

    // KM axis labels
    if (showKm) {
      [0,0.25,0.5,0.75,1].forEach(f => {
        const v = Math.round(maxKm * (1-f) / 100) * 100;
        const yg = PAD_T + f * CHART_H;
        ctx.fillStyle = '#06b6d4'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v), PAD_L-4, yg+3);
      });
    }

    // Brevets bars (behind everything)
    if (showBrv) {
      const barW = DOT_STEP * 0.55;
      data.forEach((d, i) => {
        const x = xOf(i);
        const barH = (d.brv / maxBrv) * CHART_H * 0.35;
        ctx.fillStyle = 'rgba(59,130,246,0.35)';
        ctx.beginPath();
        ctx.roundRect(x - barW/2, PAD_T + CHART_H - barH, barW, barH, 3);
        ctx.fill();
      });
    }

    // Helper: draw smooth line + fill
    function drawLine(points: number[], color: string, fillAlpha: number) {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(xOf(0), points[0]);
      for (let i = 1; i < points.length; i++) {
        const cx = (xOf(i-1) + xOf(i)) / 2;
        ctx.bezierCurveTo(cx, points[i-1], cx, points[i], xOf(i), points[i]);
      }
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

      if (fillAlpha > 0) {
        ctx.beginPath();
        ctx.moveTo(xOf(0), points[0]);
        for (let i = 1; i < points.length; i++) {
          const cx = (xOf(i-1) + xOf(i)) / 2;
          ctx.bezierCurveTo(cx, points[i-1], cx, points[i], xOf(i), points[i]);
        }
        ctx.lineTo(xOf(points.length-1), PAD_T+CHART_H);
        ctx.lineTo(xOf(0), PAD_T+CHART_H);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, PAD_T, 0, PAD_T+CHART_H);
        g.addColorStop(0, color.replace(')', `,${fillAlpha})`).replace('rgb', 'rgba'));
        g.addColorStop(1, color.replace(')', ',0)').replace('rgb', 'rgba'));
        ctx.fillStyle = g; ctx.fill();
      }
    }

    if (showEl) drawLine(data.map(d => yOfEl(d.el)), '#f59e0b', 0.15);
    if (showKm) drawLine(data.map(d => yOfKm(d.km)), '#06b6d4', 0.2);

    // Dots
    data.forEach((d, i) => {
      const x = xOf(i);
      if (showKm) {
        ctx.beginPath(); ctx.arc(x, yOfKm(d.km), 3.5, 0, Math.PI*2);
        ctx.fillStyle='#06b6d4'; ctx.fill();
      }
      if (showEl) {
        ctx.beginPath(); ctx.arc(x, yOfEl(d.el), 3, 0, Math.PI*2);
        ctx.fillStyle='#f59e0b'; ctx.fill();
      }
    });

    // Year labels
    const step = data.length > 20 ? 2 : 1;
    data.forEach((d, i) => {
      if (i % step !== 0) return;
      ctx.save();
      ctx.translate(xOf(i), PAD_T + CHART_H + 10);
      ctx.rotate(-0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(d.year, 0, 0);
      ctx.restore();
    });

  }, [data, showKm, showEl, showBrv, maxKm, maxEl, maxBrv, chartW]);

  function handleMouseMove(ev: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current; if (!canvas || !data.length) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const step = (canvas.width - PAD_L - PAD_R) / data.length;
    const idx = Math.round((mx - PAD_L - step/2) / step);
    if (idx >= 0 && idx < data.length) {
      setTooltip({ x: ev.clientX - rect.left, y: 10, ...data[idx] });
    } else setTooltip(null);
  }

  if (!data.length) return null;

  const ToggleBtn = ({ label, active, color, onClick }: {
    label: string; active: boolean; color: string; onClick: ()=>void;
  }) => (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: active ? `${color}22` : 'rgba(255,255,255,0.05)',
      border: `1px solid ${active ? color : 'rgba(255,255,255,0.15)'}`,
      borderRadius: 20, padding: '6px 16px', cursor: 'pointer',
      fontSize: 13, fontWeight: 600, color: active ? color : 'rgba(255,255,255,0.5)',
      transition: 'all 0.18s',
    }}>
      <div style={{ width: 10, height: 3, borderRadius: 2, background: active ? color : 'rgba(255,255,255,0.2)' }} />
      {label}
    </button>
  );

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, overflow: 'hidden', marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ background: 'rgba(13,59,94,0.9)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>📊</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>Συνολική Ανάλυση Ιστορικού</span>
      </div>

      {/* Toggle buttons */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', flexWrap: 'wrap' }}>
        <ToggleBtn label="Χιλιόμετρα"   active={showKm}  color="#06b6d4" onClick={()=>setShowKm(v=>!v)} />
        <ToggleBtn label="Υψομετρικά"   active={showEl}  color="#f59e0b" onClick={()=>setShowEl(v=>!v)} />
        <ToggleBtn label="Αρ. Brevets"  active={showBrv} color="#3b82f6" onClick={()=>setShowBrv(v=>!v)} />
      </div>

      {/* Chart */}
      <div style={{
        margin: '0 12px 12px', borderRadius: 12,
        background: 'rgba(10,22,40,0.9)',
        overflowX: 'auto', position: 'relative',
      }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        />
        {tooltip && (
          <div style={{
            position: 'absolute', top: tooltip.y,
            left: Math.min(tooltip.x + 8, chartW - 130),
            background: '#0a1628', border: '1px solid rgba(6,182,212,0.5)',
            borderRadius: 8, padding: '6px 10px', pointerEvents: 'none', zIndex: 10,
          }}>
            <div style={{ color: '#06b6d4', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
              {tooltip.year}
            </div>
            {showKm  && <div style={{ color:'#06b6d4', fontSize:11 }}>🚲 {fmtNum(Math.round(tooltip.km))} km</div>}
            {showEl  && <div style={{ color:'#f59e0b', fontSize:11 }}>⛰️ {fmtNum(Math.round(tooltip.el))} m+</div>}
            {showBrv && <div style={{ color:'#3b82f6', fontSize:11 }}>🏅 {tooltip.brv} brevets</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: FilteredProfile
// Renders everything below the header with club filtering applied
// ══════════════════════════════════════════════════════════════════════════════
export function FilteredProfile({ member }: { member: MemberProfile }) {
  const [activeClub, setActiveClub] = useState<Club>('ALL');

  function handleToggle(club: Club) {
    setActiveClub(prev => prev === club ? 'ALL' : club);
  }

  const filtered = useMemo(() => filterHistory(member.history, activeClub), [member.history, activeClub]);

  const km      = useMemo(() => totalKm(filtered),        [filtered]);
  const brevets = useMemo(() => totalBrevets(filtered),   [filtered]);
  const elev    = useMemo(() => totalElevation(filtered), [filtered]);
  const sr      = useMemo(() => srCount(filtered),        [filtered]);

  // Build a synthetic member-like object with filtered stats for ProfileSections
  const filteredMember = useMemo(() => ({
    ...member,
    totalKm:      km,
    totalBrevets: brevets,
    sreCount:     member.sreCount ?? 0,
    history:      filtered,
  }), [member, km, brevets, filtered]);

  const sortedYears = useMemo(() =>
    Object.keys(filtered).sort((a,b) => b.localeCompare(a)),
  [filtered]);

  return (
    <div>
      {/* Club filter toggles */}
      <ClubFilterBar member={member} active={activeClub} onToggle={handleToggle} />

      {/* Stats row — recalculates on filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <StatCard emoji="🚲" value={fmtNum(Math.round(km))}      label="Χιλιόμετρα"      unit="km"  color="#06b6d4" />
        <StatCard emoji="🏅" value={String(brevets)}              label="Brevets"          unit="BRM" color="#f59e0b" />
        <StatCard emoji="⛰️" value={fmtNum(Math.round(elev))}    label="Υψομετρικά"      unit="m+"  color="#a78bfa" />
        <StatCard emoji="🏆" value={String(sr)}                   label="Super Randonneur" unit="SR"  color="#f87171" />
      </div>

      {/* Επιτεύγματα — medal images, always from full member stats */}
      <Epiteugmata member={filteredMember} />

      {/* Ορόσημα Διαδρομών — filtered */}
      <OrosimaDiadomon member={filteredMember} />

      {/* Ταξίδι πίσω στο Χρόνο — filtered */}
      <TaksidiXrono member={filteredMember} />

      {/* Cardiograph — filtered */}
      <ActivityCardiograph history={filtered} />

      {/* History analysis chart — filtered */}
      <HistoryAnalysis history={filtered} />

      {/* Year cards — filtered */}
      <div style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, padding: '20px', marginBottom: 20,
      }}>
        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 20, margin: '0 0 16px' }}>
          📜 Ιστορικό ({sortedYears.length} χρόνια)
        </h2>
        <ClubsProvider>
          {sortedYears.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Δεν βρέθηκε ιστορικό.</p>
          ) : (
            sortedYears.map(year => (
              <YearCard key={year} year={year} data={filtered[year]} />
            ))
          )}
        </ClubsProvider>
      </div>
    </div>
  );
}
