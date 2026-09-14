// SPDX-License-Identifier: GPL-3.0-only
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';

// Walk installed runtime packages without publishing pnpm's absolute local paths.
function runtimePackages() {
  const packages = new Map<string, { directory: string; name: string; version: string; license: string; gitHead?: string }>();
  function visit(name: string, from: string) {
    let directory = from, path = '';
    while (true) {
      const candidate = join(directory, 'node_modules', name, 'package.json');
      if (existsSync(candidate)) { path = realpathSync(candidate); break; }
      if (directory === parse(directory).root) throw new Error(`Missing runtime package: ${name}`);
      directory = dirname(directory);
    }
    const pkg = JSON.parse(readFileSync(path, 'utf8'));
    const id = `${pkg.name}@${pkg.version}`;
    if (packages.has(id)) return;
    packages.set(id, { directory: dirname(path), name: pkg.name, version: pkg.version, license: pkg.license, ...(pkg.gitHead ? { gitHead: pkg.gitHead } : {}) });
    Object.keys(pkg.dependencies || {}).forEach(dependency => visit(dependency, dirname(path)));
  }
  const root = JSON.parse(readFileSync('package.json', 'utf8'));
  Object.keys(root.dependencies).forEach(name => visit(name, process.cwd()));
  return [...packages.values()];
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  server: { host: '127.0.0.1', port: 5273 },
  preview: { host: '127.0.0.1', port: 4273 },
  plugins: [react(), {
    name: 'license-notices',
    generateBundle() {
      for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
        this.emitFile({ type: 'asset', fileName: file, source: readFileSync(file) });
      }
      const packages = runtimePackages();
      for (const { name, directory } of packages) {
        let found = false;
        for (const file of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENSE-MIT.txt', 'COPYING']) {
          const path = join(directory, file);
          if (existsSync(path)) { found = true; this.emitFile({ type: 'asset', fileName: `licenses/${name.replaceAll('/', '-')}-${file}`, source: readFileSync(path) }); }
        }
        if (!found) throw new Error(`Missing runtime license: ${name}`);
      }
      this.emitFile({ type: 'asset', fileName: 'licenses/runtime-packages.json', source: JSON.stringify(packages.map(({ directory: _directory, ...pkg }) => pkg), null, 2) });
    },
  }],
  assetsInclude: ['**/*.STEP', '**/*.step', '**/*.stp', '**/*.STP'],
  worker: { format: 'es' },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 30000 },
} as Parameters<typeof defineConfig>[0]);
