// SPDX-License-Identifier: GPL-3.0-only
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { initCad } from './init-cad.ts';
import { defaultProject } from '../src/domain/project.ts';
import { buildModel, isValid, threadGroove, threadDimensions, boundsOf } from '../src/geometry/model.ts';
import { importSTEP, measureVolume } from 'replicad';
import assert from 'node:assert/strict';
import type { Template } from '../src/templates/index.ts';
import { cleanBinarySTL } from '../src/geometry/stl.ts';

await initCad();
mkdirSync('tmp/cad-check', { recursive: true });
const reports: Record<string, unknown>[] = [];
async function record(name: string, model: Awaited<ReturnType<typeof buildModel>>, p: ReturnType<typeof defaultProject>) {
  const step = model.shape.blobSTEP(), stl = model.shape.blobSTL({ binary: true, tolerance: 0.03, angularTolerance: 0.1 });
  writeFileSync(`tmp/cad-check/${name}.step`, Buffer.from(await step.arrayBuffer()));
  writeFileSync(`tmp/cad-check/${name}.stl`, Buffer.from(cleanBinarySTL(await stl.arrayBuffer())));
  reports.push({ name, volume: model.volume, bounds: model.bounds, apertureSurfaces: model.apertureSurfaces, aperturePosition: [p.central.x, p.central.y], solidCount: model.solidCount, localThickness: model.localThickness, centralMode: p.central.mode, diameter: p.central.diameter, print: p.central.print, thread: p.central.thread, stepBytes: step.size, stlBytes: stl.size });
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
writeFileSync('tmp/cad-check/report.json', JSON.stringify(reports, null, 2));
console.log(`PASS: ${reports.length} export regression samples written to tmp/cad-check.`);
