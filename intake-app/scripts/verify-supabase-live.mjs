// Live Supabase verification. Run with:
//   node --env-file=.env.local scripts/verify-supabase-live.mjs
// Exercises the REAL database (not the dev filesystem store) using the same
// table/column operations SupabaseStore performs. Prints only data that is safe
// to show (uuids, statuses, error codes) — NEVER any credential value.
// Cleans up its own test rows at the end.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const svc = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const EMAIL = 'supabase-live-test@example.com';

// --- build a realistic answers object from the real config ---
const functions = JSON.parse(readFileSync(resolve(__dirname, '../src/config/functions.json'), 'utf8'));
const values = JSON.parse(readFileSync(resolve(__dirname, '../src/config/values.json'), 'utf8'));
const fnIds = functions.categories.flatMap((c) => c.items.map((i) => i.id));
const valIds = values.values.map((v) => v.id);
const fnItems = {};
fnIds.slice(0, 12).forEach((id, i) => {
  fnItems[id] = {
    categoryId: functions.categories.find((c) => c.items.some((it) => it.id === id)).id,
    checked: true, rating: 5, top10: i < 10, top5: i < 5,
  };
});
const valItems = {};
valIds.slice(0, 10).forEach((id, i) => { valItems[id] = { checked: true, top10: true, top5: i < 5 }; });
const answers = {
  functions: { items: fnItems, categoryOther: {} },
  values: { items: valItems, other: '' },
  requirements: {
    currentJobTitle: 'Live Test Pastor', salaryMin: 91000, salaryPeriod: 'annual',
    maxTravelDaysPerMonth: '4', location: 'Denver, CO', officePreference: 'Remote',
    advancedDegrees: 'MDiv', yearsInWorkforce: '15', otherNotes: 'live db test',
  },
  stories: [
    { moment: 's1', involvement: 'i1', actions: 'a1', enjoyment: 'e1' },
    { moment: 's2', involvement: 'i2', actions: 'a2', enjoyment: 'e2' },
    { moment: 's3', involvement: 'i3', actions: 'a3', enjoyment: 'e3' },
    { moment: '', involvement: '', actions: '', enjoyment: '' },
  ],
};

function line(label, val) { console.log(`  ${label}: ${val}`); }

// --- 0. clean any prior test data (cascade deletes the submission) ---
{
  const { data } = await svc.from('clients').select('id').eq('email', EMAIL).maybeSingle();
  if (data) await svc.from('clients').delete().eq('id', data.id);
}

console.log('== 1. Create client + draft submission (real INSERTs) ==');
const { data: client, error: cErr } = await svc.from('clients').insert({ email: EMAIL }).select('id,email,created_at').single();
if (cErr) { console.log('  client insert FAILED:', cErr.code, cErr.message); process.exit(1); }
line('client.id', client.id);
const { data: draft, error: dErr } = await svc.from('intake_submissions').insert({ client_id: client.id, answers: {} }).select('*').single();
if (dErr) { console.log('  submission insert FAILED:', dErr.code, dErr.message); process.exit(1); }
line('submission.id', draft.id);
line('initial status/locked', `${draft.status} / ${draft.locked}`);
const draftUpdatedAt = draft.updated_at;

console.log('\n== 2. saveDraft: write answers (jsonb) + current_step_id ==');
const { error: upErr } = await svc.from('intake_submissions').update({ answers, current_step_id: 'review' }).eq('id', draft.id);
line('update error', upErr ? `${upErr.code} ${upErr.message}` : 'none');

console.log('\n== 3. markSubmitted: status=submitted, locked=true ==');
const { data: submitted, error: sErr } = await svc.from('intake_submissions')
  .update({ status: 'submitted', locked: true, submitted_at: new Date().toISOString() })
  .eq('id', draft.id).select('*').single();
if (sErr) { console.log('  submit FAILED:', sErr.code, sErr.message); }

console.log('\n== 4. Read the row back via service_role (proves it landed) ==');
const { data: row } = await svc.from('intake_submissions')
  .select('id,client_id,status,locked,submitted_at,current_step_id,created_at,updated_at,answers').eq('id', draft.id).single();
line('status', row.status);
line('locked', row.locked);
line('submitted_at', row.submitted_at);
line('current_step_id', row.current_step_id);
line('answers.requirements.salaryMin (jsonb persisted)', row.answers?.requirements?.salaryMin);
line('answers top5 function count', Object.values(row.answers?.functions?.items ?? {}).filter((i) => i.top5).length);
line('answers story keys present', row.answers?.stories?.length);

console.log('\n== 5a. updated_at trigger fired on UPDATE? ==');
line('draft.updated_at != submitted.updated_at', String(draftUpdatedAt !== row.updated_at));

console.log('\n== 5b. unique(client_id) index enforced? (expect a duplicate-key error) ==');
const dup = await svc.from('intake_submissions').insert({ client_id: client.id, answers: {} });
line('second submission for same client', dup.error ? `BLOCKED code=${dup.error.code}` : 'ALLOWED (index MISSING!)');

console.log('\n== 6. RLS enforced? unauthorized reads/writes with the ANON key ==');
const ac = await anon.from('clients').select('*');
const as = await anon.from('intake_submissions').select('*');
const ai = await anon.from('clients').insert({ email: 'rls-attack@example.com' });
line('anon SELECT clients', ac.error ? `error ${ac.error.code}` : `${ac.data.length} rows visible`);
line('anon SELECT intake_submissions', as.error ? `error ${as.error.code}` : `${as.data.length} rows visible`);
line('anon INSERT clients', ai.error ? `BLOCKED code=${ai.error.code}` : 'ALLOWED (RLS NOT enforced!)');
console.log('  (service_role saw the row above; anon seeing 0 rows / blocked insert = RLS working)');

console.log('\n== 7. cleanup test rows ==');
const del = await svc.from('clients').delete().eq('id', client.id);
line('deleted test client (+cascade submission)', del.error ? del.error.message : 'ok');
// Safety net: if RLS was OFF, the anon insert above would have created this row.
// Remove it unconditionally so nothing is ever left behind.
const del2 = await svc.from('clients').delete().eq('email', 'rls-attack@example.com');
line('cleaned up any rls-attack test row', del2.error ? del2.error.message : 'ok');
