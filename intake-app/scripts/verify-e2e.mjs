// End-to-end pipeline check against the running dev server (dev-cookie auth).
// GET draft -> PUT a valid answer set -> POST submit -> print server responses.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = process.env.BASE || 'http://localhost:3000';
const email = process.env.EMAIL || 'verify@example.com';
const cookie = `cc_dev_email=${encodeURIComponent(email)}`;

const functions = JSON.parse(readFileSync(resolve(__dirname, '../src/config/functions.json'), 'utf8'));
const values = JSON.parse(readFileSync(resolve(__dirname, '../src/config/values.json'), 'utf8'));

const fnIds = functions.categories.flatMap((c) => c.items.map((i) => i.id));
const valIds = values.values.map((v) => v.id);

// 12 functions checked + rated 5; top10 = first 10; top5 = first 5.
const chosenFns = fnIds.slice(0, 12);
const fnItems = {};
chosenFns.forEach((id, idx) => {
  fnItems[id] = {
    categoryId: functions.categories.find((c) => c.items.some((it) => it.id === id)).id,
    checked: true,
    rating: 5,
    top10: idx < 10,
    top5: idx < 5,
  };
});

// 10 values checked; top10 = those 10; top5 = first 5.
const chosenVals = valIds.slice(0, 10);
const valItems = {};
chosenVals.forEach((id, idx) => {
  valItems[id] = { checked: true, top10: true, top5: idx < 5 };
});

const answers = {
  functions: { items: fnItems, categoryOther: { [functions.categories[0].id]: 'Facilitated a strategy offsite' } },
  values: { items: valItems, other: 'Stewardship' },
  requirements: {
    currentJobTitle: 'Executive Pastor',
    salaryMin: 85000,
    salaryPeriod: 'annual',
    maxTravelDaysPerMonth: '5',
    location: 'Nashville, TN',
    officePreference: 'Hybrid',
    advancedDegrees: 'MBA',
    yearsInWorkforce: '18',
    otherNotes: 'Prefer mission-aligned orgs.',
  },
  stories: [
    { moment: 'Led a church-wide restructure', involvement: 'Board asked me to', actions: 'Built the plan, aligned staff', enjoyment: 'Bringing clarity to chaos' },
    { moment: 'Launched a volunteer program', involvement: 'Saw a gap', actions: 'Recruited and trained 40 leaders', enjoyment: 'Developing people' },
    { moment: 'Turned around a failing ministry', involvement: 'Volunteered to help', actions: 'Rebuilt systems and morale', enjoyment: 'Seeing measurable change' },
    { moment: '', involvement: '', actions: '', enjoyment: '' },
  ],
};

async function j(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { cookie, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

console.log('== GET /api/draft (creates draft) ==');
const g = await j('GET', '/api/draft');
console.log('status', g.status, '| status field:', g.body?.submission?.status, '| clientId:', g.body?.submission?.clientId);

console.log('\n== PUT /api/draft (save valid answers) ==');
const p = await j('PUT', '/api/draft', { answers, currentStepId: 'review' });
console.log('status', p.status, '| saved status:', p.body?.submission?.status);

console.log('\n== POST /api/submit ==');
const s = await j('POST', '/api/submit', { answers });
console.log('status', s.status);
console.log('submission.status:', s.body?.submission?.status, '| locked:', s.body?.submission?.locked);
console.log('sheetsWrittenAt:', s.body?.submission?.sheetsWrittenAt);
console.log('webhookDeliveredAt:', s.body?.submission?.webhookDeliveredAt);
console.log('sideEffects:', JSON.stringify(s.body?.sideEffects));

console.log('\n== gate check: submit with too-few (fresh email) ==');
const cookie2 = 'cc_dev_email=gatecheck@example.com';
await fetch(base + '/api/draft', { headers: { cookie: cookie2 } });
const bad = await fetch(base + '/api/submit', { method: 'POST', headers: { cookie: cookie2, 'content-type': 'application/json' }, body: JSON.stringify({ answers: {} }) });
console.log('status', bad.status, '|', JSON.stringify(await bad.json()));

console.log('\n== locked edit check: PUT after submit (should 423) ==');
const locked = await j('PUT', '/api/draft', { answers, currentStepId: 'review' });
console.log('status', locked.status, '| error:', locked.body?.error);

console.log('\n== duplicate submit check: POST again (idempotent) ==');
const dup = await j('POST', '/api/submit', { answers });
console.log('status', dup.status, '| alreadySubmitted:', dup.body?.alreadySubmitted);
