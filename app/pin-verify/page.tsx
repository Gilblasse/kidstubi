import { exitKidMode } from './actions';

export default function PinVerifyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <h1 className="mb-2 text-2xl font-semibold">Enter parent PIN</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter your PIN to return to the parent dashboard.
      </p>
      <form action={exitKidMode} className="space-y-4">
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
            className="w-full rounded border border-input bg-background px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-primary py-2 text-primary-foreground"
        >
          Return to dashboard
        </button>
      </form>
    </main>
  );
}
