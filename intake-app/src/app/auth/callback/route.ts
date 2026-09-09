// Supabase magic-link callback: exchange the code for a session, then redirect
// home. (Prod path; unused in dev mode.)
//
// Every failure path here is reported, never swallowed. Supabase returns
// verify-step failures in the URL *fragment*, which the browser never sends to
// the server — so a fragment error arrives here as "no code, no error", which
// this route reports as `missing_code` rather than silently bouncing home.
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Redirect home with a machine-readable reason in the query string. */
function fail(request: Request, reason: string, detail?: string | null) {
  const to = new URL('/', request.url);
  to.searchParams.set('auth_error', reason);
  if (detail) to.searchParams.set('auth_error_detail', detail.slice(0, 200));
  return NextResponse.redirect(to);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const errorCode = url.searchParams.get('error_code');

  // Supabase put an error in the query string (rare; most land in the fragment).
  if (errorCode) {
    const description = url.searchParams.get('error_description');
    console.error('[auth/callback] verify failed', { errorCode, description });
    return fail(request, errorCode, description);
  }

  // No code and no error. Either the link's error was in the fragment, or this
  // route was reached without a magic link at all.
  if (!code) {
    console.error('[auth/callback] reached with no code and no query error', {
      search: url.search || '(empty)',
    });
    return fail(request, 'missing_code');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed', {
      name: error.name,
      status: error.status,
      message: error.message,
    });
    return fail(request, 'exchange_failed', error.message);
  }

  if (!data.session) {
    console.error('[auth/callback] exchange succeeded but returned no session');
    return fail(request, 'no_session');
  }

  return NextResponse.redirect(new URL('/', request.url));
}
