# Career Compass v2 — Architecture (Phase 1: Intake + Minimal Admin)

*Created during the Phase 1 build. Scope: the intake form (Sections A–F of the build spec),
minimal admin view (Section 6), and the submit pipeline (Section 4).*

## Tech stack

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.3.4 |
| Language | TypeScript | 5.x |
| UI runtime | React | 19.2 |
| Styling | Tailwind CSS | v4 |
| Client state | Zustand | 5.x |
| Validation | Zod | 4.x (available; gates are hand-written in `lib/answers.ts`) |
| DB + Auth | Supabase (Postgres + magic-link Auth) | `@supabase/ssr` 0.12, `@supabase/supabase-js` 2.x |
| Hosting | Vercel (intended) | — |

> **Next.js 16 note:** middleware is renamed to **`proxy.ts`** (see `src/proxy.ts`). `cookies()`,
> `headers()`, and route `params` are **async**. Static `frame-ancestors` CSP is set via
> `next.config.ts` `headers()`, not the proxy.

## Two run modes

The app runs identically whether or not cloud infra is wired up, selected by env presence:

- **Prod mode** (Supabase env set): Postgres store, Supabase magic-link auth, real Sheets append +
  webhook POST.
- **Dev mode** (Supabase env absent): filesystem store at `intake-app/.dev-data/`, cookie-based dev
  login (`/auth/dev`), and side-effects written to `.dev-data/webhooks.json` / `.dev-data/sheets.json`
  for inspection. **Refused in production** (`assertModeSafe` in `lib/env.ts`).

This is what makes the full flow verifiable locally before Todd provisions secrets. The storage/auth
seam is a clean interface, so wiring real infra changes no UI or route code.

## Directory tree (annotated)

```
intake-app/
  next.config.ts               # CSP frame-ancestors (iframe embedding policy)
  supabase/migrations/
    0001_init.sql              # clients + intake_submissions schema (RLS on, server-only access)
  scripts/
    build-config.mjs           # parses docs/functions-values-source.md -> src/config/*.json
    verify-e2e.mjs             # drives the real API end-to-end (dev cookie) for verification
  src/
    proxy.ts                   # Next 16 "middleware": Supabase session refresh (pass-through in dev)
    config/
      functions.json           # 19 categories / 151 items (generated)
      values.json              # 94 values (generated)
    lib/
      types.ts                 # AUTHORITATIVE data model (Submission, IntakeAnswers, ...)
      config.ts                # typed loaders + lookups over the JSON config
      steps.ts                 # ordered wizard flow (31 steps) derived from config
      answers.ts               # empty-answer factory, selectors, submission gate
      wizardGating.ts          # per-step "can advance" + message (spec minimums)
      env.ts                   # env access + mode detection + admin allowlist
      auth.ts                  # getSessionEmail (Supabase session | dev cookie)
      store/                   # storage adapter
        index.ts               # Store interface + getStore() selector
        dev.ts                 # DevStore (filesystem)
        supabase.ts            # SupabaseStore (Postgres via service role)
      supabase/                # browser / server / service clients
      side-effects/
        serialize.ts           # webhook payload + Sheets row/columns (the api-contract)
        webhook.ts             # HMAC-signed POST (or dev sink)
        sheets.ts              # service-account append (or dev sink)
    store/intakeStore.ts       # Zustand: full answers + debounced autosave
    components/
      ui.tsx                   # primitives (Button, CheckPill, RatingRow, ...)
      LoginPanel.tsx           # magic-link request + resend cooldown/cap
      IntakeApp.tsx            # loads draft, routes form vs post-submit
      Wizard.tsx               # step shell: nav, gating, progress, submit
      PostSubmit.tsx           # iframe state 2 (waiting); state 3 placeholder
      AdminUnlockButton.tsx
      screens/                 # one file per section group (Function/Value/Requirements/Story/Review)
    app/
      page.tsx                 # entry: auth gate -> LoginPanel | IntakeApp
      admin/page.tsx           # submitted list (admin-gated)
      admin/[id]/page.tsx      # full submission + unlock
      api/draft/route.ts       # GET load / PUT save (resume + save-on-progress)
      api/submit/route.ts      # DB-authoritative submit + side-effects
      api/admin/unlock/route.ts
      api/auth/{dev-send,logout}/route.ts
      auth/{dev,callback}/route.ts
```

## Component map (stateful vs presentational)

- **Stateful (client):** `IntakeApp`, `Wizard`, all `screens/*` (read/write the Zustand store),
  `LoginPanel`, `AdminUnlockButton`.
- **Presentational:** `components/ui.tsx` primitives, `PostSubmit`.
- **Server components:** `app/page.tsx`, `app/admin/page.tsx`, `app/admin/[id]/page.tsx` (read the
  session + store server-side; no secrets reach the client).

## State management + flow

One Zustand store (`store/intakeStore.ts`) holds the entire `IntakeAnswers` object plus
`currentStepId`, `status`, `locked`, `saveState`. Every mutation:
1. updates the store,
2. writes a `localStorage` cache (same-session safety net),
3. schedules a **debounced (700ms) PUT `/api/draft`** — the save-on-progress that protects against a
   mid-form session drop.

On load, the store GETs `/api/draft` (server draft is the source of truth) and hydrates. Resume works
across devices because the draft is keyed to the client's email server-side, not to the browser.

The wizard (`steps.ts`) is a flat ordered list of 31 steps: 19 function-category screens →
rating → top10 → top5 → values ×3 → requirements → 4 stories → review. Advance is gated per step by
`wizardGating.ts`; submit is gated by `submissionGate` in `answers.ts`.

## Route map

| Route | Type | Purpose |
|---|---|---|
| `/` | dynamic page | Login (unauth) or the intake app (auth) |
| `/admin` | dynamic page | Submitted list (admin allowlist) |
| `/admin/[id]` | dynamic page | Full submission + unlock |
| `/api/draft` | GET/PUT | Load / save draft |
| `/api/submit` | POST | Submit pipeline |
| `/api/admin/unlock` | POST | Unlock a submission (admin) |
| `/api/auth/dev-send` | POST | Dev: return a dev sign-in link (dev only) |
| `/api/auth/logout` | POST | Sign out |
| `/auth/dev` | GET | Dev: set dev session cookie (dev only) |
| `/auth/callback` | GET | Supabase magic-link code exchange (prod) |

## Iframe (Section E)

- CSP `frame-ancestors 'self' <MISSION_CONTROL_ORIGIN>` via `next.config.ts` — restricts who may
  embed; direct top-level visits are unaffected (allowed when authenticated).
- Three states: **state 1 (form)** built fully; **state 2 (waiting)** is the real post-submit screen
  in `PostSubmit.tsx`; **state 3 (results ready + Drive download)** is a placeholder gated on
  downstream phases (see Known Gaps).
