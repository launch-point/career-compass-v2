// Supabase (Postgres) store — active when Supabase is configured.
// NOTE: written against the schema in supabase/migrations/0001_init.sql; not yet
// exercised against a live project (see docs Known Gaps). All access is via the
// service-role client.

import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { hydrateAnswers } from '@/lib/answers';
import type { IntakeAnswers, Submission } from '@/lib/types';
import type { AdminListRow, Store } from './index';

type Row = {
  id: string;
  client_id: string;
  status: Submission['status'];
  locked: boolean;
  current_step_id: string | null;
  answers: unknown;
  sheets_written_at: string | null;
  webhook_delivered_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

function norm(email: string): string {
  return email.trim().toLowerCase();
}

function toSubmission(row: Row, email: string): Submission {
  return {
    id: row.id,
    clientId: row.client_id,
    email,
    status: row.status,
    locked: row.locked,
    currentStepId: row.current_step_id,
    answers: hydrateAnswers(row.answers as Partial<IntakeAnswers>),
    sheetsWrittenAt: row.sheets_written_at,
    webhookDeliveredAt: row.webhook_delivered_at,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseStore implements Store {
  private db = createSupabaseServiceClient();

  private async clientIdForEmail(email: string, create: boolean): Promise<{ id: string; email: string } | null> {
    const e = norm(email);
    const found = await this.db.from('clients').select('id,email').eq('email', e).maybeSingle();
    if (found.data) return found.data as { id: string; email: string };
    if (!create) return null;
    const ins = await this.db.from('clients').insert({ email: e }).select('id,email').single();
    if (ins.error) throw ins.error;
    return ins.data as { id: string; email: string };
  }

  async getOrCreateByEmail(email: string): Promise<Submission> {
    const client = (await this.clientIdForEmail(email, true))!;
    const existing = await this.db
      .from('intake_submissions')
      .select('*')
      .eq('client_id', client.id)
      .maybeSingle();
    if (existing.data) return toSubmission(existing.data as Row, client.email);
    const created = await this.db
      .from('intake_submissions')
      .insert({ client_id: client.id, answers: {} })
      .select('*')
      .single();
    if (created.error) throw created.error;
    return toSubmission(created.data as Row, client.email);
  }

  async getByEmail(email: string): Promise<Submission | null> {
    const client = await this.clientIdForEmail(email, false);
    if (!client) return null;
    const res = await this.db
      .from('intake_submissions')
      .select('*')
      .eq('client_id', client.id)
      .maybeSingle();
    return res.data ? toSubmission(res.data as Row, client.email) : null;
  }

  async getById(id: string): Promise<Submission | null> {
    const res = await this.db.from('intake_submissions').select('*').eq('id', id).maybeSingle();
    if (!res.data) return null;
    const row = res.data as Row;
    const c = await this.db.from('clients').select('email').eq('id', row.client_id).single();
    return toSubmission(row, (c.data as { email: string }).email);
  }

  async saveDraft(
    email: string,
    answers: IntakeAnswers,
    currentStepId: string | null,
  ): Promise<Submission> {
    const current = await this.getByEmail(email);
    if (!current) throw new Error('no submission for email');
    if (current.locked) return current; // read-only until admin unlock
    const res = await this.db
      .from('intake_submissions')
      .update({ answers, current_step_id: currentStepId })
      .eq('id', current.id)
      .select('*')
      .single();
    if (res.error) throw res.error;
    return toSubmission(res.data as Row, current.email);
  }

  async markSubmitted(
    email: string,
  ): Promise<{ submission: Submission; alreadySubmitted: boolean }> {
    const current = await this.getByEmail(email);
    if (!current) throw new Error('no submission for email');
    if (current.status === 'submitted' && current.locked) {
      return { submission: current, alreadySubmitted: true };
    }
    const res = await this.db
      .from('intake_submissions')
      .update({ status: 'submitted', locked: true, submitted_at: new Date().toISOString() })
      .eq('id', current.id)
      .select('*')
      .single();
    if (res.error) throw res.error;
    return { submission: toSubmission(res.data as Row, current.email), alreadySubmitted: false };
  }

  async setSideEffect(
    id: string,
    field: 'sheetsWrittenAt' | 'webhookDeliveredAt',
    iso: string,
  ): Promise<void> {
    const col = field === 'sheetsWrittenAt' ? 'sheets_written_at' : 'webhook_delivered_at';
    await this.db.from('intake_submissions').update({ [col]: iso }).eq('id', id);
  }

  async adminList(): Promise<AdminListRow[]> {
    const res = await this.db
      .from('intake_submissions')
      .select('id,client_id,status,locked,submitted_at,updated_at, clients(email)')
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });
    if (res.error) throw res.error;
    type JoinRow = Pick<Row, 'id' | 'client_id' | 'status' | 'locked' | 'submitted_at' | 'updated_at'> & {
      clients: { email: string } | { email: string }[] | null;
    };
    return (res.data as JoinRow[]).map((r) => {
      const email = Array.isArray(r.clients) ? r.clients[0]?.email : r.clients?.email;
      return {
        id: r.id,
        clientId: r.client_id,
        email: email ?? '',
        status: r.status,
        locked: r.locked,
        submittedAt: r.submitted_at,
        updatedAt: r.updated_at,
      };
    });
  }

  async adminUnlock(id: string): Promise<Submission | null> {
    const res = await this.db
      .from('intake_submissions')
      .update({ locked: false, status: 'draft' })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (res.error) throw res.error;
    if (!res.data) return null;
    const row = res.data as Row;
    const c = await this.db.from('clients').select('email').eq('id', row.client_id).single();
    return toSubmission(row, (c.data as { email: string }).email);
  }
}
