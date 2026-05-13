'use client';

import { createContext, useContext } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

interface AuthContextType {
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const signInWithGoogle = async () => {
    await signIn('google');
  };

  const logout = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      loading: status === 'loading',
      signInWithGoogle,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);