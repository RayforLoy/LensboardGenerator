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
    # A threaded aperture is neither an ordinary major-diameter nor minor-diameter cylinder.
    # Sample at an intermediate radial depth: material alternates around the helix.
    if record['centralMode'] == 'thread':
        t = record['thread']
        radius = t['diameter'] / 2 - 0.25 * t['pitch'] + t['clearance']
        z = record['apertureSurfaces'][1] - t['length'] / 2 + 0.137 * t['pitch']
        samples = []
        for i in range(32):
            theta = 2 * math.pi * i / 32
            x, y = record['aperturePosition']
            cls = BRepClass3d_SolidClassifier(shape, gp_Pnt(x + radius * math.cos(theta), y + radius * math.sin(theta), z), 1e-6)
            samples.append(cls.State() == TopAbs_IN)
        assert any(samples) and not all(samples), f'{name}: thread missing or smooth hole substituted'
        thread_samples[name] = samples
    results.append({'name': name, 'stepValid': True, 'stepVolumeRelativeError': error, 'stepBoundsErrorMm': float(bound_error), 'stlWatertight': True, 'stlBoundsErrorMm': float(mesh_bound_error), 'solids': count})

rh = thread_samples['thread-flange-RH-4mm']
lh = thread_samples['thread-flange-LH-4mm']
assert rh != lh, 'LH thread unexpectedly matches RH'
assert rh == [lh[(-i) % 32] for i in range(32)], 'Left/right thread profiles are not mirrored'
(folder / 'independent-report.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(f'PASS: {len(results)} STEP/STL files checked with native OCCT and trimesh; RH/LH thread geometry verified.')
