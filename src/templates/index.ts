// SPDX-License-Identifier: GPL-3.0-only
import graflex from '../../steps/Graflex_pacemaker45_Lensboard_simplified_blank.STEP?url';
import horseman from '../../steps/Horseman_Lensboard_blank.STEP?url';
import horsemanSimple from '../../steps/Horseman_Lensboard_simplified_blank.STEP?url';
import linhof from '../../steps/Linhof_Lensboard_blank.STEP?url';
import sinar from '../../steps/Sinar_Lensboard_blank.STEP?url';
import sinarSimple from '../../steps/Sinar_Lensboard_simplified_blank.STEP?url';

export interface Template {
  id: string; version: string; name: string; variant: 'full' | 'simple';
  url: string; file: string; sha256: string;
  // Explicit source Y thickness → canonical +Z. Refined by CAD inspection.
  rotationX: number; editableRadius: number; sourceShiftX?: number; sourceMinY?: number;
}
export const templates: Template[] = [
  { id: 'sinar-blank', name: 'Sinar', variant: 'full', url: sinar, file: 'Sinar_Lensboard_blank.STEP', sha256: 'c872fb79b3f8086298246c724a03df2e63bd32291a5753b6b488ae19e9d6e9a5', rotationX: 90, editableRadius: 54, version: '1' },
  { id: 'sinar-simplified-blank', name: 'Sinar', variant: 'simple', url: sinarSimple, file: 'Sinar_Lensboard_simplified_blank.STEP', sha256: '180436f325463362d749aef3dbe200838985d6f47640b1c5a2d14e197816e20a', rotationX: 90, editableRadius: 54, version: '1' },
  { id: 'horseman-blank', name: 'Horseman', variant: 'full', url: horseman, file: 'Horseman_Lensboard_blank.STEP', sha256: 'ced885b0320723dc0844e26b7b632e69629800f64d52f48486f26411774f902d', rotationX: 90, editableRadius: 35, version: '1' },
  { id: 'horseman-simplified-blank', name: 'Horseman', variant: 'simple', url: horsemanSimple, file: 'Horseman_Lensboard_simplified_blank.STEP', sha256: '177010be377336d4d0e5faacf5b08fd44e8b46e6d00dbee940f86e763201fcd3', rotationX: 90, editableRadius: 35, version: '1' },
  { id: 'linhof-blank', name: 'Linhof', variant: 'full', url: linhof, file: 'Linhof_Lensboard_blank.STEP', sha256: '3f648ccce649828d3de797bf779991610c879fa9ec90cce2a05f0c2d3def9bdb', rotationX: 90, editableRadius: 35, version: '1' },
  { id: 'graflex-pacemaker45-simplified-blank', name: 'Graflex Pacemaker 4×5', variant: 'simple', url: graflex, file: 'Graflex_pacemaker45_Lensboard_simplified_blank.STEP', sha256: 'cedd27ada02959bd200d4916438f101240282fb46b2ba1d14a76f59f4b027ecc', rotationX: 90, editableRadius: 35, version: '1' },
];
export const templateById = (id: string) => templates.find(t => t.id === id);
