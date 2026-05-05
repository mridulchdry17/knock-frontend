/**
 * Bearer token store.
 *
 * In-memory is the source of truth during a session. sessionStorage is the
 * persistence layer — survives reload, dies on tab close. That's the
 * intentional XSS exposure window per the locked spec.
 */

const STORAGE_KEY = "knock.token";

let memoryToken: string | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function setToken(token: string): void {
  memoryToken = token;
  if (isBrowser()) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, token);
    } catch {
      // sessionStorage may throw in private mode / quota. In-memory still holds.
    }
  }
}

export function getToken(): string | null {
  if (memoryToken) return memoryToken;
  if (!isBrowser()) return null;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) memoryToken = stored;
    return stored;
  } catch {
    return null;
  }
}

export function clearToken(): void {
  memoryToken = null;
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Test-only: reset module state. Not exported from package boundary. */
export function __resetTokenForTests(): void {
  memoryToken = null;
}
