// SPDX-License-Identifier: GPL-3.0-only
import { importSTEP, makeCylinder, makeBox, makeCompound, measureVolume, getOC, sketchHelix, draw, drawCircle, drawRoundedRectangle, Plane, type Shape3D, type AnyShape, type ShapeMesh, type SimplePoint, type Sketch } from 'replicad';
import { actualDiameter, countersinkDepth, patternHoles, reliefDimensions, reliefApertureFits, reliefWithinBoard, threadBoreRadius, threadChamferSize, threadEnvelopeRadius, validate, type Project, type Hole, type Issue } from '../domain/project';
import type { Template } from '../templates';

export class GeometryError extends Error {
  constructor(public code: string, public feature?: string) { super(code); }
}
export interface Model {
  shape: Shape3D; bounds: [SimplePoint, SimplePoint]; volume: number;
  localThickness: number; apertureSurfaces?: [number, number]; solidCount: number; warnings: Issue[];
}
export function boundsOf(shape: AnyShape): [SimplePoint, SimplePoint] {
  const box = shape.boundingBox; try { return box.bounds; } finally { box.delete(); }
}
export function solidCount(shape: AnyShape): number {
  const solids = shape.solids; try { return solids.length; } finally { solids.forEach(s => s.delete()); }
}
export function isValid(shape: AnyShape): boolean {
  if (shape.isNull) return false;
  const check = new (getOC().BRepCheck_Analyzer)(shape.wrapped, true, false, false);
  try { return check.IsValid(); } finally { check.delete(); }
}
function cut(body: Shape3D, tool: Shape3D): Shape3D {
  try { const result = body.cut(tool); body.delete(); return result; } finally { tool.delete(); }
}
function intersect(body: Shape3D, tool: AnyShape): Shape3D {
  try { return body.intersect(tool); } finally { tool.delete(); }
}
function cylinder(radius: number, z0: number, z1: number, x = 0, y = 0) {
  return makeCylinder(radius, z1 - z0, [x, y, z0]);
}
function fuse(body: Shape3D, tool: Shape3D): Shape3D {
  try { const result = body.fuse(tool); body.delete(); return result; } finally { tool.delete(); }
}
function roundedProfile(width: number, height: number, radius: number, z: number): Sketch {
  const drawing = Math.abs(width - height) < 1e-8 && Math.abs(radius - width / 2) < 1e-8
    ? drawCircle(width / 2) : drawRoundedRectangle(width, height, radius);
  return drawing.sketchOnPlane('XY', z) as Sketch;
}
function roundedPrism(width: number, height: number, radius: number, z0: number, z1: number): Shape3D {
  const sketch = roundedProfile(width, height, radius, z0);
  try { return sketch.extrude(z1 - z0); } finally { sketch.delete(); }
}
function customBoardBody(p: Project): Shape3D {
  const b = p.customBoard, overlap = 0.01;
  let result = roundedPrism(b.width, b.height, b.radius, 0, b.thickness);
  try {
    if (b.outerLightTrap.enabled) {
      const trap = b.outerLightTrap;
      let ring = roundedPrism(b.width, b.height, b.radius, -trap.height, overlap);
      ring = cut(ring, roundedPrism(b.width - 2 * trap.width, b.height - 2 * trap.width,
        Math.max(0, b.radius - trap.width), -trap.height - overlap, 2 * overlap));
      result = fuse(result, ring);
    }
    if (b.innerLightTrap.enabled) {
      const trap = b.innerLightTrap;
      result = fuse(result, roundedPrism(trap.width, trap.height, trap.radius, -trap.heightMm, overlap));
    }
    if (!isValid(result) || solidCount(result) !== 1) throw new GeometryError('invalidSolid', 'customBoard');
    return result;
  } catch (error) { result.delete(); throw error; }
}
function reliefProfile(r: Project['relief'], inset: number, z: number): Sketch {
  const dims = reliefDimensions(r);
  const drawing = r.shape === 'circle' ? drawCircle(dims.width / 2 - inset)
    : drawRoundedRectangle(dims.width - 2 * inset, dims.height - 2 * inset, Math.max(0, r.radius - inset));
  return drawing.sketchOnPlane('XY', z) as Sketch;
}
function reliefPrism(r: Project['relief'], inset: number, z0: number, z1: number): Shape3D {
  const sketch = reliefProfile(r, inset, z0);
  try { return sketch.extrude(z1 - z0); } finally { sketch.delete(); }
}
function reliefLoft(r: Project['relief'], inset0: number, inset1: number, z0: number, z1: number): Shape3D {
  if (Math.abs(inset1 - inset0) < 1e-9) return reliefPrism(r, inset0, z0, z1);
  // Offset corners disappear at inset=radius. Split there so radius does not
  // interpolate past that event over the entire wall and distort the corner taper.
  if (r.shape === 'roundedRectangle' && r.radius > inset0 + 1e-8 && r.radius < inset1 - 1e-8) {
    const at = z0 + (z1 - z0) * (r.radius - inset0) / (inset1 - inset0);
    const first = reliefLoft(r, inset0, r.radius, z0, at);
    try { return fuse(first, reliefLoft(r, r.radius, inset1, at, z1)); }
    catch (error) { first.delete(); throw error; }
  }
  const a = reliefProfile(r, inset0, z0), b = reliefProfile(r, inset1, z1);
  try { return a.loftWith(b, { ruled: true }); } finally { a.delete(); b.delete(); }
}
// Base dimensions remain outside dimensions; wall thickness is normal to the slope.
function applyRelief(body: Shape3D, p: Project, extras: Shape3D[]): Shape3D {
  let result = body;
  let outer: Shape3D | undefined;
  try {
    const r = p.relief, dims = reliefDimensions(r);
    const b = boundsOf(body);
    if (!reliefWithinBoard(r, b)) throw new GeometryError('reliefBoundary', 'relief');
    const [lo, hi] = localSurfaces(body, 0, 0), end = hi + r.spacing;
    if (hi - lo <= 0.02) throw new GeometryError('thin', 'relief');
    // Check physical three-dimensional clearance, not an accessory's XY bounding box.
    const clearance = reliefLoft(r, -1.5, dims.shrink - 1.5, hi, end);
    let envelope = clearance;
    try {
      if (r.spacing < 0) envelope = fuse(envelope, reliefPrism(r, dims.shrink - 1.5, end - r.faceThickness, end));
      for (const extra of extras) {
        const overlap = extra.intersect(envelope);
        try {
          if (!overlap.isNull && measureVolume(overlap) > 1e-7) throw new GeometryError('reliefAccessory', 'relief');
        } finally { overlap.delete(); }
      }
    } finally { envelope.delete(); }
    const overlap = 0.01;
    // Clear the original membrane before adding the cup, including shallow recesses
    // whose cap would otherwise retain extra original material underneath it.
    result = cut(result, reliefPrism(r, dims.inset, b[0][2] - 1, b[1][2] + 1));
    // Extend only the constant base section into the template: nominal taper begins at hi.
    outer = reliefLoft(r, 0, dims.shrink, hi, end);
    if (r.spacing > 0) outer = fuse(outer, reliefPrism(r, 0, hi - overlap, hi));
    if (r.spacing < 0) outer = fuse(outer, reliefPrism(r, dims.shrink, end - r.faceThickness, end));
    if (r.shape === 'circle') {
      // A circular section is rotationally invariant. Separate cylindrical seams
      // from the inner cutter's seam to avoid OCCT coincident-seam classification.
      const rotated = outer.rotate(2); outer.delete(); outer = rotated;
    }
    const shell = outer; outer = undefined;
    result = fuse(result, shell);
    if (r.spacing > 0) {
      result = cut(result, reliefPrism(r, dims.inset, lo - 1, hi));
      const capBack = end - r.faceThickness;
      const capInset = dims.inset + dims.shrink * (capBack - hi) / r.spacing;
      result = cut(result, reliefLoft(r, dims.inset, capInset, hi, capBack));
    } else {
      result = cut(result, reliefPrism(r, dims.inset, hi, boundsOf(result)[1][2] + 1));
      result = cut(result, reliefLoft(r, dims.inset, dims.inset + dims.shrink, hi, end));
    }
    if (!isValid(result) || solidCount(result) !== 1) throw new GeometryError('invalidSolid', 'relief');
    return result;
  } catch (error) {
    result.delete();
    throw error;
  } finally { outer?.delete(); }
}
// Read actual local surfaces from a material probe, not from overall Z extent.
function localSurfaces(body: Shape3D, x: number, y: number): [number, number] {
  const b = boundsOf(body);
  const slice = intersect(body, cylinder(0.04, b[0][2] - 1, b[1][2] + 1, x, y));
  try {
    if (slice.isNull || measureVolume(slice) < 1e-6) throw new GeometryError('outside');
    if (solidCount(slice) !== 1) throw new GeometryError('nonuniform');
    const s = boundsOf(slice); return [s[0][2], s[1][2]];
  } finally { slice.delete(); }
}
function footprint(body: Shape3D, x: number, y: number, radius: number): [number, number] {
  const [low, high] = localSurfaces(body, x, y);
  const h = high - low - 0.02;
  if (h <= 0) throw new GeometryError('thin');
  const probe = intersect(body, cylinder(radius, low + 0.01, high - 0.01, x, y));
  try {
    const expected = Math.PI * radius ** 2 * h;
    if (probe.isNull || measureVolume(probe) < expected * 0.999) throw new GeometryError('nonuniform');
  } finally { probe.delete(); }
  return [low, high];
}
function cone(r0: number, r1: number, z0: number, z1: number, x: number, y: number) {
  // Rotate a radial section; this avoids relying on an unexposed MakeCone binding.
  return draw([0, z0]).lineTo([r0, z0]).lineTo([r1, z1]).lineTo([0, z1]).close().sketchOnPlane('XZ').revolve([0, 0, 1]).asShape3D().translate(x, y, 0);
}
export function threadDimensions(D: number, P: number) {
  const H = Math.sqrt(3) / 2 * P;
  return { majorDiameter: D, minorDiameter: D - 5 * H / 4, pitchDiameter: D - 3 * H / 4, radialDepth: 5 * H / 8, rootWidth: 3 * P / 4, apexWidth: P / 8 };
}
export function threadGroove(D: number, P: number, length: number, z: number, leftHand: boolean, clearance: number, endExtension = 0): Shape3D {
  const dims = threadDimensions(D, P), overlap = Math.min(0.01, P / 100);
  const radius = dims.minorDiameter / 2 + clearance - overlap;
  const depth = dims.radialDepth + overlap;
  const root = dims.rootWidth + 2 * overlap / Math.sqrt(3);
  const spine = sketchHelix(P, (Math.ceil(length / P) + 2) * P, radius, [0, 0, -P], [0, 0, 1], leftHand);
  const groove = spine.sweepSketch((_plane, origin) => draw([0, -root / 2])
    .lineTo([depth, -dims.apexWidth / 2]).lineTo([depth, dims.apexWidth / 2])
    .lineTo([0, root / 2]).close().sketchOnPlane(new Plane(origin, [1, 0, 0], [0, -1, 0])) as Sketch,
  { frenet: true, forceProfileSpineOthogonality: false });
  const extent = D / 2 + clearance + 1;
  const low = makeBox([-extent, -extent, -2 * P], [extent, extent, 0]);
  const high = makeBox([-extent, -extent, length + endExtension], [extent, extent, length + 3 * P]);
  return cut(cut(groove, low), high).translate(0, 0, z);
}

