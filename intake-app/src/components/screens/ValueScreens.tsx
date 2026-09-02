'use client';
import { useEffect } from 'react';
import { valuesConfig, valueLabel } from '@/lib/config';
import {
  MIN_VALUES_CHECKED,
  TOP10_COUNT,
  TOP5_COUNT,
  checkedValueIds,
  valueTop10Ids,
} from '@/lib/answers';
import { useIntakeStore } from '@/store/intakeStore';
import { CheckPill, Counter, PhaseIntro, TextField } from '@/components/ui';

// Values Phase 1 — flat elimination checklist (min 10).
export function ValuesEliminationScreen() {
  const answers = useIntakeStore((s) => s.answers);
  const items = answers.values.items;
  const other = answers.values.other;
  const toggle = useIntakeStore((s) => s.toggleValueChecked);
  const setOther = useIntakeStore((s) => s.setValueOther);
  const n = checkedValueIds(answers).length;

  return (
    <div className="space-y-4">
      <PhaseIntro eyebrow="Values · Step 1 of 3 · Check">
        Place a check mark next to the Values that you feel describe what is important to you in
        yourself, other people, and work, and culture.
      </PhaseIntro>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Which values resonate?</h2>
          <p className="mt-1 text-sm text-muted">Check at least {MIN_VALUES_CHECKED}.</p>
        </div>
        <Counter n={n} max={MIN_VALUES_CHECKED} noun="min" />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {valuesConfig.values.map((v) => (
          <CheckPill
            key={v.id}
            label={v.label}
            selected={!!items[v.id]?.checked}
            onToggle={() => toggle(v.id)}
          />
        ))}
      </div>
      <TextField
        label="Others (optional)"
        value={other}
        onChange={setOther}
        placeholder="Any values we didn’t list…"
      />
    </div>
  );
}

// Values Phase 2 — narrow the checked list to 10.
export function ValuesTop10Screen() {
  const answers = useIntakeStore((s) => s.answers);
  const items = answers.values.items;
  const toggle = useIntakeStore((s) => s.toggleValueTop10);
  const pool = checkedValueIds(answers);
  const selected = valueTop10Ids(answers);

  useEffect(() => {
    for (const id of selected) {
      if (!pool.includes(id)) toggle(id, Number.POSITIVE_INFINITY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <div className="space-y-4">
      <PhaseIntro eyebrow="Values · Step 2 of 3 · Top 10">
        Examine all the ones you marked and narrow down to your top 10 values.
      </PhaseIntro>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Choose your top 10 values</h2>
          <p className="mt-1 text-sm text-muted">From the values you checked.</p>
        </div>
        <Counter n={selected.length} max={TOP10_COUNT} noun="" />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {pool.map((id) => {
          const isSel = items[id]?.top10;
          return (
            <CheckPill
              key={id}
              label={valueLabel[id]}
              selected={!!isSel}
              onToggle={() => toggle(id, TOP10_COUNT)}
              disabled={!isSel && selected.length >= TOP10_COUNT}
            />
          );
        })}
      </div>
    </div>
  );
}

// Values Phase 3 — narrow the 10 to a final 5.
export function ValuesTop5Screen() {
  const answers = useIntakeStore((s) => s.answers);
  const items = answers.values.items;
  const toggle = useIntakeStore((s) => s.toggleValueTop5);
  const pool = valueTop10Ids(answers);
  const selected = pool.filter((id) => items[id]?.top5);

  useEffect(() => {
    for (const id of Object.keys(items)) {
      if (items[id]?.top5 && !pool.includes(id)) toggle(id, Number.POSITIVE_INFINITY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <div className="space-y-4">
      <PhaseIntro eyebrow="Values · Step 3 of 3 · Top 5">
        Narrow down from ten to a five final top values.
      </PhaseIntro>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Choose your top 5 values</h2>
          <p className="mt-1 text-sm text-muted">These five are the core you’ll build your next role around.</p>
        </div>
        <Counter n={selected.length} max={TOP5_COUNT} noun="" />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {pool.map((id) => {
          const isSel = items[id]?.top5;
          return (
            <CheckPill
              key={id}
              label={valueLabel[id]}
              selected={!!isSel}
              onToggle={() => toggle(id, TOP5_COUNT)}
              disabled={!isSel && selected.length >= TOP5_COUNT}
            />
          );
        })}
      </div>
    </div>
  );
}
