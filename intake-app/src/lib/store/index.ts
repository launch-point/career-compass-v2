// Storage adapter. All server-side persistence goes through this interface so
// the wizard/admin/API code is backend-agnostic. Two implementations:
//   - DevStore (filesystem)  — active when Supabase is NOT configured
//   - SupabaseStore (Postgres) — active when Supabase IS configured
//
// Server-only. Never import from a Client Component.

import { assertModeSafe, isSupabaseConfigured } from '@/lib/env';
import type { IntakeAnswers, Submission } from '@/lib/types';

export interface AdminListRow {
  id: string;
  clientId: string;
  email: string;
  status: Submission['status'];
  locked: boolean;
  submittedAt: string | null;
  updatedAt: string;
}

export interface Store {
  /** Find or create the client record for an email, and ensure a draft exists. */
  getOrCreateByEmail(email: string): Promise<Submission>;
  getByEmail(email: string): Promise<Submission | null>;
  getById(id: string): Promise<Submission | null>;
  /** Save progressive draft (answers + last step). No-ops if the record is locked. */
  saveDraft(
    email: string,
    answers: IntakeAnswers,
    currentStepId: string | null,
  ): Promise<Submission>;
  /** Mark submitted + locked. Returns null if already submitted (idempotent guard). */
  markSubmitted(email: string): Promise<{ submission: Submission; alreadySubmitted: boolean }>;
  setSideEffect(
    id: string,
    field: 'sheetsWrittenAt' | 'webhookDeliveredAt',
    iso: string,
  ): Promise<void>;
  /** Admin: list every submitted record (most recent first). */
  adminList(): Promise<AdminListRow[]>;
  /** Admin: unlock a submission so the client can edit again. */
  adminUnlock(id: string): Promise<Submission | null>;
}

let cached: Store | null = null;

export async function getStore(): Promise<Store> {
  assertModeSafe();
  if (cached) return cached;
  if (isSupabaseConfigured()) {
    const { SupabaseStore } = await import('./supabase');
    cached = new SupabaseStore();
  } else {
    const { DevStore } = await import('./dev');
    cached = new DevStore();
  }
  return cached;
}