export async function buildModel(p: Project, template?: Template, blob?: Blob): Promise<Model> {
  const issues = validate(p); if (issues.length) throw new GeometryError(issues[0].code, issues[0].feature);
  let body: Shape3D | undefined;
  const extras: Shape3D[] = [];
  let shape: Shape3D | undefined;
  const warnings: Issue[] = [{ code: 'experimental', warning: true }];
  let reliefFront: number | undefined;
  try {
    if (p.kind === 'board' && p.boardSource === 'custom') {
      body = customBoardBody(p);
      if (p.customBoard.outerLightTrap.enabled || p.customBoard.innerLightTrap.enabled) warnings.push({ code: 'lightTrapUnchecked', feature: 'customBoard', warning: true });
    } else if (p.kind === 'board') {
      if (!template || !blob) throw new GeometryError('template');
      const raw = await importSTEP(blob);
      if (!isValid(raw)) { raw.delete(); throw new GeometryError('invalidSolid'); }
      const source = boundsOf(raw);
      const rotated = raw.rotate(template.rotationX, [0, 0, 0], [1, 0, 0]); raw.delete();
      const normalized = rotated.translate(template.sourceShiftX ?? 0, 0, -source[0][1]); rotated.delete();
      const solids = normalized.solids;
      normalized.delete();
      solids.sort((a, b) => measureVolume(b) - measureVolume(a));
      if (!solids.length) throw new GeometryError('invalidSolid');
      body = solids[0]; extras.push(...solids.slice(1));
      // Use the PRIMARY board datum, never the assembly's taller auxiliary body.
      const boardBounds = boundsOf(body), pivot: SimplePoint = [0, 0, (boardBounds[0][2] + boardBounds[1][2]) / 2];
      function orient(part: Shape3D): Shape3D {
        let result = part;
        if (p.orientation.frontBack) { const next = result.rotate(180, pivot, [0, 1, 0]); result.delete(); result = next; }
        if (p.orientation.upDown) { const next = result.rotate(180, [0, 0, 0], [0, 0, 1]); result.delete(); result = next; }
        return result;
      }
      body = orient(body);
      for (let i = 0; i < extras.length; i++) extras[i] = orient(extras[i]);
      // Explicitly preserve Horseman's auxiliary body; central machining cannot touch it.
    } else {
      const f = p.flange;
      body = cylinder(f.diameter / 2, 0, f.thickness);
      if (f.stepHeight > 0) {
        const step = cylinder(f.stepDiameter / 2, f.thickness, f.thickness + f.stepHeight);
        const combined = body.fuse(step); body.delete(); step.delete(); body = combined;
      }
    }
    if (p.relief.enabled && p.kind === 'board') {
      reliefFront = localSurfaces(body, 0, 0)[1] + p.relief.spacing;
      const original = body; body = undefined;
      body = applyRelief(original, p, extras);
      warnings.push({ code: 'reliefFit', feature: 'relief', warning: true });
      warnings.push({ code: 'reliefUnchecked', feature: 'relief', warning: true });
      if (p.relief.wall < 1.5 || p.relief.faceThickness < 1.5) warnings.push({ code: 'thin', feature: 'relief', warning: true });
    }
    const originalSolids = solidCount(body);
    const b = boundsOf(body), lowAll = b[0][2] - 1, highAll = b[1][2] + 1;
    const c = p.central;
    let localThickness = 0;
    let apertureSurfaces: [number, number] | undefined;
    const envelopes: { x: number; y: number; radius: number; id: string }[] = [];
    function checkRegion(x: number, y: number, radius: number, id: string) {
      let local: [number, number];
      try { local = localSurfaces(body!, x, y); }
      catch (err) {
        // Keep the existing protected-region message for points outside the source board.
        if (err instanceof GeometryError && err.code === 'outside' && p.kind === 'board' && template && Math.hypot(x, y) + radius + 1.5 > template.editableRadius) throw new GeometryError('protected', id);
        if (err instanceof GeometryError) err.feature = id;
        throw err;
      }
      // Identify the ACTUAL end-face material, including after a seat has thinned it.
      // A shallow recess can share Z with old stock, so also require its XY cavity.
      const onEndFace = reliefFront !== undefined && reliefApertureFits(p.relief, x, y, 0, 0)
        && local[0] >= reliefFront - p.relief.faceThickness - 1e-5 && local[1] <= reliefFront + 1e-5;
      if (onEndFace && !reliefApertureFits(p.relief, x, y, radius)) throw new GeometryError('reliefAperture', id);
      if (!onEndFace && p.kind === 'board' && template && Math.hypot(x, y) + radius + 1.5 > template.editableRadius) throw new GeometryError('protected', id);
      if (p.kind === 'flange') {
        const f = p.flange;
        for (let i = 0; i < f.slotCount; i++) {
          const angle = (f.slotAngle + i * 360 / f.slotCount) * Math.PI / 180;
          const u = x * Math.cos(angle) + y * Math.sin(angle), v = -x * Math.sin(angle) + y * Math.cos(angle);
          const dx = Math.max(f.diameter / 2 - f.slotDepth - u, 0, u - f.diameter / 2 - 1);
          const dy = Math.max(Math.abs(v) - f.slotWidth / 2, 0);
          const gap = Math.hypot(dx, dy) - radius;
          if (gap < 0) throw new GeometryError('overlap', id);
          if (gap < 1.5) warnings.push({ code: 'thin', feature: id, warning: true });
        }
      }
      for (const extra of extras) {
        const e = boundsOf(extra);
        const dx = Math.max(e[0][0] - x, 0, x - e[1][0]);
        const dy = Math.max(e[0][1] - y, 0, y - e[1][1]);
        if (Math.hypot(dx, dy) < radius + 1.5) throw new GeometryError('protected', id);
      }
      for (const e of envelopes) {
        const gap = Math.hypot(e.x - x, e.y - y) - e.radius - radius;
        if (gap < 0) throw new GeometryError('overlap', id);
        if (gap < 1.5) warnings.push({ code: 'thin', feature: id, warning: true });
      }
      envelopes.push({ x, y, radius, id });
      try {
        const surfaces = footprint(body!, x, y, radius + 1.5);
        return surfaces;
      }
      catch (err) { if (err instanceof GeometryError) err.feature = id; throw err; }
    }
    if (p.seat.enabled) {
      const r = p.seat.diameter / 2;
      // Seat and central aperture are an intended compound feature.
      const [lo, hi] = checkRegion(c.x, c.y, r, 'seat'); envelopes.pop();
      const remaining = p.seat.remainingThickness;
      if (remaining >= hi - lo) throw new GeometryError('seat', 'seat');
      body = cut(body, cylinder(r, p.seat.face === 'front' ? lo + remaining : lowAll, p.seat.face === 'front' ? highAll : hi - remaining, c.x, c.y));
      if (remaining < 1.5) warnings.push({ code: 'thin', feature: 'seat', warning: true });
    }
    if (c.enabled) {
      const t = c.thread, radius = c.mode === 'plain' ? actualDiameter(p) / 2 : threadEnvelopeRadius(t);
      const [lo, hi] = checkRegion(c.x, c.y, radius, 'central'); localThickness = hi - lo; apertureSurfaces = [lo, hi];
      if (c.mode === 'plain') body = cut(body, cylinder(radius, lowAll, highAll, c.x, c.y));
      else {
        if (t.length > localThickness + 1e-5) throw new GeometryError('depth', 'central');
        const chamfer = threadChamferSize(t);
        if (chamfer >= localThickness - 1e-5) throw new GeometryError('chamferDepth', 'central');
        if (t.mode === 'tapDrill') body = cut(body, cylinder(t.tapDiameter / 2, lowAll, highAll, c.x, c.y));
        else {
          const dims = threadDimensions(t.diameter, t.pitch);
          body = cut(body, cylinder(dims.minorDiameter / 2 + t.clearance, lowAll, highAll, c.x, c.y).rotate(2));
          // A cutter ending exactly on the front face can be misclassified by OCCT.
          // Extend outside material; the effective thread inside the part is unchanged.
          const groove = threadGroove(t.diameter, t.pitch, t.length, hi - t.length, t.leftHand, t.clearance, t.pitch / 4).translate(c.x, c.y, 0);
          const before = measureVolume(body);
          // OCCT can misclassify a multi-turn cutter spanning a cylindrical seam.
          // Two angular halves describe exactly the same groove without that ambiguity.
          const extent = t.diameter + t.clearance + 1;
          try {
            for (const [y0, y1] of [[-extent, 0], [0, extent]]) {
              const half = intersect(groove, makeBox([c.x - extent, c.y + y0, lowAll - t.pitch], [c.x + extent, c.y + y1, highAll + t.pitch]));
              body = cut(body, half);
            }
          } finally { groove.delete(); }
          const expectedRemoval = Math.PI * (t.diameter - dims.radialDepth) * dims.radialDepth * (dims.rootWidth + dims.apexWidth) / 2 * t.length / t.pitch;
          if (before - measureVolume(body) < expectedRemoval * 0.5) throw new GeometryError('threadFailed', 'central');
        }
        if (chamfer > 0) {
          // 45° entry from the minor/tap bore: radial growth equals axial depth.
          // Overshoot the front plane without changing the cone at the actual surface.
          const bore = threadBoreRadius(t);
          body = cut(body, cone(bore, bore + chamfer + 0.01, hi - chamfer, hi + 0.01, c.x, c.y));
          if (t.mode === 'modeled' && t.length - chamfer < 2 * t.pitch) warnings.push({ code: 'chamferEngagement', feature: 'central', warning: true });
        }
      }
    }
    for (const h of [...p.holes.filter(h => h.enabled), ...patternHoles(p.pattern)]) {
      const radius = ['countersink', 'counterbore'].includes(h.kind) ? h.recessDiameter / 2 : h.diameter / 2;
      const [lo, hi] = checkRegion(h.x, h.y, radius, h.id);
      body = applyHole(body, h, lo, hi, lowAll, highAll, warnings);
    }
    if (p.kind === 'flange') {
      const f = p.flange;
      for (let i = 0; i < f.slotCount; i++) {
        const tool = makeBox([f.diameter / 2 - f.slotDepth, -f.slotWidth / 2, -1], [f.diameter / 2 + 1, f.slotWidth / 2, f.thickness + f.stepHeight + 1]).rotate(f.slotAngle + i * 360 / f.slotCount);
        body = cut(body, tool);
      }
    }
    if (!isValid(body) || measureVolume(body) <= 0 || solidCount(body) !== originalSolids) throw new GeometryError('invalidSolid');
    shape = extras.length ? makeCompound([body, ...extras]).asShape3D() : body;
    if (extras.length) body.delete(); body = undefined;
    extras.forEach(e => e.delete()); extras.length = 0;
    if (!isValid(shape)) throw new GeometryError('invalidSolid');
    const result = { shape, bounds: boundsOf(shape), volume: measureVolume(shape), localThickness, apertureSurfaces, solidCount: solidCount(shape), warnings };
    shape = undefined; return result;
  } finally { body?.delete(); shape?.delete(); extras.forEach(e => e.delete()); }
}
function applyHole(body: Shape3D, h: Hole, lo: number, hi: number, lowAll: number, highAll: number, warnings: Issue[]): Shape3D {
  const t = hi - lo, recessDepth = h.kind === 'countersink' ? countersinkDepth(h.diameter, h.recessDiameter, h.angle) : h.depth;
  if (h.kind !== 'through' && (h.kind === 'blind' ? h.depth : recessDepth) >= t - 1e-5) throw new GeometryError('depth', h.id);
  if (h.kind === 'blind' && t - h.depth < 1.5) warnings.push({ code: 'thin', feature: h.id, warning: true });
  let result = body;
  if (h.kind === 'blind') return cut(result, cylinder(h.diameter / 2, h.face === 'front' ? hi - h.depth : lo - 0.01, h.face === 'front' ? hi + 0.01 : lo + h.depth, h.x, h.y));
  result = cut(result, cylinder(h.diameter / 2, lowAll, highAll, h.x, h.y));
  if (h.kind === 'through') return result;
  if (h.kind === 'counterbore') return cut(result, cylinder(h.recessDiameter / 2, h.face === 'front' ? hi - h.depth : lo - 0.01, h.face === 'front' ? hi + 0.01 : lo + h.depth, h.x, h.y));
  const tool = h.face === 'front'
    ? cone(h.diameter / 2, h.recessDiameter / 2 + 0.01 * Math.tan(h.angle * Math.PI / 360), hi - recessDepth, hi + 0.01, h.x, h.y)
    : cone(h.recessDiameter / 2 + 0.01 * Math.tan(h.angle * Math.PI / 360), h.diameter / 2, lo - 0.01, lo + recessDepth, h.x, h.y);
  return cut(result, tool);
}
export function previewMesh(model: Model): ShapeMesh {
  return model.shape.mesh({ tolerance: 0.08, angularTolerance: 0.18 });
}
