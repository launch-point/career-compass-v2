// Dev-mode "send magic link": returns a clickable dev link instead of emailing.
// Refused when Supabase is configured or in production.
import { appUrl, isProd, isSupabaseConfigured } from '@/lib/env';
import { isValidEmail } from '@/lib/auth';

export async function POST(request: Request) {
  if (isSupabaseConfigured() || isProd) {
    return Response.json({ error: 'not available' }, { status: 404 });
  }
  let email = '';
  try {
    email = ((await request.json()) as { email?: string }).email ?? '';
  } catch {
    /* ignore */
  }
  if (!isValidEmail(email)) return Response.json({ error: 'invalid email' }, { status: 400 });

  const link = new URL('/auth/dev', appUrl());
  link.searchParams.set('email', email.trim().toLowerCase());
  return Response.json({ mode: 'dev', devLink: link.toString() });
}
