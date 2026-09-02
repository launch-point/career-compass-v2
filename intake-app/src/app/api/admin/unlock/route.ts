// Admin action: unlock a submitted intake so the client can edit it again.
import { getSessionEmail } from '@/lib/auth';
import { isAdminEmail } from '@/lib/env';
import { getStore } from '@/lib/store';

export async function POST(request: Request) {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) return Response.json({ error: 'forbidden' }, { status: 403 });

  let id = '';
  try {
    id = ((await request.json()) as { id?: string }).id ?? '';
  } catch {
    /* ignore */
  }
  if (!id) return Response.json({ error: 'missing id' }, { status: 400 });

  const store = await getStore();
  const updated = await store.adminUnlock(id);
  if (!updated) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json({ submission: updated });
}
