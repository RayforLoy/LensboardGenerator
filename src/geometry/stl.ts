// SPDX-License-Identifier: GPL-3.0-only
// OCCT may emit zero-area triangles that collapse when converted to STL float32.
// Remove only these triangles; reject open/non-manifold or inconsistently wound output.
export function cleanBinarySTL(input: ArrayBuffer): ArrayBuffer {
  const data = new DataView(input);
  if (input.byteLength < 84) throw Error('invalidMesh');
  const count = data.getUint32(80, true);
  if (84 + count * 50 !== input.byteLength) throw Error('invalidMesh');
  const kept: number[] = [], vertices = new Map<string, number>();
  const edges = new Map<string, { count: number; balance: number }>();
  const vertexId = (v: number[]) => {
    const key = v.map(n => Object.is(n, -0) ? 0 : n).join(',');
    const existing = vertices.get(key); if (existing !== undefined) return existing;
    const id = vertices.size; vertices.set(key, id); return id;
  };
  for (let i = 0; i < count; i++) {
    const offset = 84 + i * 50;
    const points = [0, 1, 2].map(j => [0, 1, 2].map(k => data.getFloat32(offset + 12 + j * 12 + k * 4, true)));
    if (!points.flat().every(Number.isFinite)) throw Error('invalidMesh');
    const a = points[1].map((n, j) => n - points[0][j]), b = points[2].map((n, j) => n - points[0][j]);
    const cross = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
    if (cross.reduce((s, n) => s + n*n, 0) <= 1e-16) continue;
    kept.push(offset);
    const ids = points.map(vertexId);
    for (let j = 0; j < 3; j++) {
      const from = ids[j], to = ids[(j + 1) % 3], key = `${Math.min(from, to)}:${Math.max(from, to)}`;
      const e = edges.get(key) ?? { count: 0, balance: 0 }; e.count++; e.balance += from < to ? 1 : -1; edges.set(key, e);
    }
  }
  if (!kept.length || [...edges.values()].some(e => e.count !== 2 || e.balance !== 0)) throw Error('invalidMesh');
  const output = new ArrayBuffer(84 + kept.length * 50), bytes = new Uint8Array(output);
  bytes.set(new Uint8Array(input, 0, 80)); new DataView(output).setUint32(80, kept.length, true);
  kept.forEach((offset, i) => bytes.set(new Uint8Array(input, offset, 50), 84 + i * 50));
  return output;
}
