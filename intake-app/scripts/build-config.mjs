// Build /src/config/functions.json and /src/config/values.json from the
// confirmed source at docs/functions-values-source.md.
//
// This script is the single point of transformation from the human-authored
// source to the app config. Re-run it if the source changes:
//   node scripts/build-config.mjs
//
// It parses the markdown structure deterministically (no transcription by
// hand) and asserts the expected counts (19 categories, 151 function items,
// 94 values) so drift is caught immediately.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const SRC = resolve(repoRoot, 'docs/functions-values-source.md');
const OUT_DIR = resolve(__dirname, '..', 'src/config');

const EXPECTED = { categories: 19, functionItems: 151, values: 94 };

// --- helpers ---------------------------------------------------------------

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
}

function assert(cond, msg) {
  if (!cond) {
    console.error('BUILD FAILED:', msg);
    process.exit(1);
  }
}

// --- parse -----------------------------------------------------------------

const raw = readFileSync(SRC, 'utf8');
const lines = raw.split('\n');

// Split into the FUNCTIONS section and the VALUES section.
const valuesHeaderIdx = lines.findIndex((l) => /^##\s+VALUES/i.test(l));
assert(valuesHeaderIdx !== -1, 'could not find "## VALUES" header');
const funcLines = lines.slice(0, valuesHeaderIdx);
const valueLines = lines.slice(valuesHeaderIdx);

// Parse functions.
// Job category:  "### 1. INFORMATION-ORIENTED FUNCTIONS"
// Branch:        "#### Branch A: Primarily One-on-One"
// Category:      "**Some Category Name**"     (bold line, not a #### header)
// Item:          "- some function text"        (skip the "- Other ___" line)
const jobCategories = [];
let currentJob = null;
let currentBranch = null; // { id, name } or null
let currentCategory = null;

const walk = []; // flat ordered list of categories (the 19-screen walk)

for (const rawLine of funcLines) {
  const line = rawLine.trim();
  if (!line) continue;

  // Job category header
  let m = line.match(/^###\s+\d+\.\s+(.+)$/);
  if (m) {
    const name = m[1].trim(); // e.g. "INFORMATION-ORIENTED FUNCTIONS"
    // Title-case each word, capitalizing after hyphens too:
    // "INFORMATION-ORIENTED FUNCTIONS" -> "Information-Oriented Functions".
    const pretty = name
      .toLowerCase()
      .split(/\s+/)
      .map((word) =>
        word
          .split('-')
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join('-'),
      )
      .join(' ');
    currentJob = { id: slug(name.replace(/functions/i, '')), name: pretty };
    jobCategories.push(currentJob);
    currentBranch = null;
    currentCategory = null;
    continue;
  }

  // Branch header (People-Oriented only)
  m = line.match(/^####\s+Branch\s+[AB]:\s+(.+)$/);
  if (m) {
    const branchName = m[1].trim();
    currentBranch = {
      id: /one-on-one/i.test(branchName) ? 'one-on-one' : 'group',
      name: branchName,
    };
    currentCategory = null;
    continue;
  }

  // Skip italic notes like "*(5 categories, no intermediate split)*"
  if (/^\*\(.*\)\*$/.test(line)) continue;
  // Skip separators / headings we don't consume
  if (line === '---' || line.startsWith('#')) continue;

  // Category header: a bold line "**...**"
  m = line.match(/^\*\*(.+)\*\*$/);
  if (m && currentJob) {
    const name = m[1].trim();
    currentCategory = {
      id: slug(name),
      name,
      jobCategory: currentJob.id,
      jobCategoryName: currentJob.name,
      branch: currentBranch ? currentBranch.id : null,
      branchName: currentBranch ? currentBranch.name : null,
      items: [],
    };
    walk.push(currentCategory);
    continue;
  }

  // Item line
  m = line.match(/^-\s+(.+)$/);
  if (m && currentCategory) {
    let text = m[1].trim();
    // The per-category free-text field appears as "Other ______..." — skip it
    // as a checkable item; every category renders an Other field regardless.
    if (/^Other\s*_+/.test(text) || /^Other\s*_*$/.test(text)) {
      currentCategory.hasOther = true;
      continue;
    }
    currentCategory.items.push({
      id: `${currentCategory.id}__${String(currentCategory.items.length + 1).padStart(2, '0')}`,
      label: text,
    });
    continue;
  }
}

// Every category has an "Other" free-text field per spec, even if the source
// line spacing varied — force it true.
for (const c of walk) c.hasOther = true;

// --- validate functions ----------------------------------------------------

assert(walk.length === EXPECTED.categories, `expected ${EXPECTED.categories} categories, got ${walk.length}`);
const totalItems = walk.reduce((n, c) => n + c.items.length, 0);
assert(totalItems === EXPECTED.functionItems, `expected ${EXPECTED.functionItems} function items, got ${totalItems}`);

// Unique category ids
const catIds = new Set();
for (const c of walk) {
  assert(!catIds.has(c.id), `duplicate category id: ${c.id}`);
  catIds.add(c.id);
}
// Unique item ids
const itemIds = new Set();
for (const c of walk) {
  for (const it of c.items) {
    assert(!itemIds.has(it.id), `duplicate item id: ${it.id}`);
    itemIds.add(it.id);
  }
}

// Structural checks that mirror the spec exactly.
const byJob = (id) => walk.filter((c) => c.jobCategory === id);
const infoId = jobCategories.find((j) => /information/i.test(j.name)).id;
const thingsId = jobCategories.find((j) => /things/i.test(j.name)).id;
const peopleId = jobCategories.find((j) => /people/i.test(j.name)).id;
assert(byJob(infoId).length === 5, `Information-Oriented must have 5 categories`);
assert(byJob(thingsId).length === 7, `Things-Oriented must have 7 categories`);
assert(byJob(peopleId).filter((c) => c.branch === 'one-on-one').length === 3, `People One-on-One must have 3 categories`);
assert(byJob(peopleId).filter((c) => c.branch === 'group').length === 4, `People Group must have 4 categories`);
// Only People-Oriented uses branches.
assert(byJob(infoId).every((c) => c.branch === null), `Information-Oriented must not use branches`);
assert(byJob(thingsId).every((c) => c.branch === null), `Things-Oriented must not use branches`);

// Attach a 1-based walk index for the progress indicator.
walk.forEach((c, i) => (c.walkIndex = i + 1));

const functionsJson = {
  // Ordered list of the 19 category screens, in walk order:
  // Information 5 -> Things 7 -> People One-on-One 3 -> People Group 4.
  jobCategories: jobCategories.map((j) => ({ id: j.id, name: j.name })),
  categories: walk,
  meta: {
    categoryCount: walk.length,
    itemCount: totalItems,
    source: 'docs/functions-values-source.md',
  },
};

// --- parse values -----------------------------------------------------------

// The values live in one comma-separated paragraph line, followed by
// "Plus: **Others** (free-text field)".
const valueParagraph = valueLines
  .map((l) => l.trim())
  .find((l) => l.includes(',') && /Accomplishment/i.test(l));
assert(valueParagraph, 'could not find the values paragraph');

const values = valueParagraph
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)
  .map((label) => ({ id: slug(label), label }));

assert(values.length === EXPECTED.values, `expected ${EXPECTED.values} values, got ${values.length}`);
const valueIds = new Set();
for (const v of values) {
  assert(!valueIds.has(v.id), `duplicate value id: ${v.id}`);
  valueIds.add(v.id);
}

const valuesJson = {
  values,
  hasOther: true, // the trailing "Others" free-text field
  meta: { valueCount: values.length, source: 'docs/functions-values-source.md' },
};

// --- write ------------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, 'functions.json'), JSON.stringify(functionsJson, null, 2) + '\n');
writeFileSync(resolve(OUT_DIR, 'values.json'), JSON.stringify(valuesJson, null, 2) + '\n');

// --- report -----------------------------------------------------------------

console.log('functions.json + values.json built OK');
console.log(`  categories: ${walk.length} (expected ${EXPECTED.categories})`);
console.log(`  function items: ${totalItems} (expected ${EXPECTED.functionItems})`);
console.log(`  values: ${values.length} (expected ${EXPECTED.values})`);
console.log('  per-job category counts:');
console.log(`    ${infoId}: ${byJob(infoId).length} categories, ${byJob(infoId).reduce((n, c) => n + c.items.length, 0)} items`);
console.log(`    ${thingsId}: ${byJob(thingsId).length} categories, ${byJob(thingsId).reduce((n, c) => n + c.items.length, 0)} items`);
console.log(`    ${peopleId} (one-on-one): ${byJob(peopleId).filter((c) => c.branch === 'one-on-one').length} categories, ${byJob(peopleId).filter((c) => c.branch === 'one-on-one').reduce((n, c) => n + c.items.length, 0)} items`);
console.log(`    ${peopleId} (group): ${byJob(peopleId).filter((c) => c.branch === 'group').length} categories, ${byJob(peopleId).filter((c) => c.branch === 'group').reduce((n, c) => n + c.items.length, 0)} items`);
console.log('  per-category item counts:');
for (const c of walk) {
  console.log(`    [${String(c.walkIndex).padStart(2, '0')}] ${c.jobCategoryName}${c.branchName ? ' / ' + c.branchName : ''} — ${c.name}: ${c.items.length}`);
}
