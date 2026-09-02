-- Career Compass v2 — intake schema (Phase 1).
-- Apply in the Supabase SQL editor or via `supabase db push`.
--
-- Access model: all reads/writes go through Next.js Route Handlers using the
-- service-role key, which bypasses RLS. RLS is enabled with NO public policies,
-- so direct anon/authenticated access is denied by default (defense in depth).
-- The Route Handlers do their own email-based authorization.

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- One row per client. `id` is the stable client id downstream phases attach to.
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,          -- the Mission Control join key
  created_at timestamptz not null default now()
);

-- One intake per client (unique client_id). `answers` holds the full progressive
-- draft as JSONB (see src/lib/types.ts IntakeAnswers).
create table if not exists public.intake_submissions (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  status              text not null default 'draft' check (status in ('draft','submitted')),
  locked              boolean not null default false,
  current_step_id     text,
  answers             jsonb not null default '{}'::jsonb,
  sheets_written_at   timestamptz,          -- side-effect completion markers
  webhook_delivered_at timestamptz,
  submitted_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists intake_submissions_client_id_key
  on public.intake_submissions (client_id);

-- keep updated_at fresh on every write
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_intake_submissions_updated_at on public.intake_submissions;
create trigger trg_intake_submissions_updated_at
  before update on public.intake_submissions
  for each row execute function public.set_updated_at();

-- Grants. The app connects as `service_role`, which also bypasses RLS (BYPASSRLS)
-- but still needs table privileges. anon/authenticated are granted too, but RLS
-- (enabled below, with NO policies) denies them every row — so they can reach
-- nothing. We grant explicitly rather than rely on Supabase's implicit default
-- privileges, which do not apply consistently to every project.
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on public.clients to service_role;
grant all privileges on public.intake_submissions to service_role;
grant select, insert, update, delete on public.clients to anon, authenticated;
grant select, insert, update, delete on public.intake_submissions to anon, authenticated;

alter table public.clients enable row level security;
alter table public.intake_submissions enable row level security;
-- No policies added on purpose: service_role bypasses RLS; anon/authenticated have
-- grants but RLS denies every row (that is what the RLS check verifies). Add
-- per-email policies here if client-direct access is ever needed.
