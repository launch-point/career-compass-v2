-- Career Compass v2 — Phase 4: record of the "report is ready" Circle DM.
--
-- Apply in the Supabase SQL editor or via `supabase db push`, same as 0001/0002.
--
-- Why a record at all: the send script's confirm prompt guards against misreading
-- a prompt, not against forgetting whether a DM went out days ago — and at Gate 4
-- the send will eventually run unattended, with no prompt. The record is what
-- stops a second DM.
--
-- The DM is tied to the REPORT it announced, not just to the client:
-- circle_dm_report_drive_file_id is copied from report_drive_file_id at send
-- time. The script refuses when that matches the current report_drive_file_id
-- (this report was already announced). A revision re-uploads and gets a new
-- file id (0002: nothing is overwritten), so a revised report can be announced
-- without clearing anything by hand. Like 0002, these columns describe the
-- NEWEST DM only; history lives in Circle.
--
-- Additive and idempotent: `add column if not exists`, no defaults, no backfill.
-- Clients delivered by hand (the Circle DM sent in the Circle app) stay NULL —
-- the columns record what this script sent, not what was sent by any means.
--
-- No new grants: 0001's `grant all privileges on public.clients to service_role`
-- covers columns added later. RLS is untouched.

alter table public.clients
  add column if not exists circle_dm_sent_at               timestamptz,
  add column if not exists circle_dm_message_id            text,
  add column if not exists circle_dm_chat_room_uuid        text,
  add column if not exists circle_dm_report_drive_file_id  text;
