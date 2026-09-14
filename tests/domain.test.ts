// SPDX-License-Identifier: GPL-3.0-only
import { describe, it, expect } from 'vitest';
import { actualDiameter, countersinkDepth, defaultProject, parseProject, patternHoles, validate, presets, configId } from '../src/domain/project';
import { en, zh } from '../src/i18n';
import { threadDimensions } from '../src/geometry/model';

describe('3D print optimization', () => {
  it('is disabled by default, with stored diameter allowance 0.5', () => {
    const p = defaultProject(); expect(p.central.print).toEqual({ enabled: false, diameterAllowanceMm: 0.5 }); expect(actualDiameter(p)).toBe(34.6);
  });
  it('adds to diameter once, never to radius or to nominal dimensions', () => {
    const p = defaultProject(); p.central.print.enabled = true; expect(actualDiameter(p)).toBe(35.1); expect(p.central.diameter).toBe(34.6);
    p.central.diameter = 65; expect(actualDiameter(p)).toBe(65.5); p.central.diameter = 34.6; expect(actualDiameter(p)).toBe(35.1);
    p.central.print.enabled = false; expect(actualDiameter(p)).toBe(34.6);
  });
  it('does not affect threads or flange holes and rejects invalid allowances', () => {
    const p = defaultProject(); p.central.print.enabled = true; p.central.mode = 'thread'; expect(actualDiameter(p)).toBe(34.6); expect(p.central.thread.diameter).toBe(65);
    p.central.mode = 'plain'; p.kind = 'flange'; expect(actualDiameter(p)).toBe(34.6); p.kind = 'board';
    for (const amount of [0, -0.5, 6, Infinity, NaN]) { p.central.print.diameterAllowanceMm = amount; expect(validate(p).length).toBeGreaterThan(0); }
  });
});
describe('parameter geometry', () => {
  it('defines PCD as diameter and degrees counter-clockwise', () => {
    const pattern = { ...defaultProject().pattern, enabled: true, pcd: 90, count: 4 };
    const expected = [[45, 0], [0, 45], [-45, 0], [0, -45]];
    patternHoles(pattern).forEach((h, i) => { expect(h.x).toBeCloseTo(expected[i][0], 8); expect(h.y).toBeCloseTo(expected[i][1], 8); });
    expect(patternHoles({ ...pattern, count: 0 })).toEqual([]);
  });
  it('uses included angle for countersink and M basic profile proportions', () => {
    expect(countersinkDepth(3.2, 6.2, 90)).toBeCloseTo(1.5);
    const d = threadDimensions(65, 1); expect(d.minorDiameter).toBeCloseTo(63.9174682453); expect(d.pitchDiameter).toBeCloseTo(64.3504809472);
    expect((d.rootWidth - d.apexWidth) / 2 * Math.sqrt(3)).toBeCloseTo(d.radialDepth);
  });
  it('keeps sourced standard diameters unchanged', () => { expect(presets.find(s => s.id === 'copal-3')?.diameter).toBe(65); expect(presets.every(s => s.source && s.checkedAt)).toBe(true); });
});
describe('project persistence and language', () => {
  it('roundtrips all manufacturing settings', () => { const p = defaultProject(); p.central.print.enabled = true; expect(parseProject(JSON.parse(JSON.stringify(p)), [p.templateId])).toEqual(p); });
  it('rejects partial, corrupt, future and unknown-template projects', () => {
    const p = defaultProject(); for (const bad of [{}, { ...p, schemaVersion: 2 }, { ...p, templateVersion: '2' }, { ...p, kind: 'script' }, { ...p, templateId: '../file' }, { ...p, holes: [null] }, { ...p, units: 'inch' }]) expect(() => parseProject(bad, [p.templateId])).toThrow();
  });
  it('preserves a stable configuration ID and parity between translations', () => { expect(configId(defaultProject())).toBe(configId(defaultProject())); expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort()); expect(Object.values(en).every(Boolean)).toBe(true); });
  it('requires explicit thread confirmation and rejects nonfinite values', () => { const p = defaultProject(); p.central.mode = 'thread'; expect(validate(p).some(i => i.code === 'confirmThread')).toBe(true); p.central.thread.confirmed = true; expect(validate(p)).toEqual([]); p.central.x = NaN; expect(validate(p)[0].code).toBe('finite'); });
});
