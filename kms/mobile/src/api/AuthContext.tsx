import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthUser, clearSession, getStoredUser, getToken, login as apiLogin, setSession } from './client';

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const storedUser = await getStoredUser();
      if (token && storedUser) setUser(storedUser);
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await apiLogin(email, password);
      await setSession(res.accessToken, res.user);
      setUser(res.user);
    } catch (e: any) {
      setError(e.message || 'Не удалось войти');
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
