// SPDX-License-Identifier: GPL-3.0-only
import { it, expect, vi, afterEach } from 'vitest';
import { initialTheme, defaultEdges } from '../src/features/preferences';
import { templates } from '../src/templates';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { APP_VERSION } from '../src/domain/project';
afterEach(() => vi.unstubAllGlobals());
it('defaults to dark even on a light system, but preserves explicit preferences', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal('localStorage', { getItem: () => null }); expect(initialTheme()).toBe('dark');
  vi.stubGlobal('localStorage', { getItem: () => 'light' }); expect(initialTheme()).toBe('light');
  vi.stubGlobal('localStorage', { getItem: () => { throw Error(); } }); expect(initialTheme()).toBe('dark');
});
it('shows topology edges for STEP but not triangle edges for STL by default', () => {
  expect(defaultEdges('step')).toBe(true); expect(defaultEdges('stl')).toBe(false);
});
it('registers exactly the ten provided STEP files with unchanged byte hashes', () => {
  const files = readdirSync('steps').filter(f => /\.(step|stp)$/i.test(f)).sort();
  expect(templates).toHaveLength(10); expect(templates.map(t => t.file).sort()).toEqual(files);
  expect(new Set(templates.map(t => t.id)).size).toBe(10);
  for (const t of templates) expect(createHash('sha256').update(readFileSync(`steps/${t.file}`)).digest('hex')).toBe(t.sha256);
  expect(JSON.parse(readFileSync('package.json', 'utf8')).version).toBe(APP_VERSION);
});
