// SPDX-License-Identifier: GPL-3.0-only
export const APP_VERSION = '0.3.0';
export const SOURCE_URL = 'https://skgrimes.com/shutters/';
export const GENERATOR_SOURCE_URL: string = import.meta.env?.VITE_SOURCE_URL || '';
export const presets = [
  ['copal-0', 'Copal #0', 34.6], ['compur-0', 'Compur #0', 34.6],
  ['copal-1', 'Copal #1', 41.6], ['compur-1', 'Compur #1', 41.6],
  ['copal-3', 'Copal #3', 65], ['compur-3', 'Compur #3', 65],
  ['compur-00', 'Compur #00', 26.3], ['compur-2', 'Compur #2', 52.5],
  ['copal-3s', 'Copal #3s', 64.1], ['copal-press-0', 'Copal Press #0', 34.6],
  ['copal-press-1', 'Copal Press #1', 41.6],
].map(([id, name, diameter]) => ({ id: id as string, name: name as string, diameter: diameter as number, source: SOURCE_URL, checkedAt: '2026-09-14' }));

export type Face = 'front' | 'back';
export type HoleKind = 'through' | 'blind' | 'countersink' | 'counterbore';
export interface Hole {
  id: string; enabled: boolean; kind: HoleKind; x: number; y: number;
  diameter: number; depth: number; recessDiameter: number; angle: number; face: Face;
}
export interface Project {
  schemaVersion: 5; generatorVersion: string; license: 'GPL-3.0-only'; units: 'mm';
  kind: 'board' | 'flange'; templateId: string; templateVersion: string;
  boardSource: 'template' | 'custom';
  orientation: { frontBack: boolean; upDown: boolean };
  customBoard: { width: number; height: number; thickness: number; radius: number;
    outerLightTrap: { enabled: boolean; width: number; height: number };
    innerLightTrap: { enabled: boolean; width: number; height: number; radius: number; heightMm: number } };
  central: { enabled: boolean; mode: 'plain' | 'thread'; x: number; y: number; diameter: number; presetId: string;
    print: { enabled: boolean; diameterAllowanceMm: number };
    thread: { diameter: number; pitch: number; length: number; leftHand: boolean; clearance: number; confirmed: boolean; mode: 'modeled' | 'tapDrill'; tapDiameter: number;
      chamfer: { enabled: boolean; mode: 'pitch' | 'custom'; sizeMm: number } } };
  holes: Hole[];
  pattern: { enabled: boolean; count: number; pcd: number; diameter: number; startAngle: number; x: number; y: number; countersink: boolean; recessDiameter: number; angle: number; face: Face };
  seat: { enabled: boolean; diameter: number; remainingThickness: number; face: Face };
  relief: { enabled: boolean; shape: 'roundedRectangle' | 'circle'; width: number; height: number; radius: number; diameter: number; wall: number; faceThickness: number; angle: number; spacing: number };
  flange: { diameter: number; thickness: number; stepDiameter: number; stepHeight: number; slotCount: number; slotWidth: number; slotDepth: number; slotAngle: number };
  meshQuality: 'standard' | 'fine';
}
export const defaultProject = (): Project => ({
  schemaVersion: 5, generatorVersion: APP_VERSION, license: 'GPL-3.0-only', units: 'mm',
  kind: 'board', templateId: 'sinar-blank', templateVersion: '1',
  boardSource: 'template',
  orientation: { frontBack: false, upDown: false },
  customBoard: { width: 100, height: 100, thickness: 3, radius: 8,
    outerLightTrap: { enabled: false, width: 3, height: 2 },
    innerLightTrap: { enabled: false, width: 60, height: 60, radius: 6, heightMm: 2 } },
  central: { enabled: true, mode: 'plain', x: 0, y: 0, diameter: 34.6, presetId: 'copal-0',
    print: { enabled: false, diameterAllowanceMm: 0.5 },
    thread: { diameter: 65, pitch: 1, length: 2.5, leftHand: false, clearance: 0, confirmed: false, mode: 'modeled', tapDiameter: 63.9,
      chamfer: { enabled: true, mode: 'pitch', sizeMm: 1.2 } } },
  holes: [], pattern: { enabled: false, count: 6, pcd: 90, diameter: 3.2, startAngle: 0, x: 0, y: 0, countersink: false, recessDiameter: 6.2, angle: 90, face: 'front' },
  seat: { enabled: false, diameter: 80, remainingThickness: 2.5, face: 'front' },
  relief: { enabled: false, shape: 'roundedRectangle', width: 60, height: 60, radius: 8, diameter: 60, wall: 2, faceThickness: 2.5, angle: 80, spacing: 17 },
  flange: { diameter: 100, thickness: 3, stepDiameter: 70, stepHeight: 2, slotCount: 4, slotWidth: 2, slotDepth: 2, slotAngle: 0 },
  meshQuality: 'standard',
});
export function actualDiameter(p: Project): number {
  return p.central.diameter + (p.kind === 'board' && p.central.mode === 'plain' && p.central.print.enabled ? p.central.print.diameterAllowanceMm : 0);
}
export function countersinkDepth(d: number, D: number, angle: number): number {
  return (D - d) / (2 * Math.tan(angle * Math.PI / 360));
}
export function threadChamferSize(t: Project['central']['thread']): number {
  return t.chamfer.enabled ? (t.chamfer.mode === 'pitch' ? t.pitch * 1.2 : t.chamfer.sizeMm) : 0;
}
export function threadBoreRadius(t: Project['central']['thread']): number {
  // M basic internal minor diameter: D1 = D - 5*sqrt(3)*P/8.
  return t.mode === 'tapDrill' ? t.tapDiameter / 2 : (t.diameter - 5 * Math.sqrt(3) * t.pitch / 8) / 2 + t.clearance;
}
export function threadEnvelopeRadius(t: Project['central']['thread']): number {
  return Math.max(t.mode === 'tapDrill' ? t.tapDiameter / 2 : t.diameter / 2 + t.clearance,
    threadBoreRadius(t) + threadChamferSize(t));
}
export function patternHoles(p: Project['pattern']): Hole[] {
  if (!p.enabled || !Number.isInteger(p.count) || p.count < 1 || p.count > 100) return [];
  return Array.from({ length: p.count }, (_, i) => {
    const angle = (p.startAngle + i * 360 / p.count) * Math.PI / 180;
    return { id: `pattern-${i}`, enabled: true, kind: p.countersink ? 'countersink' : 'through', x: p.x + p.pcd / 2 * Math.cos(angle), y: p.y + p.pcd / 2 * Math.sin(angle), diameter: p.diameter, depth: 1, recessDiameter: p.recessDiameter, angle: p.angle, face: p.face };
  });
}
export const newHole = (): Hole => ({ id: crypto.randomUUID(), enabled: true, kind: 'through', x: 25, y: 0, diameter: 3.2, depth: 1.5, recessDiameter: 6.2, angle: 90, face: 'front' });
export interface Issue { code: string; feature?: string; warning?: boolean; }
export function reliefDimensions(r: Project['relief']) {
  const shrink = r.angle === 90 ? 0 : Math.abs(r.spacing) / Math.tan(r.angle * Math.PI / 180);
  const inset = r.wall / Math.sin(r.angle * Math.PI / 180);
  const width = r.shape === 'circle' ? r.diameter : r.width;
  const height = r.shape === 'circle' ? r.diameter : r.height;
  const radius = r.shape === 'circle' ? r.diameter / 2 : r.radius;
  return { shrink, inset, width, height, radius, endWidth: width - 2 * shrink, endHeight: height - 2 * shrink,
    endRadius: Math.max(0, radius - shrink), innerWidth: width - 2 * (shrink + inset), innerHeight: height - 2 * (shrink + inset),
    baseEnvelope: Math.hypot(width / 2 - radius, height / 2 - radius) + radius };
}
export function reliefApertureFits(r: Project['relief'], x: number, y: number, radius: number, margin = 1.5): boolean {
  const d = reliefDimensions(r);
  if (r.shape === 'circle') return Math.hypot(x, y) + radius + margin <= d.innerWidth / 2;
  const corner = Math.max(0, r.radius - d.shrink - d.inset);
  const qx = Math.abs(x) - (d.innerWidth / 2 - corner), qy = Math.abs(y) - (d.innerHeight / 2 - corner);
  const distance = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - corner;
  return distance + radius + margin <= 0;
}
// User-selected size-only base check: no material probe or additional safety margin.
// Test each side around the optical origin, not merely footprint area / total width.
export function reliefWithinBoard(r: Project['relief'], bounds: readonly [readonly number[], readonly number[]]): boolean {
  const { width, height } = reliefDimensions(r), epsilon = 1e-5;
  return -width / 2 >= bounds[0][0] - epsilon && width / 2 <= bounds[1][0] + epsilon
    && -height / 2 >= bounds[0][1] - epsilon && height / 2 <= bounds[1][1] + epsilon;
}
export type CustomBoardShape = 'rectangle' | 'roundedRectangle' | 'racetrack' | 'circle';
export function customBoardShape(width: number, height: number, radius: number): CustomBoardShape {
  const epsilon = 1e-8;
  if (radius <= epsilon) return 'rectangle';
  if (Math.abs(radius - Math.min(width, height) / 2) <= epsilon) return Math.abs(width - height) <= epsilon ? 'circle' : 'racetrack';
  return 'roundedRectangle';
}
export function roundedRectangleArea(width: number, height: number, radius: number): number {
  return width * height - (4 - Math.PI) * radius ** 2;
}
export function roundedRectangleContains(outerWidth: number, outerHeight: number, outerRadius: number, innerWidth: number, innerHeight: number, innerRadius: number, clearance = 0, strict = false): boolean {
  // Rounded rectangles are a centered rectangle Minkowski-summed with a disk.
  // Comparing their support functions gives an exact containment test, including
  // circle/racetrack corners where width/height bounds alone are insufficient.
  const a = outerWidth / 2 - outerRadius - (innerWidth / 2 - innerRadius);
  const b = outerHeight / 2 - outerRadius - (innerHeight / 2 - innerRadius);
  const c = outerRadius - innerRadius - clearance;
  let minimum = Math.min(a + c, b + c);
  if (a < 0 && b < 0) minimum = Math.min(minimum, c - Math.hypot(a, b));
  return strict ? minimum > 1e-8 : minimum >= -1e-8;
}
export function validate(p: Project): Issue[] {
  const errors: Issue[] = [];
  const add = (code: string, feature?: string) => errors.push({ code, feature });
  const walk = (v: unknown): boolean => typeof v === 'number' ? Number.isFinite(v) : Array.isArray(v) ? v.every(walk) : v !== null && typeof v === 'object' ? Object.values(v).every(walk) : true;
  if (!walk(p)) return [{ code: 'finite' }];
  const c = p.central, t = c.thread, f = p.flange;
  if (p.kind === 'board' && p.boardSource === 'custom') {
    const b = p.customBoard, short = Math.min(b.width, b.height);
    if (b.width <= 0 || b.width > 400 || b.height <= 0 || b.height > 400 || b.thickness <= 0 || b.thickness > 30 || b.radius < 0 || b.radius > short / 2) add('customBoard', 'customBoard');
    const outerValid = !b.outerLightTrap.enabled || (b.outerLightTrap.width > 0 && b.outerLightTrap.width < short / 2 && b.outerLightTrap.height > 0 && b.outerLightTrap.height <= 30);
    if (!outerValid) add('outerLightTrap', 'outerLightTrap');
    let enclosing = b.outerLightTrap.enabled && outerValid
      ? { width: b.width - 2 * b.outerLightTrap.width, height: b.height - 2 * b.outerLightTrap.width, radius: Math.max(0, b.radius - b.outerLightTrap.width) }
      : { width: b.width, height: b.height, radius: b.radius };
    if (b.innerLightTrap.enabled) {
      const i = b.innerLightTrap;
      const innerValid = i.width > 0 && i.width <= b.width && i.height > 0 && i.height <= b.height && i.radius >= 0 && i.radius <= Math.min(i.width, i.height) / 2 && i.heightMm > 0 && i.heightMm <= 30;
      if (!innerValid) add('innerLightTrap', 'innerLightTrap');
      else {
        if (!roundedRectangleContains(enclosing.width, enclosing.height, enclosing.radius, i.width, i.height, i.radius)) add('lightTrapOrder', 'innerLightTrap');
        enclosing = { width: i.width, height: i.height, radius: i.radius };
      }
    }
    if (p.relief.enabled) {
      const r = reliefDimensions(p.relief);
      if (!roundedRectangleContains(enclosing.width, enclosing.height, enclosing.radius, r.width, r.height, r.radius)) add('lightTrapOrder', 'relief');
    }
  }
  if (p.relief.enabled) {
    const r = p.relief, dims = reliefDimensions(r);
    if (p.kind !== 'board' || r.wall <= 0 || r.wall > 20 || r.faceThickness <= 0 || r.faceThickness > 30 || r.angle < 45 || r.angle > 90 || r.spacing === 0 || Math.abs(r.spacing) > 100 || (r.spacing > 0 && r.spacing <= r.faceThickness) || dims.width <= 0 || dims.height <= 0 || dims.width > 200 || dims.height > 200 || (r.shape === 'roundedRectangle' && (r.radius < 0 || r.radius > Math.min(r.width, r.height) / 2)) || dims.innerWidth <= 3 || dims.innerHeight <= 3) add('relief', 'relief');
    const apertureRadius = c.mode === 'plain' ? actualDiameter(p) / 2 : threadEnvelopeRadius(t);
    if (c.enabled && !reliefApertureFits(r, c.x, c.y, apertureRadius)) add('reliefAperture', 'central');
    if (p.seat.enabled && !reliefApertureFits(r, c.x, c.y, p.seat.diameter / 2)) add('reliefAperture', 'seat');
  }
  if (c.enabled) {
    if (c.mode === 'plain' && (c.diameter <= 0 || actualDiameter(p) > 200)) add('diameter', 'central');
    if (p.kind === 'board' && c.mode === 'plain' && c.print.enabled && (c.print.diameterAllowanceMm <= 0 || c.print.diameterAllowanceMm > 5)) add('allowance', 'central');
    if (c.mode === 'thread') {
      if (!t.confirmed) add('confirmThread', 'central');
      if (t.diameter <= 0 || t.diameter > 200 || t.pitch <= 0 || t.pitch > 10 || t.length <= 0 || t.length / t.pitch > 40 || t.diameter <= 2 * t.pitch || t.clearance < 0 || t.clearance > 1) add('thread', 'central');
      if (t.mode === 'tapDrill' && (t.tapDiameter <= 0 || t.tapDiameter >= t.diameter)) add('tapDiameter', 'central');
      const chamfer = threadChamferSize(t);
      if (t.chamfer.enabled && (chamfer <= 0 || chamfer > 30 || (t.mode === 'modeled' && chamfer >= t.length))) add('chamfer', 'central');
    }
  }
  if (p.kind === 'flange' && (f.diameter <= 0 || f.diameter > 200 || f.thickness <= 0 || f.thickness > 30 || f.stepHeight < 0 || f.stepHeight > 30 || f.stepDiameter <= 0 || f.stepDiameter > f.diameter || !Number.isInteger(f.slotCount) || f.slotCount < 0 || f.slotCount > 32 || f.slotWidth <= 0 || f.slotDepth <= 0 || f.slotDepth >= f.diameter / 2)) add('flange');
  if (p.pattern.enabled && (!Number.isInteger(p.pattern.count) || p.pattern.count < 1 || p.pattern.count > 100 || p.pattern.pcd <= 0)) add('pattern');
  const holes = [...p.holes.filter(h => h.enabled), ...patternHoles(p.pattern)];
  if (holes.length + (c.enabled ? 1 : 0) > 100 || p.holes.length > 100) add('limit');
  if (new Set(p.holes.map(h => h.id)).size !== p.holes.length) add('duplicateId');
  for (const h of holes) {
    if (h.diameter <= 0 || h.diameter > 200) add('diameter', h.id);
    if ((h.kind === 'blind' || h.kind === 'counterbore') && h.depth <= 0) add('depth', h.id);
    if ((h.kind === 'countersink' || h.kind === 'counterbore') && h.recessDiameter <= h.diameter) add('recess', h.id);
    if (h.kind === 'countersink' && (h.angle <= 0 || h.angle >= 180)) add('angle', h.id);
  }
  if (p.seat.enabled && (p.seat.diameter <= 0 || p.seat.remainingThickness <= 0)) add('seat');
  return errors;
}

