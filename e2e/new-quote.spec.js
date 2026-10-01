import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// A 1×1 PNG: enough for the picker; uploads are intercepted, so these never leave the browser.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const photo = (n) => ({ name: `photo-${n}.png`, mimeType: 'image/png', buffer: PNG });
const isMobile = (testInfo) => testInfo.project.name === 'mobile';
// Baselines assume a database with quotes (the returning-user frame); recent quotes are masked as live data.
const recentQuotes = (page) => page.locator('section[aria-labelledby=recent-quotes-heading]');
// Before a screenshot: drop focus and undo the mobile focus scroll, so the sticky header is at the top.
const blur = (page) =>
  page.evaluate(async () => {
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Let the scroll paint before the screenshot starts.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });

const chip = (page) => page.getByRole('button', { name: /trade/i });
const textarea = (page) => page.locator('#job-description');
const primary = (page) => page.locator('[data-slot=primary-action]');

// The profile may or may not have a trade; pick one so every run starts from the same state.
async function chooseTrade(page, label) {
  const search = page.getByPlaceholder('Search trades');
  await chip(page).click();
  await search.fill(label);
  // Search is fuzzy, so wait for the exact trade to be the highlighted match, then pick it with Enter
  // (clicking races the popover's open animation).
  await expect(page.getByRole('option', { name: label, exact: true })).toHaveAttribute('aria-selected', 'true');
  await search.press('Enter');
  await expect(chip(page)).toHaveAccessibleName(`Change trade, currently ${label}`);
  await expect(page.locator('[data-slot=popover-content]')).toHaveCount(0);
  // Move off the chip so screenshots don't catch its hover state.
  await page.mouse.move(0, 0);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/quote/photos/upload', (route) => route.abort());
  await page.route('**/api/examples/unsplash-download', (route) => route.fulfill({ status: 200, body: '{}' }));
  await page.goto('/quote/new');
  await expect(page.getByRole('heading', { name: "What's the job?" })).toBeVisible();
});

test('empty state matches the design and has no axe violations', async ({ page }) => {
  await chooseTrade(page, 'Bathroom fitter');
  await blur(page);
  await expect(page).toHaveScreenshot('empty.png', { fullPage: true, mask: [recentQuotes(page)] });
  const results = await new AxeBuilder({ page }).exclude('nextjs-portal').analyze();
  expect(results.violations).toEqual([]);
});

test('filled state matches the design and has no axe violations', async ({ page }) => {
  // Filling focuses the text box, which scrolls on mobile; reduced motion makes that scroll instant,
  // so blur() can undo it without racing a smooth scroll still in flight.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await chooseTrade(page, 'Bathroom fitter');
  await textarea(page).fill(
    "Hi, could you quote to swap our bath for a walk-in shower? The bathroom's about 2m × 2.5m. We'd like the floor and two walls tiled to half height.",
  );
  await page.locator('input[type=file][multiple]').setInputFiles([photo(1), photo(2), photo(3)]);
  await expect(page.getByRole('button', { name: /^Remove photo/ })).toHaveCount(3);
  // Uploads are intercepted, so wait for all three to settle as failed before comparing.
  await expect(page.getByText('Photos 1, 2, 3: Upload failed.')).toBeVisible();
  await blur(page);
  // The thumbnails are masked too: they're 1×1 test images scaled up.
  await expect(page).toHaveScreenshot('filled.png', { fullPage: true, mask: [recentQuotes(page), page.locator('li img')] });
  const results = await new AxeBuilder({ page }).exclude('nextjs-portal').analyze();
  expect(results.violations).toEqual([]);
});

test('primary button needs text or a photo, and a trade', async ({ page }) => {
  await chooseTrade(page, 'Plumber');
  await expect(primary(page)).toBeDisabled();
  await expect(page.getByText('Add a description or photo to continue')).toBeVisible();
  await textarea(page).fill('Replace a dripping kitchen tap');
  await expect(primary(page)).toBeEnabled();
  await expect(page.getByText("You'll check the materials before anything is drafted")).toBeVisible();
  await textarea(page).fill('   ');
  await expect(primary(page)).toBeDisabled();
});

