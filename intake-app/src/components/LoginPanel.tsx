'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Notice, TextField } from '@/components/ui';

const COOLDOWN_SECONDS = 60;
const MAX_PER_HOUR = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Dev mode when no Supabase project is wired up (NEXT_PUBLIC_* are inlined).
const devMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export function LoginPanel() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const attempts = useRef<number[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function withinCap(): boolean {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    attempts.current = attempts.current.filter((t) => t > hourAgo);
    return attempts.current.length < MAX_PER_HOUR;
  }

  async function send() {
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!withinCap()) {
      setError(`Too many requests. Please wait a bit before trying again (max ${MAX_PER_HOUR} per hour).`);
      return;
    }
    try {
      if (devMode) {
        const res = await fetch('/api/auth/dev-send', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        if (!res.ok) {
          setError('Could not start dev login.');
          return;
        }
        const body = (await res.json()) as { devLink: string };
        setDevLink(body.devLink);
      } else {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/client');
        const supabase = createSupabaseBrowserClient();
        const { error: sbError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (sbError) {
          setError(sbError.message);
          return;
        }
      }
      attempts.current.push(Date.now());
      setCooldown(COOLDOWN_SECONDS);
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-bold">Career Compass Intake</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in with the same email you use for Mission Control. We’ll send you a secure sign-in
          link — no password needed.
        </p>

        {!sent ? (
          <div className="mt-5 space-y-3">
            <TextField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            {error && <Notice tone="error">{error}</Notice>}
            <Button full onClick={send}>
              Send me a sign-in link
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <Notice tone="success">
              <p className="font-semibold">Check your email (and spam)</p>
              <p className="mt-1">
                We sent a sign-in link to <span className="font-medium">{email}</span>.
              </p>
            </Notice>

            {devMode && devLink && (
              <Notice tone="info">
                <p className="font-semibold">Dev mode — no email is sent.</p>
                <p className="mt-1">Use this link to sign in (simulates clicking the emailed link):</p>
                <a href={devLink} className="mt-2 inline-block font-semibold text-brand underline">
                  Open sign-in link →
                </a>
              </Notice>
            )}

            {error && <Notice tone="error">{error}</Notice>}
            <Button full variant="secondary" onClick={send} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend link (wait ${cooldown}s)` : 'Resend link'}
            </Button>
            <p className="text-center text-xs text-muted">
              Didn’t get it? Check spam, or message your coach in Mission Control.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
