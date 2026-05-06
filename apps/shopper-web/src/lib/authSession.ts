export const AUTH_STORAGE_KEY = "united-pharmacies-auth-session-v1";

type SessionLikeRecord = {
  sessionToken?: string;
  sessionExpiresAt?: string;
  [key: string]: unknown;
};

export function isSessionExpired(sessionExpiresAt?: string | null) {
  if (!sessionExpiresAt) {
    return false;
  }

  const expiresAt = new Date(sessionExpiresAt);
  return Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now();
}

export function readStoredAuthSession<T extends SessionLikeRecord>() {
  if (typeof window === "undefined") {
    return null as T | null;
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!rawValue) {
      return null as T | null;
    }

    const parsed = JSON.parse(rawValue) as T;

    if (isSessionExpired(parsed.sessionExpiresAt)) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null as T | null;
    }

    return parsed;
  } catch {
    return null as T | null;
  }
}

export function persistAuthSession<T extends SessionLikeRecord>(session: T | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session || isSessionExpired(session.sessionExpiresAt)) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getStoredSessionToken() {
  const session = readStoredAuthSession<SessionLikeRecord>();
  return session?.sessionToken?.trim() || "";
}
