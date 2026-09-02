'use client';
import { functionItemLabel, valueLabel } from '@/lib/config';
import {
  completedStoryCount,
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
          <h3 className="font-semibold">Top 5 functions</h3>
          <EditLink onClick={() => onEdit('functions-top5')} />
        </div>
        {top5Fns.length ? (
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {top5Fns.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
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
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {top5Vals.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
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
