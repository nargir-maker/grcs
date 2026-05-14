'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface BrevetMapProps {
  gpxUrl: string;
  startCoords?: string;
  finishCoords?: string;
  controls?: { km: number; name: string; lat: number; lng: number }[];
}

export default function BrevetMap({
  gpxUrl,
  startCoords,
  finishCoords,
  controls = [],
}: BrevetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Invalidate map size whenever fullscreen changes so Leaflet redraws tiles
useEffect(() => {
  if (!mapInstanceRef.current) return;
  const t = setTimeout(() => {
    const map = mapInstanceRef.current;
    map.invalidateSize();
    // Re-enable scroll zoom in fullscreen, disable when not
    if (isFullscreen) {
      map.scrollWheelZoom.enable();
    } else {
      map.scrollWheelZoom.disable();
    }
    // Force a bounds refresh so tiles repaint
    const bounds = map.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], animate: false });
    }
  }, 350);
  return () => clearTimeout(t);
}, [isFullscreen]);

  // Close fullscreen with Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(f => !f);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function initMap() {
      const L = (await import('leaflet')).default;

      if ((mapRef.current as any)._leaflet_id) {
        try { mapInstanceRef.current?.remove(); } catch {}
        delete (mapRef.current as any)._leaflet_id;
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        zoomControl: true,
        scrollWheelZoom: false,
      });

      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      try {
        const response = await fetch(gpxUrl);
        const gpxText = await response.text();
        const parser = new DOMParser();
        const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
        const trackPoints = gpxDoc.querySelectorAll('trkpt');

        const coords: [number, number][] = [];
        trackPoints.forEach((pt) => {
          const lat = parseFloat(pt.getAttribute('lat') ?? '0');
          const lng = parseFloat(pt.getAttribute('lon') ?? '0');
          if (lat && lng) coords.push([lat, lng]);
        });

        if (coords.length === 0) {
          map.setView([38.0, 23.7], 7);
          return;
        }

        const polyline = L.polyline(coords, {
          color: '#ff3d02',
          weight: 3,
          opacity: 0.9,
        }).addTo(map);

        map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

        // Start marker
        const startIcon = L.divIcon({
          html: `<div style="
            background:#22c55e;color:white;font-size:11px;
            font-weight:bold;padding:3px 7px;border-radius:12px;
            white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);
          ">🟢 START</div>`,
          className: '',
          iconAnchor: [30, 10],
        });
        L.marker(coords[0], { icon: startIcon })
          .addTo(map)
          .bindPopup('Αφετηρία');

        // Finish marker
        const finishIcon = L.divIcon({
          html: `<div style="
            background:#f59e0b;color:white;font-size:11px;
            font-weight:bold;padding:3px 7px;border-radius:12px;
            white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);
          ">🏁 FINISH</div>`,
          className: '',
          iconAnchor: [35, 10],
        });
        L.marker(coords[coords.length - 1], { icon: finishIcon })
          .addTo(map)
          .bindPopup('Τερματισμός');

        // CP markers
        controls.forEach((cp, i) => {
          if (!cp.lat || !cp.lng) return;
          const cpIcon = L.divIcon({
            html: `<div style="
              background:#0A1628;color:#06b6d4;font-size:10px;
              font-weight:bold;padding:3px 7px;border-radius:12px;
              border:1px solid #06b6d4;white-space:nowrap;
              box-shadow:0 2px 4px rgba(0,0,0,0.3);
            ">CP${i + 1}</div>`,
            className: '',
            iconAnchor: [15, 10],
          });
          L.marker([cp.lat, cp.lng], { icon: cpIcon })
            .addTo(map)
            .bindPopup(`CP${i + 1}: ${cp.name}`);
        });

      } catch (e) {
        console.error('GPX load error:', e);
        map.setView([38.0, 23.7], 7);
      }
    }

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [gpxUrl]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />

      {/* ── Fullscreen overlay backdrop ───────────────────────────────── */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={toggleFullscreen}
        />
      )}

      {/* ── Map container ─────────────────────────────────────────────── */}
      <div
        className={`relative transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl'
            : 'relative'
        }`}
      >
        {/* Map tile */}
        <div
          ref={mapRef}
          style={{ height: isFullscreen ? '100%' : '400px', width: '100%' }}
          className="rounded-xl overflow-hidden border border-white/10"
        />

        {/* ── Fullscreen toggle button ───────────────────────────────── */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Κλείσιμο (Esc)' : 'Πλήρης οθόνη'}
          className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(10,22,40,0.85)',
            borderColor: 'rgba(6,182,212,0.4)',
            color: '#06b6d4',
          }}
        >
          {isFullscreen ? (
            // Compress icon
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
            </svg>
          ) : (
            // Expand icon
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
            </svg>
          )}
          {isFullscreen ? 'Κλείσιμο' : 'Πλήρης οθόνη'}
        </button>

        {/* Attribution — hidden in fullscreen to save space */}
        {!isFullscreen && (
          <p className="text-white/20 text-xs text-right mt-1">
            © OpenStreetMap contributors
          </p>
        )}
      </div>
    </>
  );
}
