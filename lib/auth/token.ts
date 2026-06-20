/**
 * Access-token store. MEMORY ONLY.
 *
 * The access token is short-lived (~15 min); persistence across page reloads
 * is provided by silently calling `POST /api/auth/refresh`, which
 * authenticates via the HttpOnly refresh cookie that JavaScript can never
 * read. Closing the tab loses the in-memory token, but a single refresh
 * call on next boot brings the user right back — without ever exposing a
 * long-lived secret to JS-accessible storage.
 *
 * Previous design used sessionStorage to bridge tab reloads. The two-token
 * model gives a strictly better trade: the long-lived secret is invisible
 * to JS via HttpOnly, and the access token's 15-min TTL bounds any XSS
 * exfil window so tightly that persistence here would be pure UX overhead
 * with zero security benefit.
 */

let memoryToken: string | null = null;

export function setToken(token: string): void {
  memoryToken = token;
}

export function getToken(): string | null {
  return memoryToken;
}

export function clearToken(): void {
  memoryToken = null;
}

/** Test-only: reset module state. Not exported from the package boundary. */
export function __resetTokenForTests(): void {
  memoryToken = null;
}
