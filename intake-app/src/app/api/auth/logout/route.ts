import { cookies } from 'next/headers';
import { isSupabaseConfigured } from '@/lib/env';
import { DEV_EMAIL_COOKIE } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  const store = await cookies();
  store.delete(DEV_EMAIL_COOKIE);
  return Response.json({ ok: true });
}
