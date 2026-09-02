// Minimal admin view (Section 6): list submitted clients. Admin-email gated.
import Link from 'next/link';
import { getSessionEmail } from '@/lib/auth';
import { isAdminEmail } from '@/lib/env';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Admin</h1>
        <p className="mt-2 text-sm text-muted">
          {email ? 'This account is not an admin.' : 'Sign in as an admin to view submissions.'}
        </p>
      </div>
    );
  }

  const store = await getStore();
  const rows = await store.adminList();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Submitted intakes</h1>
        <span className="text-xs text-muted">{rows.length} total</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No submissions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">{r.email}</td>
                  <td className="px-4 py-2 text-muted">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.locked ? 'bg-border text-muted' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.locked ? 'locked' : 'unlocked'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/admin/${r.id}`} className="font-semibold text-brand hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
