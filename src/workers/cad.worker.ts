// SPDX-License-Identifier: GPL-3.0-only
import initialize from 'replicad-opencascadejs';
import wasmUrl from 'replicad-opencascadejs/wasm?url';
import { setOC } from 'replicad';
import { buildModel, previewMesh, GeometryError, type Model } from '../geometry/model';
import type { Request, Result } from './protocol';
import type { Project } from '../domain/project';
import { cleanBinarySTL } from '../geometry/stl';

let initialization: Promise<unknown> | undefined;
let current: Model | undefined, revision = '', project: Project;
let queue = Promise.resolve();
const worker = self as unknown as { postMessage(r: Result, transfer: Transferable[]): void; onmessage: (event: MessageEvent<Request>) => void };
const post = (r: Result, transfer: Transferable[] = []) => worker.postMessage(r, transfer);
const sourceCache = new Map<string, Blob>();
async function execute(request: Request) {
  const token = request.revision;
  try {
    if (request.type === 'build') {
      current?.shape.delete(); current = undefined; revision = '';
      post({ type: 'stage', revision: token, stage: 'loading' });
      initialization ??= initialize({ locateFile: () => wasmUrl }).then(oc => setOC(oc));
      await initialization;
      let blob: Blob | undefined;
      if (request.project.kind === 'board') {
        const template = request.template;
        if (!template) throw new GeometryError('template');
        blob = sourceCache.get(template.id);
        if (!blob) {
          const response = await fetch(template.url);
          if (!response.ok) throw new GeometryError('template');
          blob = await response.blob();
          const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('');
          if (hash !== template.sha256) throw new GeometryError('template');
          sourceCache.set(template.id, blob);
        }
      }
      post({ type: 'stage', revision: token, stage: 'building' });
      const start = performance.now();
      current = await buildModel(request.project, request.template, blob);
      const mesh = previewMesh(current);
      revision = token; project = request.project;
      post({ type: 'model', revision: token, mesh, bounds: current.bounds, volume: current.volume, localThickness: current.localThickness, solidCount: current.solidCount, warnings: current.warnings, elapsedMs: performance.now() - start });
    } else {
      if (!current || token !== revision) throw new GeometryError('stale');
      post({ type: 'stage', revision: token, stage: 'exporting' });
      const blob = request.format === 'step' ? current.shape.blobSTEP() : current.shape.blobSTL({ binary: true, tolerance: project.meshQuality === 'fine' ? 0.01 : 0.03, angularTolerance: 0.1 });
      let bytes = await blob.arrayBuffer();
      if (request.format === 'stl') {
        try { bytes = cleanBinarySTL(bytes); } catch { throw new GeometryError('invalidMesh'); }
      }
      post({ type: 'export', revision: token, format: request.format, bytes }, [bytes]);
    }
  } catch (error) {
    if (request.type === 'build') { current?.shape.delete(); current = undefined; revision = ''; }
    post({ type: 'error', revision: token, code: error instanceof GeometryError ? error.code : 'kernel', feature: error instanceof GeometryError ? error.feature : undefined, detail: error instanceof Error ? error.message : String(error), during: request.type });
  }
}
worker.onmessage = ({ data }: MessageEvent<Request>) => { queue = queue.then(() => execute(data)); };
