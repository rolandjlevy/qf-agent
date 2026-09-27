import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// scripts/migrate.mjs splits schema.sql on every ';', so one inside a comment breaks the migration mid-run.
describe('schema.sql', () => {
  it('has no semicolons in comments', () => {
    const lines = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8').split('\n');
    const bad = lines.filter((l) => /--.*;/.test(l));
    expect(bad).toEqual([]);
  });
});
