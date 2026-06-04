'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export interface OrganizerSession {
  role: 'organizer';
  clubId: string;
  clubNameGr: string;
  clubNameEn: string;
  clubFullNameGr: string;
  loginAt: string;
}

interface AuthContextType {
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  organizer: OrganizerSession | null;
  isOrganizer: boolean;
  organizerLoaded: boolean;   // true once localStorage has been checked
  logoutOrganizer: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  organizer: null,
  isOrganizer: false,
  organizerLoaded: false,
  logoutOrganizer: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [organizer, setOrganizer]           = useState<OrganizerSession | null>(null);
  const [organizerLoaded, setOrganizerLoaded] = useState(false);

  const signInWithGoogle = async () => {
     await signIn('google', { callbackUrl: '/profile' }, { prompt: 'select_account' });
  };

  const logout = async () => {
     await signOut({ callbackUrl: '/' });
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('organizer_session');
      if (stored) {
        const parsed = JSON.parse(stored) as OrganizerSession;
        if (parsed.role === 'organizer' && parsed.clubId) {
          setOrganizer(parsed);
        }
      }
    } catch {
      localStorage.removeItem('organizer_session');
    } finally {
      setOrganizerLoaded(true);
    }
  }, []);

  const logoutOrganizer = () => {
    localStorage.removeItem('organizer_session');
    setOrganizer(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      loading: status === 'loading',
      signInWithGoogle,
      logout,
      organizer,
      isOrganizer: organizer !== null,
      organizerLoaded,
      logoutOrganizer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);