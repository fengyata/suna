'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { KortixLoader } from '@/components/ui/kortix-loader';

type SetLoginResponseBody =
  | { ok: true; redirectUrl: string }
  | { ok: false; redirectUrl: string; message?: string };

export default function SetLoginPage() {
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/setLogin', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
        });

        const data = (await res.json().catch(() => null)) as SetLoginResponseBody | null;
        const redirectUrl =
          (data && typeof data === 'object' && 'redirectUrl' in data && typeof data.redirectUrl === 'string'
            ? data.redirectUrl
            : null) || '/auth';

        window.location.href = redirectUrl;
      } catch {
        window.location.href = '/auth';
      }
    };

    run();
  }, []);

  return (
    <main className="min-h-screen w-full flex items-center justify-center">
      <Button disabled className="h-12 px-6 rounded-full">
        <KortixLoader size="small" variant="white" />
      </Button>
      {/* <div className="text-sm text-muted-foreground">Signing you in…</div> */}
    </main>
  );
}