// Validate the entire known structure before replacing the current design.
export function parseProject(input: unknown, templateIds: string[]): Project {
  const expected = defaultProject();
  const { boardSource: _boardSource, customBoard: _customBoard, ...schema4Rest } = expected;
  const schema4Expected = { ...schema4Rest, schemaVersion: 4 };
  const { chamfer: _chamfer, ...legacyThread } = schema4Expected.central.thread;
  const legacyExpected = { ...schema4Expected, central: { ...schema4Expected.central, thread: legacyThread } };
  function check(value: unknown, model: unknown): boolean {
    if (Array.isArray(model)) return Array.isArray(value) && value.length <= 100 && value.every(h => check(h, { ...newHole(), id: '' }));
    if (model !== null && typeof model === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.entries(model).every(([key, v]) => Object.hasOwn(value, key) && check((value as Record<string, unknown>)[key], v)) && Object.keys(value).every(k => Object.hasOwn(model, k));
    return typeof value === typeof model && (typeof value !== 'number' || Number.isFinite(value));
  }
  if (input !== null && typeof input === 'object' && (input as Record<string, unknown>).schemaVersion === 1) {
    const { relief: _relief, orientation: _orientation, ...legacy } = legacyExpected;
    if (!check(input, { ...legacy, schemaVersion: 1 })) throw Error('invalidProject');
    input = { ...input, schemaVersion: 2, relief: expected.relief };
  }
  if (input !== null && typeof input === 'object' && (input as Record<string, unknown>).schemaVersion === 2) {
    const { orientation: _orientation, ...legacy } = legacyExpected;
    if (!check(input, { ...legacy, schemaVersion: 2 })) throw Error('invalidProject');
    input = { ...input, schemaVersion: 3, orientation: expected.orientation };
  }
  if (input !== null && typeof input === 'object' && (input as Record<string, unknown>).schemaVersion === 3) {
    if (!check(input, { ...legacyExpected, schemaVersion: 3 })) throw Error('invalidProject');
    const legacy = input as typeof legacyExpected;
    input = { ...legacy, schemaVersion: 4, central: { ...legacy.central, thread: { ...legacy.central.thread,
      chamfer: { ...expected.central.thread.chamfer, enabled: false } } } };
  }
  if (input !== null && typeof input === 'object' && (input as Record<string, unknown>).schemaVersion === 4) {
    if (!check(input, schema4Expected)) throw Error('invalidProject');
    input = { ...input, schemaVersion: 5, boardSource: 'template', customBoard: expected.customBoard };
  }
  if (!check(input, expected)) throw Error('invalidProject');
  const p = input as Project;
  const enumOK = p.license === 'GPL-3.0-only' && p.units === 'mm' && p.templateVersion === '1' && templateIds.includes(p.templateId) && ['board', 'flange'].includes(p.kind) && ['template', 'custom'].includes(p.boardSource) && ['plain', 'thread'].includes(p.central.mode) && ['modeled', 'tapDrill'].includes(p.central.thread.mode) && ['standard', 'fine'].includes(p.meshQuality) && [p.seat.face, p.pattern.face, ...p.holes.map(h => h.face)].every(f => ['front', 'back'].includes(f)) && p.holes.every(h => ['through', 'blind', 'countersink', 'counterbore'].includes(h.kind) && h.id.length > 0 && !h.id.startsWith('pattern-'));
  if (!enumOK || p.schemaVersion !== 5 || !['pitch', 'custom'].includes(p.central.thread.chamfer.mode) || !['roundedRectangle', 'circle'].includes(p.relief.shape) || validate(p).length) throw Error('invalidProject');
  return structuredClone({ ...p, generatorVersion: APP_VERSION });
}
export function configId(p: Project): string {
  const text = JSON.stringify(p); let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
