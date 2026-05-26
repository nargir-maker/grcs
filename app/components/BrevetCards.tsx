'use client';

// BrevetCards.tsx  — v2
// Drop-in replacement for YearCard in profile/page.tsx
//
// INSTALL:
//   1. Copy to  app/components/BrevetCards.tsx
//   2. In profile/page.tsx:
//        import { YearCard } from '@/app/components/BrevetCards';
//        (delete the old YearCard function)
//   3. Done — everything else stays the same.
//
// LOGOS:  /public/logos/<filename>  (same names as in the Flutter app assets)
//   pepa_logo3.png | ble_logo3.png | bioracer_logo3.png | har_logo3.png
//   randonneurs_logo3.png | arg_logo1.png | pok_logo3.png | aiolos_logo3.png
//   kassimatis_logo3.png | sfpip.png | peacock.png | GBT_logo_390.png
//   Lepote_logo.png | LogoAudax-2022.png | lrm_logo.png | PBP_logo_trans.png
//   acp_hom.png | har_stamp390.png | lrm_stamp.png | sre_logo.png | sre_medal2.png
//   fleche_medal.png | (200|300|400|600|1000|1200)-100YEARS.png
//
// Cards are FULLY EXPANDED — no inner collapse — taller on desktop.
// Auto-scroll rail + click-to-pause, same as v1.

