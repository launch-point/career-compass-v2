// Live Supabase connectivity probe. Run with:
//   node --env-file=.env.local scripts/supabase-check.mjs
// Prints ONLY status/booleans/error codes — never any credential value.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log('env: missing URL or service role key');
  process.exit(1);
}
// Reachability without leaking the host: show only the ref subdomain shape.
let host = 'unknown';
try {
  host = new URL(url).hostname.replace(/^([^.]+)\..*/, '$1***.supabase.co');
} catch {}
console.log('project host (masked):', host);

const db = createClient(url, key, { auth: { persistSession: false } });

for (const table of ['clients', 'intake_submissions']) {
  const res = await db.from(table).select('*', { count: 'exact', head: true });
  if (res.error) {
    console.log(`table ${table}: NOT reachable/exists — code=${res.error.code ?? '?'} msg="${res.error.message}"`);
  } else {
    console.log(`table ${table}: EXISTS (row count=${res.count})`);
  }
}
