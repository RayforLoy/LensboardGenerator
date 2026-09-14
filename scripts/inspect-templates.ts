// SPDX-License-Identifier: GPL-3.0-only
import { initCad } from './init-cad.ts';
import { readdirSync, readFileSync } from 'node:fs';
import { importSTEP, measureVolume, makeCylinder } from 'replicad';

await initCad();
for (const file of readdirSync('steps').filter(n => /\.(step|stp)$/i.test(n))) {
  const shape = await importSTEP(new Blob([readFileSync(`steps/${file}`)]));
  const originBounds = shape.boundingBox.bounds;
  let normalized = shape.rotate(90, [0,0,0], [1,0,0]).translate(file.startsWith('Graflex') ? -150 : 0, 0, -originBounds[0][1]);
  const solids = normalized.solids;
  console.log(JSON.stringify({ file, bounds: normalized.boundingBox.bounds, volume: measureVolume(normalized.asShape3D()), solids: solids.map(s => ({ bounds: s.boundingBox.bounds, volume: measureVolume(s) })) }));
  const tool = makeCylinder(0.5, 50, [0,0,-10]);
  const intersection = normalized.asShape3D().intersect(tool);
  console.log(JSON.stringify({ centerProbe: intersection.isNull ? null : intersection.boundingBox.bounds }));
  intersection.delete(); tool.delete(); solids.forEach(s => s.delete()); normalized.delete();
  shape.delete();
}