import { useRef, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface BrevetEvent {
  n:    string;
  d:    number;
  t:    string;
  as:   number;
  dt:   string;
  og:   string;
  acp:  string;
  har:  string;
  mt:   string;
  rt:   string;
  pc?:  number;
  eid?: string;
}

interface YearData {
  km:      number;
  brevets: number;
  events:  BrevetEvent[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CARD_W = 260;   // px — card width in the rail
const CARD_H = 500;   // px — fully expanded height (taller so footer logos are always visible)
const GAP    = 14;    // px — gap between cards

// ── Helpers ───────────────────────────────────────────────────────────────────
function logo(name: string) {
  return `/logos/${name}`;
}

function formatDate(dt: string): string {
  if (!dt || dt === 'null') return '';
  try {
    const d = new Date(dt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('el-GR', { day:'2-digit', month:'2-digit', year:'numeric' });
    }
  } catch {}
  const parts = dt.split(' ');
  if (parts.length >= 4) {
    const months: Record<string,string> = {
      Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
      Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12',
    };
    const m = months[parts[1]];
    if (m) return `${parts[2].padStart(2,'0')}/${m}/${parts[3]}`;
  }
  return dt;
}

function getOrganizerLogo(og: string): string {
  const u = og.toUpperCase();
  if (u.includes('Π.Ε.Π.Α') || u.includes('ΠΕΠΑ'))                          return logo('pepa_logo3.png');
  if (u.includes('BLE'))                                                        return logo('ble_logo3.png');
  if (u.includes('BIORACER'))                                                   return logo('bioracer_logo3.png');
  if (u.includes('HAR') || u.includes('H.A.R') || u.includes('HELLENIC AUTO')) return logo('har_logo3.png');
  if (u.includes('GREEK RAND'))                                                 return logo('randonneurs_logo3.png');
  if (u.includes('ΕΛΛΑΔΟΣ') || u.includes('AUDAX RAND') || u.includes('GRÈCE') || u.includes('GRECE')) return logo('arg_logo1.png');
  if (u.includes('ΚΑΡΔΙΤΣ') || u.includes('Π.Ο.Κ'))                           return logo('pok_logo3.png');
  if (og.includes('ΑΙΟΛΟΣ'))                                                    return logo('aiolos_logo3.png');
  if (og.includes('KASSIMATIS'))                                                return logo('kassimatis_logo3.png');
  if (og.includes('Σ.Φ.Π.Ι.Π'))                                               return logo('sfpip.png');
  if (og.includes('PEACOCK'))                                                   return logo('peacock.png');
  return logo('GBT_logo_390.png');
}

// Maps the short organizer code stored in `og` to a human-readable display name.
// The `og` field holds whatever the DB has — sometimes a full name, sometimes a
// short code like "Π.Ε.Π.Α." or "AUDAX RANDONNEURS GRECE". We normalise here
// so the card always shows something readable alongside the logo.
function getOrganizerDisplayName(og: string): string {
  const u = og.toUpperCase().trim();
  // Already a readable full name — return as-is (longer than ~10 chars and not all dots/letters)
  if (og.length > 14 && !u.match(/^[Α-Ωα-ωA-Z.\s]+$/)) return og;
  if (u.includes('Π.Ε.Π.Α') || u === 'ΠΕΠΑ')           return 'Π.Ε.Π.Α.';
  if (u.includes('BLE'))                                  return 'BLE Cycling';
  if (u.includes('BIORACER'))                             return 'Bioracer';
  if (u.includes('H.A.R') || u.includes('HELLENIC AUTO') || u === 'HAR') return 'Hellenic Autonomous Randonneurs';
  if (u.includes('GREEK RAND'))                           return 'Greek Randonneurs';
  if (u.includes('ΕΛΛΑΔΟΣ') || u.includes('AUDAX RAND') || u.includes('GRÈCE') || u.includes('GRECE')) return 'Audax Randonneurs Grèce';
  if (u.includes('ΚΑΡΔΙΤΣ') || u.includes('Π.Ο.Κ'))     return 'Π.Ο. Καρδίτσας';
  if (u.includes('ΑΙΟΛΟΣ'))                               return 'Α.Ο. Αίολος';
  if (u.includes('KASSIMATIS'))                           return 'Kassimatis';
  if (u.includes('Σ.Φ.Π.Ι.Π'))                          return 'Σ.Φ.Π.Ι.Π.';
  if (u.includes('PEACOCK'))                              return 'Peacock';
  // Fallback — return what we have
  return og;
}

function isEmpty(v: string | undefined | null) {
  return !v || v === 'null' || v === '---' || v.trim() === '';
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DottedLine() {
  return (
    <div className="flex justify-between items-center my-2">
      {Array.from({ length: 34 }).map((_, i) => (
        <div key={i} style={{ width:3, height:3, borderRadius:'50%', background:'rgba(0,0,0,0.2)' }} />
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span style={{ fontSize:10, fontWeight:600, color:'rgba(0,0,0,0.45)', letterSpacing:0.5 }}>
        {label}
      </span>
      <span style={{ fontSize:12, fontWeight:700, color:'rgba(0,0,0,0.8)', fontFamily:'Courier New, monospace' }}>
        {value}
      </span>
    </div>
  );
}

function FinishBadge({ rt, isLRM }: { rt: string; isLRM?: boolean }) {
  if (!rt || rt === '00:00' || rt === '--:--') return null;
  const isDNF = rt === 'DNF';
  const isOut = rt === 'ΕΚΤΟΣ ΧΡΟΝΟΥ';
  const col   = isDNF ? '#991b1b' : isOut ? 'rgba(220,38,38,0.85)' : isLRM ? 'rgba(147,51,234,0.85)' : 'rgba(30,64,175,0.85)';
  return (
    <div style={{ display:'inline-block', transform:'rotate(-11deg)', border:`2px solid ${col}`, borderRadius:3, padding:'2px 6px' }}>
      <span style={{ color:col, fontWeight:700, fontSize:isDNF?13:9, letterSpacing:isDNF?2:1 }}>
        {isDNF ? 'DNF' : isOut ? 'ΕΚΤΟΣ ΧΡΟΝΟΥ' : 'ΕΝΤΟΣ ΧΡΟΝΟΥ'}
      </span>
    </div>
  );
}

// ── ACP stamp (uses real image) ───────────────────────────────────────────────
function AcpStamp({ code }: { code: string }) {
  return (
    <div style={{ transform:'rotate(-11deg)', textAlign:'center' }}>
      <img src={logo('acp_hom.png')} alt="ACP" style={{ height:80, objectFit:'contain', display:'block', margin:'0 auto' }} />
      {!isEmpty(code) && (
        <div style={{ fontSize:8, fontWeight:700, color:'#1a3a7a', fontFamily:'Courier New', marginTop:2 }}>{code}</div>
      )}
    </div>
  );
}

// ── HAR stamp (uses real image, tinted blue) ──────────────────────────────────
function HarStamp({ code }: { code: string }) {
  return (
    <div style={{ transform:'rotate(-9deg)', textAlign:'center' }}>
      {/* The Flutter app uses colorBlendMode.srcIn with Color(0xFF0D47A1) — we replicate with CSS filter */}
      <img
        src={logo('har_stamp390.png')}
        alt="HAR"
        style={{ height:72, width:72, objectFit:'contain', display:'block', margin:'0 auto',
                 filter:'brightness(0) saturate(100%) invert(13%) sepia(79%) saturate(3000%) hue-rotate(208deg) brightness(90%)' }}
      />
      <div style={{ fontSize:7, fontWeight:900, color:'#0d47a1', fontFamily:'Courier New', letterSpacing:1 }}>HOMOLOGATION</div>
      {!isEmpty(code) && (
        <div style={{ fontSize:9, fontWeight:700, color:'#0d47a1', fontFamily:'Courier New' }}>{code}</div>
      )}
    </div>
  );
}

// ── LRM stamp ────────────────────────────────────────────────────────────────
function LrmStamp() {
  return (
    <div style={{ transform:'rotate(-6deg)', textAlign:'center' }}>
      <img src={logo('lrm_stamp.png')} alt="LRM" style={{ height:36, objectFit:'contain', display:'block', margin:'0 auto' }} />
      <div style={{ fontSize:7, fontWeight:900, color:'#7e22ce', letterSpacing:1 }}>LRM HOMOLOGATION</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CARD: Default yellow BRM (and LRM, 100YEARS variants)
// ══════════════════════════════════════════════════════════════════════════════
function BrmCard({ e }: { e: BrevetEvent }) {
  const isLRM  = e.t?.toUpperCase() === 'LRM';
  const is100  = e.t?.toUpperCase() === 'BRM-100YEARS';
  const acpOk  = !isEmpty(e.acp);
  const harOk  = !isEmpty(e.har);

  const bg       = is100 ? '#e0d8cc' : isLRM ? '#f3e5f5' : '#f7e397';
  const headerBg = is100 ? '#c5b9a5' : isLRM ? '#e1bee7' : '#e5d186';

  const clubTitle = isLRM
    ? 'LES RANDONNEURS MONDIAUX'
    : 'ΛΕΣΧΗ ΠΟΔΗΛΑΤΙΚΟΥ ΤΟΥΡΙΣΜΟΥ ΕΛΛΑΔΑΣ';

  const subTitle = is100
    ? '1921 · BRM · 2021'
    : isLRM
    ? 'LRM EVENT'
    : 'ΔΙΑΔΡΟΜΕΣ ΜΕΓΑΛΩΝ ΑΠΟΣΤΑΣΕΩΝ';

  return (
    <div style={{ background: bg, border:'2px solid rgba(0,0,0,0.13)', borderRadius:4, height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── Header ── */}
      <div style={{ background: headerBg, padding:'8px 12px', textAlign:'center', flexShrink:0 }}>
        {is100 && (
          <>
            <div style={{ fontWeight:700, fontSize:18, color:'#3e2723', letterSpacing:1.2 }}>1921 - 2021</div>
            <div style={{ fontWeight:500, fontSize:11, color:'#3e2723' }}>100 YEARS BRM</div>
          </>
        )}
        {!is100 && (
          <>
            <div style={{ fontWeight:700, fontSize:10, color:'rgba(0,0,0,0.75)', letterSpacing:0.4 }}>{clubTitle}</div>
            <div style={{ fontWeight:500, fontSize:8, color: isLRM ? '#6a1b9a' : 'rgba(0,0,0,0.45)', letterSpacing:1.2, marginTop:1 }}>{subTitle}</div>
          </>
        )}
      </div>

      {/* ── Organizer row: logo left + name right ── */}
      <div style={{ padding:'10px 12px 0', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <img
          src={getOrganizerLogo(e.og)}
          alt={e.og}
          style={{ height:58, maxWidth:72, objectFit:'contain', flexShrink:0 }}
          onError={(ev) => { (ev.target as HTMLImageElement).style.display='none'; }}
        />
        <div style={{ flex:1, minWidth:0 }}>
          {isLRM && <div style={{ fontSize:10, fontWeight:700, color:'#7e22ce', marginBottom:2 }}>LRM EVENT</div>}
          <div style={{ fontWeight:900, fontSize:13, color:'rgba(0,0,0,0.85)', lineHeight:1.2, wordBreak:'break-word' }}>
            {getOrganizerDisplayName(e.og)}
          </div>
        </div>
      </div>

      {/* ── Finish stamp — its own row, right-aligned so it never overlaps the logo ── */}
      {!isEmpty(e.rt) && e.rt !== '00:00' && (
        <div style={{ padding:'4px 12px 0', display:'flex', justifyContent:'flex-end' }}>
          <FinishBadge rt={e.rt} isLRM={isLRM} />
        </div>
      )}

      <div style={{ padding:'0 12px' }}>
        <DottedLine />
      </div>

      {/* ── Event name ── */}
      <div style={{ padding:'0 12px', fontWeight:900, fontSize:14, color:'rgba(0,0,0,0.88)', lineHeight:1.3 }}>
        {e.n.toUpperCase()}
      </div>

      <div style={{ padding:'0 12px' }}>
        <DottedLine />
      </div>

      {/* ── Date ── */}
      {formatDate(e.dt) && (
        <div style={{ padding:'0 12px 2px', fontWeight:700, fontSize:14, color:'rgba(0,0,0,0.8)' }}>
          {formatDate(e.dt)}
        </div>
      )}

      <div style={{ padding:'0 12px' }}>
        <DottedLine />
      </div>

      {/* ── Distance + ascent ── */}
      <div style={{ padding:'0 12px 4px', fontWeight:900, fontSize:20, color:'rgba(0,0,0,0.88)' }}>
        {e.d}km{e.as > 0 ? ` · ▲+${e.as}m` : ''}
      </div>

      {/* ── Details rows ── */}
      <div style={{ padding:'0 12px', flex:1 }}>
        {e.pc != null && e.pc > 0 && <Row label="ΣΥΜΜΕΤΟΧΕΣ / PARTICIPANTS" value={String(e.pc)} />}
        {!isEmpty(e.rt) && e.rt !== '00:00' && <Row label="ΧΡΟΝΟΣ / TIME" value={e.rt} />}
        {!isEmpty(e.mt) && e.mt !== '00:00' && <Row label="ΟΡΙΟ / LIMIT" value={e.mt} />}
        {acpOk && <Row label={isLRM ? 'LRM No.' : 'BREVET No.'} value={e.acp} />}
      </div>

      {/* ── Homologation footer ── */}
      <div style={{ padding:'8px 12px 10px', borderTop:'1px solid rgba(0,0,0,0.1)', flexShrink:0 }}>
        {!isLRM && !is100 && (
          <div style={{ fontWeight:900, fontSize:12, color:'rgba(0,0,0,0.75)', marginBottom:6, textAlign:'center' }}>
            HOMOLOGATION
          </div>
        )}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <img src={logo('Lepote_logo.png')} alt="Lepote" style={{ height:42, objectFit:'contain' }}
               onError={(ev) => { (ev.target as HTMLImageElement).style.display='none'; }} />
          {isLRM ? <LrmStamp /> : (acpOk || harOk) ? (
            harOk && !acpOk ? <HarStamp code={e.har} /> : <AcpStamp code={e.acp} />
          ) : <div style={{ width:60 }} />}
          <img
            src={logo(isLRM ? 'lrm_logo.png' : 'LogoAudax-2022.png')}
            alt="Audax"
            style={{ height:52, objectFit:'contain' }}
            onError={(ev) => { (ev.target as HTMLImageElement).style.display='none'; }}
          />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CARD: PBP — orange/salmon with watermark logo
// ══════════════════════════════════════════════════════════════════════════════
function PbpCard({ e }: { e: BrevetEvent }) {
  return (
    <div style={{ background:'#fdd0b1', border:'2px solid rgba(180,60,0,0.2)', borderRadius:12, height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

      {/* Watermark */}
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', overflow:'hidden' }}>
        <img
          src={logo('PBP_logo_trans.png')}
          alt=""
          style={{ height:200, objectFit:'contain', opacity:0.18 }}
          onError={() => {}}
        />
      </div>

      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100%', padding:16 }}>

        {/* Date + ACP */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#7f1d1d', fontFamily:'Georgia,serif' }}>
            {formatDate(e.dt)}
          </div>
          {!isEmpty(e.acp) && (
            <div style={{ fontSize:9, fontWeight:700, color:'#c2410c', textAlign:'right', maxWidth:120, lineHeight:1.3 }}>
              {e.acp}
            </div>
          )}
        </div>

        <div style={{ fontSize:9, color:'#6b7280', fontWeight:700, marginBottom:4 }}>{e.og}</div>

        {/* Name */}
        <div style={{ fontWeight:700, color:'#7f1d1d', lineHeight:1.25, marginBottom:8, fontFamily:'Georgia,serif', fontSize:22 }}>
          {e.n.toUpperCase()}
        </div>

        {/* Distance */}
        <div style={{ textAlign:'right', marginBottom:4 }}>
          <div style={{ fontSize:9, fontWeight:700, color:'#9ca3af' }}>DISTANCE</div>
          <div style={{ fontSize:26, fontWeight:900, color:'#dc2626' }}>{e.d}km</div>
        </div>

        {/* Red divider */}
        <div style={{ height:4, background:'#dc2626', borderRadius:2, marginLeft:80, marginBottom:10 }} />

        {/* Ascent */}
        {e.as > 0 && (
          <div style={{ textAlign:'right', marginBottom:4 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#9ca3af' }}>ASCENT</div>
            <div style={{ fontSize:22, fontWeight:900, color:'#dc2626' }}>+{e.as}m</div>
          </div>
        )}

        {/* Details */}
        <div style={{ flex:1 }}>
          {e.pc != null && e.pc > 0 && <Row label="ΣΥΜΜΕΤΟΧΕΣ" value={String(e.pc)} />}
          {!isEmpty(e.rt) && e.rt !== '00:00' && <Row label="ΧΡΟΝΟΣ / TIME" value={e.rt} />}
          {!isEmpty(e.mt) && e.mt !== '00:00' && <Row label="ΟΡΙΟ / LIMIT" value={e.mt} />}
        </div>

        {/* Finish */}
        {!isEmpty(e.rt) && e.rt !== '00:00' && (
          <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:13 }}>⏱</span>
            <span style={{ fontWeight:700, fontSize:13, color:'#1e3a5f' }}>FINISH: {e.rt}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CARD: HAR-only (blue)
// ══════════════════════════════════════════════════════════════════════════════
function HarCard({ e }: { e: BrevetEvent }) {
  return (
    <div style={{ background:'rgba(162,229,248,0.55)', border:'1px solid rgba(30,120,180,0.35)', borderRadius:4, height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Title bar */}
      <div style={{ background:'#7eb5be', padding:'10px 12px', textAlign:'center', flexShrink:0 }}>
        <div style={{ fontWeight:700, fontSize:17, color:'#000', fontFamily:'Georgia,serif' }}>
          Hellenic Autonomous Randonneurs
        </div>
        <div style={{ fontWeight:700, fontSize:8, color:'rgba(0,0,0,0.65)', letterSpacing:2, marginTop:2 }}>
          ΔΙΟΡΓΑΝΩΤΗΣ
        </div>
      </div>

      {/* HAR logo + organizer name row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 12px 4px', flexShrink:0 }}>
        <img
          src={logo('har_logo3.png')}
          alt="HAR"
          style={{ height:72, maxWidth:80, objectFit:'contain', flexShrink:0 }}
          onError={(ev) => { (ev.target as HTMLImageElement).style.display='none'; }}
        />
        <div style={{ flex:1, fontWeight:900, fontSize:12, color:'rgba(0,0,0,0.8)', lineHeight:1.3 }}>
          Hellenic Autonomous<br />Randonneurs
        </div>
      </div>

      {/* Finish stamp — right-aligned, own row */}
      {!isEmpty(e.rt) && e.rt !== '00:00' && (
        <div style={{ padding:'2px 12px 0', display:'flex', justifyContent:'flex-end' }}>
          <FinishBadge rt={e.rt} />
        </div>
      )}

      {/* Body */}
      <div style={{ flex:1, padding:'0 12px', display:'flex', flexDirection:'column' }}>
        <DottedLine />
        <div style={{ fontWeight:700, fontSize:14, color:'rgba(0,0,0,0.88)', textAlign:'center', lineHeight:1.3 }}>
          {e.n} · {e.d}km
        </div>
        <DottedLine />

        <div style={{ fontWeight:700, fontSize:13, color:'rgba(0,0,0,0.78)', textAlign:'center' }}>
          {formatDate(e.dt)}
        </div>
        <DottedLine />

        {/* "Brevet - χλμ" label like the app */}
        <div style={{ fontFamily:'serif', fontWeight:100, fontSize:13, color:'rgba(0,0,0,0.5)', textAlign:'center', marginBottom:6 }}>
          Brevet · χλμ
        </div>
        <DottedLine />

        <div style={{ flex:1 }}>
          {e.pc != null && e.pc > 0 && <Row label="ΣΥΜΜΕΤΟΧΕΣ" value={String(e.pc)} />}
          {!isEmpty(e.rt) && e.rt !== '00:00' && <Row label="ΧΡΟΝΟΣ / TIME" value={e.rt} />}
          {!isEmpty(e.mt) && e.mt !== '00:00' && <Row label="ΟΡΙΟ / LIMIT" value={e.mt} />}
        </div>
      </div>

      {/* HAR stamp footer */}
      <div style={{ borderTop:'1px solid rgba(30,120,180,0.25)', padding:'10px 12px', display:'flex', justifyContent:'center', flexShrink:0 }}>
        <HarStamp code={e.har} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CARD: Dual ACP + HAR (swipeable — two sub-pages)
// ══════════════════════════════════════════════════════════════════════════════
function DualCard({ e }: { e: BrevetEvent }) {
  const [page, setPage] = useState(0);

  // Shared body content used in both sub-pages
  function SharedBody({ tint }: { tint: 'acp' | 'har' }) {
    return (
      <div style={{ flex:1, padding:'0 12px', display:'flex', flexDirection:'column' }}>
        {/* Organizer: logo left + name right */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0 4px', flexShrink:0 }}>
          <img
            src={tint === 'acp' ? getOrganizerLogo(e.og) : logo('har_logo3.png')}
            alt={tint}
            style={{ height:52, maxWidth:68, objectFit:'contain', flexShrink:0 }}
            onError={(ev) => { (ev.target as HTMLImageElement).style.display='none'; }}
          />
          <div style={{ flex:1, fontWeight:900, fontSize:11, color:'rgba(0,0,0,0.8)', lineHeight:1.2 }}>
            {tint === 'acp' ? getOrganizerDisplayName(e.og) : 'Hellenic Autonomous Randonneurs'}
          </div>
        </div>
        {/* Finish stamp — right-aligned, own row */}
        {!isEmpty(e.rt) && e.rt !== '00:00' && (
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:2 }}>
            <FinishBadge rt={e.rt} />
          </div>
        )}
        <DottedLine />
        <div style={{ fontWeight:900, fontSize:13, color:'rgba(0,0,0,0.88)', lineHeight:1.3 }}>
          {e.n.toUpperCase()}
        </div>
        <DottedLine />
        <div style={{ fontWeight:700, fontSize:13, color:'rgba(0,0,0,0.78)' }}>{formatDate(e.dt)}</div>
        <DottedLine />
        <div style={{ fontWeight:900, fontSize:18, color:'rgba(0,0,0,0.88)', marginBottom:4 }}>
          {e.d}km{e.as > 0 ? ` · ▲+${e.as}m` : ''}
        </div>
        <div style={{ flex:1 }}>
          {e.pc != null && e.pc > 0 && <Row label="ΣΥΜΜΕΤΟΧΕΣ" value={String(e.pc)} />}
          {!isEmpty(e.rt) && e.rt !== '00:00' && <Row label="ΧΡΟΝΟΣ / TIME" value={e.rt} />}
          {!isEmpty(e.mt) && e.mt !== '00:00' && <Row label="ΟΡΙΟ / LIMIT" value={e.mt} />}
          {tint === 'acp' && !isEmpty(e.acp) && <Row label="BREVET No." value={e.acp} />}
          {tint === 'har' && !isEmpty(e.har) && <Row label="HAR No." value={e.har} />}
        </div>
        <div style={{ display:'flex', justifyContent:'center', padding:'8px 0' }}>
          {tint === 'acp' ? <AcpStamp code={e.acp} /> : <HarStamp code={e.har} />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      {/* Slide container */}
      <div style={{ flex:1, position:'relative', overflow:'hidden', minHeight:0 }}>
        {/* ACP page */}
        <div style={{
          position:'absolute', inset:0,
          transform: page === 0 ? 'translateX(0%)' : 'translateX(-100%)',
          transition: 'transform 0.35s ease',
          background:'#f7e397', border:'2px solid #d4b800', borderRadius:4,
          display:'flex', flexDirection:'column', overflow:'hidden',
        }}>
          <div style={{ background:'linear-gradient(90deg,#e5d186,#d4b800)', padding:'6px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ fontSize:8, fontWeight:700, color:'rgba(0,0,0,0.7)', flex:1, lineHeight:1.3 }}>
              ΛΕΣΧΗ ΠΟΔΗΛΑΤΙΚΟΥ ΤΟΥΡΙΣΜΟΥ ΕΛΛΑΔΑΣ
            </div>
            <div style={{ fontSize:7, fontWeight:700, background:'rgba(0,0,0,0.2)', color:'#fff', padding:'2px 6px', borderRadius:4, marginLeft:8, flexShrink:0 }}>
              ⚡ ACP+HAR
            </div>
          </div>
          <SharedBody tint="acp" />
        </div>

        {/* HAR page */}
        <div style={{
          position:'absolute', inset:0,
          transform: page === 1 ? 'translateX(0%)' : 'translateX(100%)',
          transition: 'transform 0.35s ease',
          background:'rgba(162,229,248,0.55)', border:'1px solid rgba(30,120,180,0.35)', borderRadius:4,
          display:'flex', flexDirection:'column', overflow:'hidden',
        }}>
          <div style={{ background:'#7eb5be', padding:'6px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ fontSize:8, fontWeight:700, color:'rgba(0,0,0,0.8)', flex:1 }}>
              Hellenic Autonomous Randonneurs
            </div>
            <div style={{ fontSize:7, fontWeight:700, background:'rgba(0,0,0,0.2)', color:'#fff', padding:'2px 6px', borderRadius:4, marginLeft:8, flexShrink:0 }}>
              ⚡ ACP+HAR
            </div>
          </div>
          <SharedBody tint="har" />
        </div>
      </div>

      {/* Indicators */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'6px 0 2px', flexShrink:0 }}>
        <span style={{ fontSize:7, fontWeight:700, color:'#a16207', letterSpacing:1 }}>ΔΙΠΛΗ ΟΜΟΛΟΓΗΣΗ</span>
        {[0,1].map(i => (
          <button key={i} onClick={() => setPage(i)} style={{
            width: page === i ? 18 : 6, height:6, borderRadius:3, border:'none', cursor:'pointer', padding:0,
            background: page === i ? (i===0 ? '#d4b800' : '#7eb5be') : '#9ca3af',
            transition: 'all 0.25s',
          }} />
        ))}
        {page === 0 && (
          <span style={{ fontSize:8, color:'#7eb5be', fontWeight:700 }}>H.A.R. →</span>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CARD: Flèche Nationale
// ══════════════════════════════════════════════════════════════════════════════
function FlecheCard({ e }: { e: BrevetEvent }) {
  return (
    <div style={{ background:'#FFFDE7', border:'2px solid rgba(200,160,0,0.3)', borderRadius:8, height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ background:'rgba(255,245,157,0.6)', padding:'8px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(200,160,0,0.2)', flexShrink:0 }}>
        <img
          src={logo('LogoAudax-2022.png')}
          alt="Audax"
          style={{ height:44, objectFit:'contain' }}
          onError={(ev) => { (ev.target as HTMLImageElement).style.display='none'; }}
        />
        <div style={{ fontWeight:700, fontSize:18, color:'#78350f', fontFamily:'Georgia,serif' }}>
          Flèche Nationale
        </div>
      </div>

      <div style={{ fontSize:10, fontWeight:700, color:'#78350f', textAlign:'center', padding:'6px 12px 2px', fontStyle:'italic' }}>
        24 hours of team cycling towards a concentration of cyclists
      </div>

      <div style={{ margin:'0 12px', borderTop:'1px solid rgba(0,0,0,0.12)' }} />

      {/* Body */}
      <div style={{ flex:1, padding:'10px 12px', display:'flex', flexDirection:'column', gap:6 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          <img
            src={logo('fleche_medal.png')}
            alt="medal"
            style={{ height:100, objectFit:'contain', flexShrink:0 }}
            onError={(ev) => { (ev.target as HTMLImageElement).style.display='none'; }}
          />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:14, color:'rgba(0,0,0,0.85)', lineHeight:1.3 }}>
              {e.n.toUpperCase()}
            </div>
            <div style={{ fontSize:11, color:'rgba(0,0,0,0.5)', marginTop:4 }}>{formatDate(e.dt)}</div>
            {!isEmpty(e.acp) && (
              <div style={{ fontSize:11, color:'rgba(0,0,0,0.45)', fontFamily:'Courier New' }}>
                Homologation: {e.acp}
              </div>
            )}
            <div style={{ fontSize:20, fontWeight:700, color:'#1e3a5f', marginTop:8 }}>
              {e.d}km {e.as > 0 ? `+${e.as}m` : ''}
            </div>
          </div>
        </div>

        <div style={{ flex:1 }}>
          {e.pc != null && e.pc > 0 && <Row label="ΣΥΜΜΕΤΟΧΕΣ" value={String(e.pc)} />}
          {!isEmpty(e.rt) && e.rt !== '00:00' && <Row label="ΧΡΟΝΟΣ / TIME" value={e.rt} />}
          {!isEmpty(e.mt) && e.mt !== '00:00' && <Row label="ΟΡΙΟ / LIMIT" value={e.mt} />}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CARD: Super Randonnée Étoile (SRe)
// ══════════════════════════════════════════════════════════════════════════════
function SreCard({ e }: { e: BrevetEvent }) {
  return (
    <div style={{ background:'rgb(224,177,232)', border:'1px solid rgba(213,73,238,0.5)', borderRadius:12, height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header row: SRe logo + title */}
      <div style={{ padding:'10px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'rgba(150,40,180,0.1)' }}>
        <img
          src={logo('sre_logo.png')}
          alt="SRe"
          style={{ height:90, objectFit:'contain' }}
          onError={(ev) => { (ev.target as HTMLImageElement).style.display='none'; }}
        />
        <div style={{ textAlign:'right' }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#4a148c', lineHeight:1.3, fontFamily:'Georgia,serif' }}>
            PROVENCE Randonneurs<br />Super Randonnée
          </div>
        </div>
      </div>

      <div style={{ fontSize:12, fontStyle:'italic', color:'#5b21b6', textAlign:'center', padding:'4px 12px' }}>
        "The route of the High Peaks"
      </div>

      <div style={{ margin:'0 12px', borderTop:'1px solid rgba(180,0,230,0.25)' }} />

      {/* Organizer */}
      <div style={{ padding:'8px 12px', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <img
          src={getOrganizerLogo(e.og)}
          alt={e.og}
          style={{ height:44, objectFit:'contain' }}
          onError={(ev) => { (ev.target as HTMLImageElement).style.display='none'; }}
        />
        <div style={{ fontWeight:700, fontSize:13, color:'#7b2d8b', letterSpacing:0.8, flex:1, lineHeight:1.2 }}>
          {getOrganizerDisplayName(e.og).toUpperCase()}
        </div>
      </div>

      <div style={{ margin:'0 12px', borderTop:'1px solid rgba(180,0,230,0.25)' }} />

      {/* Body */}
      <div style={{ flex:1, padding:'8px 12px', display:'flex', gap:10 }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
          <div style={{ fontWeight:900, fontSize:13, color:'#4a148c', lineHeight:1.3 }}>
            {e.n.toUpperCase()}
          </div>
          <div style={{ fontSize:11, color:'rgba(0,0,0,0.5)' }}>Date: {formatDate(e.dt)}</div>
          {!isEmpty(e.acp) && (
            <div style={{ fontSize:10, color:'rgba(0,0,0,0.45)', fontFamily:'Courier New' }}>Homologation: {e.acp}</div>
          )}
          <div style={{ fontSize:20, fontWeight:700, color:'#6d28d9', marginTop:6 }}>{e.d}km</div>
          {e.as > 0 && <div style={{ fontSize:16, fontWeight:700, color:'#7c3aed' }}>+{e.as}m</div>}

          <div style={{ flex:1 }}>
            {e.pc != null && e.pc > 0 && <Row label="ΣΥΜΜΕΤΟΧΕΣ" value={String(e.pc)} />}
            {!isEmpty(e.rt) && e.rt !== '00:00' && <Row label="ΧΡΟΝΟΣ / TIME" value={e.rt} />}
            {!isEmpty(e.mt) && e.mt !== '00:00' && <Row label="ΟΡΙΟ / LIMIT" value={e.mt} />}
          </div>

          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
            <span style={{ background:'#6d28d9', color:'#fff', fontSize:7, fontWeight:700, padding:'3px 8px', borderRadius:4, letterSpacing:0.5 }}>
              OFFICIAL FINISHER
            </span>
          </div>
        </div>

        {/* Medal */}
        <img
          src={logo('sre_medal2.png')}
          alt="medal"
          style={{ height:110, objectFit:'contain', flexShrink:0, alignSelf:'center' }}
          onError={(ev) => { (ev.target as HTMLImageElement).style.display='none'; }}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CARD: BRM-100YEARS — uses the French anniversary layout from Android
// ══════════════════════════════════════════════════════════════════════════════
function AnniversaryCard({ e }: { e: BrevetEvent }) {
  const cleanDist = String(e.d);
  return (
    <div style={{ background:'#e0d8cc', border:'2px solid rgba(100,80,0,0.2)', borderRadius:4, height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ background:'#c5b9a5', padding:'8px 12px', textAlign:'center', flexShrink:0 }}>
        <div style={{ fontWeight:700, fontSize:18, color:'#3e2723', letterSpacing:1.2 }}>1921 - 2021</div>
        <div style={{ fontSize:11, color:'#3e2723', fontWeight:500 }}>100 YEARS BRM</div>
      </div>

      <div style={{ flex:1, padding:'10px 12px', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
        {/* Double border box */}
        <div style={{ border:'1px solid #1a237e', padding:2 }}>
          <div style={{ border:'1px solid #1a237e', padding:'4px 10px' }}>
            <div style={{ color:'#1a237e', fontWeight:700, fontSize:14 }}>Brevet des Randonneurs Mondiaux</div>
          </div>
        </div>

        <div style={{ color:'#1a237e', fontSize:20, fontWeight:900, letterSpacing:3 }}>CENTENAIRE</div>

        <img
          src={logo(`${cleanDist}-100YEARS.png`)}
          alt={`${cleanDist}km`}
          style={{ height:80, objectFit:'contain' }}
          onError={(ev) => { (ev.target as HTMLImageElement).style.display='none'; }}
        />

        {/* French details */}
        <div style={{ width:'100%', fontSize:11, color:'#1a237e', lineHeight:1.6 }}>
          <div><strong>Le Brevet</strong> {e.n}</div>
          <div><strong>Randonnée de</strong> {e.d} km à bicyclette</div>
          <div><strong>Organisée le</strong> {formatDate(e.dt)}</div>
          <div><strong>Par</strong> {e.og}</div>
        </div>

        <div style={{ textAlign:'center', fontSize:10, color:'#1a237e', fontStyle:'italic', marginTop:'auto' }}>
          Sous le contrôle et l'homologation exclusive de<br />
          <strong style={{ fontSize:13 }}>L'AUDAX CLUB PARISIEN</strong><br />
          Société fondée en 1904
        </div>
      </div>
    </div>
  );
}

// ── Card dispatcher ───────────────────────────────────────────────────────────
function BrevetCard({ e }: { e: BrevetEvent }) {
  const type  = (e.t  ?? '').toUpperCase();
  const name  = (e.n  ?? '').toUpperCase();
  const acpOk = !isEmpty(e.acp);
  const harOk = !isEmpty(e.har);

  if (type === 'PBP')                             return <PbpCard e={e} />;
  if (name.includes('FLECHE') || type === 'FLC') return <FlecheCard e={e} />;
  if (type === 'SRE')                             return <SreCard e={e} />;
  if (type === 'BRM-100YEARS')                    return <AnniversaryCard e={e} />;
  if (acpOk && harOk)                             return <DualCard e={e} />;
  if (harOk && !acpOk)                            return <HarCard e={e} />;
  return <BrmCard e={e} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// Horizontal scroll rail — auto-play + click-to-pause
// ══════════════════════════════════════════════════════════════════════════════
// ── Numbered selector button ──────────────────────────────────────────────────
// Shows: number, distance badge, date — click scrolls the rail to that card.
function SelectorButton({
  idx, event, isActive, onClick,
}: {
  idx: number;
  event: BrevetEvent;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  // Card-type colour for the badge accent
  const type  = (event.t ?? '').toUpperCase();
  const name  = (event.n ?? '').toUpperCase();
  const acpOk = !isEmpty(event.acp);
  const harOk = !isEmpty(event.har);

  let accent = '#e5d186';          // yellow  — BRM default
  if (type === 'PBP')                              accent = '#fb923c'; // orange
  else if (name.includes('FLECHE') || type === 'FLC') accent = '#fde68a'; // cream
  else if (type === 'SRE')                         accent = '#d8b4fe'; // purple
  else if (type === 'BRM-100YEARS')               accent = '#c5b9a5'; // sepia
  else if (type === 'LRM')                         accent = '#e9d5ff'; // lavender
  else if (acpOk && harOk)                         accent = '#7eb5be'; // teal dual
  else if (harOk)                                  accent = '#93c5fd'; // blue HAR

  const isLit = isActive || hovered;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${event.d}km · ${formatDate(event.dt)}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '6px 8px',
        borderRadius: 6,
        border: `2px solid ${isActive ? accent : isLit ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}`,
        background: isActive
          ? `rgba(${hexToRgb(accent)},0.18)`
          : isLit
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(255,255,255,0.03)',
        cursor: 'pointer',
        minWidth: 48,
        transition: 'all 0.18s ease',
        outline: 'none',
        boxShadow: isActive ? `0 0 10px rgba(${hexToRgb(accent)},0.35)` : 'none',
      }}
    >
      {/* Number badge */}
      <div style={{
        width: 22, height: 22,
        borderRadius: 4,
        background: isActive ? accent : 'rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: 11,
        color: isActive ? '#000' : 'rgba(255,255,255,0.55)',
        transition: 'all 0.18s ease',
        flexShrink: 0,
      }}>
        {idx + 1}
      </div>

      {/* Distance */}
      <div style={{
        fontSize: 11, fontWeight: 700, lineHeight: 1,
        color: isActive ? accent : 'rgba(255,255,255,0.6)',
        transition: 'color 0.18s',
      }}>
        {event.d}km
      </div>

      {/* Short date — day/month only */}
      <div style={{
        fontSize: 9, fontWeight: 500, lineHeight: 1,
        color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
        transition: 'color 0.18s',
        fontFamily: 'Courier New, monospace',
      }}>
        {formatDate(event.dt).substring(0, 5) /* dd/mm */}
      </div>
    </button>
  );
}

// tiny helper: '#rrggbb' → 'r,g,b'  (used for rgba() in SelectorButton)
function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '255,255,255';
  const r = parseInt(clean.substring(0,2), 16);
  const g = parseInt(clean.substring(2,4), 16);
  const b = parseInt(clean.substring(4,6), 16);
  return `${r},${g},${b}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// EventsScrollRail — numbered selector, no auto-scroll
// ══════════════════════════════════════════════════════════════════════════════
function EventsScrollRail({ events }: { events: BrevetEvent[] }) {
  const railRef    = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState<number>(0);

  // Sort ascending by date (same as Android sortedEvents)
  const sorted = [...events].sort((a, b) => {
    try { return new Date(a.dt).getTime() - new Date(b.dt).getTime(); } catch { return 0; }
  });

  const scrollToIdx = useCallback((idx: number) => {
    railRef.current?.scrollTo({ left: idx * (CARD_W + GAP), behavior: 'smooth' });
  }, []);

  function handleSelect(idx: number) {
    setActiveIdx(idx);
    scrollToIdx(idx);
  }

  return (
    <div style={{ userSelect: 'none' }}>

      {/* ── Card rail ── */}
      <div
        ref={railRef}
        style={{
          display: 'flex',
          gap: GAP,
          overflowX: 'auto',
          paddingLeft: 16, paddingRight: 16,
          paddingBottom: 14, paddingTop: 4,
          scrollbarWidth: 'none',
          scrollSnapType: 'x mandatory',
        }}
      >
        {sorted.map((e, i) => (
          <div
            key={i}
            onClick={() => handleSelect(i)}
            style={{
              width: CARD_W,
              minWidth: CARD_W,
              height: CARD_H,
              flexShrink: 0,
              scrollSnapAlign: 'start',
              cursor: 'pointer',
              borderRadius: 6,
              overflow: 'hidden',
              outline: activeIdx === i ? '2.5px solid #06b6d4' : '2px solid transparent',
              outlineOffset: 2,
              transform: activeIdx === i ? 'scale(1.02) translateY(-3px)' : 'scale(1)',
              boxShadow: activeIdx === i
                ? '0 12px 36px rgba(0,0,0,0.6)'
                : '0 3px 12px rgba(0,0,0,0.3)',
              opacity: activeIdx !== i ? 0.62 : 1,
              transition: 'transform 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease, outline 0.15s ease',
            }}
          >
            <BrevetCard e={e} />
          </div>
        ))}
      </div>

      {/* ── Numbered selector strip ── */}
      {sorted.length > 1 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '8px 16px 12px',
          justifyContent: 'center',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          {/* "Jump to:" label */}
          <div style={{
            display: 'flex', alignItems: 'center',
            fontSize: 9, fontWeight: 700, letterSpacing: 1,
            color: 'rgba(255,255,255,0.25)',
            paddingRight: 4, alignSelf: 'center',
            textTransform: 'uppercase',
          }}>
            {sorted.length} brevets ·
          </div>

          {sorted.map((ev, i) => (
            <SelectorButton
              key={i}
              idx={i}
              event={ev}
              isActive={activeIdx === i}
              onClick={() => handleSelect(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// YearCard — exported drop-in replacement
// ══════════════════════════════════════════════════════════════════════════════
export function YearCard({ year, data }: { year: string; data: YearData }) {
  const [open, setOpen] = useState(false);

  const has200 = data.events.some(e => e.d >= 200 && e.d < 300);
  const has300 = data.events.some(e => e.d >= 300 && e.d < 400);
  const has400 = data.events.some(e => e.d >= 400 && e.d < 600);
  const has600 = data.events.some(e => e.d >= 600);
  const isSR   = has200 && has300 && has400 && has600;
  const isPBP  = data.events.some(e => e.t?.toUpperCase() === 'PBP');
  const isFLC  = data.events.some(e =>
    e.t?.toUpperCase() === 'FLC' || e.n?.toUpperCase().includes('FLECHE')
  );

  return (
    <div style={{
      background: open ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${open ? 'rgba(6,182,212,0.35)' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 12,
      transition: 'border-color 0.2s, background 0.2s',
    }}>
      {/* ── Year header button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', background:'transparent', border:'none', cursor:'pointer',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.03)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='transparent'; }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{
            background: open ? 'rgba(6,182,212,0.15)' : '#0A1628',
            border: `1px solid ${open ? 'rgba(6,182,212,0.5)' : 'rgba(6,182,212,0.3)'}`,
            borderRadius:12, padding:'8px 12px', textAlign:'center', minWidth:56,
            transition:'all 0.2s',
          }}>
            <div style={{ color:'#06b6d4', fontWeight:700, fontSize:18, lineHeight:1 }}>{year}</div>
          </div>
          <div style={{ textAlign:'left' }}>
            <div style={{ color:'#fff', fontWeight:700 }}>{data.km.toLocaleString('el-GR')}km</div>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>{data.brevets} brevets</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {isSR  && <span style={{ fontSize:11, background:'rgba(239,68,68,0.2)', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)', padding:'2px 8px', borderRadius:999, fontWeight:700 }}>SR</span>}
          {isPBP && <span style={{ fontSize:11, background:'rgba(59,130,246,0.2)', color:'#93c5fd', border:'1px solid rgba(59,130,246,0.3)', padding:'2px 8px', borderRadius:999, fontWeight:700 }}>PBP</span>}
          {isFLC && <span style={{ fontSize:11, background:'rgba(249,115,22,0.2)', color:'#fb923c', border:'1px solid rgba(249,115,22,0.3)', padding:'2px 8px', borderRadius:999, fontWeight:700 }}>FLECHE</span>}
          <span style={{
            color:'rgba(255,255,255,0.3)', fontSize:18,
            display:'inline-block',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition:'transform 0.3s',
          }}>▼</span>
        </div>
      </button>

      {/* ── Card rail (expanded) ── */}
      {open && (
        <div style={{
          borderTop:'1px solid rgba(255,255,255,0.1)',
          background:'rgba(0,0,0,0.18)',
          paddingTop:12, paddingBottom:4,
        }}>
          {data.events.length === 0 ? (
            <p style={{ padding:'0 20px', color:'rgba(255,255,255,0.3)', fontSize:13 }}>
              Δεν βρέθηκαν brevets.
            </p>
          ) : (
            <EventsScrollRail events={data.events} />
          )}
        </div>
      )}
    </div>
  );
}

export default YearCard;
