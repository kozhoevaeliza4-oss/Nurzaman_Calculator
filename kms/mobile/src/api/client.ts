import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// expo-secure-store has no web implementation; AsyncStorage covers the web
// preview (and any future web deployment), native platforms keep Keychain/
// Keystore-backed secure storage.
const storage = Platform.OS === 'web'
  ? { getItem: AsyncStorage.getItem, setItem: AsyncStorage.setItem, deleteItem: AsyncStorage.removeItem }
  : { getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync, deleteItem: SecureStore.deleteItemAsync };

// Points at the deployed KMS backend by default. Change via EXPO_PUBLIC_API_URL
// at build time (app.config) if a different environment is needed.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://asyl-amanat-kms.onrender.com';

const TOKEN_KEY = 'kms_token';
const USER_KEY = 'kms_user';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'director' | 'admin' | 'accountant' | 'teacher' | 'medic' | 'parent';
  groupId: string | null;
};

export async function getToken(): Promise<string | null> {
  return storage.getItem(TOKEN_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await storage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setSession(token: string, user: AuthUser): Promise<void> {
  await storage.setItem(TOKEN_KEY, token);
  await storage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  await storage.deleteItem(TOKEN_KEY);
  await storage.deleteItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Every authenticated call goes through here. A 401 clears the stored
// session so the caller can redirect to login instead of showing stale data.
export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    await clearSession();
    throw new ApiError('unauthorized', 401);
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(message || `Ошибка ${res.status}`, res.status);
  }
  return body as T;
}

export async function login(email: string, password: string): Promise<{ accessToken: string; user: AuthUser }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.message || 'Неверный email или пароль', res.status);
  }
  return body;
}
