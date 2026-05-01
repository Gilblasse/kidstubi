// Polyfills/shims for the test environment.
// `server-only` would refuse to import outside server contexts; stub it.
import { vi } from 'vitest';
vi.mock('server-only', () => ({}));
