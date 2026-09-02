// Appends a row to the "Intake Submissions" tab of the Master Data Sheet.
// Dev (creds not set): append to .dev-data/sheets.json for inspection.
// Real: mint a service-account access token (RS256 JWT, zero-dep) and call the
// Sheets values.append REST endpoint. Server only.
//
// NOTE: the real path has not been exercised against a live sheet yet
// (see docs Known Gaps).

import { createSign } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { sheetsConfig } from '@/lib/env';
import { SHEETS_COLUMNS } from './serialize';

const SINK = resolve(process.cwd(), '.dev-data', 'sheets.json');
const TAB = 'Intake Submissions';

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }),
  );
  const signingInput = `${header}.${claim}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(privateKey);
  const jwt = `${signingInput}.${b64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Returns true if the row was written (real append 2xx, or dev sink). */
export async function appendSheetsRow(row: (string | number)[]): Promise<boolean> {
  const { sheetId, clientEmail, privateKey } = sheetsConfig();

  if (!sheetId || !clientEmail || !privateKey) {
    // Dev sink — include the header once for readability.
    const prior = existsSync(SINK)
      ? (JSON.parse(readFileSync(SINK, 'utf8')) as { columns: string[]; rows: (string | number)[][] })
      : { columns: [...SHEETS_COLUMNS], rows: [] };
    prior.rows.push(row);
    mkdirSync(resolve(process.cwd(), '.dev-data'), { recursive: true });
    writeFileSync(SINK, JSON.stringify(prior, null, 2));
    return true;
  }

  const token = await getAccessToken(clientEmail, privateKey);
  const range = encodeURIComponent(`${TAB}!A1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  return res.ok;
}
