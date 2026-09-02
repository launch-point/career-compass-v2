'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export function AdminUnlockButton({ id, locked }: { id: string; locked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!locked) {
    return <span className="text-xs font-semibold text-amber-700">Unlocked for editing</span>;
  }

  async function unlock() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" onClick={unlock} disabled={busy}>
      {busy ? 'Unlocking…' : 'Unlock for editing'}
    </Button>
  );
}
