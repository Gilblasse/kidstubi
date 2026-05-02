'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { verifyPinAction } from './actions';

export default function PinVerifyPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastTried = useRef<string>('');

  useEffect(() => {
    if (pin.length < 4 || pin.length > 8) return;
    if (lastTried.current === pin) return;
    const candidate = pin;
    const t = setTimeout(() => {
      lastTried.current = candidate;
      startTransition(async () => {
        const result = await verifyPinAction(candidate);
        if (result.ok) {
          router.replace('/dashboard');
        } else if (candidate.length === 8) {
          setError('Incorrect PIN');
        }
      });
    }, 200);
    return () => clearTimeout(t);
  }, [pin, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-4 sm:p-8">
      <h1 className="mb-2 text-2xl font-semibold">Enter parent PIN</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter your PIN to return to the parent dashboard.
      </p>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-4"
      >
        <div>
          <label htmlFor="pin" className="mb-1 block text-sm">
            PIN
          </label>
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            minLength={4}
            maxLength={8}
            pattern="[0-9]*"
            required
            autoFocus
            autoComplete="current-password"
            disabled={isPending}
            value={pin}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, '').slice(0, 8);
              setError(null);
              setPin(next);
            }}
            className="w-full rounded border border-input bg-background px-3 py-2"
          />
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
          {isPending && !error && (
            <p className="mt-2 text-sm text-muted-foreground">Verifying…</p>
          )}
        </div>
      </form>
    </main>
  );
}
