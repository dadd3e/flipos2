export interface EtsyOAuthSession {
  codeVerifier: string;
  apiKey: string;
  sharedSecret?: string;
  shopName?: string;
  redirectUri: string;
  createdAt: number;
}

// Global declaration to survive Next.js module reloads in dev
declare global {
  var __etsyOAuthSessions: Map<string, EtsyOAuthSession> | undefined;
}

if (!globalThis.__etsyOAuthSessions) {
  globalThis.__etsyOAuthSessions = new Map<string, EtsyOAuthSession>();
}

export const etsyOAuthSessions = globalThis.__etsyOAuthSessions;

// Clean up sessions older than 15 minutes
export function cleanOldSessions() {
  const now = Date.now();
  const maxAge = 15 * 60 * 1000;
  for (const [state, session] of etsyOAuthSessions.entries()) {
    if (now - session.createdAt > maxAge) {
      etsyOAuthSessions.delete(state);
    }
  }
}
