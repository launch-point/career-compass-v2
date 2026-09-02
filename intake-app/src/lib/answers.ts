// Answer factory + derived selectors + gate checks shared by the wizard UI and
// the server-side submit validation. Keep this pure (no React, no Supabase).

import { allFunctionItemIds, functionItemCategory, valuesConfig } from './config';
import type { IntakeAnswers, StoryAnswer, StoriesAnswer } from './types';

// ---------------------------------------------------------------------------
// Factory — a fully-formed empty answer object (every item present).
// ---------------------------------------------------------------------------

function emptyStory(): StoryAnswer {
  return { moment: '', involvement: '', actions: '', enjoyment: '' };
}

export function emptyAnswers(): IntakeAnswers {
  const functionsItems: IntakeAnswers['functions']['items'] = {};
  for (const id of allFunctionItemIds) {
    functionsItems[id] = {
      categoryId: functionItemCategory[id],
      checked: false,
      rating: null,
      top10: false,
      top5: false,
    };
  }

  const valuesItems: IntakeAnswers['values']['items'] = {};
  for (const v of valuesConfig.values) {
    valuesItems[v.id] = { checked: false, top10: false, top5: false };
  }

  return {
    functions: { items: functionsItems, categoryOther: {} },
    values: { items: valuesItems, other: '' },
    requirements: {
      currentJobTitle: '',
      salaryMin: null,
      salaryPeriod: 'annual',
      maxTravelDaysPerMonth: '',
      location: '',
      officePreference: '',
      advancedDegrees: '',
      yearsInWorkforce: '',
      otherNotes: '',
    },
    stories: [emptyStory(), emptyStory(), emptyStory(), emptyStory()] as StoriesAnswer,
  };
}

/** Merge a possibly-partial stored answer object onto a fresh empty one, so new
 *  config items (added later) don't crash older drafts. */
export function hydrateAnswers(stored: Partial<IntakeAnswers> | null | undefined): IntakeAnswers {
  const base = emptyAnswers();
  if (!stored) return base;
  return {
    functions: {
      items: { ...base.functions.items, ...(stored.functions?.items ?? {}) },
      categoryOther: { ...(stored.functions?.categoryOther ?? {}) },
    },
    values: {
      items: { ...base.values.items, ...(stored.values?.items ?? {}) },
      other: stored.values?.other ?? '',
    },
    requirements: { ...base.requirements, ...(stored.requirements ?? {}) },
    stories: [0, 1, 2, 3].map((i) => ({
      ...emptyStory(),
      ...(stored.stories?.[i] ?? {}),
    })) as StoriesAnswer,
  };
}

// ---------------------------------------------------------------------------
// Function selectors
// ---------------------------------------------------------------------------

export const MIN_FUNCTIONS_RATED_HIGH = 10; // Phase 3 pool minimum
export const MIN_VALUES_CHECKED = 10; // Values Phase 2 minimum
export const TOP10_COUNT = 10;
export const TOP5_COUNT = 5;
export const MIN_STORIES_COMPLETE = 3;
export const LARGE_CHECK_NUDGE = 60; // gentle nudge when rating pool is huge

export function checkedFunctionIds(a: IntakeAnswers): string[] {
  return allFunctionItemIds.filter((id) => a.functions.items[id]?.checked);
}

/** Items eligible for the top-10 pool: checked AND rated 4 or 5. */
export function functionIdsRatedHigh(a: IntakeAnswers): string[] {
  return checkedFunctionIds(a).filter((id) => {
    const r = a.functions.items[id]?.rating;
    return r === 4 || r === 5;
  });
}

export function functionTop10Ids(a: IntakeAnswers): string[] {
  return allFunctionItemIds.filter((id) => a.functions.items[id]?.top10);
}

export function functionTop5Ids(a: IntakeAnswers): string[] {
  return allFunctionItemIds.filter((id) => a.functions.items[id]?.top5);
}

/** Checked items that still need a rating (drives the rating gate). */
export function unratedCheckedFunctionIds(a: IntakeAnswers): string[] {
  return checkedFunctionIds(a).filter((id) => a.functions.items[id]?.rating == null);
}

// ---------------------------------------------------------------------------
// Value selectors
// ---------------------------------------------------------------------------

export function checkedValueIds(a: IntakeAnswers): string[] {
  return valuesConfig.values.filter((v) => a.values.items[v.id]?.checked).map((v) => v.id);
}

export function valueTop10Ids(a: IntakeAnswers): string[] {
  return valuesConfig.values.filter((v) => a.values.items[v.id]?.top10).map((v) => v.id);
}

export function valueTop5Ids(a: IntakeAnswers): string[] {
  return valuesConfig.values.filter((v) => a.values.items[v.id]?.top5).map((v) => v.id);
}

// ---------------------------------------------------------------------------
// Story selectors
// ---------------------------------------------------------------------------

export function isStoryComplete(s: StoryAnswer): boolean {
  return (
    s.moment.trim() !== '' &&
    s.involvement.trim() !== '' &&
    s.actions.trim() !== '' &&
    s.enjoyment.trim() !== ''
  );
}

export function completedStoryCount(a: IntakeAnswers): number {
  return a.stories.filter(isStoryComplete).length;
}

// ---------------------------------------------------------------------------
// Submission-level gate (must all pass to submit) — mirrored server-side.
// ---------------------------------------------------------------------------

export interface GateResult {
  ok: boolean;
  problems: string[];
}

export function submissionGate(a: IntakeAnswers): GateResult {
  const problems: string[] = [];
  if (functionTop5Ids(a).length !== TOP5_COUNT) {
    problems.push('Select exactly 5 top functions.');
  }
  if (valueTop5Ids(a).length !== TOP5_COUNT) {
    problems.push('Select exactly 5 top values.');
  }
  if (completedStoryCount(a) < MIN_STORIES_COMPLETE) {
    problems.push('Complete at least 3 of the 4 Career Highlight Stories.');
  }
  return { ok: problems.length === 0, problems };
}
