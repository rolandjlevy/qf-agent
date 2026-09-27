import { defineConfig, devices } from '@playwright/test';

// End-to-end checks for /quote/new against the dev server (npm run test:e2e). Kept out of
// `npm test`: it needs DATABASE_URL and a browser. Photo uploads are intercepted in the tests.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // One worker: the dev server compiles on demand anyway, and two test browsers next to a running
  // dev server ran this devcontainer out of memory ("Target crashed").
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3000' },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, stylePath: './e2e/screenshot.css' } },
  projects: [
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/quote/new',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