test('primary button stays on screen on mobile', async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo), 'mobile only');
  const box = await primary(page).boundingBox();
  const viewport = page.viewportSize();
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  await page.mouse.wheel(0, 2000);
  expect((await primary(page).boundingBox()).y).toBeCloseTo(box.y, 0);
});

test('a ninth photo is refused inline', async ({ page }) => {
  await page.locator('input[type=file][multiple]').setInputFiles(Array.from({ length: 9 }, (_, i) => photo(i + 1)));
  await expect(page.getByRole('button', { name: /^Remove photo/ })).toHaveCount(8);
  await expect(page.getByRole('status')).toHaveText("You can add up to 8 photos, so 1 wasn't added.");
});

test('example chips follow the trade, fill the text and hide once edited', async ({ page }) => {
  await chooseTrade(page, 'Roofer');
  const chips = page.locator('[data-slot=example-chip]');
  await expect(chips).toHaveCount(3);
  await chips.nth(1).click();
  await expect(textarea(page)).toBeFocused();
  await expect(textarea(page)).not.toHaveValue('');
  // An untouched example keeps the chips up, so the trader can swap templates.
  await expect(chips).toHaveCount(3);
  await textarea(page).pressSequentially(' More detail.');
  await expect(chips).toHaveCount(0);
  await textarea(page).fill('');
  await expect(chips).toHaveCount(3);
});

test('a homepage example opens with its chips and its photo', async ({ page }) => {
  await page.goto('/quote/new?example=retile-shower-enclosure');
  await expect(textarea(page)).not.toHaveValue('');
  const chips = page.locator('[data-slot=example-chip]');
  await expect(chips).toHaveCount(3);
  const removeButtons = page.getByRole('button', { name: /^Remove photo/ });
  await expect(removeButtons).toHaveCount(1);
  await expect(page.getByText(/Example photo by .+ on Unsplash/)).toBeVisible();
  // Another example swaps the photo rather than adding a second.
  await chips.first().click();
  await expect(removeButtons).toHaveCount(1);
});

test('photo hint follows the trade', async ({ page }, testInfo) => {
  await chooseTrade(page, 'Electrician');
  const hint = page.locator('#job-description-help');
  // The trade heading is desktop only; mobile keeps the card short.
  const heading = hint.getByText('Key details for electrical work');
  await (isMobile(testInfo) ? expect(heading).toBeHidden() : expect(heading).toBeVisible());
  // Both photo lists are in the DOM; check the one for this width is the one showing.
  await expect(hint.getByText(isMobile(testInfo) ? 'the fuse box and its label' : 'the fuse box or consumer unit')).toBeVisible();
});

test('every control is keyboard reachable with a visible focus ring', async ({ page }, testInfo) => {
  await chooseTrade(page, 'Plumber');
  await textarea(page).fill('Fix a leak');
  const want = [
    /trade/i,
    'job-description',
    isMobile(testInfo) ? 'Camera' : 'Upload photos',
    'Get materials list',
  ];
  const seen = [];
  for (let i = 0; i < 25 && seen.length < want.length; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      const style = getComputedStyle(el);
      return {
        id: el.id,
        label: el === document.body ? '' : (el.getAttribute('aria-label') ?? el.textContent.trim()),
        ring: style.outlineStyle !== 'none' || style.boxShadow !== 'none' || getComputedStyle(el.closest('[class*=focus-within]') ?? el).boxShadow !== 'none',
      };
    });
    const match = want[seen.length];
    const hit = match instanceof RegExp ? match.test(info.label) : info.id === match || info.label.startsWith(match);
    if (hit) {
      expect(info.ring, `${info.label || info.id} has a visible focus ring`).toBe(true);
      seen.push(info.label || info.id);
    }
  }
  expect(seen).toHaveLength(want.length);
});

