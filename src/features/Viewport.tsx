// SPDX-License-Identifier: GPL-3.0-only
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ModelResult } from '../workers/protocol';
import { translator, type Language } from '../i18n';
import { defaultEdges } from './preferences';

export function Viewport({ model, language, sourceType = 'step' }: { model?: ModelResult; language: Language; sourceType?: 'step' | 'stl' }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; render: () => void; mesh?: THREE.Mesh; edges?: THREE.LineSegments; axes: THREE.Group; size: number } | null>(null);
  const [showEdges, setShowEdges] = useState(() => defaultEdges(sourceType));
  useEffect(() => { setShowEdges(defaultEdges(sourceType)); }, [sourceType]);
  const [failed, setFailed] = useState(false), t = translator(language);
  useEffect(() => {
    const node = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0x152923, 0);
    node.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const axes = new THREE.Group();
    const axisResources: (() => void)[] = [];
    for (const [name, direction, color] of [
      ['X', new THREE.Vector3(1, 0, 0), '#ff667c'], ['Y', new THREE.Vector3(0, 1, 0), '#73e8a7'], ['Z', new THREE.Vector3(0, 0, 1), '#65bbff'],
    ] as const) {
      const arrow = new THREE.ArrowHelper(direction, new THREE.Vector3(), 1, color, 0.1, 0.05);
      // Clone shared ArrowHelper geometry so cleanup does not invalidate other viewers.
      for (const object of [arrow.line, arrow.cone]) {
        object.geometry = object.geometry.clone();
        const material = object.material as THREE.Material;
        material.depthTest = false; material.depthWrite = false; object.renderOrder = 10;
        axisResources.push(() => { object.geometry.dispose(); material.dispose(); });
      }
      axes.add(arrow);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const context = canvas.getContext('2d')!;
      context.font = 'bold 48px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
      context.strokeStyle = '#06121f'; context.lineWidth = 5; context.strokeText(name, 32, 32);
      context.fillStyle = color; context.fillText(name, 32, 32);
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
      const label = new THREE.Sprite(material); label.position.copy(direction).multiplyScalar(1.12); label.scale.setScalar(0.18); label.renderOrder = 11;
      axes.add(label); axisResources.push(() => { texture.dispose(); material.dispose(); });
    }
    axes.scale.setScalar(55); scene.add(axes);
    scene.add(new THREE.HemisphereLight(0xe9f7ff, 0x15283e, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.8); key.position.set(100, -100, 200); scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bcfff, 1.1); fill.position.set(-100, 100, -100); scene.add(fill);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 5000); camera.up.set(0, 0, 1); camera.position.set(150, -200, 230);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false;
    const render = () => renderer.render(scene, camera);
    controls.addEventListener('change', render);
    api.current = { scene, camera, controls, render, axes, size: 140 };
    const observer = new ResizeObserver(() => { const { width, height } = node.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); render(); });
    observer.observe(node); render();
    return () => {
      observer.disconnect(); controls.dispose();
      axisResources.forEach(dispose => dispose());
      if (api.current?.mesh) { api.current.mesh.geometry.dispose(); (api.current.mesh.material as THREE.Material).dispose(); }
      if (api.current?.edges) { api.current.edges.geometry.dispose(); (api.current.edges.material as THREE.Material).dispose(); }
      api.current = null; renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  useEffect(() => {
    const v = api.current; if (!v || !model) return;
    if (v.mesh) { v.scene.remove(v.mesh); v.mesh.geometry.dispose(); (v.mesh.material as THREE.Material).dispose(); }
    if (v.edges) { v.scene.remove(v.edges); v.edges.geometry.dispose(); (v.edges.material as THREE.Material).dispose(); }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(model.mesh.vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(model.mesh.normals, 3));
    geometry.setIndex(model.mesh.triangles);
    v.mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xc9ddeb, metalness: 0.08, roughness: 0.68, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    v.scene.add(v.mesh);
    const edges = new THREE.BufferGeometry();
    edges.setAttribute('position', new THREE.Float32BufferAttribute(model.edges, 3));
    v.edges = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x102d45, depthTest: true }));
    v.edges.visible = showEdges; v.scene.add(v.edges);
    const b = model.bounds, size = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1], b[1][2] - b[0][2], 40);
    const center = new THREE.Vector3((b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2, (b[0][2] + b[1][2]) / 2);
    v.axes.scale.setScalar(size * 0.4);
    v.camera.position.add(center.clone().sub(v.controls.target)); v.controls.target.copy(center);
    if (Math.abs(v.size - size) > 1) {
      v.size = size;
      v.camera.position.copy(center).add(new THREE.Vector3(size * 1.25, -size * 1.7, size * 1.7));
    }
    v.controls.update();
    v.render();
  }, [model]);
  useEffect(() => { const v = api.current; if (v?.edges) { v.edges.visible = showEdges; v.render(); } }, [showEdges]);
  function view(which: 'front' | 'back' | 'side' | 'iso') {
    const v = api.current; if (!v) return;
    const s = v.size * 3;
    v.camera.up.set(0, which === 'front' || which === 'back' ? 1 : 0, which === 'front' || which === 'back' ? 0 : 1);
    const offset = which === 'front' ? [0, 0, s] : which === 'back' ? [0, 0, -s] : which === 'side' ? [s, 0, 0] : [s * 0.5, -s * 0.6, s * 0.65];
    v.camera.position.copy(v.controls.target).add(new THREE.Vector3(...offset)); v.controls.update(); v.render();
  }
  return <div className="viewport">
    <div ref={host} className="canvas-host" aria-label={t('title')} />
    {failed && <p className="viewport-fallback">{t('viewportError')}</p>}
    <div className="viewport-label"><span className="live-dot" /> B-REP / mm <span>01 — {t('preview')}</span></div>
    <div className="views">{(['front', 'back', 'side', 'iso'] as const).map(v => <button key={v} onClick={() => view(v)}>{t(v)}</button>)}</div>
    <label className="edge-toggle"><input type="checkbox" checked={showEdges} onChange={e => setShowEdges(e.target.checked)} data-testid="show-edges" />{t('showEdges')}</label>
    <div className="axis-key" data-testid="world-axes" aria-label={t('axes')} title={t('axes')}><span>X</span><span>Y</span><span>Z</span></div>
  </div>;
}
