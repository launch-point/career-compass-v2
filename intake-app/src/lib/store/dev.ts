// Dev filesystem store — active only when Supabase is not configured.
// Persists to intake-app/.dev-data/db.json so the full flow is browser-testable
// locally without any cloud infra. NOT for production (see assertModeSafe).

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { emptyAnswers, hydrateAnswers } from '@/lib/answers';
import type { IntakeAnswers, Submission } from '@/lib/types';
import type { AdminListRow, Store } from './index';

const DB_PATH = resolve(process.cwd(), '.dev-data', 'db.json');

interface DevDb {
  clients: { id: string; email: string; createdAt: string }[];
  submissions: Submission[];
}

function readDb(): DevDb {
  if (!existsSync(DB_PATH)) return { clients: [], submissions: [] };
  try {
    return JSON.parse(readFileSync(DB_PATH, 'utf8')) as DevDb;
  } catch {
    return { clients: [], submissions: [] };
  }
}

function writeDb(db: DevDb): void {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function norm(email: string): string {
  return email.trim().toLowerCase();
}

// Serialize writes within this process to avoid read-modify-write races.
let queue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => T): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export class DevStore implements Store {
  async getOrCreateByEmail(email: string): Promise<Submission> {
    return withLock(() => {
      const e = norm(email);
      const db = readDb();
      let client = db.clients.find((c) => c.email === e);
      if (!client) {
        client = { id: randomUUID(), email: e, createdAt: new Date().toISOString() };
        db.clients.push(client);
      }
      let sub = db.submissions.find((s) => s.clientId === client!.id);
      if (!sub) {
        const now = new Date().toISOString();
        sub = {
          id: randomUUID(),
          clientId: client.id,
          email: e,
          status: 'draft',
          locked: false,
          currentStepId: null,
          answers: emptyAnswers(),
          sheetsWrittenAt: null,
          webhookDeliveredAt: null,
          submittedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        db.submissions.push(sub);
      }
      writeDb(db);
      return structuredClone(sub);
    });
  }

  async getByEmail(email: string): Promise<Submission | null> {
    const e = norm(email);
    const db = readDb();
    const sub = db.submissions.find((s) => s.email === e);
    return sub ? structuredClone(sub) : null;
  }

  async getById(id: string): Promise<Submission | null> {
    const db = readDb();
    const sub = db.submissions.find((s) => s.id === id);
    return sub ? structuredClone(sub) : null;
  }

  async saveDraft(
    email: string,
    answers: IntakeAnswers,
    currentStepId: string | null,
  ): Promise<Submission> {
    return withLock(() => {
      const e = norm(email);
      const db = readDb();
      const sub = db.submissions.find((s) => s.email === e);
      if (!sub) throw new Error('no submission for email');
      // Locked (submitted) records are read-only until an admin unlocks.
      if (sub.locked) return structuredClone(sub);
      sub.answers = hydrateAnswers(answers);
      sub.currentStepId = currentStepId;
      sub.updatedAt = new Date().toISOString();
      writeDb(db);
      return structuredClone(sub);
    });
  }

  async markSubmitted(
    email: string,
  ): Promise<{ submission: Submission; alreadySubmitted: boolean }> {
    return withLock(() => {
      const e = norm(email);
      const db = readDb();
      const sub = db.submissions.find((s) => s.email === e);
      if (!sub) throw new Error('no submission for email');
      if (sub.status === 'submitted' && sub.locked) {
        return { submission: structuredClone(sub), alreadySubmitted: true };
      }
      const now = new Date().toISOString();
      sub.status = 'submitted';
      sub.locked = true;
      sub.submittedAt = now;
      sub.updatedAt = now;
      writeDb(db);
      return { submission: structuredClone(sub), alreadySubmitted: false };
    });
  }

  async setSideEffect(
    id: string,
    field: 'sheetsWrittenAt' | 'webhookDeliveredAt',
    iso: string,
  ): Promise<void> {
    await withLock(() => {
      const db = readDb();
      const sub = db.submissions.find((s) => s.id === id);
      if (!sub) return;
      sub[field] = iso;
      sub.updatedAt = new Date().toISOString();
      writeDb(db);
    });
  }

  async adminList(): Promise<AdminListRow[]> {
    const db = readDb();
    return db.submissions
      .filter((s) => s.status === 'submitted')
      .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
      .map((s) => ({
        id: s.id,
        clientId: s.clientId,
        email: s.email,
        status: s.status,
        locked: s.locked,
        submittedAt: s.submittedAt,
        updatedAt: s.updatedAt,
      }));
  }

  async adminUnlock(id: string): Promise<Submission | null> {
    return withLock(() => {
      const db = readDb();
      const sub = db.submissions.find((s) => s.id === id);
      if (!sub) return null;
      sub.locked = false;
      sub.status = 'draft'; // editable again; re-submit re-locks
      sub.updatedAt = new Date().toISOString();
      writeDb(db);
      return structuredClone(sub);
    });
  }
}
