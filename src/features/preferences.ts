// SPDX-License-Identifier: GPL-3.0-only
export type Theme = 'light' | 'dark';
export const defaultEdges = (sourceType: 'step' | 'stl') => sourceType !== 'stl';
export function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem('lensboard-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* A blocked preference store must not prevent editing. */ }
  return 'dark';
}
export const PROJECT_ISSUES_URL = 'https://github.com/RayforLoy/LensboardGenerator/issues';
