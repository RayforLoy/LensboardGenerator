// SPDX-License-Identifier: GPL-3.0-only
import graflex from '../../steps/Graflex_pacemaker45_Lensboard_simplified_blank.STEP?url';
import horseman from '../../steps/Horseman_Lensboard_blank.STEP?url';
import horsemanSimple from '../../steps/Horseman_Lensboard_simplified_blank.STEP?url';
import linhof from '../../steps/Linhof_Lensboard_blank.STEP?url';
import sinar from '../../steps/Sinar_Lensboard_blank.STEP?url';
import sinarSimple from '../../steps/Sinar_Lensboard_simplified_blank.STEP?url';
import alpa from '../../steps/ALPA_Lensboard_blank.STEP?url';
import arca from '../../steps/Arca141_Lensboard_blank.STEP?url';
import cambo from '../../steps/CAMBO TWR54_Lensboard_simplified_blank.STEP?url';
import toyo from '../../steps/TOYO158_Lensboard_simplified_blank.STEP?url';
import graflexPreAnniversary from '../../steps/Graflex_pre_anniversary_4x5_lensboard_blank.STEP?url';
import linhofTechnika69 from '../../steps/Linhof_technika_iii_iv_6x9_lensboard_blank.STEP?url';
import rolleiXact2 from '../../steps/Rollei_xact2_lensboard_blank.STEP?url';

export interface Template {
  id: string; version: string; name: string; variant: 'full' | 'simple';
  url: string; file: string; sha256: string;
  // Explicit source X-axis orientation; the rotated minimum Z is aligned to the board datum.
  rotationX: number; editableRadius: number; sourceShiftX?: number; sourceMinY?: number;
  sourceType?: 'step' | 'stl';
}
export const templates: Template[] = [
  { id: 'sinar-blank', name: 'Sinar', variant: 'full', url: sinar, file: 'Sinar_Lensboard_blank.STEP', sha256: 'c872fb79b3f8086298246c724a03df2e63bd32291a5753b6b488ae19e9d6e9a5', rotationX: 90, editableRadius: 54, version: '1' },
  { id: 'sinar-simplified-blank', name: 'Sinar', variant: 'simple', url: sinarSimple, file: 'Sinar_Lensboard_simplified_blank.STEP', sha256: '180436f325463362d749aef3dbe200838985d6f47640b1c5a2d14e197816e20a', rotationX: 90, editableRadius: 54, version: '1' },
  { id: 'horseman-blank', name: 'Horseman', variant: 'full', url: horseman, file: 'Horseman_Lensboard_blank.STEP', sha256: 'ced885b0320723dc0844e26b7b632e69629800f64d52f48486f26411774f902d', rotationX: 90, editableRadius: 35, version: '1' },
  { id: 'horseman-simplified-blank', name: 'Horseman', variant: 'simple', url: horsemanSimple, file: 'Horseman_Lensboard_simplified_blank.STEP', sha256: '177010be377336d4d0e5faacf5b08fd44e8b46e6d00dbee940f86e763201fcd3', rotationX: 90, editableRadius: 35, version: '1' },
  { id: 'linhof-blank', name: 'Linhof', variant: 'full', url: linhof, file: 'Linhof_Lensboard_blank.STEP', sha256: '3f648ccce649828d3de797bf779991610c879fa9ec90cce2a05f0c2d3def9bdb', rotationX: 90, editableRadius: 35, version: '1' },
  { id: 'graflex-pacemaker45-simplified-blank', name: 'Graflex Pacemaker 4×5', variant: 'simple', url: graflex, file: 'Graflex_pacemaker45_Lensboard_simplified_blank.STEP', sha256: 'cedd27ada02959bd200d4916438f101240282fb46b2ba1d14a76f59f4b027ecc', rotationX: 90, editableRadius: 35, sourceShiftX: -150, version: '1' },
  { id: 'graflex-pre-anniversary-45-blank', name: 'Graflex Pre-Anniversary 4×5', variant: 'full', url: graflexPreAnniversary, file: 'Graflex_pre_anniversary_4x5_lensboard_blank.STEP', sha256: 'f2b6c9e67a583b5100412cf975c18876470185b51eb16897eea25ed0dd049c20', rotationX: 90, editableRadius: 35, version: '1' },
  { id: 'linhof-technika-iii-iv-69-blank', name: 'Linhof Technika III/IV 6×9', variant: 'full', url: linhofTechnika69, file: 'Linhof_technika_iii_iv_6x9_lensboard_blank.STEP', sha256: '92485a2fa839eb855225d02e96d240d71ea816ee1ee7fa1300372fb4c9ae1515', rotationX: 90, editableRadius: 26, version: '1' },
  { id: 'rollei-xact2-blank', name: 'Rollei X-ACT2', variant: 'full', url: rolleiXact2, file: 'Rollei_xact2_lensboard_blank.STEP', sha256: '28bbc59c8396f4cf42f186eb1b25012a0e1a3abb86aca50db08d39dd6a27ddb9', rotationX: 90, editableRadius: 35, version: '1' },
  { id: 'alpa-blank', name: 'ALPA', variant: 'full', url: alpa, file: 'ALPA_Lensboard_blank.STEP', sha256: '986ad6493b9b094e8004ae934dc03409c58e12a4b5cef587417f7126c967d12c', rotationX: 90, editableRadius: 30, version: '1' },
  { id: 'arca141-blank', name: 'Arca 141', variant: 'full', url: arca, file: 'Arca141_Lensboard_blank.STEP', sha256: 'd22eefdd89cfdc3a33a6abb26802560067902b38a11d6510fe2586bc7de778bf', rotationX: 90, editableRadius: 54, version: '1' },
  { id: 'cambo-twr54-simplified-blank', name: 'CAMBO TWR54', variant: 'simple', url: cambo, file: 'CAMBO TWR54_Lensboard_simplified_blank.STEP', sha256: '04a5fe3be495fcf2fffbce2ccac948436af70aa6dc62adfe1391f1792376cca6', rotationX: 90, editableRadius: 26, version: '1' },
  { id: 'toyo158-simplified-blank', name: 'TOYO 158', variant: 'simple', url: toyo, file: 'TOYO158_Lensboard_simplified_blank.STEP', sha256: 'beb273db71c74ead970c12d36b0082f23524df5f6d6bf88c6f32386f273d83d7', rotationX: 90, editableRadius: 62, version: '1' },
];
export const templateById = (id: string) => templates.find(t => t.id === id);
