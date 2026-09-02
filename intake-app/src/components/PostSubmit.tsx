'use client';
// Iframe states 2 (waiting) and 3 (ready). This build implements state 1 (the
// form) fully and state 2 as the real post-submit screen. State 3 (results
// ready, with a Drive download) is a placeholder gated on downstream phases
// (PDF + Drive upload) that don't exist yet — see docs Known Gaps.
import { Card } from '@/components/ui';

export function PostSubmit() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
        ✓
      </div>
      <h1 className="text-2xl font-bold">Your intake is submitted</h1>
      <p className="mt-2 text-sm text-muted">
        Thanks — we’ve got everything we need to get started.
      </p>
      <Card className="mt-6 w-full">
        <p className="text-sm font-semibold">Waiting on your coach to complete your Career Compass.</p>
        <p className="mt-1 text-sm text-muted">
          Your coach is reviewing your answers and building your report. You’ll be able to download it
          here once it’s ready. If you need to change an answer, ask your coach to unlock your intake.
        </p>
      </Card>
    </div>
  );
}