test('touch targets are at least 44px', async ({ page }) => {
  await chooseTrade(page, 'Plumber');
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('main button, main a, header button, header a')]
      .filter((el) => el.offsetParent && el.dataset.slot !== 'photo-remove')
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 44)
      .map(({ el, r }) => `${el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40)} (${Math.round(r.height)}px)`),
  );
  expect(small).toEqual([]);
});

test('viewport allows zoom', async ({ page }) => {
  const content = await page.locator('meta[name=viewport]').getAttribute('content');
  expect(content).not.toMatch(/maximum-scale|user-scalable\s*=\s*no/);
});

// Loading states: the server is mocked, so these pause on each wait without calling the model.
const hold = () => new Promise(() => {});

async function toMaterialsStep(page) {
  await chooseTrade(page, 'Plumber');
  await textarea(page).fill('Replace a dripping kitchen tap');
  await primary(page).click();
  await page.getByRole('button', { name: /Continue/ }).last().click();
}

test('materials loading state is announced and accessible', async ({ page }) => {
  await page.route('**/api/quote/propose-materials', hold);
  await toMaterialsStep(page);
  await expect(page.getByRole('status')).toContainText("Working out what's needed");
  await expect(page.locator('section[aria-busy="true"]')).toBeVisible();
  // Placeholders are hidden from assistive tech; the status text carries the meaning.
  await expect(page.locator('[data-slot=skeleton]').first()).toHaveAttribute('aria-hidden', 'true');
  const results = await new AxeBuilder({ page }).exclude('nextjs-portal').analyze();
  expect(results.violations).toEqual([]);
});

test('drafting shows real section progress', async ({ page }) => {
  const call = (section) => ({ type: 'tool_call', tool: 'draft_section', input: { section } });
  const done = (section) => ({ type: 'tool_result', tool: 'draft_section', result: { section } });
  await page.route('**/api/quote/propose-materials', (route) =>
    route.fulfill({ json: { jobType: null, materials: [{ label: 'Mixer tap' }] } }),
  );
  await page.route('**/api/quote', (route) =>
    route.request().method() === 'POST' ? route.fulfill({ json: { runId: 'e2e-run' } }) : route.continue(),
  );
  await page.route('**/api/quote/e2e-run/status', (route) =>
    route.fulfill({ json: { status: 'running', steps: [call('introduction'), done('introduction'), call('materials'), done('materials'), call('scope')] } }),
  );
  await toMaterialsStep(page);
  await page.getByRole('button', { name: /Continue to quote/ }).click();

  await expect(page.getByRole('heading', { name: 'Drafting your quote' })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  await expect(page.getByText('2 of 7 sections drafted.')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Scope of work' })).toContainText('drafting');
  const results = await new AxeBuilder({ page }).exclude('nextjs-portal').analyze();
  expect(results.violations).toEqual([]);
});

test('header stays in view while scrolling', async ({ page }) => {
  await chooseTrade(page, 'Plumber');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect((await page.locator('header').boundingBox()).y).toBe(0);
  await expect(page.getByRole('link', { name: 'QuoteFetch' })).toBeInViewport();
});

test('on mobile, a focused field scrolls up under the header', async ({ page }, testInfo) => {
  await chooseTrade(page, 'Plumber');
  // A short viewport stands in for the on-screen keyboard, which leaves the page room to scroll.
  await page.setViewportSize({ width: testInfo.project.use.viewport.width, height: 500 });
  const label = page.locator('label[for=job-description]');
  const labelTop = async () => (await label.boundingBox()).y;
  const before = await labelTop();
  await textarea(page).focus();
  if (isMobile(testInfo)) {
    // Header is 56px; the label lands 12px below it.
    await expect.poll(async () => Math.abs((await labelTop()) - 68)).toBeLessThanOrEqual(1);
  } else {
    await page.waitForTimeout(500);
    expect(await labelTop()).toBe(before);
  }
});
