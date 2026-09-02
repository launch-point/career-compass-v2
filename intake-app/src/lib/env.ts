// Central env access + mode detection. Server-only values must never be read
// from Client Components. `NEXT_PUBLIC_*` are the only browser-safe ones.

export const isProd = process.env.NODE_ENV === 'production';

/** True when a real Supabase project is configured. When false, the app runs in
 *  DEV MODE: filesystem-backed storage + cookie-based dev login (no emails sent).
 *  Dev mode is refused in production (see assertModeSafe). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Guard: dev mode (no Supabase) must never run in production. */
export function assertModeSafe(): void {
  if (isProd && !isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured but NODE_ENV=production. Refusing to run dev-mode storage/auth in production.',
    );
  }
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

/** Origin allowed to embed the app in an iframe (CSP frame-ancestors). */
export function missionControlOrigin(): string | null {
  return process.env.MISSION_CONTROL_ORIGIN ?? null;
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

export function webhookConfig(): { url: string | null; secret: string | null } {
  return {
    url: process.env.ORCHESTRATOR_WEBHOOK_URL || null,
    secret: process.env.CAREER_COMPASS_WEBHOOK_SECRET || null,
  };
}

export function sheetsConfig(): {
  sheetId: string | null;
  clientEmail: string | null;
  privateKey: string | null;
} {
  return {
    sheetId: process.env.MASTER_DATA_SHEET_ID || null,
    clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
    // Restore literal newlines that get escaped when the key is stored on one line.
    privateKey: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n') || null,
  };
}
