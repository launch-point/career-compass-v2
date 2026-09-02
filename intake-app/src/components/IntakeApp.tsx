'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { STEPS } from '@/lib/steps';
import { useIntakeStore } from '@/store/intakeStore';
import { Wizard } from '@/components/Wizard';
import { PostSubmit } from '@/components/PostSubmit';

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
  const router = useRouter();

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    if (typeof window !== 'undefined') window.localStorage.removeItem('cc-intake-draft');
    router.replace('/');
    router.refresh();
  };

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
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 text-xs">
        <span className="text-muted">
          Signed in as <span className="font-medium text-foreground">{email}</span>
          {devMode && (
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
              DEV MODE
            </span>
          )}
        </span>
        <form action="/api/auth/logout" method="post" onSubmit={handleLogout}>
          <button type="submit" className="font-semibold text-muted hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>
      {submitted ? <PostSubmit /> : <Wizard />}
    </div>
  );
}
