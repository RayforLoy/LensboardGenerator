// SPDX-License-Identifier: GPL-3.0-only
import { it, expect } from 'vitest';
import { cleanBinarySTL } from '../src/geometry/stl';

function mesh(degenerate = false) {
  const vertices = [[0,0,0], [1,0,0], [0,1,0], [0,0,1]];
  const faces = [[0,2,1], [0,1,3], [0,3,2], [1,2,3]];
  if (degenerate) faces.push([0,0,0]);
  const bytes = new ArrayBuffer(84 + faces.length * 50), view = new DataView(bytes);
  view.setUint32(80, faces.length, true);
  faces.forEach((face, i) => face.forEach((v, j) => vertices[v].forEach((n, k) => view.setFloat32(84 + i*50 + 12 + j*12 + k*4, n, true))));
  return bytes;
}
it('preserves a closed oriented STL and removes only collapsed triangles', () => {
  expect(cleanBinarySTL(mesh()).byteLength).toBe(284);
  expect(cleanBinarySTL(mesh(true)).byteLength).toBe(284);
});
it('rejects malformed and open meshes instead of silently repairing them', () => {
  expect(() => cleanBinarySTL(new ArrayBuffer(10))).toThrow('invalidMesh');
  const open = mesh().slice(0, 234); new DataView(open).setUint32(80, 3, true);
  expect(() => cleanBinarySTL(open)).toThrow('invalidMesh');
});
