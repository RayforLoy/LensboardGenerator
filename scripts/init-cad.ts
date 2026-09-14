// SPDX-License-Identifier: GPL-3.0-only
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { setOC } from 'replicad';
import initialize from 'replicad-opencascadejs';

export async function initCad() {
  const require = createRequire(import.meta.url);
  const oc = await initialize({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')), print: () => {}, printErr: () => {} });
  setOC(oc); return oc;
}
