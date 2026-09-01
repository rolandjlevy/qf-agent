import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// With `globals: false`, RTL's built-in auto-cleanup (which looks for a
// global afterEach) never registers, silently leaking renders between
// tests in the same file — do it explicitly instead.
afterEach(() => {
  cleanup();
});
