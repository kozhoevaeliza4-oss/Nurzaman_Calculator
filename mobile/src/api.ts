import * as SecureStore from 'expo-secure-store';

// Points at the deployed backend by default. Override for local dev by
// editing this constant (Expo env vars need an EXPO_PUBLIC_ prefix, but a
// single kindergarten app doesn't need the extra ceremony of env files).
export const API_BASE_URL = 'https://asyl-amanat-kms.onrender.com';

const TOKEN_KEY = 'kms_token';
const USER_KEY = 'kms_user';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  groupId: string | null;
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export async function setSession(token: string, user: AuthUser): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized');
  }
}

export class ApiError extends Error {}

// Every authenticated call goes through here. A 401 clears the stored
// session and throws UnauthorizedError so screens can bounce to Login
// without each of them re-implementing that check.
export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    await clearSession();
    throw new UnauthorizedError();
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(message || `Ошибка ${res.status}`);
  }

  return body as T;
}

export async function login(email: string, password: string): Promise<{ accessToken: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body?.message || 'Неверный email или пароль');
  }
  return body;
}

// Multipart upload (document files) needs its own call — no JSON body.
export async function apiUpload<T = unknown>(path: string, form: FormData): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Do NOT set Content-Type — fetch sets the multipart boundary itself.
    },
    body: form as unknown as BodyInit,
  });
  if (res.status === 401) {
    await clearSession();
    throw new UnauthorizedError();
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(message || `Ошибка ${res.status}`);
  }
  return body as T;
}

export function authHeader(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
