'use client';
import { useState } from 'react';
import {
  STEPS,
  SECTION_LABELS,
  SECTION_ORDER,
  getStep,
  stepIndex,
  type Step,
} from '@/lib/steps';
import { advanceGate } from '@/lib/wizardGating';
import { submissionGate } from '@/lib/answers';
import { useIntakeStore } from '@/store/intakeStore';
import { Button, Notice, ProgressBar } from '@/components/ui';
import {
  FunctionsCategoryScreen,
  FunctionsRatingScreen,
  FunctionsTop10Screen,
  FunctionsTop5Screen,
} from '@/components/screens/FunctionScreens';
import {
  ValuesEliminationScreen,
  ValuesTop10Screen,
  ValuesTop5Screen,
} from '@/components/screens/ValueScreens';
import { RequirementsScreen } from '@/components/screens/RequirementsScreen';
import { StoryScreen } from '@/components/screens/StoryScreen';
import { ReviewScreen } from '@/components/screens/ReviewScreen';
import { TransitionScreen } from '@/components/screens/TransitionScreen';
import type { Submission } from '@/lib/types';

function renderScreen(step: Step, onEdit: (id: string) => void) {
  switch (step.kind) {
    case 'functions-category':
      return <FunctionsCategoryScreen categoryId={step.categoryId!} />;
    case 'functions-rating':
      return <FunctionsRatingScreen />;
    case 'functions-top10':
      return <FunctionsTop10Screen />;
    case 'functions-top5':
      return <FunctionsTop5Screen />;
    case 'functions-values-transition':
      return <TransitionScreen />;
    case 'values-elimination':
      return <ValuesEliminationScreen />;
    case 'values-top10':
      return <ValuesTop10Screen />;
    case 'values-top5':
      return <ValuesTop5Screen />;
    case 'requirements':
      return <RequirementsScreen />;
    case 'story':
      return <StoryScreen storyIndex={step.storyIndex!} />;
    case 'review':
      return <ReviewScreen onEdit={onEdit} />;
  }
}

function SaveIndicator() {
  const saveState = useIntakeStore((s) => s.saveState);
  const map = {
    idle: '',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Save failed — retrying on next change',
    locked: 'Locked',
  } as const;
  const text = map[saveState];
  if (!text) return null;
  return (
    <span className={`text-xs ${saveState === 'error' ? 'text-red-600' : 'text-muted'}`}>{text}</span>
  );
}

export function Wizard() {
  const currentStepId = useIntakeStore((s) => s.currentStepId);
  const answers = useIntakeStore((s) => s.answers);
  const setCurrentStep = useIntakeStore((s) => s.setCurrentStep);
  const markSubmitted = useIntakeStore((s) => s.markSubmitted);

  const [submitting, setSubmitting] = useState(false);
  const [submitProblems, setSubmitProblems] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const step = getStep(currentStepId ?? '') ?? STEPS[0];
  const idx = stepIndex(step.id);
  const gate = advanceGate(step, answers);
  const isReview = step.kind === 'review';
  // Submit is only enabled once the submission gate is satisfied (5 fns + 5 vals
  // + >=3 complete stories). Same gate the server enforces.
  const submitReady = submissionGate(answers).ok;

  const goBack = () => {
    if (idx > 0) setCurrentStep(STEPS[idx - 1].id);
  };
  const goNext = () => {
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].id);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitProblems([]);
    setSubmitError(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (res.status === 422) {
        const body = (await res.json()) as { problems?: string[] };
        setSubmitProblems(body.problems ?? ['Some required fields are incomplete.']);
        return;
      }
      if (!res.ok) {
        setSubmitError('Something went wrong submitting. Please try again.');
        return;
      }
      const { submission } = (await res.json()) as { submission: Submission };
      markSubmitted(submission); // flips status -> IntakeApp shows the confirmation/waiting screen
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentSection = step.section;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-6">
      {/* Header: section rail + overall progress */}
      <header className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold">Career Compass Intake</span>
          <SaveIndicator />
        </div>
        <div className="mb-2 flex gap-1">
          {SECTION_ORDER.map((sec) => {
            const active = sec === currentSection;
            const passed = SECTION_ORDER.indexOf(sec) < SECTION_ORDER.indexOf(currentSection);
            return (
              <div key={sec} className="flex-1 text-center">
                <div
                  className={`h-1 rounded-full ${active ? 'bg-brand' : passed ? 'bg-brand/50' : 'bg-border'}`}
                />
                <span className={`mt-1 block text-[10px] ${active ? 'font-semibold text-foreground' : 'text-muted'}`}>
                  {SECTION_LABELS[sec]}
                </span>
              </div>
            );
          })}
        </div>
        <ProgressBar value={idx + 1} max={STEPS.length} />
        <p className="mt-1 text-right text-[11px] text-muted">
          Step {idx + 1} of {STEPS.length}
        </p>
      </header>

      {/* Current screen */}
      <main className="flex-1">{renderScreen(step, setCurrentStep)}</main>

      {/* Blocking reason / submit issues */}
      {!isReview && !gate.ok && gate.reason && (
        <div className="mt-4">
          <Notice tone="warn">{gate.reason}</Notice>
        </div>
      )}
      {isReview && submitProblems.length > 0 && (
        <div className="mt-4">
          <Notice tone="warn">
            <ul className="list-disc pl-5">
              {submitProblems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}
      {submitError && (
        <div className="mt-4">
          <Notice tone="error">{submitError}</Notice>
        </div>
      )}

      {/* Footer nav */}
      <footer className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-border bg-background/90 py-3 backdrop-blur">
        <Button variant="secondary" onClick={goBack} disabled={idx === 0}>
          ← Back
        </Button>
        {isReview ? (
          <Button onClick={submit} disabled={submitting || !submitReady}>
            {submitting ? 'Submitting…' : 'Submit intake'}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!gate.ok}>
            Next →
          </Button>
        )}
      </footer>
    </div>
  );
}
