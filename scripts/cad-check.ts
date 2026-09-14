// SPDX-License-Identifier: GPL-3.0-only
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { initCad } from './init-cad.ts';
import { defaultProject as appDefaults, threadChamferSize } from '../src/domain/project.ts';
import { buildModel, isValid, threadGroove, threadDimensions, boundsOf } from '../src/geometry/model.ts';
import { importSTEP, measureVolume, makeBox, makeCompound } from 'replicad';
import assert from 'node:assert/strict';
import type { Template } from '../src/templates/index.ts';
import { cleanBinarySTL } from '../src/geometry/stl.ts';

// Historical regression samples explicitly retain their pre-chamfer geometry.
const defaultProject = () => { const p = appDefaults(); p.central.thread.chamfer.enabled = false; return p; };
await initCad();
mkdirSync('tmp/cad-check', { recursive: true });
const reports: Record<string, unknown>[] = [];
async function record(name: string, model: Awaited<ReturnType<typeof buildModel>>, p: ReturnType<typeof defaultProject>, evidence: Record<string, unknown> = {}) {
  const step = model.shape.blobSTEP(), stl = model.shape.blobSTL({ binary: true, tolerance: 0.03, angularTolerance: 0.1 });
  writeFileSync(`tmp/cad-check/${name}.step`, Buffer.from(await step.arrayBuffer()));
  writeFileSync(`tmp/cad-check/${name}.stl`, Buffer.from(cleanBinarySTL(await stl.arrayBuffer())));
  reports.push(structuredClone({ name, generatorVersion: p.generatorVersion, volume: model.volume, bounds: model.bounds, apertureSurfaces: model.apertureSurfaces, aperturePosition: [p.central.x, p.central.y], solidCount: model.solidCount, localThickness: model.localThickness, centralMode: p.central.mode, diameter: p.central.diameter, print: p.central.print, thread: p.central.thread, relief: p.relief, orientation: p.orientation, ...evidence, stepBytes: step.size, stlBytes: stl.size }));
}
for (const file of readdirSync('steps').filter(n => /\.(step|stp)$/i.test(n))) {
  const p = defaultProject();
  const template = { id: file.startsWith('Graflex') ? 'graflex-test' : file, file, rotationX: 90, editableRadius: 54 } as Template;
  const source = new Blob([readFileSync(`steps/${file}`)]);
  const model = await buildModel(p, template, source);
  assert.ok(isValid(model.shape));
  const step = model.shape.blobSTEP();
  const reloaded = await importSTEP(step);
  assert.ok(isValid(reloaded));
  assert.ok(Math.abs(measureVolume(reloaded.asShape3D()) - model.volume) / model.volume < 0.001);
  console.log(JSON.stringify({ file, valid: true, bounds: model.bounds, volume: model.volume, localThickness: model.localThickness, solids: model.solidCount, stepBytes: step.size, stlBytes: model.shape.blobSTL({ binary: true, tolerance: 0.03 }).size }));
  await record(file.replace(/\.step$/i, ''), model, p);
  reloaded.delete(); model.shape.delete();
}
console.log('Thread profile', threadDimensions(65, 1));
const groove = threadGroove(65, 1, 3, 0, false, 0);
console.log('Thread groove', { valid: isValid(groove), bounds: boundsOf(groove), volume: measureVolume(groove) });
assert.ok(isValid(groove)); groove.delete();
const p = defaultProject(); p.kind = 'flange'; p.central.mode = 'thread'; p.central.thread.confirmed = true;
const start = Date.now(), model = await buildModel(p);
assert.ok(isValid(model.shape)); console.log('Thread flange', { valid: true, volume: model.volume, ms: Date.now() - start, stepBytes: model.shape.blobSTEP().size });
await record('thread-flange-RH', model, p);
model.shape.delete();
for (const leftHand of [false, true]) {
  const project = defaultProject(); project.kind = 'flange'; project.central.mode = 'thread'; project.central.thread.confirmed = true; project.central.thread.leftHand = leftHand;
  project.central.thread.length = 4; project.flange.slotCount = 0;
  const threaded = await buildModel(project); assert.ok(isValid(threaded.shape));
  await record(`thread-flange-${leftHand ? 'LH' : 'RH'}-4mm`, threaded, project); threaded.shape.delete();
}
const sinar = { id: 'sinar-blank', rotationX: 90, editableRadius: 54 } as Template;
const sinarBlob = new Blob([readFileSync('steps/Sinar_Lensboard_blank.STEP')]);
for (const diameter of [34.6, 65]) {
  const project = defaultProject(); project.central.diameter = diameter; project.central.print.enabled = true;
  const drilled = await buildModel(project, sinar, sinarBlob);
  const expected = 62289.61992770565 - Math.PI * ((diameter + 0.5) / 2) ** 2 * 3.15;
  assert.ok(Math.abs(drilled.volume - expected) / expected < 1e-5);
  await record(`print-${diameter}`, drilled, project); drilled.shape.delete();
}
for (const kind of ['blind', 'countersink', 'counterbore'] as const) {
  const project = defaultProject(); project.holes = [{ id: `test-${kind}`, kind, enabled: true, x: 25, y: 0, diameter: 3.2, recessDiameter: 6.2, depth: 1.5, angle: 90, face: 'back' }];
  const drilled = await buildModel(project, sinar, sinarBlob); assert.ok(isValid(drilled.shape));
  await record(`back-${kind}`, drilled, project); drilled.shape.delete();
}
const patterned = defaultProject(); patterned.pattern.enabled = true; patterned.pattern.countersink = true;
const patternModel = await buildModel(patterned, sinar, sinarBlob); await record('pattern-countersink', patternModel, patterned); patternModel.shape.delete();
const seated = defaultProject(); seated.seat.enabled = true;
const seatModel = await buildModel(seated, sinar, sinarBlob); await record('seat', seatModel, seated); seatModel.shape.delete();
const threadedBoard = defaultProject(); threadedBoard.central.mode = 'thread'; threadedBoard.central.thread.confirmed = true;
const boardModel = await buildModel(threadedBoard, sinar, sinarBlob); await record('thread-board', boardModel, threadedBoard); boardModel.shape.delete();
const copalThread = defaultProject(); copalThread.central.mode = 'thread'; copalThread.central.thread.confirmed = true;
copalThread.central.thread.diameter = 62; copalThread.central.thread.pitch = 0.75;
const copalModel = await buildModel(copalThread, sinar, sinarBlob); await record('thread-M62-075', copalModel, copalThread); copalModel.shape.delete();
for (const length of [1, 20]) {
  const test = defaultProject(); test.kind = 'flange'; test.flange.diameter = 50; test.flange.thickness = 22; test.flange.stepDiameter = 30; test.flange.stepHeight = 0; test.flange.slotCount = 0;
  test.central.mode = 'thread'; test.central.x = 5; test.central.y = 3;
  test.central.thread.confirmed = true; test.central.thread.diameter = 20; test.central.thread.length = length;
  const tested = await buildModel(test); await record(`thread-${length}-turn`, tested, test); tested.shape.delete();
}
const invalid = defaultProject(); invalid.central.x = 100;
await assert.rejects(() => buildModel(invalid, sinar, sinarBlob));
for (const shape of ['roundedRectangle', 'circle'] as const) {
  for (const angle of [80, 90]) {
    for (const spacing of [17, -17]) {
      const test = defaultProject(); test.relief = { ...test.relief, enabled: true, shape, angle, spacing };
      const relief = await buildModel(test, sinar, sinarBlob);
      assert.ok(isValid(relief.shape)); assert.equal(relief.solidCount, 1);
      assert.ok(Math.abs(relief.localThickness - 2.5) < 1e-5);
      assert.ok(Math.abs(relief.apertureSurfaces![1] - (3.15 + spacing)) < 1e-5);
      assert.ok(Math.abs(relief.apertureSurfaces![0] - (3.15 + spacing - 2.5)) < 1e-5);
      if (angle === 90) {
        const area = shape === 'circle' ? Math.PI * 30 ** 2 : 60 ** 2 - (4 - Math.PI) * 8 ** 2;
        const innerArea = shape === 'circle' ? Math.PI * 28 ** 2 : 56 ** 2 - (4 - Math.PI) * 6 ** 2;
        const unbored = spacing > 0 ? 62289.61992770565 - innerArea * 3.15 + area * spacing - innerArea * (spacing - 2.5)
          : 62289.61992770565 - area * 3.15 + (area - innerArea) * Math.abs(spacing) + area * 2.5;
        const expected = unbored - Math.PI * (34.6 / 2) ** 2 * 2.5;
        assert.ok(Math.abs(relief.volume - expected) < 0.02, `Wrong straight-wall relief volume ${relief.volume} vs ${expected}`);
      }
      const edges = relief.shape.meshEdges().lines; assert.ok(edges.length > 0 && edges.length % 6 === 0);
      await record(`relief-${shape}-${angle}-${spacing > 0 ? 'raised' : 'recessed'}`, relief, test);
      console.log(`Relief ${shape} ${angle} ${spacing}: valid, face=2.5 mm`); relief.shape.delete();
    }
  }
}
for (const spacing of [17, -17]) {
  const test = defaultProject(); test.relief.enabled = true; test.relief.spacing = spacing;
  test.central.mode = 'thread'; test.central.thread.confirmed = true;
  test.central.thread.diameter = 40; test.central.thread.length = 2;
  const relief = await buildModel(test, sinar, sinarBlob);
  await record(`relief-thread-${spacing > 0 ? 'raised' : 'recessed'}`, relief, test); relief.shape.delete();
}
const oversizedRelief = defaultProject(); oversizedRelief.relief.enabled = true; oversizedRelief.relief.width = 170;
await assert.rejects(() => buildModel(oversizedRelief, sinar, sinarBlob), /reliefBoundary/);
const crossedWall = defaultProject(); crossedWall.relief.enabled = true; crossedWall.central.x = 20;
await assert.rejects(() => buildModel(crossedWall, sinar, sinarBlob));
for (const spacing of [-0.1, -1]) {
  const test = defaultProject(); test.relief.enabled = true; test.relief.spacing = spacing;
  const m = await buildModel(test, sinar, sinarBlob);
  assert.ok(Math.abs(m.localThickness - 2.5) < 1e-5);
  await record(`relief-shallow-${Math.abs(spacing)}`, m, test); m.shape.delete();
}
for (const radius of [0, 2]) for (const spacing of [17, -17]) {
  const test = defaultProject(); test.relief.enabled = true; test.relief.radius = radius; test.relief.spacing = spacing;
  const m = await buildModel(test, sinar, sinarBlob);
  await record(`relief-radius-${radius}-${spacing > 0 ? 'raised' : 'recessed'}`, m, test); m.shape.delete();
}
// Golden source datums independently inspected before this orientation feature:
// main-body overall height, central lower surface, central upper surface.
const datums: Record<string, [number, number, number]> = {
  'ALPA_Lensboard_blank.STEP': [3, 0, 2], 'Arca141_Lensboard_blank.STEP': [3.25, 0, 2.5],
  'CAMBO TWR54_Lensboard_simplified_blank.STEP': [3.75, 2, 3.75],
  'Graflex_pacemaker45_Lensboard_simplified_blank.STEP': [5, 3, 5],
  'Horseman_Lensboard_blank.STEP': [7.6, 5.8, 7.6], 'Horseman_Lensboard_simplified_blank.STEP': [7.6, 5.8, 7.6],
  'Linhof_Lensboard_blank.STEP': [4.45, 1.95, 4.45], 'Sinar_Lensboard_blank.STEP': [5.15, 0, 3.15],
  'Sinar_Lensboard_simplified_blank.STEP': [5, 0, 3.15], 'TOYO158_Lensboard_simplified_blank.STEP': [6.5, 0, 2.5],
};
for (const [file, [height, lo, hi]] of Object.entries(datums)) {
  const source = new Blob([readFileSync(`steps/${file}`)]);
  const template = { id: file.startsWith('Graflex') ? 'graflex-test' : file, rotationX: 90, editableRadius: 26 } as Template;
  for (const [frontBack, upDown] of [[true, false], [false, true], [true, true]]) {
    const p = defaultProject(); p.orientation = { frontBack, upDown }; p.central.diameter = 10; p.central.x = 7; p.central.y = -5;
    const m = await buildModel(p, template, source);
    const expectedSurfaces = frontBack ? [height - hi, height - lo] : [lo, hi];
    m.apertureSurfaces!.forEach((v, i) => assert.ok(Math.abs(v - expectedSurfaces[i]) < 1e-5, `${file}: flipped datum`));
    assert.equal(m.solidCount, file === 'Horseman_Lensboard_blank.STEP' ? 2 : 1);
    await record(`orientation-${file.replace(/\.STEP$/, '')}-${Number(frontBack)}${Number(upDown)}`, m, p, { expectedSurfaces, checkOffsetHole: true }); m.shape.delete();
  }
}
for (const [file, width, editableRadius] of [
  ['ALPA_Lensboard_blank.STEP', 60, 30], ['Graflex_pacemaker45_Lensboard_simplified_blank.STEP', 60, 35],
  ['CAMBO TWR54_Lensboard_simplified_blank.STEP', 52, 26], ['Linhof_Lensboard_blank.STEP', 56, 35],
] as const) for (const frontBack of [false, true]) {
  const p = defaultProject(); p.relief.enabled = true; p.relief.width = p.relief.height = width; p.orientation.frontBack = frontBack;
  const template = { id: file.startsWith('Graflex') ? 'graflex-test' : file, rotationX: 90, editableRadius } as Template;
  const m = await buildModel(p, template, new Blob([readFileSync(`steps/${file}`)]));
  const [height, lo, hi] = datums[file], expectedBase = frontBack ? height - lo : hi;
  assert.ok(Math.abs(m.apertureSurfaces![1] - expectedBase - 17) < 1e-5);
  await record(`relief-fix-${file.replace(/\.STEP$/, '')}-${Number(frontBack)}`, m, p, { expectedBase, baseLo: frontBack ? height - hi : lo }); m.shape.delete();
}
// Original fixture, not a camera compatibility claim: preserve a separate front accessory.
for (const file of ['Linhof_Lensboard_blank.STEP', 'CAMBO TWR54_Lensboard_simplified_blank.STEP']) {
  for (const frontBack of [false, true]) for (const spacing of [17, -17]) {
    const p = defaultProject(); p.relief.enabled = true; p.orientation.frontBack = frontBack; p.relief.spacing = spacing;
    const template = { id: file, rotationX: 90, editableRadius: 26 } as Template;
    const m = await buildModel(p, template, new Blob([readFileSync(`steps/${file}`)]));
    const [height, lo, hi] = datums[file], expectedBase = frontBack ? height - lo : hi;
    assert.ok(Math.abs(m.apertureSurfaces![1] - expectedBase - spacing) < 1e-5);
    await record(`relief-size-only-${file.replace(/\.STEP$/, '')}-${Number(frontBack)}-${spacing}`, m, p, { expectedBase, baseLo: frontBack ? height - hi : lo, nonuniformSource: file, sourceHeight: height }); m.shape.delete();
  }
}
const fixtureMain = makeBox([-50, 0, -50], [50, 3, 50]);
const fixtureAccessory = makeBox([29, 4, -5], [31, 10, 5]);
const fixture = makeCompound([fixtureMain, fixtureAccessory]); const fixtureBlob = fixture.blobSTEP();
fixture.delete(); fixtureMain.delete(); fixtureAccessory.delete();
const fixtureTemplate = { id: 'fixture', rotationX: 90, editableRadius: 35 } as Template;
const collision = defaultProject(); collision.relief.enabled = true;
await assert.rejects(() => buildModel(collision, fixtureTemplate, fixtureBlob), /reliefAccessory/);
collision.orientation.frontBack = true;
const clear = await buildModel(collision, fixtureTemplate, fixtureBlob); assert.equal(clear.solidCount, 2);
await record('relief-accessory-flipped', clear, collision, { expectedBase: 3, baseLo: 0, materialSamples: [[-30, 0, -4, true], [30, 0, 7, false]] }); clear.shape.delete();
collision.relief.spacing = -17;
await assert.rejects(() => buildModel(collision, fixtureTemplate, fixtureBlob), /reliefAccessory/);
// Reconstructed manufacturing settings from the two reported ALPA designs.
// Do not depend on or publish private Downloads JSON paths / feature IDs.
const alpaTemplate = { id: 'alpa-blank', rotationX: 90, editableRadius: 30 } as Template;
const alpaBlob = new Blob([readFileSync('steps/ALPA_Lensboard_blank.STEP')]);
function alpaCap() {
  const p = defaultProject(); p.templateId = 'alpa-blank'; p.orientation.frontBack = true;
  p.relief = { ...p.relief, enabled: true, width: 80, height: 80, radius: 8, diameter: 50, angle: 90 };
  p.central.diameter = 60; return p;
}
const alpaEvidence = { expectedBase: 3, baseLo: 1, nonuniformSource: 'ALPA_Lensboard_blank.STEP', sourceHeight: 3 };
for (const mode of ['plain', 'thread'] as const) {
  const p = alpaCap(); p.central.mode = mode; p.central.thread.confirmed = mode === 'thread';
  const m = await buildModel(p, alpaTemplate, alpaBlob);
  assert.equal(m.solidCount, 1); assert.ok(isValid(m.shape));
  m.apertureSurfaces!.forEach((v, i) => assert.ok(Math.abs(v - [17.5, 20][i]) < 1e-5));
  await record(`alpa-cap-${mode === 'plain' ? 'hole60' : 'M65x1'}`, m, p, alpaEvidence); m.shape.delete();
  const flat = structuredClone(p); flat.relief.enabled = false;
  await assert.rejects(() => buildModel(flat, alpaTemplate, alpaBlob), /protected/);
}
const capHole = alpaCap(); capHole.central.diameter = 10;
capHole.holes = [{ id: 'end-face-hole', enabled: true, kind: 'blind', x: 32, y: 0, diameter: 3, depth: 1, recessDiameter: 6, angle: 90, face: 'front' }];
const capHoleModel = await buildModel(capHole, alpaTemplate, alpaBlob);
await record('alpa-cap-offset-blind', capHoleModel, capHole, { ...alpaEvidence, materialSamples: [[32, 0, 19.5, false], [32, 0, 18, true], [-32, 0, 19.5, true]] }); capHoleModel.shape.delete();
const oldStockHole = structuredClone(capHole); oldStockHole.holes[0].x = 41;
await assert.rejects(() => buildModel(oldStockHole, alpaTemplate, alpaBlob), /protected/);
const wallHole = structuredClone(capHole); wallHole.holes[0].x = 36;
await assert.rejects(() => buildModel(wallHole, alpaTemplate, alpaBlob), /reliefAperture/);
const longThread = alpaCap(); longThread.central.mode = 'thread'; longThread.central.thread.confirmed = true; longThread.central.thread.length = 3;
await assert.rejects(() => buildModel(longThread, alpaTemplate, alpaBlob), /depth/);
// Seat changes the end-face upper surface: it must not accidentally restore the old gate.
const capSeat = alpaCap(); capSeat.central.diameter = 10; capSeat.seat.enabled = true; capSeat.seat.diameter = 60; capSeat.seat.remainingThickness = 2;
const capSeatModel = await buildModel(capSeat, alpaTemplate, alpaBlob);
assert.ok(Math.abs(capSeatModel.localThickness - 2) < 1e-5);
await record('alpa-cap-seat', capSeatModel, capSeat, { ...alpaEvidence, endFaceThinned: true, materialSamples: [[0, 0, 18, false], [20, 0, 19.75, false], [20, 0, 18, true]] }); capSeatModel.shape.delete();
// Lead-in regressions use the actual new-design defaults, not the legacy wrapper.
for (const leftHand of [false, true]) {
  const p = appDefaults(); p.kind = 'flange'; p.central.mode = 'thread'; p.central.thread.confirmed = true;
  p.central.thread.leftHand = leftHand; p.central.thread.clearance = 0.2; p.central.thread.length = 4; p.flange.slotCount = 0;
  const m = await buildModel(p); await record(`chamfer-flange-${leftHand ? 'LH' : 'RH'}`, m, p); m.shape.delete();
}
for (const pitch of [0.75, 2]) {
  const p = appDefaults(); p.kind = 'flange'; p.flange.stepHeight = 0; p.flange.slotCount = 0; p.flange.thickness = 8;
  p.central.mode = 'thread'; p.central.thread.confirmed = true; p.central.thread.diameter = 20; p.central.thread.pitch = pitch; p.central.thread.length = 6;
  p.central.x = 5; p.central.y = -3;
  const m = await buildModel(p); await record(`chamfer-pitch-${pitch}`, m, p); m.shape.delete();
}
for (const spacing of [17, -17]) {
  const p = alpaCap(); p.central.mode = 'thread'; p.central.thread.confirmed = true; p.central.thread.chamfer.enabled = true; p.relief.spacing = spacing;
  const m = await buildModel(p, alpaTemplate, alpaBlob); await record(`chamfer-alpa-${spacing}`, m, p, alpaEvidence); m.shape.delete();
}
const customChamfer = appDefaults(); customChamfer.kind = 'flange'; customChamfer.central.mode = 'thread'; customChamfer.central.thread.confirmed = true;
customChamfer.central.thread.chamfer = { enabled: true, mode: 'custom', sizeMm: 0.5 }; customChamfer.flange.slotCount = 0;
const customModel = await buildModel(customChamfer); await record('chamfer-custom-05', customModel, customChamfer); customModel.shape.delete();
const tap = appDefaults(); tap.kind = 'flange'; tap.central.mode = 'thread'; tap.central.thread.confirmed = true; tap.central.thread.mode = 'tapDrill';
tap.flange.stepHeight = 0; tap.flange.slotCount = 0; tap.central.x = 4; tap.central.y = -2;
const tapBare = structuredClone(tap); tapBare.central.thread.chamfer.enabled = false;
const bareModel = await buildModel(tapBare), tapModel = await buildModel(tap), C = threadChamferSize(tap.central.thread);
const removed = Math.PI * (tap.central.thread.tapDiameter / 2 * C ** 2 + C ** 3 / 3);
assert.ok(Math.abs(bareModel.volume - tapModel.volume - removed) / removed < 1e-5);
await record('chamfer-tap-drill', tapModel, tap, { chamferRemovedVolume: removed }); bareModel.shape.delete(); tapModel.shape.delete();
const deep = structuredClone(tap); deep.flange.thickness = 1;
await assert.rejects(() => buildModel(deep), /depth/); deep.central.thread.length = 0.5;
await assert.rejects(() => buildModel(deep), /chamferDepth/);
const depleted = structuredClone(customChamfer); depleted.central.thread.chamfer.sizeMm = depleted.central.thread.length;
await assert.rejects(() => buildModel(depleted), /chamfer/);
const crossedChamfer = alpaCap(); crossedChamfer.central.mode = 'thread'; crossedChamfer.central.thread.confirmed = true;
crossedChamfer.central.thread.chamfer.enabled = true; crossedChamfer.relief.width = crossedChamfer.relief.height = 72.4;
await assert.rejects(() => buildModel(crossedChamfer, alpaTemplate, alpaBlob), /reliefAperture/);
writeFileSync('tmp/cad-check/report.json', JSON.stringify(reports, null, 2));
console.log(`PASS: ${reports.length} export regression samples written to tmp/cad-check.`);
