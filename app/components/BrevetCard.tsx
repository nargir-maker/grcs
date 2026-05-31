// ── BrevetCard.tsx ─────────────────────────────────────────────────────────────
// Drop-in replacement card component for the brevets grid
// Usage: <BrevetCard b={brevet} hasCoOrg={hasCoOrg(brevet)} />

interface BrevetCardProps {
  b: {
    id: string;
    title: string;
    distance: number;
    date: string;
    organizer: string;
    organizerId: string;
    organizerLogo: string;
    coOrganizerId: string;
    start: string;
    ascent: number;
    certification: string;
    type: string;
    gpxUrl: string;
    imageUrl: string;
    difficultyLabel: string;
    difficultyColor: string;
  };
  hasCoOrg: boolean;
}

const DIFF_EMOJI: Record<string, string> = {
  'ΕΥΚΟΛΟ':       '🟢',
  'ΜΕΤΡΙΟ':       '🟡',
  'ΔΥΣΚΟΛΟ':      '🟠',
  'ΠΟΛΥ ΔΥΣΚΟΛΟ': '🔴',
  'ΑΚΡΑΙΟ':       '💀',
  'ΘΡΥΛΙΚΟ':      '☠️',
};

export default function BrevetCard({ b, hasCoOrg }: BrevetCardProps) {
  const hasImage = b.imageUrl && b.imageUrl.length > 0;
  const emoji    = DIFF_EMOJI[b.difficultyLabel] ?? '⚪';

  const dateStr = b.date
    ? new Date(b.date).toLocaleDateString('el-GR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';

  return (
    <a
      href={`/brevets/${b.id}`}
      className="group block no-underline"
      style={{ position: 'relative' }}
    >
      {/* ── Animated gradient border ───────────────────────────────────────── */}
      <div
        className="absolute inset-0 rounded-2xl z-0 transition-opacity duration-500
          opacity-0 group-hover:opacity-100"
        style={{
          padding: 1.5,
          background: `conic-gradient(
            from var(--angle, 0deg),
            ${b.difficultyColor}00 0deg,
            ${b.difficultyColor}ff 90deg,
            #06b6d4ff 180deg,
            ${b.difficultyColor}ff 270deg,
            ${b.difficultyColor}00 360deg
          )`,
          borderRadius: 16,
          animation: 'spin 4s linear infinite',
        }}
      />

      {/* ── Static border (always visible) ────────────────────────────────── */}
      <div
        className="absolute inset-0 rounded-2xl z-0"
        style={{
          padding: 1.5,
          background: `linear-gradient(135deg, 
            ${b.difficultyColor}60 0%, 
            rgba(6,182,212,0.3) 50%, 
            ${b.difficultyColor}40 100%)`,
          borderRadius: 16,
        }}
      />

      {/* ── Card body ─────────────────────────────────────────────────────── */}
      <div
        className="relative z-10 rounded-2xl overflow-hidden flex flex-col min-h-[300px]"
        style={{
          margin: 1.5,
          backgroundImage: hasImage ? `url(${b.imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: hasImage ? undefined : 'rgba(255,255,255,0.04)',
        }}
      >
        {/* Dark gradient overlay on photo */}
        {hasImage && (
          <div className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(5,10,25,0.45) 0%, rgba(5,10,25,0.75) 55%, rgba(5,10,25,0.97) 100%)',
            }}
          />
        )}

        {/* ── GLASSMORPHISM HEADER ──────────────────────────────────────── */}
        <div
          className="relative z-10 flex items-center justify-between px-4 py-3"
          style={{
            background: 'linear-gradient(135deg, rgba(10,22,40,0.72) 0%, rgba(6,182,212,0.08) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: `1px solid rgba(255,255,255,0.09)`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          {/* Left: logo + organizer name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={hasCoOrg ? '/logos/both.png' : b.organizerLogo}
                alt={b.organizer}
                className="w-14 h-14 object-contain rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  boxShadow: `0 0 0 1.5px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.4)`,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logos/000000.png';
                }}
              />
              {/* Subtle glow ring behind logo */}
              <div
                className="absolute inset-0 rounded-full -z-10"
                style={{
                  boxShadow: `0 0 12px 2px ${b.difficultyColor}40`,
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-xs leading-tight truncate"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {hasCoOrg ? 'Συνδιοργάνωση' : b.organizer}
              </p>
              <p className="text-white/40 text-[10px] leading-tight truncate">
                {b.certification} {b.type}
              </p>
            </div>
          </div>

          {/* Right: distance + difficulty */}
          <div className="flex flex-col items-end shrink-0 ml-3">
            <span
              className="font-black text-2xl leading-none"
              style={{
                color: '#06b6d4',
                textShadow: '0 0 20px rgba(6,182,212,0.9), 0 0 40px rgba(6,182,212,0.5), 0 2px 4px rgba(0,0,0,0.9)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {b.distance}
              <span className="text-xs font-bold text-cyan-400/60 ml-0.5">km</span>
            </span>
            <span
              className="text-[10px] font-bold mt-0.5 tracking-wide"
              style={{
                color: b.difficultyColor,
                textShadow: `0 0 12px ${b.difficultyColor}99, 0 1px 3px rgba(0,0,0,0.9)`,
              }}
            >
              {emoji} {b.difficultyLabel}
            </span>
          </div>
        </div>

        {/* ── CARD BODY ─────────────────────────────────────────────────── */}
        <div className="relative z-10 flex-1 flex flex-col justify-end p-5">

          {/* Title */}
          <h3
            className="text-white font-black text-lg leading-tight mb-1.5"
            style={{
              textShadow: '0 2px 12px rgba(0,0,0,0.9)',
              letterSpacing: '-0.02em',
            }}
          >
            {b.title}
          </h3>

          {/* Location */}
          <p className="text-white/55 text-xs mb-4 flex items-center gap-1.5">
            <span style={{ color: '#06b6d4' }}>📍</span>
            {b.start}
          </p>

          {/* ── Bottom info row ─────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between flex-wrap gap-2 pt-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-white/45 text-xs">
              📅 {dateStr}
            </span>

            <div className="flex items-center gap-3">
              {b.ascent > 0 && (
                <span className="flex items-center gap-1 text-white/40 text-xs">
                  <span>⛰️</span>
                  <span>{b.ascent.toLocaleString()}m+</span>
                </span>
              )}
              {b.gpxUrl && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(b.gpxUrl, '_blank');
                  }}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg transition-all
                    hover:bg-cyan-500/20"
                  style={{
                    color: '#06b6d4',
                    border: '1px solid rgba(6,182,212,0.3)',
                    background: 'rgba(6,182,212,0.08)',
                  }}
                >
                  GPX ↓
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Hover shimmer effect ───────────────────────────────────────── */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100
            transition-opacity duration-700 pointer-events-none"
          style={{
            background: `linear-gradient(105deg, 
              transparent 30%, 
              rgba(255,255,255,0.04) 50%, 
              transparent 70%)`,
          }}
        />
      </div>

      <style>{`
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes spin {
          to { --angle: 360deg; }
        }
      `}</style>
    </a>
  );
}
