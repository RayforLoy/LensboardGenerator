// SPDX-License-Identifier: GPL-3.0-only
import type { Project, Issue } from '../domain/project';
import type { Template } from '../templates';
import type { ShapeMesh, SimplePoint } from 'replicad';
export type Request =
  | { type: 'build'; revision: string; project: Project; template?: Template }
  | { type: 'export'; revision: string; format: 'step' | 'stl' };
export type Result =
  | { type: 'stage'; revision: string; stage: 'loading' | 'building' | 'exporting' }
  | { type: 'model'; revision: string; mesh: ShapeMesh; bounds: [SimplePoint, SimplePoint]; volume: number; localThickness: number; solidCount: number; warnings: Issue[]; elapsedMs: number }
  | { type: 'export'; revision: string; format: 'step' | 'stl'; bytes: ArrayBuffer }
  | { type: 'error'; revision: string; code: string; feature?: string; detail: string; during: 'build' | 'export' };
export type ModelResult = Extract<Result, { type: 'model' }>;
