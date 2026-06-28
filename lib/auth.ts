import type { PlayerProfile, User } from "./domain";

const STORAGE_KEY = "pimbas-auth-v1";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface SessionResponse extends AuthTokens {
  user: User;
}

type Listener = () => void;

function loadTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    return null;
  }
}

let tokens: AuthTokens | null = loadTokens();
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  if (typeof window === "undefined") return;
  if (tokens) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  else window.sessionStorage.removeItem(STORAGE_KEY);
}

export function getAccessToken(): string | null {
  return tokens?.accessToken ?? null;
}

export function setTokens(newTokens: AuthTokens) {
  tokens = newTokens;
  persist();
  emit();
}

export function clearTokens() {
  tokens = null;
  persist();
  emit();
}

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (res.status === 401 && token) {
    // Try refresh
    try {
      const refreshRes = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens?.refreshToken }),
      });
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        setTokens({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
        });
        // retry original
        return apiFetch<T>(path, init);
      }
    } catch {
      // Refresh failures fall through to clearing the local session.
    }
    clearTokens();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function fetchMe(): Promise<{
  user: User;
  playerProfile?: PlayerProfile;
}> {
  if (!getAccessToken()) {
    return { user: { id: "", name: "", email: "" } };
  }
  try {
    return await apiFetch("/api/v1/me");
  } catch {
    return { user: { id: "", name: "", email: "" } };
  }
}

async function authRequest(path: string, body: Record<string, string>): Promise<SessionResponse> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// Snapshot and subscribe for external store (AuthContext)
export async function login(email: string, password: string) {
  const session = await authRequest("/api/v1/auth/login", {
    email,
    password,
  });
  setTokens({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
}

export async function signup(email: string, password: string, name: string) {
  const session = await authRequest("/api/v1/auth/signup", {
    email,
    password,
    name,
  });
  setTokens({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
}

export function logout() {
  clearTokens();
}

export function getAuthSnapshot() {
  return tokens;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
