// SPDX-License-Identifier: GPL-3.0-only
export type Theme = 'light' | 'dark';
export function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem('lensboard-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* A blocked preference store must not prevent editing. */ }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export const PROJECT_ISSUES_URL = 'https://github.com/RayforLoy/LensboardGenerator/issues';
