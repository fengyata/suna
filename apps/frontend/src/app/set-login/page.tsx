'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { KortixLoader } from '@/components/ui/kortix-loader';

type SetLoginResponseBody =
  | { ok: true; redirectUrl: string }
  | { ok: false; redirectUrl: string; message?: string };

function buildExternalLoginUrl() {
  const loginFrontend = process.env.NEXT_PUBLIC_LOGIN_FRONTEND;
  const flashrevFrontend = process.env.NEXT_PUBLIC_FLASHREV_FRONTEND;

  if (!loginFrontend || !flashrevFrontend) return '/auth';

  return `${loginFrontend}/login/flashinfo?redirect_uri=${encodeURIComponent(
    `${flashrevFrontend}/superagent`,
  )}`;
}

function isEmbeddedInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin iframe access may throw; assume embedded.
    return true;
  }
}

function navigate(url: string) {
  const embedded = isEmbeddedInIframe();
  const isAbsolute = /^https?:\/\//i.test(url);
  const isExternal = isAbsolute && !url.startsWith(window.location.origin);

  if (embedded && isExternal) {
    window.open(url, '_parent');
    return;
  }

  window.location.href = url;
}

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
            : null) || buildExternalLoginUrl();

        navigate(redirectUrl);
      } catch {
        navigate(buildExternalLoginUrl());
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

