'use client';

import { useEffect } from 'react';

export default function AuthHandler() {
  useEffect(() => {
    // Close this popup window — Firebase handles the rest
    if (window.opener) {
      window.close();
    } else {
      window.location.href = '/';
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/50 text-sm">Σύνδεση...</p>
      </div>
    </div>
  );
}