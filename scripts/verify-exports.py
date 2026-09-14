# SPDX-License-Identifier: GPL-3.0-only
"""Independent native OCCT STEP validation plus STL checks (offline tooling only)."""
import json
import math
from pathlib import Path
import numpy as np
import trimesh
from OCP.STEPControl import STEPControl_Reader
from OCP.IFSelect import IFSelect_RetDone
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.GProp import GProp_GProps
from OCP.BRepGProp import BRepGProp
from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_SOLID, TopAbs_IN
from OCP.BRepClass3d import BRepClass3d_SolidClassifier
from OCP.gp import gp_Pnt

folder = Path('tmp/cad-check')
reports = json.loads((folder / 'report.json').read_text(encoding='utf-8'))
results = []
thread_samples = {}
for record in reports:
    name = record['name']
    reader = STEPControl_Reader()
    assert reader.ReadFile(str(folder / f'{name}.step')) == IFSelect_RetDone, name
    reader.TransferRoots()
    shape = reader.OneShape()
    assert BRepCheck_Analyzer(shape).IsValid(), f'{name}: invalid STEP'
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(shape, props)
    error = abs(props.Mass() - record['volume']) / record['volume']
    assert error <= 0.001, (name, error)
    box = Bnd_Box()
    BRepBndLib.AddOptimal_s(shape, box, False, False)
    bound_error = np.max(np.abs(np.array(box.Get()) - np.array(record['bounds']).flatten()))
    assert bound_error <= 0.01, (name, bound_error)
    count = 0
    explorer = TopExp_Explorer(shape, TopAbs_SOLID)
    while explorer.More():
        count += 1
        explorer.Next()
    assert count == record['solidCount'], (name, count, record['solidCount'])
    mesh = trimesh.load_mesh(folder / f'{name}.stl', process=True)
    assert mesh.is_watertight, f'{name}: STL not watertight'
    assert mesh.is_winding_consistent, f'{name}: inconsistent STL normals'
    assert abs(mesh.volume - record['volume']) / record['volume'] <= 0.001, f'{name}: STL volume mismatch'
    mesh_bound_error = np.max(np.abs(mesh.bounds - np.array(record['bounds'])))
    assert mesh_bound_error <= 0.05, (name, mesh_bound_error)
    assert len(mesh.split(only_watertight=False, engine='networkx')) == record['solidCount'], f'{name}: unexpected STL fragments'
    def inside(x, y, z):
        # Explicitly test each solid so accessory compounds have reliable classification.
        solids = TopExp_Explorer(shape, TopAbs_SOLID)
        while solids.More():
            if BRepClass3d_SolidClassifier(solids.Current(), gp_Pnt(x, y, z), 1e-6).State() == TopAbs_IN:
                return True
            solids.Next()
        return False
    if record.get('expectedSurfaces'):
        assert np.max(np.abs(np.array(record['apertureSurfaces']) - record['expectedSurfaces'])) < 1e-5, name
    if record.get('checkOffsetHole'):
        x, y = record['aperturePosition']
        z = sum(record['expectedSurfaces']) / 2
        assert not inside(x, y, z), f'{name}: offset hole not in final coordinates'
        assert inside(-x, -y, z), f'{name}: hole silently mirrored with template'
    for x, y, z, expected in record.get('materialSamples', []):
        assert inside(x, y, z) == expected, f'{name}: accessory orientation / preservation'
    if record.get('relief', {}).get('enabled'):
        r = record['relief']
        front = record['expectedBase'] + r['spacing'] if record.get('endFaceThinned') else record['apertureSurfaces'][1]
        base = front - r['spacing']
        assert abs(front - record.get('expectedBase', 3.15) - r['spacing']) < 1e-5, f'{name}: wrong signed spacing'
        base_lo = record.get('baseLo', 0)
        assert abs(record['localThickness'] - (2 if record.get('endFaceThinned') else r['faceThickness'])) < 1e-5, f'{name}: wrong end-face thickness'
        slope = 0 if r['angle'] == 90 else 1 / math.tan(math.radians(r['angle']))
        inset = r['wall'] / math.sin(math.radians(r['angle']))
        half = (r['diameter'] if r['shape'] == 'circle' else r['width']) / 2
        # Probe straight sides, away from rounded corners: normal wall is inward,
        # outside the nominal profile is empty; the interior is genuinely hollow.
        travel = r['spacing'] - (r['faceThickness'] if r['spacing'] > 0 else 0)
        for fraction in [0.25, 0.5, 0.75]:
            z = base + travel * fraction
            outer = half - abs(z - base) * slope
            assert inside(outer - inset / 2, 0, z), f'{name}: missing wall'
            if z > base or z < base_lo:  # Within the original plate, exterior material is intentional.
                assert not inside(outer + 0.2, 0, z), f'{name}: wrong exterior / slope'
            assert not inside(outer - inset - 0.2, 0, z), f'{name}: solid cavity / wrong wall thickness'
            if r['shape'] == 'roundedRectangle':
                shrink = abs(z - base) * slope
                radius = max(0, r['radius'] - shrink)
                cx = r['width'] / 2 - shrink - radius
                cy = r['height'] / 2 - shrink - radius
                if radius > 0.01 and (z > base or z < base_lo):
                    q = (radius + 0.2) / math.sqrt(2)
                    assert not inside(cx + q, cy + q, z), f'{name}: wrong offset corner taper'
                if radius > inset + 0.2:
                    q = (radius - inset / 2) / math.sqrt(2)
                    assert inside(cx + q, cy + q, z), f'{name}: corner wall missing'
                    q = (radius - inset - 0.2) / math.sqrt(2)
                    assert not inside(cx + q, cy + q, z), f'{name}: corner cavity filled'
        x = (half - abs(r['spacing']) * slope - inset + record['diameter'] / 2) / 2
        assert inside(x, 0, front - r['faceThickness'] / 2), f'{name}: missing end face'
        old_membrane_z = base - (min(0.5, abs(r['spacing']) / 2) if r['spacing'] < 0 else 0.5)
        assert not inside(x, 0, old_membrane_z), f'{name}: original inner plate was not opened'
        if record.get('nonuniformSource'):
            # Nonuniform stock has no single exterior-plate thickness. Compare original
            # material outside the base directly in native STEP coordinates instead.
            original_reader = STEPControl_Reader()
            assert original_reader.ReadFile(str(Path('steps') / record['nonuniformSource'])) == IFSelect_RetDone
            original_reader.TransferRoots()
            original = original_reader.OneShape()
            original_box = Bnd_Box()
            BRepBndLib.AddOptimal_s(original, original_box, False, False)
            source_min_y = original_box.Get()[1]
            height = record['sourceHeight']
            for fraction in [0.1, 0.3, 0.5, 0.7, 0.9]:
                z = height * fraction
                for x in [half + 2, -half - 2]:
                    sx, sy, sz = x, 0, z
                    orientation = record['orientation']
                    if orientation['upDown']:
                        sx, sy = -sx, -sy
                    if orientation['frontBack']:
                        sx, sz = -sx, height - sz
                    expected = BRepClass3d_SolidClassifier(original, gp_Pnt(sx, sz + source_min_y, -sy), 1e-6).State() == TopAbs_IN
                    assert inside(x, 0, z) == expected, f'{name}: original exterior stock changed'
                assert not inside((half - inset + record['diameter'] / 2) / 2, 0, z), f'{name}: nonuniform original membrane retained'
        else:
            assert inside(half + 2, 0, base - 0.5), f'{name}: exterior base plate lost'
    # A threaded aperture is neither an ordinary major-diameter nor minor-diameter cylinder.
    # Sample at an intermediate radial depth: material alternates around the helix.
    if record['centralMode'] == 'thread' and record['thread']['mode'] == 'modeled':
        t = record['thread']
        ch = t.get('chamfer', {'enabled': False})
        c = (1.2 * t['pitch'] if ch.get('mode') == 'pitch' else ch.get('sizeMm', 0)) if ch['enabled'] else 0
        radius = t['diameter'] / 2 - 0.25 * t['pitch'] + t['clearance']
        z = record['apertureSurfaces'][1] - c - (t['length'] - c) / 2 + min(0.137 * t['pitch'], (t['length'] - c) / 4)
        samples = []
        for i in range(32):
            theta = 2 * math.pi * i / 32
            x, y = record['aperturePosition']
            cls = BRepClass3d_SolidClassifier(shape, gp_Pnt(x + radius * math.cos(theta), y + radius * math.sin(theta), z), 1e-6)
            samples.append(cls.State() == TopAbs_IN)
        assert any(samples) and not all(samples), f'{name}: thread missing or smooth hole substituted'
        thread_samples[name] = samples
    if record['centralMode'] == 'thread' and record['thread'].get('chamfer', {}).get('enabled'):
        t = record['thread']; ch = t['chamfer']
        c = 1.2 * t['pitch'] if ch['mode'] == 'pitch' else ch['sizeMm']
        bore = t['tapDiameter'] / 2 if t['mode'] == 'tapDrill' else (t['diameter'] - 5 * math.sqrt(3) * t['pitch'] / 8) / 2 + t['clearance']
        cx, cy = record['aperturePosition']; hi = record['apertureSurfaces'][1]
        # Three axial levels: void just inside the 45° cone, stock just outside.
        # A threaded groove can remove stock at some phases; an intact crest must remain.
        for fraction in [0.2, 0.5, 0.8]:
            z = hi - c * fraction; r = bore + c * (1 - fraction)
            outside = []
            for i in range(32):
                angle = i * 2 * math.pi / 32
                assert not inside(cx + (r - 0.02) * math.cos(angle), cy + (r - 0.02) * math.sin(angle), z), f'{name}: missing 45 degree chamfer'
                outside.append(inside(cx + (r + 0.02) * math.cos(angle), cy + (r + 0.02) * math.sin(angle), z))
            assert any(outside), f'{name}: chamfer overcut / wrong cone slope'
        if t['mode'] == 'tapDrill':
            for z in [hi - c - 0.1, sum(record['apertureSurfaces']) / 2]:
                assert not inside(cx + bore - 0.02, cy, z), f'{name}: wrong tap bore'
                assert inside(cx + bore + 0.02, cy, z), f'{name}: tap bore enlarged below chamfer'
    results.append({'name': name, 'stepValid': True, 'stepVolumeRelativeError': error, 'stepBoundsErrorMm': float(bound_error), 'stlWatertight': True, 'stlBoundsErrorMm': float(mesh_bound_error), 'solids': count})

rh = thread_samples['thread-flange-RH-4mm']
lh = thread_samples['thread-flange-LH-4mm']
assert rh != lh, 'LH thread unexpectedly matches RH'
assert rh == [lh[(-i) % 32] for i in range(32)], 'Left/right thread profiles are not mirrored'
rh = thread_samples['chamfer-flange-RH']; lh = thread_samples['chamfer-flange-LH']
assert rh != lh and rh == [lh[(-i) % 32] for i in range(32)], 'Chamfer changed thread handedness'
(folder / 'independent-report.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(f'PASS: {len(results)} STEP/STL files checked with native OCCT and trimesh; RH/LH thread geometry verified.')
