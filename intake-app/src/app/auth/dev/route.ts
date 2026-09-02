// Dev "magic link" target — sets the dev session cookie, then redirects home.
// Simulates clicking an emailed link (open it in any browser to resume as that
// email). Refused when Supabase is configured or in production.
import { NextResponse } from 'next/server';
import { isProd, isSupabaseConfigured } from '@/lib/env';
import { DEV_EMAIL_COOKIE, isValidEmail } from '@/lib/auth';

export async function GET(request: Request) {
  if (isSupabaseConfigured() || isProd) return new Response('Not found', { status: 404 });
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') ?? '').trim().toLowerCase();
  if (!isValidEmail(email)) return new Response('missing or invalid email', { status: 400 });

  const res = NextResponse.redirect(new URL('/', request.url));
  res.cookies.set(DEV_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
