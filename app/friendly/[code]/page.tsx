'use client';

// app/friendly/[code]/page.tsx
// Web viewer for a friendly ride session — with group chat

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off, get, push, set, serverTimestamp } from 'firebase/database';
import { rtdb } from '@/app/lib/firebase';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('../../components/LiveMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '82vh' }} className="bg-white/5 rounded-2xl
      border border-white/10 flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent
          rounded-full animate-spin mx-auto mb-2" />
        <p className="text-white/30 text-sm">Φόρτωση χάρτη...</p>
      </div>
    </div>
  ),
});

interface Rider {
  id: string;
  fullName: string;
  status: string;
  lat: number;
  lng: number;
  speed: string;
  avgSpeed: string;
  currentKm: string;
  timestamp: number;
  gender: string;
}

interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  gender: string;
  text: string;
  ts: number;
}

function Chip({ value, label, color }: {
  value: string | number; label: string; color: string;
}) {
  return (
    <div style={{
      background: 'rgba(10,22,40,0.72)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 12,
      padding: '6px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      whiteSpace: 'nowrap' as const,
    }}>
      <span style={{ color, fontSize: 18, fontWeight: 'bold', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
        {label}
      </span>
    </div>
  );
}

// ── Name modal ────────────────────────────────────────────────────────────────
function NameModal({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center
      bg-[#0A1628]/90 backdrop-blur-sm rounded-2xl">
      <div className="bg-white/5 border border-white/15 rounded-2xl p-6 w-full max-w-xs mx-4">
        <p className="text-2xl text-center mb-2">💬</p>
        <h3 className="text-white font-bold text-center mb-1">Πώς να σε λένε;</h3>
        <p className="text-white/40 text-xs text-center mb-4">
          Το όνομά σου θα φαίνεται στα μηνύματά σου
        </p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
          placeholder="π.χ. Νίκος"
          maxLength={30}
          className="w-full bg-white/5 border border-white/15 text-white rounded-xl
            px-4 py-2.5 text-sm focus:outline-none focus:border-green-500/60
            placeholder-white/25 mb-3"
        />
        <button
          onClick={() => { if (name.trim()) onSave(name.trim()); }}
          disabled={!name.trim()}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40
            text-black font-bold py-2.5 rounded-xl text-sm transition-all">
          Συνέχεια →
        </button>
      </div>
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────
function ChatPanel({
  code,
  messages,
  onClose,
  viewerName,
  onSetViewerName,
}: {
  code: string;
  messages: ChatMessage[];
  onClose: () => void;
  viewerName: string | null;
  onSetViewerName: (name: string) => void;
}) {
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef             = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || sending || !viewerName) return;
    setSending(true);
    setText('');
    try {
      const msgRef = push(ref(rtdb, `friendly_rides/${code}/messages`));
      await set(msgRef, {
        uid:    'web-viewer',
        name:   viewerName,
        gender: 'M',
        text:   trimmed,
        ts:     Date.now(),
      });
    } catch (e) {
      console.error('Send error:', e);
    }
    setSending(false);
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Name modal — εμφανίζεται αν δεν έχει δοθεί όνομα */}
      {!viewerName && <NameModal onSave={onSetViewerName} />}
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3
        border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="text-white font-bold text-sm">Ομαδικό Chat</span>
          <span className="text-white/30 text-xs font-mono">{code}</span>
        </div>
        <button onClick={onClose}
          className="text-white/40 hover:text-white transition-colors text-xl leading-none">
          ×
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/20 text-sm text-center">
              Δεν υπάρχουν μηνύματα ακόμα.
            </p>
          </div>
        ) : messages.map(msg => {
          const isViewer = msg.uid === 'web-viewer' && msg.name === viewerName;
          const dt       = new Date(msg.ts);
          const time     = dt.toLocaleTimeString('el-GR', {
            hour: '2-digit', minute: '2-digit'
          });

          const bubbleBg = isViewer
            ? 'rgba(34,197,94,0.15)'
            : msg.gender === 'F'
              ? 'rgba(233,30,140,0.15)'
              : 'rgba(21,101,192,0.15)';

          const borderColor = isViewer
            ? 'rgba(34,197,94,0.4)'
            : msg.gender === 'F'
              ? 'rgba(233,30,140,0.4)'
              : 'rgba(21,101,192,0.4)';

          const nameColor = isViewer ? '#22c55e'
            : msg.gender === 'F' ? '#E91E8C' : '#06b6d4';

          return (
            <div key={msg.id}
              className={`flex ${isViewer ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isViewer && (
                <div className="w-6 h-6 rounded shrink-0 flex items-center justify-center text-xs font-bold text-white mt-1"
                  style={{ background: msg.gender === 'F' ? '#E91E8C' : '#1565C0' }}>
                  {msg.gender === 'F' ? '♀' : '♂'}
                </div>
              )}
              <div className="max-w-[75%]">
                {!isViewer && (
                  <p className="text-xs font-bold mb-0.5" style={{ color: nameColor }}>
                    {msg.name}
                  </p>
                )}
                <div className="rounded-2xl px-3 py-2 text-sm text-white"
                  style={{ background: bubbleBg, border: `1px solid ${borderColor}`,
                    borderBottomLeftRadius: isViewer ? 16 : 4,
                    borderBottomRightRadius: isViewer ? 4 : 16 }}>
                  {msg.text}
                </div>
                <p className="text-white/30 text-xs mt-0.5 px-1"
                  style={{ textAlign: isViewer ? 'right' : 'left' }}>
                  {time}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-white/10 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Γράψε μήνυμα..."
          className="flex-1 bg-white/5 border border-white/15 text-white rounded-full
            px-4 py-2 text-sm focus:outline-none focus:border-green-500/60
            placeholder-white/25"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !text.trim()}
          className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-400
            disabled:opacity-40 flex items-center justify-center transition-all shrink-0">
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FriendlyRidePage() {
  const params  = useParams();
  const code    = (params.code as string)?.toUpperCase();

  const [riders, setRiders]               = useState<Rider[]>([]);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [lastUpdate, setLastUpdate]       = useState<Date | null>(null);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [notFound, setNotFound]           = useState(false);
  const [rideStartTime, setRideStartTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime]     = useState(new Date());
  const [showChat, setShowChat]           = useState(false);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [lastSeenTs, setLastSeenTs]       = useState(Date.now());
  const [viewerName, setViewerName]       = useState<string | null>(null);

  // Φόρτωσε αποθηκευμένο όνομα από localStorage
  useEffect(() => {
    const saved = localStorage.getItem('friendly_viewer_name');
    if (saved) setViewerName(saved);
  }, []);

  function handleSetViewerName(name: string) {
    setViewerName(name);
    localStorage.setItem('friendly_viewer_name', name);
  }

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Ride start time
  useEffect(() => {
    if (!code) return;
    get(ref(rtdb, `friendly_rides/${code}/created_at`)).then(snap => {
      if (snap.exists()) setRideStartTime(new Date(snap.val()));
    });
  }, [code]);

  // Riders listener
  useEffect(() => {
    if (!code) return;
    const participantsRef = ref(rtdb, `friendly_rides/${code}/participants`);
    onValue(participantsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setRiders([]); setNotFound(true); return; }
      setNotFound(false);
      const list: Rider[] = Object.entries(data)
        .filter(([, val]: [string, any]) => val.status !== 'left')
        .map(([key, val]: [string, any]) => ({
          id:        key,
          fullName:  val.fullName ?? key,
          status:    val.status ?? 'active',
          lat:       parseFloat(val.lat ?? '0') || 0,
          lng:       parseFloat(val.lng ?? '0') || 0,
          speed:     val.speed ?? '0',
          avgSpeed:  val.avg_speed ?? '0',
          currentKm: val.current_km ?? '0',
          timestamp: val.timestamp ?? 0,
          gender:    val.gender ?? 'M',
        }));
      setRiders(list);
      setLastUpdate(new Date());
    });
    return () => off(participantsRef);
  }, [code]);

  // Messages listener
  useEffect(() => {
    if (!code) return;
    const messagesRef = ref(rtdb, `friendly_rides/${code}/messages`);
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setMessages([]); return; }
      const list: ChatMessage[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id:     key,
          uid:    val.uid ?? '',
          name:   val.name ?? 'Αναβάτης',
          gender: val.gender ?? 'M',
          text:   val.text ?? '',
          ts:     val.ts ?? 0,
        }))
        .sort((a, b) => a.ts - b.ts);
      setMessages(list);

      // Badge count — μηνύματα μετά το lastSeenTs
      if (!showChat) {
        const newCount = list.filter(m => m.ts > lastSeenTs).length;
        setUnreadCount(newCount);
      }
    });
    return () => off(messagesRef);
  }, [code, lastSeenTs, showChat]);

  // Μηδένισε badge όταν ανοίξει το chat
  function openChat() {
    setShowChat(true);
    setUnreadCount(0);
    setLastSeenTs(Date.now());
  }

  const activeRiders = riders.filter(r => r.lat !== 0);

  if (notFound && riders.length === 0) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🚴</div>
        <h1 className="text-white font-bold text-xl mb-2">Βόλτα δεν βρέθηκε</h1>
        <p className="text-white/40 text-sm mb-6">
          Δεν υπάρχει ενεργή φιλική βόλτα με κωδικό{' '}
          <span className="text-green-400 font-bold">{code}</span>.
        </p>
        <a href="/" className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
          ← Επιστροφή στην αρχική
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <span className="text-green-400 text-xs font-bold tracking-wider">LIVE</span>
          <h1 className="text-xl font-bold text-white">Φιλική Βόλτα 🚴‍♂️</h1>
          <span className="text-white/30 text-sm font-mono tracking-widest">{code}</span>
        </div>

        {/* MAP + CHAT LAYOUT */}
        <div className="flex gap-4 mb-6" style={{ height: '82vh' }}>

          {/* MAP */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 flex-1 min-w-0">
            <div className="absolute inset-0">
              <LiveMap
                gpxUrl=""
                controls={[]}
                riders={riders.map(r => ({ ...r, registryId: r.id }))}
                selectedRiderId={selectedRider}
                onRiderSelect={setSelectedRider}
                mapHeight="100%"
                riderLabelMode="friendly"
              />
            </div>

            {/* STAT CHIPS — top left */}
            <div className="absolute top-3 left-3 z-[1000] flex flex-wrap gap-2">
              <Chip value={activeRiders.length} label="🚴 Σε βόλτα" color="#22c55e" />
              <Chip value={riders.length}       label="👥 Σύνολο"   color="white"   />
            </div>

            {/* TIME INFO — top right */}
            <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5 items-end">
              <div style={{
                background: 'rgba(10,22,40,0.72)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
                padding: '5px 12px',
              }}>
                <span style={{ color: 'white', fontSize: 15, fontWeight: 'bold', fontFamily: 'monospace' }}>
                  🕐 {currentTime.toLocaleTimeString('el-GR', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </span>
              </div>
              {rideStartTime && (
                <div style={{
                  background: 'rgba(10,22,40,0.72)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
                  padding: '5px 12px',
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Έναρξη: </span>
                  <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {rideStartTime.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })}{' '}
                    {rideStartTime.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              {lastUpdate && (
                <div style={{
                  background: 'rgba(10,22,40,0.72)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
                  padding: '5px 12px',
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                    Ενημέρωση: {lastUpdate.toLocaleTimeString('el-GR', {
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* 💬 CHAT FLOATING BUTTON — bottom right */}
            <button
              onClick={openChat}
              className="absolute bottom-16 right-4 z-[1000] w-12 h-12 rounded-full
                flex items-center justify-center transition-all hover:brightness-110"
              style={{
                background: 'rgba(10,22,40,0.90)',
                border: `2px solid ${unreadCount > 0 ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
                boxShadow: unreadCount > 0
                  ? '0 0 12px rgba(34,197,94,0.4)' : '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full
                  bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* CHAT PANEL — slide in από δεξιά */}
          {showChat && (
            <div className="w-80 shrink-0 bg-white/5 border border-white/10
              rounded-2xl overflow-hidden flex flex-col">
              <ChatPanel
                code={code}
                messages={messages}
                onClose={() => setShowChat(false)}
                viewerName={viewerName}
                onSetViewerName={handleSetViewerName}
              />
            </div>
          )}
        </div>

        {/* RIDERS LIST */}
        {riders.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">Αναβάτες</h2>
            </div>
            <div className="divide-y divide-white/5">
              {riders
                .sort((a, b) => parseFloat(b.currentKm) - parseFloat(a.currentKm))
                .map(rider => {
                  const mins = rider.timestamp
                    ? Math.floor((Date.now() - rider.timestamp) / 60000) : null;
                  return (
                    <div key={rider.id}
                      onClick={() => setSelectedRider(
                        selectedRider === rider.id ? null : rider.id)}
                      className={`px-6 py-4 flex items-center gap-4 cursor-pointer
                        hover:bg-white/5 transition-colors ${
                        selectedRider === rider.id ? 'bg-green-500/10' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center
                        justify-center shrink-0">
                        <span className="text-sm">
                          {rider.gender === 'F' ? '👩' : '👨'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {rider.fullName}
                        </p>
                        <p className="text-xs text-green-400">🚴 Σε βόλτα</p>
                      </div>
                      <div className="flex gap-4 text-right shrink-0">
                        {rider.currentKm !== '0' && (
                          <div>
                            <div className="text-white text-sm font-bold">
                              {parseFloat(rider.currentKm).toFixed(1)}km
                            </div>
                            <div className="text-white/30 text-xs">διανυθείσα</div>
                          </div>
                        )}
                        {rider.avgSpeed !== '0' && (
                          <div>
                            <div className="text-cyan-400 text-sm font-bold">
                              {parseFloat(rider.avgSpeed).toFixed(1)}
                            </div>
                            <div className="text-white/30 text-xs">km/h μ.ο.</div>
                          </div>
                        )}
                        {mins !== null && (
                          <div>
                            <div className={`text-sm font-bold ${
                              mins > 5 ? 'text-red-400' : 'text-green-400'}`}>
                              {mins < 1 ? 'Τώρα' : `${mins}λ`}
                            </div>
                            <div className="text-white/30 text-xs">σήμα</div>
                          </div>
                        )}
                      </div>
                      {rider.lat !== 0 && (
                        <div className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${
                          selectedRider === rider.id
                            ? 'border-green-500 text-green-400 bg-green-500/10'
                            : 'border-white/20 text-white/30'}`}>
                          📍
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {riders.length === 0 && !notFound && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🚴</div>
            <p className="text-white/30">
              Αναμονή για αναβάτες να ενωθούν στη βόλτα...
            </p>
          </div>
        )}

        <p className="text-white/20 text-xs text-center mt-6">
          Φιλική Βόλτα · {code} · Greek Brevets Tracker
        </p>
      </div>
    </div>
  );
}
