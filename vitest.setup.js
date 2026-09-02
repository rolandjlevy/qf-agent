import dotenv from 'dotenv';
// DB-touching tests need DATABASE_URL (a Neon dev/test branch) in process.env.
// Nothing else loads .env for the test process — qf.js's dotenv.config() call
// never runs here, since tests import route.js/lib/db.js directly. override
// stays false (the default) so a CI-supplied DATABASE_URL is never clobbered.
dotenv.config();

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// With `globals: false`, RTL's built-in auto-cleanup (which looks for a
// global afterEach) never registers, silently leaking renders between
// tests in the same file — do it explicitly instead.
afterEach(() => {
  cleanup();
});
