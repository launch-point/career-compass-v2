# Career Compass v2 — API Contracts (Phase 1)

*The orchestrator and later phases consume this. Source of truth for shapes:
`intake-app/src/lib/types.ts` and `intake-app/src/lib/side-effects/serialize.ts`. Keep this doc in
sync with those files.*

## 1. Data models

### Submission (`types.ts`)

```ts
interface Submission {
  id: string;              // submission row id
  clientId: string;        // STABLE client id — the join key later phases attach to
  email: string;           // Mission Control join key / magic-link identity
  status: 'draft' | 'submitted';
  locked: boolean;         // true after submit; only an admin unlock clears it
  currentStepId: string | null; // wizard step for resume
  answers: IntakeAnswers;
  sheetsWrittenAt: string | null;    // side-effect marker (ISO) — detects partial submit
  webhookDeliveredAt: string | null; // side-effect marker (ISO)
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### IntakeAnswers

```ts
interface IntakeAnswers {
  functions: {
    // keyed by function item id (config/functions.json)
    items: Record<string, {
      categoryId: string;              // preserves Phase 1 grouping after flattening
      checked: boolean;                // Phase 1 elimination
      rating: 1|2|3|4|5|null;          // Phase 2 (null until rated)
      top10: boolean;                  // Phase 3
      top5: boolean;                   // Phase 4
    }>;
    categoryOther: Record<string,string>; // per-category "Other ___", keyed by category id
  };
  values: {
    items: Record<string, { checked: boolean; top10: boolean; top5: boolean }>; // no rating step
    other: string;                     // trailing "Others" free-text
  };
  requirements: {
    currentJobTitle: string;
    salaryMin: number | null;          // structured integer (annual USD)
    salaryPeriod: 'annual';
    maxTravelDaysPerMonth: string;     // open text (spec)
    location: string;                  // "City, State"
    officePreference: string;          // open text
    advancedDegrees: string;
    yearsInWorkforce: string;
    otherNotes: string;
  };
  stories: [Story, Story, Story, Story]; // exactly 4; >=3 fully complete to submit
}
interface Story { moment: string; involvement: string; actions: string; enjoyment: string; }
```

## 2. Webhook contract (fired on submit, after the DB commit)

- **Method/URL:** `POST` to `ORCHESTRATOR_WEBHOOK_URL`.
- **Signature header:** `x-cc-signature: sha256=<hex>` — HMAC-SHA256 of the exact JSON body using
  `CAREER_COMPASS_WEBHOOK_SECRET`. Verify before trusting. (Omitted only if no secret is configured.)
- **Delivery:** best-effort after the authoritative commit. A non-2xx does not roll back the
  submission; `webhookDeliveredAt` stays null so it can be retried. The DB is the source of truth.

Payload shape (`WebhookPayload` in `serialize.ts`):

```jsonc
{
  "clientId": "5fdd4a85-…",
  "email": "client@example.com",
  "submissionId": "c5aca78d-…",
  "status": "submitted",
  "locked": true,
  "submittedAt": "2026-09-02T02:14:35.137Z",
  "functions": {
    // top5 + next5 are plain label strings, exactly 5 each, non-overlapping.
    "top5":  ["Generating ideas, creating, inventing, imagining", "Diagnosing…", "…", "…", "…"],
    "next5": ["Networking, building alliances and relationships", "Mentoring…", "…", "…", "…"], // items 6–10
    "all":   [{ "id": "…", "label": "…", "categoryId": "…", "categoryName": "…",
               "jobCategory": "Information-Oriented Functions",
               "rating": 5, "top10": true, "top5": true }],  // every CHECKED function (full detail)
    "categoryOther": { "creating-designing-and-using-imagination": "Facilitated a strategy offsite" }
  },
  "values": {
    "top5":    ["Achievement", "…", "…", "…", "…"],   // 5 label strings
    "next5":   ["…", "…", "…", "…", "…"],             // items 6–10, 5 label strings
    "checked": [{ "id": "…", "label": "…" }],         // full checked list, id+label (unchanged)
    "other":   "Stewardship"
  },
  "requirements": { "currentJobTitle": "…", "salaryMin": 85000, "salaryPeriod": "annual", … },
  "stories": {
    "story1_moment": "…", "story1_involvement": "…", "story1_actions": "…", "story1_enjoyment": "…",
    "story2_moment": "…", …, "story4_enjoyment": ""   // 16 keys total; blanks allowed on story 4
  }
}
```

> **For the orchestrator (Step 0.3 note from the spec):** the client now SELECTS the top 5 directly
> (`functions.top5`). Do not recompute a top 5 by summing ratings — consume `functions.top5` as-is.

## 3. Sheets write contract

Appended to the **`Intake Submissions`** tab of the Master Data Sheet
(`MASTER_DATA_SHEET_ID`), one row per submit, columns in this exact order (`SHEETS_COLUMNS` in
`serialize.ts`):

```
submitted_at, client_id, email, current_job_title, salary_min, salary_period,
max_travel_days_per_month, location, office_preference, advanced_degrees, years_in_workforce,
other_notes, functions_top5, functions_top10, values_top5, values_top10, values_checked,
functions_ratings_json, story1_moment, story1_involvement, story1_actions, story1_enjoyment,
story2_moment, story2_involvement, story2_actions, story2_enjoyment, story3_moment,
story3_involvement, story3_actions, story3_enjoyment, story4_moment, story4_involvement,
story4_actions, story4_enjoyment, locked
```

- List columns (`functions_top5`, etc.) are `" | "`-joined labels.
- **Sheets columns are unchanged by the webhook `top5`/`next5` refactor.** The `*_top10` columns
  still hold the full 10 labels — `buildSheetsRow` reconstructs them as `top5 + next5`. (The Sheets
  side is slated for deprecation; this keeps it from silently breaking. Flagged, not silently changed.)
- `functions_ratings_json` is the full `functions.all` array as JSON (rating + grouping preserved).
- `locked` is `TRUE`/`FALSE`.
- Header row is the app's responsibility to ensure once in the real sheet (dev sink includes it).

## 4. Auth expectations

- Identity = **email**, shared with Mission Control. Magic-link (Supabase) in prod; a dev cookie
  (`cc_dev_email`) in dev.
- Downstream consumers can rely on: one `clientId` per email (stable), and `email` present on every
  payload/row.
- API routes authorize server-side via `getSessionEmail()`; admin routes additionally check the
  `ADMIN_EMAILS` allowlist.

## 5. Environment variables

See `intake-app/.env.example` for the full annotated list. Summary:

| Var | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase client + magic link |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Store writes (bypasses RLS) |
| `NEXT_PUBLIC_APP_URL` | public | Magic-link redirect base |
| `MISSION_CONTROL_ORIGIN` | server | CSP `frame-ancestors` allowed embedder |
| `CAREER_COMPASS_WEBHOOK_SECRET` | server | **Reused** — HMAC-signs the webhook |
| `ORCHESTRATOR_WEBHOOK_URL` | server | Webhook target (blank = skip) |
| `MASTER_DATA_SHEET_ID` | server | Sheets target (`1hgBOWdD…jdMpg`) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | server | Sheets append auth |
| `ADMIN_EMAILS` | server | Comma-separated admin allowlist |

## 6. Known gaps (deliberately unbuilt in Phase 1)

- **Supabase/Sheets/webhook real paths are written but not yet exercised against live infra.** Dev
  mode (filesystem + sinks) is what has been run end-to-end. Needs Todd's Supabase project, Google
  service-account creds, and orchestrator URL/secret to verify for real, then apply
  `supabase/migrations/0001_init.sql`.
- **Iframe state 3 (results ready + Drive download)** is a placeholder — depends on the PDF + Drive
  phases that don't exist yet.
- **Admin view is intentionally minimal** (list + full submission + unlock). No top-5 column, PDF
  download, or Circle trigger — those attach to the existing `clientId` in Phase 4 without a rebuild.
- **Side-effect retry is manual** — markers (`sheetsWrittenAt`/`webhookDeliveredAt`) record what
  landed, but there is no automatic retry worker yet.
- **In-browser click-through of the wizard was not machine-verified** in the build session (browser
  automation unavailable); the backend pipeline was verified with real output via `verify-e2e.mjs`.
