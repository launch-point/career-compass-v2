// Serializes a Submission into the two downstream shapes:
//   - the webhook payload fired to the orchestrator
//   - the row appended to the Intake Submissions sheet
// Documented in docs/api-contracts.md. Keep in sync with that file.

import {
  functionCategories,
  functionItemLabel,
  functionItemCategory,
  valueLabel,
} from '@/lib/config';
import {
  checkedFunctionIds,
  checkedValueIds,
  functionTop10Ids,
  functionTop5Ids,
  valueTop10Ids,
  valueTop5Ids,
} from '@/lib/answers';
import type { Submission } from '@/lib/types';

const catName: Record<string, string> = Object.fromEntries(
  functionCategories.map((c) => [c.id, c.name]),
);
const catJob: Record<string, string> = Object.fromEntries(
  functionCategories.map((c) => [c.id, c.jobCategoryName]),
);

export interface FunctionSelection {
  id: string;
  label: string;
  categoryId: string;
  categoryName: string;
  jobCategory: string;
  rating: number | null;
  top10: boolean;
  top5: boolean;
}

export interface WebhookPayload {
  clientId: string;
  email: string;
  submissionId: string;
  status: Submission['status'];
  locked: boolean;
  submittedAt: string | null;
  functions: {
    /** The client's final top 5, as plain label strings (for easy downstream use). */
    top5: string[];
    /** Items 6–10 (top 10 minus top 5) — a distinct, non-overlapping list of label strings. */
    next5: string[];
    /** Every CHECKED function with its rating + selection flags + grouping. */
    all: FunctionSelection[];
    /** Per-category free-text "Other" entries (only non-empty ones). */
    categoryOther: Record<string, string>;
  };
  values: {
    /** Top 5 values, as plain label strings. */
    top5: string[];
    /** Items 6–10 (top 10 minus top 5), non-overlapping label strings. */
    next5: string[];
    checked: { id: string; label: string }[];
    other: string;
  };
  requirements: Submission['answers']['requirements'];
  stories: Record<string, string>; // story1_moment ... story4_enjoyment (16 keys)
}

function labelPairs(ids: string[], lookup: Record<string, string>) {
  return ids.map((id) => ({ id, label: lookup[id] ?? id }));
}

function labelsOnly(ids: string[], lookup: Record<string, string>): string[] {
  return ids.map((id) => lookup[id] ?? id);
}

export function storyFields(sub: Submission): Record<string, string> {
  const out: Record<string, string> = {};
  sub.answers.stories.forEach((s, i) => {
    const n = i + 1;
    out[`story${n}_moment`] = s.moment;
    out[`story${n}_involvement`] = s.involvement;
    out[`story${n}_actions`] = s.actions;
    out[`story${n}_enjoyment`] = s.enjoyment;
  });
  return out;
}

export function buildWebhookPayload(sub: Submission): WebhookPayload {
  const a = sub.answers;
  const checkedFns = checkedFunctionIds(a);
  const all: FunctionSelection[] = checkedFns.map((id) => {
    const item = a.functions.items[id];
    const cid = functionItemCategory[id];
    return {
      id,
      label: functionItemLabel[id] ?? id,
      categoryId: cid,
      categoryName: catName[cid] ?? cid,
      jobCategory: catJob[cid] ?? '',
      rating: item.rating,
      top10: item.top10,
      top5: item.top5,
    };
  });
  const categoryOther: Record<string, string> = {};
  for (const [cid, text] of Object.entries(a.functions.categoryOther)) {
    if (text && text.trim()) categoryOther[cid] = text.trim();
  }

  // top5 and next5 are distinct, non-overlapping 5-item lists (next5 = top10 minus top5).
  const fnTop5 = functionTop5Ids(a);
  const fnNext5 = functionTop10Ids(a).filter((id) => !fnTop5.includes(id));
  const valTop5 = valueTop5Ids(a);
  const valNext5 = valueTop10Ids(a).filter((id) => !valTop5.includes(id));

  return {
    clientId: sub.clientId,
    email: sub.email,
    submissionId: sub.id,
    status: sub.status,
    locked: sub.locked,
    submittedAt: sub.submittedAt,
    functions: {
      top5: labelsOnly(fnTop5, functionItemLabel),
      next5: labelsOnly(fnNext5, functionItemLabel),
      all,
      categoryOther,
    },
    values: {
      top5: labelsOnly(valTop5, valueLabel),
      next5: labelsOnly(valNext5, valueLabel),
      checked: labelPairs(checkedValueIds(a), valueLabel),
      other: a.values.other,
    },
    requirements: a.requirements,
    stories: storyFields(sub),
  };
}

// --- Sheets row --------------------------------------------------------------

export const SHEETS_COLUMNS = [
  'submitted_at',
  'client_id',
  'email',
  'current_job_title',
  'salary_min',
  'salary_period',
  'max_travel_days_per_month',
  'location',
  'office_preference',
  'advanced_degrees',
  'years_in_workforce',
  'other_notes',
  'functions_top5',
  'functions_top10',
  'values_top5',
  'values_top10',
  'values_checked',
  'functions_ratings_json',
  'story1_moment',
  'story1_involvement',
  'story1_actions',
  'story1_enjoyment',
  'story2_moment',
  'story2_involvement',
  'story2_actions',
  'story2_enjoyment',
  'story3_moment',
  'story3_involvement',
  'story3_actions',
  'story3_enjoyment',
  'story4_moment',
  'story4_involvement',
  'story4_actions',
  'story4_enjoyment',
  'locked',
] as const;

export function buildSheetsRow(sub: Submission): (string | number)[] {
  const p = buildWebhookPayload(sub);
  const r = sub.answers.requirements;
  const stories = p.stories;
  const joinLabels = (arr: { label: string }[]) => arr.map((x) => x.label).join(' | ');
  const joinStr = (arr: string[]) => arr.join(' | ');
  return [
    sub.submittedAt ?? '',
    sub.clientId,
    sub.email,
    r.currentJobTitle,
    r.salaryMin ?? '',
    r.salaryPeriod,
    r.maxTravelDaysPerMonth,
    r.location,
    r.officePreference,
    r.advancedDegrees,
    r.yearsInWorkforce,
    r.otherNotes,
    joinStr(p.functions.top5),
    // functions_top10 column keeps its original meaning (the full 10) = top5 + next5.
    joinStr([...p.functions.top5, ...p.functions.next5]),
    joinStr(p.values.top5),
    joinStr([...p.values.top5, ...p.values.next5]),
    joinLabels(p.values.checked),
    JSON.stringify(p.functions.all),
    stories.story1_moment,
    stories.story1_involvement,
    stories.story1_actions,
    stories.story1_enjoyment,
    stories.story2_moment,
    stories.story2_involvement,
    stories.story2_actions,
    stories.story2_enjoyment,
    stories.story3_moment,
    stories.story3_involvement,
    stories.story3_actions,
    stories.story3_enjoyment,
    stories.story4_moment,
    stories.story4_involvement,
    stories.story4_actions,
    stories.story4_enjoyment,
    sub.locked ? 'TRUE' : 'FALSE',
  ];
}
