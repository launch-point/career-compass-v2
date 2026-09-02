'use client';
import { functionItemLabel, valueLabel } from '@/lib/config';
import {
  completedStoryCount,
  functionTop10Ids,
  functionTop5Ids,
  isStoryComplete,
  submissionGate,
  valueTop5Ids,
} from '@/lib/answers';
import { useIntakeStore } from '@/store/intakeStore';
import { Card, Notice } from '@/components/ui';

function EditLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-semibold text-brand hover:underline">
      Edit
    </button>
  );
}

export function ReviewScreen({ onEdit }: { onEdit: (stepId: string) => void }) {
  const answers = useIntakeStore((s) => s.answers);
  const r = answers.requirements;
  const gate = submissionGate(answers);

  const top5Fns = functionTop5Ids(answers).map((id) => functionItemLabel[id]);
  // "Next 5" = the top-10 minus the top-5 (display-only regroup; no stored ranking).
  const next5Fns = functionTop10Ids(answers)
    .filter((id) => !answers.functions.items[id]?.top5)
    .map((id) => functionItemLabel[id]);
  const top5Vals = valueTop5Ids(answers).map((id) => valueLabel[id]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Review &amp; submit</h2>
        <p className="mt-1 text-sm text-muted">
          Check everything below. You can edit any section before submitting. Once you submit, your
          intake locks — your coach can unlock it if you need to make a change.
        </p>
      </div>

      {!gate.ok && (
        <Notice tone="warn">
          <p className="font-semibold">Before you can submit:</p>
          <ul className="mt-1 list-disc pl-5">
            {gate.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Notice>
      )}

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Top Functions</h3>
          <EditLink onClick={() => onEdit('functions-top5')} />
        </div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Top 5</p>
        {top5Fns.length ? (
          <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
            {top5Fns.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-sm text-muted">Not selected yet.</p>
        )}
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Next 5 (6–10)</p>
        {next5Fns.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {next5Fns.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Not selected yet.</p>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Top 5 values</h3>
          <EditLink onClick={() => onEdit('values-top5')} />
        </div>
        {top5Vals.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {top5Vals.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Not selected yet.</p>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Work requirements</h3>
          <EditLink onClick={() => onEdit('requirements')} />
        </div>
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
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Career Highlight Stories ({completedStoryCount(answers)} of 4 complete)</h3>
        </div>
        <ul className="space-y-1.5 text-sm">
          {answers.stories.map((s, i) => (
            <li key={i} className="flex items-center justify-between">
              <span>
                {isStoryComplete(s) ? '✓' : '○'} Story {i + 1}
                {s.moment ? ` — ${s.moment.slice(0, 60)}${s.moment.length > 60 ? '…' : ''}` : ''}
              </span>
              <EditLink onClick={() => onEdit(`story:${i + 1}`)} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
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
