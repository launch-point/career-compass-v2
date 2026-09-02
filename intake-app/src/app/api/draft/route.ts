// Draft load + progressive save (the resume + save-on-progress mechanism).
import { getSessionEmail } from '@/lib/auth';
import { getStore } from '@/lib/store';
import { hydrateAnswers } from '@/lib/answers';
import type { IntakeAnswers } from '@/lib/types';

export async function GET() {
  const email = await getSessionEmail();
  if (!email) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const store = await getStore();
  const submission = await store.getOrCreateByEmail(email);
  return Response.json({ submission });
}

export async function PUT(request: Request) {
  const email = await getSessionEmail();
  if (!email) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  let body: { answers?: Partial<IntakeAnswers>; currentStepId?: string | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const store = await getStore();
  const existing = await store.getByEmail(email);
  if (existing?.locked) {
    // Post-submit lock: refuse edits, hand back the authoritative server copy.
    return Response.json({ error: 'locked', submission: existing }, { status: 423 });
  }

  const answers = hydrateAnswers(body.answers);
  const submission = await store.saveDraft(email, answers, body.currentStepId ?? null);
  return Response.json({ submission });
}
