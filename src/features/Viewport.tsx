// SPDX-License-Identifier: GPL-3.0-only
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ModelResult } from '../workers/protocol';
import { translator, type Language } from '../i18n';

export function Viewport({ model, language }: { model?: ModelResult; language: Language }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; render: () => void; mesh?: THREE.Mesh; size: number } | null>(null);
  const [failed, setFailed] = useState(false), t = translator(language);
  useEffect(() => {
    const node = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0x152923, 0);
    node.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x678f7c, 2.5));
    const key = new THREE.DirectionalLight(0xffffff, 3.5); key.position.set(100, -100, 200); scene.add(key);
    const fill = new THREE.DirectionalLight(0xc0e0dc, 2); fill.position.set(-100, 100, -100); scene.add(fill);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 5000); camera.up.set(0, 0, 1); camera.position.set(150, -200, 230);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false;
    const render = () => renderer.render(scene, camera);
    controls.addEventListener('change', render);
    api.current = { scene, camera, controls, render, size: 140 };
    const observer = new ResizeObserver(() => { const { width, height } = node.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); render(); });
    observer.observe(node); render();
    return () => {
      observer.disconnect(); controls.dispose();
      if (api.current?.mesh) { api.current.mesh.geometry.dispose(); (api.current.mesh.material as THREE.Material).dispose(); }
      api.current = null; renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  useEffect(() => {
    const v = api.current; if (!v || !model) return;
    if (v.mesh) { v.scene.remove(v.mesh); v.mesh.geometry.dispose(); (v.mesh.material as THREE.Material).dispose(); }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(model.mesh.vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(model.mesh.normals, 3));
    geometry.setIndex(model.mesh.triangles);
    v.mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xa7bbae, metalness: 0.48, roughness: 0.48, side: THREE.DoubleSide }));
    v.scene.add(v.mesh);
    const b = model.bounds, size = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1], 40);
    if (Math.abs(v.size - size) > 1) {
      v.size = size; v.controls.target.set(0, 0, (b[0][2] + b[1][2]) / 2);
      v.camera.position.set(size * 1.25, -size * 1.7, size * 1.7); v.controls.update();
    }
    v.render();
  }, [model]);
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
    <div className="axis-key"><span>X</span><span>Y</span><span>Z</span></div>
  </div>;
}
