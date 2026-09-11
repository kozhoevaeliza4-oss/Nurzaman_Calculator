import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser, clearSession, getStoredUser, getToken, login as apiLogin, setSession } from '../api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { accessToken, user: loggedInUser } = await apiLogin(email, password);
      await setSession(accessToken, loggedInUser);
      setUser(loggedInUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  // Called by screens when an API call throws UnauthorizedError.
  const forceLogout = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, login, logout, forceLogout }),
    [user, loading, error, login, logout, forceLogout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue & { forceLogout: () => Promise<void> } {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx as AuthContextValue & { forceLogout: () => Promise<void> };
}
