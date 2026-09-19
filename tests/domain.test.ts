// SPDX-License-Identifier: GPL-3.0-only
import { describe, it, expect } from 'vitest';
import { actualDiameter, countersinkDepth, customBoardShape, defaultProject, parseProject, patternHoles, validate, presets, configId, reliefDimensions, reliefApertureFits, reliefWithinBoard, roundedRectangleArea, roundedRectangleContains, APP_VERSION, threadChamferSize, threadBoreRadius, threadEnvelopeRadius } from '../src/domain/project';
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
describe('thread lead-in chamfer', () => {
  it('defaults to automatic 1.2P and keeps the custom size independent', () => {
    const p = defaultProject(), t = p.central.thread;
    expect(t.chamfer).toEqual({ enabled: true, mode: 'pitch', sizeMm: 1.2 });
    expect(threadChamferSize(t)).toBe(1.2); t.pitch = 0.75; expect(threadChamferSize(t)).toBeCloseTo(0.9);
    t.chamfer.mode = 'custom'; t.chamfer.sizeMm = 0.5; t.pitch = 2; expect(threadChamferSize(t)).toBe(0.5);
    t.chamfer.enabled = false; expect(threadChamferSize(t)).toBe(0); expect(t.chamfer.sizeMm).toBe(0.5);
    expect(threadEnvelopeRadius(t)).toBe(t.diameter / 2); expect(t.diameter).toBe(65);
  });
  it('uses the minor/tap bore and includes the 45 degree mouth in cap protection', () => {
    const p = defaultProject(), t = p.central.thread;
    expect(threadBoreRadius(t)).toBeCloseTo(threadDimensions(t.diameter, t.pitch).minorDiameter / 2);
    t.clearance = 0.2; expect(threadEnvelopeRadius(t)).toBeCloseTo(threadBoreRadius(t) + 1.2);
    t.mode = 'tapDrill'; expect(threadBoreRadius(t)).toBe(t.tapDiameter / 2);
    expect(threadEnvelopeRadius(t)).toBeCloseTo(t.tapDiameter / 2 + 1.2);
    t.mode = 'modeled'; t.clearance = 0; p.central.mode = 'thread'; t.confirmed = true;
    p.relief = { ...p.relief, enabled: true, angle: 90, width: 72.4, height: 72.4 };
    expect(validate(p).some(e => e.code === 'reliefAperture')).toBe(true);
    t.chamfer.enabled = false; expect(validate(p)).toEqual([]);
  });
  it('rejects bad enabled sizes, depleted threads and malformed schemas', () => {
    const p = defaultProject(); p.central.mode = 'thread'; p.central.thread.confirmed = true;
    p.central.thread.chamfer.mode = 'custom';
    for (const size of [0, -1, 31, 2.5, Infinity, NaN]) {
      p.central.thread.chamfer.sizeMm = size; expect(validate(p).length).toBeGreaterThan(0);
    }
    p.central.thread.chamfer.sizeMm = 0.5;
    for (const chamfer of [{ enabled: true }, { ...p.central.thread.chamfer, mode: 'script' }, { ...p.central.thread.chamfer, angle: 45 }]) {
      expect(() => parseProject({ ...p, central: { ...p.central, thread: { ...p.central.thread, chamfer } } }, [p.templateId])).toThrow();
    }
    expect(parseProject(p, [p.templateId])).toEqual(p);
  });
  it('strictly migrates schema 3 with chamfer off and retains all older machining data', () => {
    const p = defaultProject(); p.central.mode = 'thread'; p.central.thread.confirmed = true; p.orientation.frontBack = true;
    const { boardSource: _boardSource, customBoard: _customBoard, ...schema4 } = p;
    const { chamfer, ...thread } = schema4.central.thread;
    const old = { ...schema4, schemaVersion: 3, central: { ...schema4.central, thread } };
    const migrated = parseProject(old, [p.templateId]);
    expect(migrated).toEqual({ ...p, central: { ...p.central, thread: { ...thread, chamfer: { ...chamfer, enabled: false } } } });
    expect(() => parseProject({ ...old, central: { ...old.central, thread: { ...thread, chamfer } } }, [p.templateId])).toThrow();
    expect(() => parseProject({ ...p, schemaVersion: 4, central: { ...p.central, thread } }, [p.templateId])).toThrow();
  });
});
describe('project persistence and language', () => {
  it('roundtrips all manufacturing settings', () => { const p = defaultProject(); p.central.print.enabled = true; expect(parseProject(JSON.parse(JSON.stringify(p)), [p.templateId])).toEqual(p); });
  it('rejects partial, corrupt, future and unknown-template projects', () => {
    const p = defaultProject(); for (const bad of [{}, { ...p, schemaVersion: 6 }, { ...p, templateVersion: '2' }, { ...p, kind: 'script' }, { ...p, templateId: '../file' }, { ...p, holes: [null] }, { ...p, units: 'inch' }]) expect(() => parseProject(bad, [p.templateId])).toThrow();
  });
  it('preserves a stable configuration ID and parity between translations', () => { expect(configId(defaultProject())).toBe(configId(defaultProject())); expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort()); expect(Object.values(en).every(Boolean)).toBe(true); });
  it('requires explicit thread confirmation and rejects nonfinite values', () => { const p = defaultProject(); p.central.mode = 'thread'; expect(validate(p).some(i => i.code === 'confirmThread')).toBe(true); p.central.thread.confirmed = true; expect(validate(p)).toEqual([]); p.central.x = NaN; expect(validate(p)[0].code).toBe('finite'); });
});
describe('raised / recessed parameters', () => {
  it('uses board dimensions only, allowing equality without a 1.5 mm margin', () => {
    const r = { ...defaultProject().relief, width: 80, height: 60 };
    const bounds = [[-40, -30, 0], [40, 30, 8]] as const;
    expect(reliefWithinBoard(r, bounds)).toBe(true);
    expect(reliefWithinBoard({ ...r, width: 80.01 }, bounds)).toBe(false);
    expect(reliefWithinBoard({ ...r, height: 60.01 }, bounds)).toBe(false);
    expect(reliefWithinBoard({ ...r, shape: 'circle', diameter: 60 }, bounds)).toBe(true);
    expect(reliefWithinBoard({ ...r, shape: 'circle', diameter: 60.01 }, bounds)).toBe(false);
    // Area alone cannot catch a narrow, excessively long base.
    expect(reliefWithinBoard({ ...r, width: 100, height: 20 }, bounds)).toBe(false);
    expect(reliefWithinBoard(r, [[-35, -30, 0], [45, 30, 8]])).toBe(false);
  });
  it('keeps aperture and seat footprints inside the inner end face, not merely its exterior', () => {
    const p = defaultProject(); p.relief.enabled = true;
    expect(reliefApertureFits(p.relief, 0, 0, 17.3)).toBe(true);
    expect(reliefApertureFits(p.relief, 20, 0, 17.3)).toBe(false);
    p.relief.shape = 'circle'; p.relief.diameter = 44;
    expect(validate(p).some(e => e.code === 'reliefAperture')).toBe(true);
    p.relief.diameter = 49; expect(validate(p)).toEqual([]);
    p.central.x = 35; expect(validate(p).some(e => e.code === 'reliefAperture')).toBe(true);
    p.central.x = 0; p.seat.enabled = true;
    expect(validate(p).some(e => e.code === 'reliefAperture' && e.feature === 'seat')).toBe(true);
  });
  it('defaults to disabled with specified manufacturing dimensions', () => {
    expect(defaultProject().relief).toMatchObject({ enabled: false, shape: 'roundedRectangle', wall: 2, faceThickness: 2.5, angle: 80, spacing: 17 });
  });
  it('defines normal inward walls, signed spacing and 90-degree straight walls', () => {
    const r = defaultProject().relief, dims = reliefDimensions(r);
    expect(dims.shrink).toBeCloseTo(17 / Math.tan(80 * Math.PI / 180));
    expect(dims.inset).toBeCloseTo(2 / Math.sin(80 * Math.PI / 180));
    expect(reliefDimensions({ ...r, spacing: -17 })).toEqual(dims);
    expect(reliefDimensions({ ...r, angle: 90 }).endWidth).toBe(60);
  });
  it('rejects degenerate dimensions and unsupported relief shapes', () => {
    const p = defaultProject(); p.relief.enabled = true;
    for (const change of [{ spacing: 0 }, { spacing: 2.5 }, { spacing: 101 }, { angle: 44 }, { angle: 91 }, { wall: 0 }, { faceThickness: 0 }, { radius: 31 }, { width: 8 }]) {
      expect(validate({ ...p, relief: { ...p.relief, ...change } }).some(e => e.code === 'relief')).toBe(true);
    }
    expect(() => parseProject({ ...p, relief: { ...p.relief, shape: 'script' } }, [p.templateId])).toThrow();
    expect(parseProject(p, [p.templateId])).toEqual(p);
  });
  it('strictly migrates schema 1 without changing its geometry settings', () => {
    const defaults = defaultProject();
    const { boardSource: _boardSource, customBoard: _customBoard, relief: _relief, orientation: _orientation, ...p } = defaults;
    const { chamfer: _chamfer, ...thread } = p.central.thread;
    const old = { ...p, central: { ...p.central, thread }, schemaVersion: 1, generatorVersion: '0.1.0' };
    const migrated = parseProject(old, [p.templateId]);
    expect(migrated).toEqual({ ...p, central: { ...p.central, thread: { ...p.central.thread, chamfer: { ..._chamfer, enabled: false } } }, generatorVersion: APP_VERSION, schemaVersion: 5, relief: defaults.relief, orientation: defaults.orientation, boardSource: 'template', customBoard: defaults.customBoard });
    expect(() => parseProject({ ...old, relief: {} }, [p.templateId])).toThrow();
  });
  it('strictly migrates schema 2 and roundtrips all orientation combinations', () => {
    const defaults = defaultProject();
    const { boardSource: _boardSource, customBoard: _customBoard, orientation: _orientation, ...legacy } = defaults; legacy.relief.enabled = true;
    const { chamfer, ...thread } = legacy.central.thread;
    expect(parseProject({ ...legacy, central: { ...legacy.central, thread }, schemaVersion: 2 }, [legacy.templateId])).toEqual({ ...legacy, central: { ...legacy.central, thread: { ...thread, chamfer: { ...chamfer, enabled: false } } }, schemaVersion: 5, orientation: defaults.orientation, boardSource: 'template', customBoard: defaults.customBoard });
    for (const frontBack of [false, true]) for (const upDown of [false, true]) {
      const p = { ...defaultProject(), orientation: { frontBack, upDown } };
      expect(parseProject(p, [p.templateId])).toEqual(p);
      expect(configId(p)).not.toBe(configId({ ...p, orientation: { frontBack: !frontBack, upDown } }));
    }
    for (const orientation of [{ frontBack: true }, { frontBack: true, upDown: 'false' }, { frontBack: false, upDown: false, extra: 1 }]) expect(() => parseProject({ ...defaultProject(), orientation }, [legacy.templateId])).toThrow();
    expect(() => parseProject({ ...legacy, schemaVersion: 2, orientation: {} }, [legacy.templateId])).toThrow();
  });
});
describe('custom lensboard parameters', () => {
  it('classifies rectangle, rounded rectangle, racetrack and circle at exact radius limits', () => {
    expect(customBoardShape(100, 80, 0)).toBe('rectangle');
    expect(customBoardShape(100, 80, 10)).toBe('roundedRectangle');
    expect(customBoardShape(120, 80, 40)).toBe('racetrack');
    expect(customBoardShape(80, 80, 40)).toBe('circle');
    expect(roundedRectangleArea(80, 80, 40)).toBeCloseTo(Math.PI * 40 ** 2);
    expect(roundedRectangleContains(74, 74, 37, 60, 60, 6, 0, true)).toBe(false);
    expect(roundedRectangleContains(74, 74, 37, 50, 50, 8)).toBe(true);
    expect(roundedRectangleContains(80, 80, 40, 80, 80, 40)).toBe(true);
  });
  it('defaults to a plain 100 mm board with optional rear light traps disabled', () => {
    expect(defaultProject()).toMatchObject({ schemaVersion: 5, boardSource: 'template', customBoard: { width: 100, height: 100, thickness: 3, radius: 8,
      outerLightTrap: { enabled: false, width: 3, height: 2 }, innerLightTrap: { enabled: false, width: 60, height: 60, radius: 6, heightMm: 2 } } });
  });
  it('rejects invalid radii and enforces relief ≤ inner ≤ outer opening ≤ board', () => {
    const p = defaultProject(); p.boardSource = 'custom';
    for (const change of [{ width: 0 }, { height: 401 }, { thickness: 0 }, { radius: 51 }]) expect(validate({ ...p, customBoard: { ...p.customBoard, ...change } }).some(i => i.code === 'customBoard')).toBe(true);
    p.customBoard.outerLightTrap.enabled = true; p.customBoard.outerLightTrap.width = 50; expect(validate(p).some(i => i.code === 'outerLightTrap')).toBe(true);
    p.customBoard.outerLightTrap.width = 3; p.customBoard.innerLightTrap.enabled = true; p.customBoard.innerLightTrap.width = 96; expect(validate(p).some(i => i.code === 'lightTrapOrder')).toBe(true);
    p.customBoard.innerLightTrap.width = 60; p.customBoard.innerLightTrap.radius = 31; expect(validate(p).some(i => i.code === 'innerLightTrap')).toBe(true);
    p.customBoard.width = p.customBoard.height = 80; p.customBoard.radius = 40; p.customBoard.innerLightTrap.width = p.customBoard.innerLightTrap.height = 70; p.customBoard.innerLightTrap.radius = 0; expect(validate(p).some(i => i.code === 'lightTrapOrder')).toBe(true);
    p.customBoard = defaultProject().customBoard; p.customBoard.outerLightTrap.enabled = true; p.customBoard.innerLightTrap.enabled = true; p.relief.enabled = true;
    expect(validate(p)).toEqual([]);
    p.customBoard.innerLightTrap.radius = p.relief.radius; expect(validate(p)).toEqual([]);
    p.customBoard.innerLightTrap.radius = 6;
    p.relief.width = 61; expect(validate(p).some(i => i.code === 'lightTrapOrder' && i.feature === 'relief')).toBe(true);
    p.relief.width = 60; p.customBoard.innerLightTrap.enabled = false; expect(validate(p)).toEqual([]);
    p.customBoard.outerLightTrap.enabled = false; expect(validate(p)).toEqual([]);
  });
  it('strictly migrates a complete schema 4 project to template mode', () => {
    const p = defaultProject(); p.orientation.upDown = true;
    const { boardSource: _boardSource, customBoard: _customBoard, ...old } = p;
    const migrated = parseProject({ ...old, schemaVersion: 4, generatorVersion: '0.2.4' }, [p.templateId]);
    expect(migrated).toEqual({ ...p, generatorVersion: APP_VERSION, boardSource: 'template', customBoard: defaultProject().customBoard });
    expect(() => parseProject({ ...old, schemaVersion: 4, customBoard: {} }, [p.templateId])).toThrow();
  });
});
