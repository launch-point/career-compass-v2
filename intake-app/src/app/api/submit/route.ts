// Submit pipeline (DB-authoritative):
//   1. validate gates
//   2. commit: mark submitted + locked (authoritative)
//   3. fire side-effects (Sheets append, orchestrator webhook) and record markers
// A partial side-effect never rolls back the commit; markers let it be detected
// and retried. Duplicate/locked submits are idempotent.
import { getSessionEmail } from '@/lib/auth';
import { getStore } from '@/lib/store';
import { hydrateAnswers, submissionGate } from '@/lib/answers';
import { buildSheetsRow, buildWebhookPayload } from '@/lib/side-effects/serialize';
import { appendSheetsRow } from '@/lib/side-effects/sheets';
import { fireWebhook } from '@/lib/side-effects/webhook';
import type { IntakeAnswers } from '@/lib/types';

export async function POST(request: Request) {
  const email = await getSessionEmail();
  if (!email) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  const store = await getStore();
  const existing = await store.getByEmail(email);
  if (!existing) return Response.json({ error: 'no draft' }, { status: 400 });

  // Idempotent guard: already submitted + locked → treat as success, no re-fire.
  if (existing.status === 'submitted' && existing.locked) {
    return Response.json({ submission: existing, alreadySubmitted: true });
  }

  // Persist the final answers sent with submit (in case the last autosave lagged),
  // then validate the gate against the authoritative record.
  let body: { answers?: Partial<IntakeAnswers> } = {};
  try {
    body = await request.json();
  } catch {
    /* body optional */
  }
  if (body.answers) {
    await store.saveDraft(email, hydrateAnswers(body.answers), existing.currentStepId);
  }
  const toCheck = (await store.getByEmail(email))!;
  const gate = submissionGate(toCheck.answers);
  if (!gate.ok) {
    return Response.json({ error: 'gate_failed', problems: gate.problems }, { status: 422 });
  }

  // Authoritative commit.
  const { submission } = await store.markSubmitted(email);

  // Side-effects (best-effort; failures are surfaced, not fatal to the commit).
  const sideEffects: { sheets: boolean; webhook: boolean; errors: string[] } = {
    sheets: false,
    webhook: false,
    errors: [],
  };
  try {
    if (await appendSheetsRow(buildSheetsRow(submission))) {
      await store.setSideEffect(submission.id, 'sheetsWrittenAt', new Date().toISOString());
      sideEffects.sheets = true;
    }
  } catch (e) {
    sideEffects.errors.push(`sheets: ${(e as Error).message}`);
  }
  try {
    if (await fireWebhook(buildWebhookPayload(submission))) {
      await store.setSideEffect(submission.id, 'webhookDeliveredAt', new Date().toISOString());
      sideEffects.webhook = true;
    }
  } catch (e) {
    sideEffects.errors.push(`webhook: ${(e as Error).message}`);
  }

  const finalSubmission = await store.getById(submission.id);
  return Response.json({ submission: finalSubmission, sideEffects });
}
