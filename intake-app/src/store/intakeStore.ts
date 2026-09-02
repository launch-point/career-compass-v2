'use client';
// Client-side wizard state. Holds the full answer object and autosaves to the
// server (PUT /api/draft) with debounce — this is the save-on-progress that
// makes a mid-form session drop non-destructive. The server draft is the
// source of truth; localStorage is only a same-session safety net.

import { create } from 'zustand';
import { emptyAnswers, hydrateAnswers } from '@/lib/answers';
import type { IntakeAnswers, StoryAnswer, Submission } from '@/lib/types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'locked';

interface IntakeState {
  loaded: boolean;
  email: string | null;
  status: Submission['status'];
  locked: boolean;
  currentStepId: string | null;
  answers: IntakeAnswers;
  saveState: SaveState;
  lastSavedAt: number | null;

  load: () => Promise<void>;
  setCurrentStep: (id: string) => void;

  // functions
  toggleFunctionChecked: (id: string) => void;
  setFunctionRating: (id: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  toggleFunctionTop10: (id: string, max: number) => void;
  toggleFunctionTop5: (id: string, max: number) => void;
  setFunctionCategoryOther: (categoryId: string, text: string) => void;

  // values
  toggleValueChecked: (id: string) => void;
  toggleValueTop10: (id: string, max: number) => void;
  toggleValueTop5: (id: string, max: number) => void;
  setValueOther: (text: string) => void;

  // requirements + stories
  setRequirement: <K extends keyof IntakeAnswers['requirements']>(
    field: K,
    value: IntakeAnswers['requirements'][K],
  ) => void;
  setStory: (index: number, field: keyof StoryAnswer, value: string) => void;

  markSubmitted: (submission: Submission) => void;
  scheduleSave: () => void;
}

const LS_KEY = 'cc-intake-draft';
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useIntakeStore = create<IntakeState>((set, get) => ({
  loaded: false,
  email: null,
  status: 'draft',
  locked: false,
  currentStepId: null,
  answers: emptyAnswers(),
  saveState: 'idle',
  lastSavedAt: null,

  load: async () => {
    // Same-session safety net first (instant), then reconcile with the server.
    if (typeof window !== 'undefined') {
      try {
        const cached = window.localStorage.getItem(LS_KEY);
        if (cached) set({ answers: hydrateAnswers(JSON.parse(cached)) });
      } catch {
        /* ignore */
      }
    }
    const res = await fetch('/api/draft', { method: 'GET' });
    if (!res.ok) {
      set({ loaded: true });
      return;
    }
    const { submission } = (await res.json()) as { submission: Submission };
    set({
      loaded: true,
      email: submission.email,
      status: submission.status,
      locked: submission.locked,
      currentStepId: submission.currentStepId,
      answers: hydrateAnswers(submission.answers),
    });
  },

  setCurrentStep: (id) => {
    set({ currentStepId: id });
    get().scheduleSave();
  },

  toggleFunctionChecked: (id) => {
    set((s) => {
      const item = s.answers.functions.items[id];
      const checked = !item.checked;
      return {
        answers: {
          ...s.answers,
          functions: {
            ...s.answers.functions,
            items: {
              ...s.answers.functions.items,
              // Unchecking clears downstream rating/selection for that item.
              [id]: checked
                ? { ...item, checked: true }
                : { ...item, checked: false, rating: null, top10: false, top5: false },
            },
          },
        },
      };
    });
    get().scheduleSave();
  },

  setFunctionRating: (id, rating) => {
    set((s) => ({
      answers: {
        ...s.answers,
        functions: {
          ...s.answers.functions,
          items: {
            ...s.answers.functions.items,
            [id]: { ...s.answers.functions.items[id], rating },
          },
        },
      },
    }));
    get().scheduleSave();
  },

  toggleFunctionTop10: (id, max) => {
    set((s) => {
      const item = s.answers.functions.items[id];
      const next = !item.top10;
      if (next) {
        const count = Object.values(s.answers.functions.items).filter((i) => i.top10).length;
        if (count >= max) return s; // enforce max
      }
      return {
        answers: {
          ...s.answers,
          functions: {
            ...s.answers.functions,
            items: {
              ...s.answers.functions.items,
              // Deselecting from top10 also removes it from top5.
              [id]: next ? { ...item, top10: true } : { ...item, top10: false, top5: false },
            },
          },
        },
      };
    });
    get().scheduleSave();
  },

  toggleFunctionTop5: (id, max) => {
    set((s) => {
      const item = s.answers.functions.items[id];
      const next = !item.top5;
      if (next) {
        const count = Object.values(s.answers.functions.items).filter((i) => i.top5).length;
        if (count >= max) return s;
      }
      return {
        answers: {
          ...s.answers,
          functions: {
            ...s.answers.functions,
            items: {
              ...s.answers.functions.items,
              [id]: { ...item, top5: next },
            },
          },
        },
      };
    });
    get().scheduleSave();
  },

  setFunctionCategoryOther: (categoryId, text) => {
    set((s) => ({
      answers: {
        ...s.answers,
        functions: {
          ...s.answers.functions,
          categoryOther: { ...s.answers.functions.categoryOther, [categoryId]: text },
        },
      },
    }));
    get().scheduleSave();
  },

  toggleValueChecked: (id) => {
    set((s) => {
      const item = s.answers.values.items[id];
      const checked = !item.checked;
      return {
        answers: {
          ...s.answers,
          values: {
            ...s.answers.values,
            items: {
              ...s.answers.values.items,
              [id]: checked
                ? { ...item, checked: true }
                : { checked: false, top10: false, top5: false },
            },
          },
        },
      };
    });
    get().scheduleSave();
  },

  toggleValueTop10: (id, max) => {
    set((s) => {
      const item = s.answers.values.items[id];
      const next = !item.top10;
      if (next) {
        const count = Object.values(s.answers.values.items).filter((i) => i.top10).length;
        if (count >= max) return s;
      }
      return {
        answers: {
          ...s.answers,
          values: {
            ...s.answers.values,
            items: {
              ...s.answers.values.items,
              [id]: next ? { ...item, top10: true } : { ...item, top10: false, top5: false },
            },
          },
        },
      };
    });
    get().scheduleSave();
  },

  toggleValueTop5: (id, max) => {
    set((s) => {
      const item = s.answers.values.items[id];
      const next = !item.top5;
      if (next) {
        const count = Object.values(s.answers.values.items).filter((i) => i.top5).length;
        if (count >= max) return s;
      }
      return {
        answers: {
          ...s.answers,
          values: {
            ...s.answers.values,
            items: { ...s.answers.values.items, [id]: { ...item, top5: next } },
          },
        },
      };
    });
    get().scheduleSave();
  },

  setValueOther: (text) => {
    set((s) => ({
      answers: { ...s.answers, values: { ...s.answers.values, other: text } },
    }));
    get().scheduleSave();
  },

  setRequirement: (field, value) => {
    set((s) => ({
      answers: { ...s.answers, requirements: { ...s.answers.requirements, [field]: value } },
    }));
    get().scheduleSave();
  },

  setStory: (index, field, value) => {
    set((s) => {
      const stories = s.answers.stories.map((st, i) =>
        i === index ? { ...st, [field]: value } : st,
      ) as IntakeAnswers['stories'];
      return { answers: { ...s.answers, stories } };
    });
    get().scheduleSave();
  },

  markSubmitted: (submission) => {
    set({
      status: submission.status,
      locked: submission.locked,
      answers: hydrateAnswers(submission.answers),
    });
  },

  scheduleSave: () => {
    if (get().locked) return;
    // Persist same-session cache immediately.
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LS_KEY, JSON.stringify(get().answers));
      } catch {
        /* ignore */
      }
    }
    set({ saveState: 'saving' });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const { answers, currentStepId } = get();
      try {
        const res = await fetch('/api/draft', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ answers, currentStepId }),
        });
        if (res.status === 423) {
          set({ saveState: 'locked', locked: true });
          return;
        }
        if (!res.ok) {
          set({ saveState: 'error' });
          return;
        }
        set({ saveState: 'saved', lastSavedAt: Date.now() });
      } catch {
        set({ saveState: 'error' });
      }
    }, 700);
  },
}));
