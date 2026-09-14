// SPDX-License-Identifier: GPL-3.0-only
import { useEffect, useRef, useState } from 'react';
import { validate, type Project } from '../domain/project';
import { templateById } from '../templates';
import type { Result, ModelResult, Request } from '../workers/protocol';

export function useCad(project: Project, onExport: (format: 'step' | 'stl', bytes: ArrayBuffer, project: Project) => void) {
  const [model, setModel] = useState<ModelResult>();
  const [state, setState] = useState<'loading' | 'building' | 'ready' | 'failed' | 'exporting'>('loading');
  const [error, setError] = useState<{ code: string; feature?: string; detail?: string }>();
  const [attempt, setAttempt] = useState(0);
  const worker = useRef<Worker | null>(null), timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const revision = JSON.stringify(project);
  const latest = useRef(revision); latest.current = revision;
  const currentProject = useRef(project); currentProject.current = project;
  const exportCallback = useRef(onExport); exportCallback.current = onExport;
  const issues = validate(project);
  function clearTimeouts() { if (timeout.current) clearTimeout(timeout.current); }
  function armTimeout() {
    clearTimeouts();
    timeout.current = setTimeout(() => {
      worker.current?.terminate(); worker.current = null;
      setState('failed'); setError({ code: 'timeout' });
    }, 60000);
  }
  function ensureWorker() {
    if (worker.current) return worker.current;
    const w = new Worker(new URL('../workers/cad.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = ({ data }: MessageEvent<Result>) => {
      if (data.revision !== latest.current) return;
      if (data.type === 'stage') setState(data.stage);
      if (data.type === 'model') { clearTimeouts(); setError(undefined); setModel(data); setState('ready'); }
      if (data.type === 'error') { clearTimeouts(); setError(data); setState(data.during === 'export' ? 'ready' : 'failed'); }
      if (data.type === 'export') {
        clearTimeouts(); setState('ready');
        exportCallback.current(data.format, data.bytes, structuredClone(currentProject.current));
      }
    };
    w.onerror = (event) => { clearTimeouts(); w.terminate(); worker.current = null; setState('failed'); setError({ code: 'kernel', detail: event.message }); };
    worker.current = w; return w;
  }
  useEffect(() => {
    setError(undefined);
    if (issues.length) { clearTimeouts(); return; }
    setState('building');
    const timer = setTimeout(() => {
      ensureWorker().postMessage({ type: 'build', project: structuredClone(project), template: templateById(project.templateId), revision } satisfies Request);
      armTimeout();
    }, 350);
    return () => clearTimeout(timer);
    // Revision captures all geometry and export parameters; language is excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, attempt]);
  useEffect(() => () => { clearTimeouts(); worker.current?.terminate(); }, []);
  const ready = state === 'ready' && model?.revision === revision && !issues.length;
  const exportModel = (format: 'step' | 'stl') => {
    if (!ready) return;
    setError(undefined); setState('exporting'); armTimeout();
    worker.current?.postMessage({ type: 'export', format, revision } satisfies Request);
  };
  return { model, state: issues.length ? 'invalid' as const : model?.revision !== revision && state === 'ready' ? 'stale' as const : state, error, ready, issues, exportModel, retry: () => { worker.current?.terminate(); worker.current = null; setAttempt(a => a + 1); } };
}
