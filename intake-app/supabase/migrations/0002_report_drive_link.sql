-- Career Compass v2 — Phase 4 step 1: Drive upload link.
--
-- Apply in the Supabase SQL editor or via `supabase db push`, same as 0001.
--
-- These columns point at the NEWEST uploaded report for a client. History is
-- not kept here on purpose: every upload creates a new, timestamped Drive file
-- and nothing is ever overwritten, so the folder is the history. If steps 2/3
-- ever need per-version rows, add a client_reports table — these columns stay
-- valid either way.
--
-- No new grants: 0001 already does `grant all privileges on public.clients to
-- service_role`, which covers columns added later. RLS is untouched (enabled,
-- no policies; service_role bypasses it).

alter table public.clients
  add column if not exists report_drive_file_id text,
  add column if not exists report_drive_link    text,
  add column if not exists report_file_name     text,
  add column if not exists report_uploaded_at   timestamptz;
