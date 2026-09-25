// SPDX-License-Identifier: GPL-3.0-only
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getOC, importSTEP, makeCylinder, measureVolume, type AnyShape } from 'replicad';
import { initCad } from './init-cad.ts';

function boundsOf(shape: AnyShape) {
  const box = shape.boundingBox;
  try { return box.bounds; } finally { box.delete(); }
}

const [input, angleArg, shiftArg] = process.argv.slice(2);
if (!input || !Number.isFinite(Number(angleArg)) || !Number.isFinite(Number(shiftArg))) {
  throw new Error('Usage: inspect-template.ts <file.step> <rotationX> <sourceShiftX>');
}

await initCad();
const raw = await importSTEP(new Blob([readFileSync(resolve(input))]));
let rotated: ReturnType<typeof raw.rotate> | undefined;
let normalized: ReturnType<typeof raw.rotate> | undefined;
let probe: ReturnType<typeof makeCylinder> | undefined;
let intersection: ReturnType<typeof raw.rotate> | undefined;
try {
  const analyzer = new (getOC().BRepCheck_Analyzer)(raw.wrapped, true, false, false);
  let valid: boolean;
  try { valid = analyzer.IsValid(); } finally { analyzer.delete(); }
  rotated = raw.rotate(Number(angleArg), [0, 0, 0], [1, 0, 0]);
  const rotatedBounds = boundsOf(rotated);
  normalized = rotated.translate(Number(shiftArg), 0, -rotatedBounds[0][2]);
  const bounds = boundsOf(normalized);
  const solids = normalized.solids;
  const solidInfo = solids.map((solid) => {
    try { return { bounds: boundsOf(solid), volume: measureVolume(solid) }; }
    finally { solid.delete(); }
  });
  const volume = solidInfo.reduce((sum, item) => sum + item.volume, 0);
  probe = makeCylinder(0.04, bounds[1][2] - bounds[0][2] + 2, [0, 0, bounds[0][2] - 1]);
  intersection = normalized.asShape3D().intersect(probe);
  const centerBounds = intersection.isNull ? null : boundsOf(intersection);
  console.log(JSON.stringify({ valid, bounds, solidCount: solidInfo.length, solids: solidInfo,
    volume, centerBounds, centralThickness: centerBounds ? centerBounds[1][2] - centerBounds[0][2] : 0 }));
} finally {
  intersection?.delete(); probe?.delete(); normalized?.delete(); rotated?.delete(); raw.delete();
}
