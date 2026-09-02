// Fires the orchestrator webhook. HMAC-signs the body with the shared secret.
// Dev (no ORCHESTRATOR_WEBHOOK_URL): append the payload to .dev-data/webhooks.json
// so it can be inspected during verification. Server only.

import { createHmac } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { webhookConfig } from '@/lib/env';
import type { WebhookPayload } from './serialize';

const SINK = resolve(process.cwd(), '.dev-data', 'webhooks.json');

function signBody(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

/** Returns true if delivered (real POST 2xx, or dev sink write). */
export async function fireWebhook(payload: WebhookPayload): Promise<boolean> {
  const body = JSON.stringify(payload);
  const { url, secret } = webhookConfig();

  if (!url) {
    // Dev sink.
    const prior = existsSync(SINK) ? JSON.parse(readFileSync(SINK, 'utf8')) : [];
    prior.push({ at: new Date().toISOString(), signature: secret ? signBody(body, secret) : null, payload });
    mkdirSync(resolve(process.cwd(), '.dev-data'), { recursive: true });
    writeFileSync(SINK, JSON.stringify(prior, null, 2));
    return true;
  }

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (secret) headers['x-cc-signature'] = `sha256=${signBody(body, secret)}`;
  const res = await fetch(url, { method: 'POST', headers, body });
  return res.ok;
}
