'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startSessionAction } from '@/app/(kid)/k/[kidId]/watch/[videoId]/actions';

const POLL_INTERVAL_MS = 30_000;

export function WatchSessionGuard({
  kidId,
  videoId,
}: {
  kidId: string;
  videoId: string;
}) {
  const router = useRouter();
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let pollHandle: ReturnType<typeof setInterval> | null = null;

    function record() {
      if (recordedRef.current || startedAtRef.current === null) return;
      recordedRef.current = true;
      const secondsWatched = Math.max(
        0,
        Math.round((Date.now() - startedAtRef.current) / 1000),
      );
      const blob = new Blob(
        [
          JSON.stringify({
            kidId,
            videoId,
            secondsWatched,
            sessionId: sessionIdRef.current,
          }),
        ],
        { type: 'application/json' },
      );
      navigator.sendBeacon('/api/watch', blob);
    }

    function onVisibility() {
      if (document.visibilityState === 'hidden') record();
    }

    async function poll() {
      try {
        const res = await fetch('/api/screen-time/remaining', {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          remaining_seconds: number;
          within_allowed_window?: boolean;
        };
        if (
          data.remaining_seconds <= 0 ||
          data.within_allowed_window === false
        ) {
          record();
          router.replace(`/k/${kidId}/locked`);
        }
      } catch {
        /* network blip; next poll will retry */
      }
    }

    (async () => {
      const result = await startSessionAction({ kidId, videoId });
      if (cancelled) return;
      if ('error' in result) {
        router.replace(`/k/${kidId}/locked`);
        return;
      }
      sessionIdRef.current = result.sessionId;
      startedAtRef.current = Date.now();
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', record);
      pollHandle = setInterval(poll, POLL_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      if (pollHandle !== null) clearInterval(pollHandle);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', record);
      record();
    };
  }, [kidId, videoId, router]);

  return null;
}
