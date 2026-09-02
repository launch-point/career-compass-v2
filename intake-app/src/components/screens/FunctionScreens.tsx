'use client';
import { useEffect, useMemo, useState } from 'react';
import { functionCategories, functionItemLabel } from '@/lib/config';
import {
  LARGE_CHECK_NUDGE,
  TOP10_COUNT,
  TOP5_COUNT,
  checkedFunctionIds,
  functionIdsRatedHigh,
  functionTop10Ids,
} from '@/lib/answers';
import { useIntakeStore } from '@/store/intakeStore';
import { CheckPill, Counter, Notice, PhaseIntro, ProgressBar, RatingRow, TextField } from '@/components/ui';

// Phase 1 — one category screen (one of 19 in the walk).
export function FunctionsCategoryScreen({ categoryId }: { categoryId: string }) {
  const cat = functionCategories.find((c) => c.id === categoryId)!;
  const items = useIntakeStore((s) => s.answers.functions.items);
  const other = useIntakeStore((s) => s.answers.functions.categoryOther[categoryId] ?? '');
  const toggle = useIntakeStore((s) => s.toggleFunctionChecked);
  const setOther = useIntakeStore((s) => s.setFunctionCategoryOther);

  return (
    <div className="space-y-4">
      <PhaseIntro eyebrow="Functions · Step 1 of 4 · Check">
        Place a check mark in front of the functions that you have done in prior jobs, come naturally
        to you, or express what you do best. Be selective and just mark the most important stuff. Do
        your best to limit your selections to just a few.
      </PhaseIntro>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {cat.jobCategoryName}
          {cat.branchName ? ` · ${cat.branchName}` : ''} · Category {cat.walkIndex} of 19
        </p>
        <h2 className="mt-1 text-xl font-bold">{cat.name}</h2>
      </div>
      <div className="space-y-2">
        {cat.items.map((it) => (
          <CheckPill
            key={it.id}
            label={it.label}
            selected={!!items[it.id]?.checked}
            onToggle={() => toggle(it.id)}
          />
        ))}
      </div>
      <TextField
        label="Other (optional)"
        value={other}
        onChange={(v) => setOther(categoryId, v)}
        placeholder="Anything in this category we didn’t list…"
      />
    </div>
  );
}

// Phase 2 — paginated 1–5 rating of every checked function.
const PAGE_SIZE = 8;
export function FunctionsRatingScreen() {
  const answers = useIntakeStore((s) => s.answers);
  const items = answers.functions.items;
  const setRating = useIntakeStore((s) => s.setFunctionRating);
  const checked = useMemo(() => checkedFunctionIds(answers), [answers]);
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(checked.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const pageIds = checked.slice(start, start + PAGE_SIZE);
  const ratedCount = checked.filter((id) => items[id]?.rating != null).length;
  const highCount = checked.filter((id) => items[id]?.rating === 4 || items[id]?.rating === 5).length;

  if (checked.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Rate your natural ability</h2>
        <Notice tone="warn">
          You haven’t checked any functions yet. Go back and check the functions you’ve done in a paid
          job, then return here to rate them.
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PhaseIntro eyebrow="Functions · Step 2 of 4 · Rate">
        Go back over the functions again. Examine all the ones you marked and rate your estimated
        natural ability for each using the rating buttons. One is the lowest rating; five is the
        highest. This way you will have a guide to your top functions based on your sense of fit,
        appeal, and talent.
      </PhaseIntro>
      <div>
        <h2 className="text-xl font-bold">Rate your natural ability</h2>
        <p className="mt-1 text-sm text-muted">
          These are the functions you just checked — now rate each one. You’ll need at least 10 rated
          4 or 5 to continue.
        </p>
      </div>
      {checked.length >= LARGE_CHECK_NUDGE && (
        <Notice tone="info">
          You checked {checked.length} functions — that’s a lot to rate. Be honest and quick; your gut
          score is usually right.
        </Notice>
      )}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Page {page + 1} of {pageCount}
        </span>
        <span>
          {ratedCount}/{checked.length} rated · {highCount} at 4–5
        </span>
      </div>
      <ProgressBar value={ratedCount} max={checked.length} />
      <div className="space-y-2">
        {pageIds.map((id) => (
          <div key={id} className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">{functionItemLabel[id]}</span>
            <RatingRow value={items[id]?.rating ?? null} onChange={(n) => setRating(id, n)} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="text-sm font-semibold text-muted disabled:opacity-30"
        >
          ← Previous page
        </button>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          disabled={page >= pageCount - 1}
          className="text-sm font-semibold text-muted disabled:opacity-30"
        >
          Next page →
        </button>
      </div>
    </div>
  );
}

// Phase 3 — narrow the rated-4/5 pool to exactly 10.
export function FunctionsTop10Screen() {
  const answers = useIntakeStore((s) => s.answers);
  const items = answers.functions.items;
  const toggle = useIntakeStore((s) => s.toggleFunctionTop10);
  const pool = functionIdsRatedHigh(answers);
  const selected = functionTop10Ids(answers);

  // Prune any top10 selection that fell out of the pool (e.g. rating lowered).
  useEffect(() => {
    for (const id of selected) {
      if (!pool.includes(id)) toggle(id, Number.POSITIVE_INFINITY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <div className="space-y-4">
      <PhaseIntro eyebrow="Functions · Step 3 of 4 · Top 10">
        Narrow down your top functions to a maximum of ten by looking at the functions that you rated
        as 4 or 5 only.
      </PhaseIntro>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Choose your top 10 functions</h2>
          <p className="mt-1 text-sm text-muted">
            From the functions you rated 4 or 5 — pick the 10 you enjoy most.
          </p>
        </div>
        <Counter n={selected.length} max={TOP10_COUNT} noun="" />
      </div>
      <div className="space-y-2">
        {pool.map((id) => {
          const isSel = items[id]?.top10;
          return (
            <CheckPill
              key={id}
              label={functionItemLabel[id]}
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

// Phase 4 — narrow the 10 to a final 5.
export function FunctionsTop5Screen() {
  const answers = useIntakeStore((s) => s.answers);
  const items = answers.functions.items;
  const toggle = useIntakeStore((s) => s.toggleFunctionTop5);
  const pool = functionTop10Ids(answers);
  const selected = pool.filter((id) => items[id]?.top5);

  useEffect(() => {
    for (const id of Object.keys(items)) {
      if (items[id]?.top5 && !pool.includes(id)) toggle(id, Number.POSITIVE_INFINITY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <div className="space-y-4">
      <PhaseIntro eyebrow="Functions · Step 4 of 4 · Top 5">
        Narrow down from ten to a five final, most important, most fitting functions from the entire
        list. Get to the real essentials. If you have difficulty getting to 5, one way to reduce the
        number of your selections is to imagine performing them for several hours each day forever. Do
        any of them lose their appeal when put to the volume test? Push yourself to get past the
        romance of functions that may sound good, but only for a few hours a week or less.
      </PhaseIntro>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Choose your top 5 functions</h2>
          <p className="mt-1 text-sm text-muted">From your top 10 — get to the five that matter most.</p>
        </div>
        <Counter n={selected.length} max={TOP5_COUNT} noun="" />
      </div>
      <div className="space-y-2">
        {pool.map((id) => {
          const isSel = items[id]?.top5;
          return (
            <CheckPill
              key={id}
              label={functionItemLabel[id]}
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
