import { getSessionEmail } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { getStore } from '@/lib/store';
import { LoginPanel } from '@/components/LoginPanel';
import { IntakeApp } from '@/components/IntakeApp';
import { AppHeader } from '@/components/AppHeader';
import { ResultsReady } from '@/components/ResultsReady';

// Reads the session cookie, so this route renders dynamically.
export default async function Home() {
  const email = await getSessionEmail();
  if (!email) return <LoginPanel />;
  const devMode = !isSupabaseConfigured();

  // Screen 3 is decided on the SERVER. Once a report has been delivered the
  // wizard is not rendered at all — not hidden, not read-only, simply not on the
  // page and not in this branch's bundle. Client-side routing alone would leave
  // the form one state-change away; this leaves it unreachable.
  const store = await getStore();
  const submission = await store.getByEmail(email);
  if (submission?.reportDriveLink) {
    return (
      <div className="flex min-h-full flex-col">
        <AppHeader email={email} devMode={devMode} />
        <ResultsReady
          reportLink={submission.reportDriveLink}
          stories={submission.answers.stories}
        />
      </div>
    );
  }

  return <IntakeApp email={email} devMode={devMode} />;
}
