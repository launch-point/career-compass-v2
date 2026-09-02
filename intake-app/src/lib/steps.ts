// The ordered wizard flow (Sections A–F), derived from config.
// Each step is one screen the client sees. Progress indicators are computed
// from a step's section + index.

import { functionCategories } from './config';

export type StepSection =
  | 'functions'
  | 'values'
  | 'requirements'
  | 'stories'
  | 'review';

export type StepKind =
  | 'functions-category' // Phase 1: one of 19 category-walk screens
  | 'functions-rating' // Phase 2: paginated 1–5 rating of checked items
  | 'functions-top10' // Phase 3: narrow rated-4/5 pool to 10
  | 'functions-top5' // Phase 4: narrow 10 to 5
  | 'functions-values-transition' // interstitial between the two tracks
  | 'values-elimination' // Values Phase 1
  | 'values-top10' // Values Phase 2
  | 'values-top5' // Values Phase 3
  | 'requirements' // Section C
  | 'story' // Section D: one of 4 story screens
  | 'review'; // Section F

export interface Step {
  id: string;
  kind: StepKind;
  section: StepSection;
  title: string;
  /** For kind === 'functions-category'. */
  categoryId?: string;
  /** For kind === 'story' (0-based). */
  storyIndex?: number;
}

function buildSteps(): Step[] {
  const steps: Step[] = [];

  // Section A — Functions Phase 1: 19 category screens in walk order.
  for (const cat of functionCategories) {
    steps.push({
      id: `functions-category:${cat.id}`,
      kind: 'functions-category',
      section: 'functions',
      title: cat.name,
      categoryId: cat.id,
    });
  }
  // Functions Phases 2–4.
  steps.push({ id: 'functions-rating', kind: 'functions-rating', section: 'functions', title: 'Rate your natural ability' });
  steps.push({ id: 'functions-top10', kind: 'functions-top10', section: 'functions', title: 'Choose your top 10 functions' });
  steps.push({ id: 'functions-top5', kind: 'functions-top5', section: 'functions', title: 'Choose your top 5 functions' });

  // Interstitial — hand-off from functions to values (no gate).
  steps.push({ id: 'functions-values-transition', kind: 'functions-values-transition', section: 'values', title: 'Now, your values' });

  // Section B — Values.
  steps.push({ id: 'values-elimination', kind: 'values-elimination', section: 'values', title: 'Which values resonate?' });
  steps.push({ id: 'values-top10', kind: 'values-top10', section: 'values', title: 'Choose your top 10 values' });
  steps.push({ id: 'values-top5', kind: 'values-top5', section: 'values', title: 'Choose your top 5 values' });

  // Section C — Requirements.
  steps.push({ id: 'requirements', kind: 'requirements', section: 'requirements', title: 'Work requirements' });

  // Section D — Career Highlight Stories (4).
  for (let i = 0; i < 4; i++) {
    steps.push({
      id: `story:${i + 1}`,
      kind: 'story',
      section: 'stories',
      title: `Career Highlight Story ${i + 1}`,
      storyIndex: i,
    });
  }

  // Section F — Review & submit.
  steps.push({ id: 'review', kind: 'review', section: 'review', title: 'Review & submit' });

  return steps;
}

export const STEPS: Step[] = buildSteps();

export const STEP_IDS: string[] = STEPS.map((s) => s.id);

export function stepIndex(id: string): number {
  return STEP_IDS.indexOf(id);
}

export function getStep(id: string): Step | undefined {
  return STEPS.find((s) => s.id === id);
}

/** The five walk-through sections in order, for a section-level progress rail. */
export const SECTION_ORDER: StepSection[] = [
  'functions',
  'values',
  'requirements',
  'stories',
  'review',
];

export const SECTION_LABELS: Record<StepSection, string> = {
  functions: 'Functions',
  values: 'Values',
  requirements: 'Requirements',
  stories: 'Stories',
  review: 'Review',
};
