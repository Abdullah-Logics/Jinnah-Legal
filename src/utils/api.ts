// src/utils/api.ts
// Thin API client — wraps fetch, handles auth headers + errors

import { useStore } from '../store/useStore';

const BASE = import.meta.env.DEV
  ? 'http://localhost:3001'
  : import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
  try {
    const s = localStorage.getItem('jinnah-legal-storage');
    if (!s) return null;
    return JSON.parse(s)?.state?.token ?? null;
  } catch { return null; }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    // Expired/invalid token: reset auth so the app returns to the login
    // screen instead of silently rendering empty data everywhere.
    if (res.status === 401 && token) {
      try { useStore.getState().logout(); } catch {}
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export default api;
