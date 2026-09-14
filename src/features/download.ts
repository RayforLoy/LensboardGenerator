// SPDX-License-Identifier: GPL-3.0-only
import { zipSync, strToU8 } from 'fflate';
import license from '../../LICENSE?raw';
import { actualDiameter, configId, APP_VERSION, SOURCE_URL, GENERATOR_SOURCE_URL, threadChamferSize, threadBoreRadius, type Project } from '../domain/project';
import { templateById } from '../templates';

export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function fileStem(p: Project) {
  const c = p.central;
  const mode = !c.enabled ? 'blank' : c.mode === 'plain' ? `hole-${actualDiameter(p).toFixed(2)}mm` : `M${c.thread.diameter}x${c.thread.pitch}-${c.thread.mode}-${c.thread.leftHand ? 'LH' : 'RH'}`;
  const relief = p.kind === 'board' && p.relief.enabled ? `-${p.relief.spacing > 0 ? 'raised' : 'recessed'}-${Math.abs(p.relief.spacing)}mm` : '';
  const chamfer = c.enabled && c.mode === 'thread' && c.thread.chamfer.enabled ? `-C${threadChamferSize(c.thread).toFixed(2)}-45deg` : '';
  return `${p.kind === 'board' ? p.templateId : 'flange'}${relief}-${mode}${chamfer}-${configId(p)}`;
}
export async function downloadPackage(format: 'step' | 'stl', bytes: ArrayBuffer, p: Project) {
  const stem = fileStem(p), template = p.kind === 'board' ? templateById(p.templateId) : undefined;
  const files: Record<string, Uint8Array> = {
    [`${stem}.${format}`]: new Uint8Array(bytes),
    [`${stem}.json`]: strToU8(JSON.stringify(p, null, 2)),
    'LICENSE.txt': strToU8(license),
    'PROVENANCE.txt': strToU8(`LensboardGenerator ${APP_VERSION}\nLicense: GPL-3.0-only\nUnits: mm\nTemplate: ${template?.file ?? 'Original parametric flange'}\nTemplate version: ${template?.version ?? '1'}\nTemplate SHA-256: ${template?.sha256 ?? 'not applicable'}\nAuthor: project owner (user-authored initial STEP / original project design)\nShutter opening reference: ${SOURCE_URL}\nConfiguration: ${configId(p)}\nCentral mode: ${p.central.mode === 'thread' ? p.central.thread.mode : 'plain aperture'}\nNominal aperture diameter: ${p.central.diameter} mm\nActual plain aperture diameter: ${actualDiameter(p)} mm\nPrint optimization: ${p.kind === 'board' && p.central.mode === 'plain' && p.central.print.enabled}\nReconstruction: use the included project JSON and matching template with this generator version. The generator source and lockfile are in the repository from which this app was built.\nSTEP does not preserve the app feature tree. STL stores no reliable unit metadata.\nNo camera-fit, load-bearing, thread tolerance-class or light-sealing certification. Test before manufacturing.\n无担保；制造前请试配并为重镜头提供独立支撑。\n`),
  };
  if (template) {
    const response = await fetch(template.url);
    if (!response.ok) throw Error('template');
    const data = await response.arrayBuffer();
    const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(b => b.toString(16).padStart(2, '0')).join('');
    if (sha !== template.sha256) throw Error('template');
    files[`source-template/${template.file}`] = new Uint8Array(data);
  }
  if (p.central.enabled && p.central.mode === 'thread') {
    const thread = p.central.thread, c = threadChamferSize(thread);
    files['THREAD-ENTRY.txt'] = strToU8(`Thread: M${thread.diameter}x${thread.pitch} ${thread.leftHand ? 'LH' : 'RH'}\nMode: ${thread.mode} (${thread.mode === 'tapDrill' ? 'unthreaded tap-drill hole' : 'modeled thread'})\nEntry: front +Z\nChamfer enabled: ${thread.chamfer.enabled}\nSize mode: ${thread.chamfer.mode}\nChamfer C: ${c} mm (axial depth = radial increase; fixed 45 degrees)\nChamfer bore diameter: ${2 * threadBoreRadius(thread)} mm\nEntry diameter: ${2 * (threadBoreRadius(thread) + c)} mm\nThread machining length: ${thread.length} mm\nFull-profile length after chamfer (approx.): ${thread.mode === 'modeled' ? thread.length - c : 'not applicable'}\nChamfer does not change nominal diameter or pitch. Test fit and support heavy lenses independently.\n`);
  }
  files['GENERATOR-SOURCE.txt'] = strToU8(`Generator: LensboardGenerator ${APP_VERSION}\nCorresponding source: ${GENERATOR_SOURCE_URL || 'Local checkout: preserve this repository, pnpm-lock.yaml and build instructions.'}\nWASM source/build provenance: THIRD_PARTY_NOTICES.md in the generator repository.\n`);
  download(`${stem}-${format}.zip`, zipSync(files, { level: 6 }) as Uint8Array<ArrayBuffer>, 'application/zip');
}
