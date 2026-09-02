// Career Compass v2 — core data model.
//
// This file is the authoritative shape of an intake submission. docs/api-contracts.md
// documents it for the orchestrator. Downstream phases (role matching, PDF, Drive,
// Circle) attach to `Submission.clientId`, so keep that stable.

// ---------------------------------------------------------------------------
// Functions track (Section A)
// ---------------------------------------------------------------------------

/** One function item's answer state across all four functions phases. */
export interface FunctionItemAnswer {
  /** Category id this item belongs to — preserves the Phase 1 grouping even
   *  after the list is flattened for rating/narrowing. */
  categoryId: string;
  /** Phase 1 elimination: has the client done this in a paid job? */
  checked: boolean;
  /** Phase 2 natural-ability rating, 1–5 (5 = highest). null until rated.
   *  Only meaningful when `checked` is true. */
  rating: 1 | 2 | 3 | 4 | 5 | null;
  /** Phase 3: selected into the top 10 (only items rated 4–5 are eligible). */
  top10: boolean;
  /** Phase 4: selected into the final top 5. */
  top5: boolean;
}

export interface FunctionsAnswer {
  /** Keyed by function item id (see config/functions.json). */
  items: Record<string, FunctionItemAnswer>;
  /** Per-category free-text "Other ___" field, keyed by category id. */
  categoryOther: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Values track (Section B) — no rating step
// ---------------------------------------------------------------------------

export interface ValueItemAnswer {
  checked: boolean; // Phase 1 elimination
  top10: boolean; // Phase 2
  top5: boolean; // Phase 3
}

export interface ValuesAnswer {
  /** Keyed by value id (see config/values.json). */
  items: Record<string, ValueItemAnswer>;
  /** Trailing "Others" free-text field. */
  other: string;
}

// ---------------------------------------------------------------------------
// Work requirements (Section C) — exact field wording preserved
// ---------------------------------------------------------------------------

export interface RequirementsAnswer {
  currentJobTitle: string; // Q1
  salaryMin: number | null; // Q2 — structured (integer). null if unanswered.
  salaryPeriod: 'annual'; // fixed: annual USD (only period offered for now)
  maxTravelDaysPerMonth: string; // Q3 — open text per spec
  location: string; // Q4 — "City, State"
  officePreference: string; // Q5 — open text (Remote/Hybrid/In Office/combination)
  advancedDegrees: string; // Q6
  yearsInWorkforce: string; // Q7
  otherNotes: string; // Q8
}

// ---------------------------------------------------------------------------
// Career Highlight Stories (Section D) — 4 stories × 4 sub-questions
// ---------------------------------------------------------------------------

export interface StoryAnswer {
  moment: string; // storyN_moment
  involvement: string; // storyN_involvement
  actions: string; // storyN_actions
  enjoyment: string; // storyN_enjoyment
}

/** Exactly four stories, in order. At least 3 must be fully complete to submit. */
export type StoriesAnswer = [StoryAnswer, StoryAnswer, StoryAnswer, StoryAnswer];

// ---------------------------------------------------------------------------
// Full answer object (what the wizard collects, saved progressively)
// ---------------------------------------------------------------------------

export interface IntakeAnswers {
  functions: FunctionsAnswer;
  values: ValuesAnswer;
  requirements: RequirementsAnswer;
  stories: StoriesAnswer;
}

export type SubmissionStatus = 'draft' | 'submitted';

/** One client's intake record. One row per client (keyed by email). */
export interface Submission {
  id: string;
  /** Stable client id — the join key downstream phases attach to. */
  clientId: string;
  /** Email = the Mission Control join key and the magic-link identity. */
  email: string;
  status: SubmissionStatus;
  /** Locked on submit; only an admin unlock returns it to editable. */
  locked: boolean;
  /** Wizard step id the client last reached (for resume). */
  currentStepId: string | null;
  answers: IntakeAnswers;
  /** Side-effect completion markers — let a partial submit be detected. */
  sheetsWrittenAt: string | null;
  webhookDeliveredAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
