// SPDX-License-Identifier: GPL-3.0-only
export const APP_VERSION = '0.1.0';
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
  schemaVersion: 1; generatorVersion: string; license: 'GPL-3.0-only'; units: 'mm';
  kind: 'board' | 'flange'; templateId: string; templateVersion: string;
  central: { enabled: boolean; mode: 'plain' | 'thread'; x: number; y: number; diameter: number; presetId: string;
    print: { enabled: boolean; diameterAllowanceMm: number };
    thread: { diameter: number; pitch: number; length: number; leftHand: boolean; clearance: number; confirmed: boolean; mode: 'modeled' | 'tapDrill'; tapDiameter: number } };
  holes: Hole[];
  pattern: { enabled: boolean; count: number; pcd: number; diameter: number; startAngle: number; x: number; y: number; countersink: boolean; recessDiameter: number; angle: number; face: Face };
  seat: { enabled: boolean; diameter: number; remainingThickness: number; face: Face };
  flange: { diameter: number; thickness: number; stepDiameter: number; stepHeight: number; slotCount: number; slotWidth: number; slotDepth: number; slotAngle: number };
  meshQuality: 'standard' | 'fine';
}
export const defaultProject = (): Project => ({
  schemaVersion: 1, generatorVersion: APP_VERSION, license: 'GPL-3.0-only', units: 'mm',
  kind: 'board', templateId: 'sinar-blank', templateVersion: '1',
  central: { enabled: true, mode: 'plain', x: 0, y: 0, diameter: 34.6, presetId: 'copal-0',
    print: { enabled: false, diameterAllowanceMm: 0.5 },
    thread: { diameter: 65, pitch: 1, length: 2.5, leftHand: false, clearance: 0, confirmed: false, mode: 'modeled', tapDiameter: 63.9 } },
  holes: [], pattern: { enabled: false, count: 6, pcd: 90, diameter: 3.2, startAngle: 0, x: 0, y: 0, countersink: false, recessDiameter: 6.2, angle: 90, face: 'front' },
  seat: { enabled: false, diameter: 80, remainingThickness: 2.5, face: 'front' },
  flange: { diameter: 100, thickness: 3, stepDiameter: 70, stepHeight: 2, slotCount: 4, slotWidth: 2, slotDepth: 2, slotAngle: 0 },
  meshQuality: 'standard',
});
export function actualDiameter(p: Project): number {
  return p.central.diameter + (p.kind === 'board' && p.central.mode === 'plain' && p.central.print.enabled ? p.central.print.diameterAllowanceMm : 0);
}
export function countersinkDepth(d: number, D: number, angle: number): number {
  return (D - d) / (2 * Math.tan(angle * Math.PI / 360));
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
export function validate(p: Project): Issue[] {
  const errors: Issue[] = [];
  const add = (code: string, feature?: string) => errors.push({ code, feature });
  const walk = (v: unknown): boolean => typeof v === 'number' ? Number.isFinite(v) : Array.isArray(v) ? v.every(walk) : v !== null && typeof v === 'object' ? Object.values(v).every(walk) : true;
  if (!walk(p)) return [{ code: 'finite' }];
  const c = p.central, t = c.thread, f = p.flange;
  if (c.enabled) {
    if (c.mode === 'plain' && (c.diameter <= 0 || actualDiameter(p) > 200)) add('diameter', 'central');
    if (p.kind === 'board' && c.mode === 'plain' && c.print.enabled && (c.print.diameterAllowanceMm <= 0 || c.print.diameterAllowanceMm > 5)) add('allowance', 'central');
    if (c.mode === 'thread') {
      if (!t.confirmed) add('confirmThread', 'central');
      if (t.diameter <= 0 || t.diameter > 200 || t.pitch <= 0 || t.pitch > 10 || t.length <= 0 || t.length / t.pitch > 40 || t.diameter <= 2 * t.pitch || t.clearance < 0 || t.clearance > 1) add('thread', 'central');
      if (t.mode === 'tapDrill' && (t.tapDiameter <= 0 || t.tapDiameter >= t.diameter)) add('tapDiameter', 'central');
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
  function check(value: unknown, model: unknown): boolean {
    if (Array.isArray(model)) return Array.isArray(value) && value.length <= 100 && value.every(h => check(h, { ...newHole(), id: '' }));
    if (model !== null && typeof model === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.entries(model).every(([key, v]) => Object.hasOwn(value, key) && check((value as Record<string, unknown>)[key], v)) && Object.keys(value).every(k => Object.hasOwn(model, k));
    return typeof value === typeof model && (typeof value !== 'number' || Number.isFinite(value));
  }
  if (!check(input, expected)) throw Error('invalidProject');
  const p = input as Project;
  const enumOK = p.schemaVersion === 1 && p.license === 'GPL-3.0-only' && p.units === 'mm' && p.templateVersion === '1' && templateIds.includes(p.templateId) && ['board', 'flange'].includes(p.kind) && ['plain', 'thread'].includes(p.central.mode) && ['modeled', 'tapDrill'].includes(p.central.thread.mode) && ['standard', 'fine'].includes(p.meshQuality) && [p.seat.face, p.pattern.face, ...p.holes.map(h => h.face)].every(f => ['front', 'back'].includes(f)) && p.holes.every(h => ['through', 'blind', 'countersink', 'counterbore'].includes(h.kind) && h.id.length > 0 && !h.id.startsWith('pattern-'));
  if (!enumOK || validate(p).length) throw Error('invalidProject');
  return structuredClone(p);
}
export function configId(p: Project): string {
  const text = JSON.stringify(p); let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
