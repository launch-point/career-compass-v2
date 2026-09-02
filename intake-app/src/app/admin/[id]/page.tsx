// Admin: full read-only view of one submission + unlock action.
import Link from 'next/link';
import { getSessionEmail } from '@/lib/auth';
import { isAdminEmail } from '@/lib/env';
import { getStore } from '@/lib/store';
import { buildWebhookPayload } from '@/lib/side-effects/serialize';
import { AdminUnlockButton } from '@/components/AdminUnlockButton';

export const dynamic = 'force-dynamic';

export default async function AdminSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-muted">Not authorized.</div>;
  }
  const { id } = await params;
  const store = await getStore();
  const sub = await store.getById(id);
  if (!sub) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-muted">Not found.</div>;
  }
  const p = buildWebhookPayload(sub);
  const r = sub.answers.requirements;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin" className="text-sm font-semibold text-brand hover:underline">
        ← All intakes
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{sub.email}</h1>
          <p className="text-xs text-muted">
            Client ID {sub.clientId} · submitted {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '—'}
          </p>
        </div>
        <AdminUnlockButton id={sub.id} locked={sub.locked} />
      </div>

      <Section title="Top 5 functions">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {p.functions.top5.map((f) => (
            <li key={f.id}>{f.label}</li>
          ))}
        </ol>
      </Section>

      <Section title="Top 5 values">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {p.values.top5.map((v) => (
            <li key={v.id}>{v.label}</li>
          ))}
        </ol>
      </Section>

      <Section title={`All checked functions with ratings (${p.functions.all.length})`}>
        <ul className="space-y-1 text-sm">
          {p.functions.all.map((f) => (
            <li key={f.id} className="flex justify-between gap-3">
              <span>
                {f.label}
                <span className="text-muted"> · {f.categoryName}</span>
              </span>
              <span className="flex-none font-mono text-xs text-muted">
                {f.rating ?? '—'}
                {f.top10 ? ' ·10' : ''}
                {f.top5 ? ' ·5' : ''}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Work requirements">
        <dl className="space-y-1.5 text-sm">
          <Row k="Current job title" v={r.currentJobTitle} />
          <Row k="Minimum salary" v={r.salaryMin == null ? '' : `$${r.salaryMin.toLocaleString('en-US')} / year`} />
          <Row k="Max travel days / month" v={r.maxTravelDaysPerMonth} />
          <Row k="Location" v={r.location} />
          <Row k="Office preference" v={r.officePreference} />
          <Row k="Advanced degrees" v={r.advancedDegrees} />
          <Row k="Years in workforce" v={r.yearsInWorkforce} />
          <Row k="Other notes" v={r.otherNotes} />
        </dl>
      </Section>

      <Section title="Career Highlight Stories">
        <div className="space-y-4">
          {sub.answers.stories.map((s, i) => (
            <div key={i} className="rounded-lg border border-border p-3 text-sm">
              <p className="mb-1 font-semibold">Story {i + 1}</p>
              <StoryField label="Moment" v={s.moment} />
              <StoryField label="What got you involved" v={s.involvement} />
              <StoryField label="Actions taken" v={s.actions} />
              <StoryField label="What was enjoyable" v={s.enjoyment} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-xl border border-border bg-card p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-44 flex-none text-muted">{k}</dt>
      <dd className="flex-1">{v || <span className="text-muted">—</span>}</dd>
    </div>
  );
}
function StoryField({ label, v }: { label: string; v: string }) {
  return (
    <p className="mb-1">
      <span className="text-muted">{label}:</span> {v || <span className="text-muted">—</span>}
    </p>
  );
}
