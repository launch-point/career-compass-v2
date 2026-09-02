// Auth resolution — SERVER ONLY.
// Prod: the authenticated email comes from the Supabase session.
// Dev:  the email comes from an httpOnly cookie set by the dev magic-link route.
import { cookies } from 'next/headers';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const DEV_EMAIL_COOKIE = 'cc_dev_email';

/** The signed-in client's email, or null if not authenticated. */
export async function getSessionEmail(): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.email?.toLowerCase() ?? null;
  }
  const store = await cookies();
  const v = store.get(DEV_EMAIL_COOKIE)?.value;
  return v ? v.toLowerCase() : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}
