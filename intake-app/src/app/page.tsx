import { getSessionEmail } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { LoginPanel } from '@/components/LoginPanel';
import { IntakeApp } from '@/components/IntakeApp';

// Reads the session cookie, so this route renders dynamically.
export default async function Home() {
  const email = await getSessionEmail();
  if (!email) return <LoginPanel />;
  return <IntakeApp email={email} devMode={!isSupabaseConfigured()} />;
}
