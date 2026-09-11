import { useCallback } from 'react';
import { api, apiUpload, UnauthorizedError } from '../api';
import { useAuth } from '../context/AuthContext';

// Wraps api()/apiUpload() so every screen gets the same behavior on a 401:
// drop back to the login screen instead of rendering a broken view.
export function useAuthedApi() {
  const { forceLogout } = useAuth();

  const request = useCallback(
    async <T = unknown>(path: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      try {
        return await api<T>(path, options);
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          await forceLogout();
        }
        throw err;
      }
    },
    [forceLogout],
  );

  const upload = useCallback(
    async <T = unknown>(path: string, form: FormData): Promise<T> => {
      try {
        return await apiUpload<T>(path, form);
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          await forceLogout();
        }
        throw err;
      }
    },
    [forceLogout],
  );

  return { request, upload };
}
