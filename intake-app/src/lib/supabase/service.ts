// Service-role Supabase client — SERVER ONLY. Bypasses RLS. Used by the store
// and submit pipeline. Never import into a Client Component.
import { createClient } from '@supabase/supabase-js';

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service client requires URL + service role key');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
