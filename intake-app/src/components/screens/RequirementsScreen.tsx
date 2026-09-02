'use client';
import { useIntakeStore } from '@/store/intakeStore';
import { TextArea, TextField } from '@/components/ui';

export function RequirementsScreen() {
  const r = useIntakeStore((s) => s.answers.requirements);
  const set = useIntakeStore((s) => s.setRequirement);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Work requirements</h2>
        <p className="mt-1 text-sm text-muted">A few practical constraints for your next role.</p>
      </div>

      <TextField label="What is your current job title?" value={r.currentJobTitle} onChange={(v) => set('currentJobTitle', v)} />

      {/* Salary — structured number (annual USD). */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          What is the minimum salary requirement for your next job?
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">$</span>
          <input
            inputMode="numeric"
            value={r.salaryMin == null ? '' : r.salaryMin.toLocaleString('en-US')}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, '');
              set('salaryMin', digits === '' ? null : Number(digits));
            }}
            placeholder="85,000"
            className="w-40 rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <span className="text-sm text-muted">/ year</span>
        </div>
      </label>

      <TextField
        label="What is the maximum amount of travel days per month that would be acceptable to you?"
        value={r.maxTravelDaysPerMonth}
        onChange={(v) => set('maxTravelDaysPerMonth', v)}
      />
      <TextField label="Where do you live? (City, State)" value={r.location} onChange={(v) => set('location', v)} />
      <TextField
        label="What is your office preference? (Remote, Hybrid, In Office, a combination)"
        value={r.officePreference}
        onChange={(v) => set('officePreference', v)}
      />
      <TextField
        label="Do you have any advanced degrees in anything besides what you would get at seminary or bible school?"
        value={r.advancedDegrees}
        onChange={(v) => set('advancedDegrees', v)}
      />
      <TextField
        label="How many years have you been in the workforce working full time?"
        value={r.yearsInWorkforce}
        onChange={(v) => set('yearsInWorkforce', v)}
      />
      <TextArea
        label="Any other notes about your preferences we should take into account?"
        value={r.otherNotes}
        onChange={(v) => set('otherNotes', v)}
      />
    </div>
  );
}
