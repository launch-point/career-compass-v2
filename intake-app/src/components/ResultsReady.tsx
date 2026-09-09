'use client';
// Screen 3 — results ready. Rendered ONLY when the client's row carries a
// report_drive_link. It deliberately does not import the Wizard: a delivered
// client should not load the form's code path, let alone reach it.
//
// The stories are shown the way the client entered them — four labelled parts
// per story, never run together as narrative. The client wrote four separate
// answers and should see four separate answers.
import { useState } from 'react';
import { Card } from '@/components/ui';
import type { StoryAnswer } from '@/lib/types';

const PARTS: { key: keyof StoryAnswer; label: string }[] = [
  { key: 'moment', label: 'The moment' },
  { key: 'involvement', label: 'How you got involved' },
  { key: 'actions', label: 'What you did' },
  { key: 'enjoyment', label: 'What you enjoyed about it' },
];

/**
 * A story earns a tab if ANY part has content.
 *
 * Not "all four": the submit gate only enforces all-four on stories 1–3
 * (wizardGating.ts) and requires 3 of 4 complete overall (answers.ts), so a
 * partially-filled story 4 is a legal submission. Requiring all four here would
 * silently drop something the client actually wrote.
 */
export function storyHasContent(s: StoryAnswer): boolean {
  return PARTS.some(({ key }) => (s[key] ?? '').trim() !== '');
}

export function ResultsReady({
  reportLink,
  stories,
}: {
  reportLink: string;
  stories: StoryAnswer[];
}) {
  // Index into the ORIGINAL array, so labels stay "Story 2" even if 1 is empty.
  const shown = stories
    .map((story, i) => ({ story, n: i + 1 }))
    .filter(({ story }) => storyHasContent(story));
  const [active, setActive] = useState(0);
  const current = shown[Math.min(active, Math.max(shown.length - 1, 0))];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h1 className="text-2xl font-bold">Your Career Compass is ready</h1>
        <p className="mt-2 text-sm text-muted">
          Your coach has finished your report. Open it below — the link stays here, so you can come
          back to it any time.
        </p>
      </div>

      <Card className="mt-6 text-center">
        <a
          href={reportLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-brand px-6 py-3 text-base font-semibold text-white hover:opacity-90"
        >
          Open your Career Compass report →
        </a>
        <p className="mt-3 text-xs text-muted">Opens in Google Drive in a new tab.</p>
      </Card>

      {shown.length > 0 && current && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">Your Career Highlight Stories</h2>
          <p className="mt-1 text-sm text-muted">
            These are the stories you wrote during your intake, exactly as you entered them.
          </p>

          <div
            role="tablist"
            aria-label="Career Highlight Stories"
            className="mt-4 flex flex-wrap gap-2 border-b border-border"
          >
            {shown.map(({ n }, i) => {
              const selected = i === Math.min(active, shown.length - 1);
              return (
                <button
                  key={n}
                  role="tab"
                  type="button"
                  id={`story-tab-${n}`}
                  aria-selected={selected}
                  aria-controls={`story-panel-${n}`}
                  onClick={() => setActive(i)}
                  className={
                    'rounded-t-md px-4 py-2 text-sm font-semibold ' +
                    (selected
                      ? 'border-b-2 border-brand text-foreground'
                      : 'text-muted hover:text-foreground')
                  }
                >
                  Story {n}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`story-panel-${current.n}`}
            aria-labelledby={`story-tab-${current.n}`}
            className="mt-5 space-y-5"
          >
            {PARTS.filter(({ key }) => (current.story[key] ?? '').trim() !== '').map(
              ({ key, label }) => (
                <div key={key}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {label}
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                    {current.story[key]}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>
      )}
    </div>
  );
}
