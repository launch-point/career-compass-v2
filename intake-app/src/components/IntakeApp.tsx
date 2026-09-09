'use client';
import { useEffect } from 'react';
import { STEPS } from '@/lib/steps';
import { useIntakeStore } from '@/store/intakeStore';
import { Wizard } from '@/components/Wizard';
import { PostSubmit } from '@/components/PostSubmit';
import { AppHeader } from '@/components/AppHeader';

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full items-center justify-center p-8 text-sm text-muted">{children}</div>;
}

export function IntakeApp({ email, devMode }: { email: string; devMode: boolean }) {
  const loaded = useIntakeStore((s) => s.loaded);
  const status = useIntakeStore((s) => s.status);
  const locked = useIntakeStore((s) => s.locked);
  const currentStepId = useIntakeStore((s) => s.currentStepId);
  const setCurrentStep = useIntakeStore((s) => s.setCurrentStep);
  const load = useIntakeStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  // First visit (or resumed with no saved step) starts at the beginning.
  useEffect(() => {
    if (loaded && !currentStepId) setCurrentStep(STEPS[0].id);
  }, [loaded, currentStepId, setCurrentStep]);

  if (!loaded) return <Centered>Loading your intake…</Centered>;

  const submitted = status === 'submitted' || locked;

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader email={email} devMode={devMode} />
      {submitted ? <PostSubmit /> : <Wizard />}
    </div>
  );
}
