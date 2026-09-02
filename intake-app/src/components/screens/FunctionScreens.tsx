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
import { CheckPill, Counter, Notice, ProgressBar, RatingRow, TextField } from '@/components/ui';

// Phase 1 — one category screen (one of 19 in the walk).
export function FunctionsCategoryScreen({ categoryId }: { categoryId: string }) {
  const cat = functionCategories.find((c) => c.id === categoryId)!;
  const items = useIntakeStore((s) => s.answers.functions.items);
  const other = useIntakeStore((s) => s.answers.functions.categoryOther[categoryId] ?? '');
  const toggle = useIntakeStore((s) => s.toggleFunctionChecked);
  const setOther = useIntakeStore((s) => s.setFunctionCategoryOther);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {cat.jobCategoryName}
          {cat.branchName ? ` · ${cat.branchName}` : ''} · Category {cat.walkIndex} of 19
        </p>
        <h2 className="mt-1 text-xl font-bold">{cat.name}</h2>
        <p className="mt-1 text-sm text-muted">
          Check every function you have done before in a <strong>paid job</strong>. Don’t judge skill
          or enjoyment yet — just “have I done this.”
        </p>
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
      <div>
        <h2 className="text-xl font-bold">Rate your natural ability</h2>
        <p className="mt-1 text-sm text-muted">
          For each function, rate how naturally it comes to you: <strong>5 = highest</strong> natural
          ability. You’ll need at least 10 rated 4 or 5 to continue.
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Choose your top 10 functions</h2>
          <p className="mt-1 text-sm text-muted">
            From the functions you rated 4 or 5, pick the 10 you enjoy most. This is a gut call —
            weigh how much you like doing them.
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Choose your top 5 functions</h2>
          <p className="mt-1 text-sm text-muted">
            Imagine performing each of these for several hours a day, for the rest of your working
            life. If it loses its appeal under that lens, don’t include it.
          </p>
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
