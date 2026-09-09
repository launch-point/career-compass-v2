'use client';
// The signed-in bar shared by the wizard/post-submit view and the results screen.
// Extracted from IntakeApp so screen 3 can render WITHOUT importing the Wizard —
// a delivered client should never load the form's code path at all.
import { useRouter } from 'next/navigation';

export function AppHeader({ email, devMode }: { email: string; devMode: boolean }) {
  const router = useRouter();

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    if (typeof window !== 'undefined') window.localStorage.removeItem('cc-intake-draft');
    router.replace('/');
    router.refresh();
  };

  return (
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
  );
}
