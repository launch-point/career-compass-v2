// Pure per-step "can the client advance?" logic + the message shown when they
// cannot. Mirrors the spec's minimums (Sections A/B/D and Section 7 edges).
import type { Step } from './steps';
import type { IntakeAnswers } from './types';
import {
  MIN_FUNCTIONS_RATED_HIGH,
  MIN_VALUES_CHECKED,
  TOP10_COUNT,
  TOP5_COUNT,
  checkedValueIds,
  functionIdsRatedHigh,
  functionTop10Ids,
  functionTop5Ids,
  unratedCheckedFunctionIds,
  valueTop10Ids,
  valueTop5Ids,
} from './answers';

export interface AdvanceGate {
  ok: boolean;
  reason?: string;
}

export function advanceGate(step: Step, a: IntakeAnswers): AdvanceGate {
  switch (step.kind) {
    case 'functions-rating': {
      const unrated = unratedCheckedFunctionIds(a).length;
      if (unrated > 0) {
        return { ok: false, reason: `Give every checked function a rating to continue (${unrated} left).` };
      }
      const high = functionIdsRatedHigh(a).length;
      if (high < MIN_FUNCTIONS_RATED_HIGH) {
        return {
          ok: false,
          reason: `You have ${high} function${high === 1 ? '' : 's'} rated 4 or 5. At least ${MIN_FUNCTIONS_RATED_HIGH} are needed to choose a top 10 — revisit your ratings, or go back and check more functions.`,
        };
      }
      return { ok: true };
    }
    case 'functions-top10': {
      const n = functionTop10Ids(a).length;
      return n === TOP10_COUNT ? { ok: true } : { ok: false, reason: `Choose exactly ${TOP10_COUNT} (currently ${n}).` };
    }
    case 'functions-top5': {
      const n = functionTop5Ids(a).length;
      return n === TOP5_COUNT ? { ok: true } : { ok: false, reason: `Choose exactly ${TOP5_COUNT} (currently ${n}).` };
    }
    case 'values-elimination': {
      const n = checkedValueIds(a).length;
      return n >= MIN_VALUES_CHECKED
        ? { ok: true }
        : { ok: false, reason: `Check at least ${MIN_VALUES_CHECKED} values that resonate (currently ${n}).` };
    }
    case 'values-top10': {
      const n = valueTop10Ids(a).length;
      return n === TOP10_COUNT ? { ok: true } : { ok: false, reason: `Choose exactly ${TOP10_COUNT} (currently ${n}).` };
    }
    case 'values-top5': {
      const n = valueTop5Ids(a).length;
      return n === TOP5_COUNT ? { ok: true } : { ok: false, reason: `Choose exactly ${TOP5_COUNT} (currently ${n}).` };
    }
    // Category walk, requirements, stories, review: free to advance.
    default:
      return { ok: true };
  }
}
