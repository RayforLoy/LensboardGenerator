// SPDX-License-Identifier: GPL-3.0-only
export const zh = {
  theme: '主题', switchDark: '切换为暗色主题', switchLight: '切换为亮色主题', reportHint: 'Report：在 GitHub Issues 报告问题（新标签页）',
  thirdParty: '第三方许可', generatorSource: '对应版本源码',
  title: '大画幅镜头板工作室', subtitle: '从镜头板到可制造模型，一切在浏览器内完成。',
  board: '镜头板', flange: '法兰 / 压圈', template: '镜头板模板', full: '完整结构', simple: '简化结构', experimental: '实验模板 · 未验证实机适配',
  central: '镜头安装孔', enabled: '启用', plain: '普通通孔', thread: 'M 型内螺纹', preset: '快门孔径预设', custom: '自定义', nominal: '名义孔径', actual: '实际孔径',
  print: '3D 打印优化', allowance: '孔径正公差（直径增量）', printHint: '只增加中央普通通孔的直径，不影响螺纹或安装孔。请先打印试配。',
  x: 'X 偏移', y: 'Y 偏移', diameter: '孔径', major: '螺纹公称外径 D', pitch: '螺距 P', length: '有效螺纹长度', clearance: '螺纹径向间隙', leftHand: '左旋螺纹',
  confirm: '我已确认实际配合件的外径与螺距', threadMode: '螺纹导出方式', modeled: '真实几何螺纹', tapDrill: '攻丝底孔（无牙）', tapDiameter: '用户确认的攻丝底孔直径',
  threadHint: '60° M 基本牙型；未认证制造公差等级。快门通孔径不等于安装螺纹径。',
  holes: '独立加工孔', addHole: '添加孔', copy: '复制', remove: '删除', through: '通孔', blind: '平底盲孔', countersink: '锥形沉头孔', counterbore: '圆柱沉孔',
  holeType: '孔类型', depth: '深度', recessDiameter: '沉孔大径', angle: '沉头包含角', face: '加工面', front: '正面', back: '背面', side: '侧面', iso: '立体', resetView: '复位',
  pattern: '圆周安装孔', count: '孔数', pcd: '孔心圆直径 PCD', startAngle: '起始角', patternSink: '带锥形沉头', seat: '局部减薄 / 法兰座', seatDiameter: '法兰座直径', remaining: '剩余板厚',
  outer: '法兰外径', thickness: '底部厚度', stepDiameter: '台阶外径', stepHeight: '台阶高度（0=关闭）', slotCount: '扳手槽数量（0=关闭）', slotWidth: '槽宽', slotDepth: '槽径向深度', slotAngle: '槽起始角',
  export: '导出制造文件', step: '下载 STEP 包', stl: '下载 STL 包', json: '保存参数 JSON', import: '导入参数', reset: '恢复默认', undo: '撤销', redo: '重做',
  quality: 'STL 精度', standard: '标准 · 0.03 mm', fine: '精细 · 0.01 mm', packageHint: '下载 ZIP 含几何文件、重建参数、来源说明与 GPL v3。STEP 不保留应用参数树。',
  loading: '正在加载 CAD 内核与模板…', building: '正在计算实体与网格…', exporting: '正在准备导出文件…', ready: '模型已就绪', invalid: '参数需要修正', stale: '模型过期，请等待重建', failed: '生成失败', retry: '重新计算',
  volume: '实体体积', localThickness: '孔位当地厚度', solids: '实体数量', computeTime: '计算耗时', dimensions: '外形尺寸', warnings: '制造注意事项', acceptWarnings: '我已阅读制造提示，确认导出',
  caution: '未进行实机适配、承重或漏光认证。重镜头需独立支撑，打印 / 加工前须试配。', source: '快门孔径来源', sourceHint: '型号变体及加工推荐值存在差异，可输入自定义孔径。',
  privacy: '本地计算 · 无模型上传', license: 'GPL v3 许可', protectedHint: '绿色虚线为保守加工区，边缘与附件受到保护。区域未经实机认证。', plot: '二维孔位图', selectPosition: '点选二维图移动中央孔；数字输入为准。',
  resetConfirm: '恢复默认参数？当前设计将被替换。', importConfirm: '导入参数会替换当前设计，是否继续？', invalidProject: '项目文件无效、版本不支持或模板不匹配。当前设计未被覆盖。', storage: '本地保存不可用，请下载参数 JSON 备份。', viewportError: 'WebGL 不可用，仍可使用二维孔位图及参数编辑。',
  error_finite: '所有数值必须是有限数字。', error_diameter: '孔径必须为正数且在支持范围内。', error_allowance: '启用打印优化时，直径增量必须大于 0 且不超过 5 mm。', error_confirmThread: '请确认螺纹外径与螺距。', error_thread: '检查螺纹外径、螺距、长度与间隙；最多 40 圈。', error_tapDiameter: '攻丝底孔必须大于 0 且小于公称外径。',
  error_flange: '法兰尺寸或槽参数无效。', error_pattern: '圆周阵列须为 1–100 个孔，PCD 为正数。', error_limit: '每个零件最多 100 个加工孔。', error_duplicateId: '孔标识重复。', error_depth: '深度 / 螺纹长度超过当地板厚，或沉孔穿透。', error_recess: '沉孔大径必须大于底孔径。', error_angle: '沉头包含角须在 0° 与 180° 之间。', error_seat: '法兰座剩余厚度须大于 0 且小于当地原厚度。',
  error_template: '模板加载或校验失败。', error_outside: '孔位没有可加工的实体材料。', error_nonuniform: '加工轮廓及安全余量处材料不完整或厚度不均匀。请调整位置 / 尺寸。', error_thin: '残余壁厚不足 1.5 mm，请仔细检查制造可行性。', error_protected: '加工轮廓进入模板保护区或附件区域。', error_overlap: '独立加工特征相交，请调整孔位或尺寸。', error_invalidSolid: '加工结果不是有效实体，或产生了意外碎片。', error_stale: '当前模型与参数不同，禁止导出旧模型。', error_kernel: 'CAD 内核运算失败。请检查参数并重试。', error_timeout: '计算超过 60 秒，内核已重启，请减小模型复杂度。',
  emptyHoles: '还没有独立孔，可在这里添加安装孔。', hole: '孔', mm: 'mm', degree: '°', language: '界面语言', preview: '实体预览', error_invalidMesh: 'STL 网格不是封闭流形或法向不一致，已阻止下载。', error_threadFailed: '螺纹布尔切削未形成有效牙型，已阻止用光滑孔替代下载。',
};
export type Key = keyof typeof zh;
export const en: Record<Key, string> = {
  theme: 'Theme', switchDark: 'Switch to dark theme', switchLight: 'Switch to light theme', reportHint: 'Report a problem on GitHub Issues (new tab)',
  thirdParty: 'Third-party licenses', generatorSource: 'Matching source code',
  title: 'Large-format Lensboard Studio', subtitle: 'From lensboard to manufacturing model, entirely in your browser.',
  board: 'Lensboard', flange: 'Flange / retaining ring', template: 'Lensboard template', full: 'Full structure', simple: 'Simplified', experimental: 'Experimental · camera fit not verified',
  central: 'Lens mounting aperture', enabled: 'Enabled', plain: 'Plain through-hole', thread: 'Metric M internal thread', preset: 'Shutter opening preset', custom: 'Custom', nominal: 'Nominal diameter', actual: 'Actual diameter',
  print: '3D printing optimization', allowance: 'Positive allowance (diameter increase)', printHint: 'Only enlarges the central plain aperture, not threads or mounting holes. Test the fit first.',
  x: 'X offset', y: 'Y offset', diameter: 'Hole diameter', major: 'Nominal thread major diameter D', pitch: 'Thread pitch P', length: 'Effective thread length', clearance: 'Radial thread clearance', leftHand: 'Left-hand thread',
  confirm: 'I have confirmed the mating diameter and pitch', threadMode: 'Thread export mode', modeled: 'Modeled geometric thread', tapDrill: 'Tap-drill hole (unthreaded)', tapDiameter: 'Confirmed tap-drill diameter',
  threadHint: '60° M basic profile; manufacturing tolerance class is not certified. Opening diameter is not mounting thread diameter.',
  holes: 'Individual machining holes', addHole: 'Add hole', copy: 'Duplicate', remove: 'Delete', through: 'Through-hole', blind: 'Flat-bottom blind hole', countersink: 'Conical countersink', counterbore: 'Cylindrical counterbore',
  holeType: 'Hole type', depth: 'Depth', recessDiameter: 'Recess major diameter', angle: 'Countersink included angle', face: 'Machining face', front: 'Front', back: 'Back', side: 'Side', iso: 'Isometric', resetView: 'Reset',
  pattern: 'Circular mounting pattern', count: 'Hole count', pcd: 'Pitch circle diameter PCD', startAngle: 'Start angle', patternSink: 'Countersunk holes', seat: 'Local thinning / flange seat', seatDiameter: 'Seat diameter', remaining: 'Remaining thickness',
  outer: 'Flange outer diameter', thickness: 'Base thickness', stepDiameter: 'Step outer diameter', stepHeight: 'Step height (0=off)', slotCount: 'Wrench slots (0=off)', slotWidth: 'Slot width', slotDepth: 'Radial slot depth', slotAngle: 'Slot start angle',
  export: 'Export manufacturing files', step: 'Download STEP package', stl: 'Download STL package', json: 'Save project JSON', import: 'Import project', reset: 'Restore defaults', undo: 'Undo', redo: 'Redo',
  quality: 'STL precision', standard: 'Standard · 0.03 mm', fine: 'Fine · 0.01 mm', packageHint: 'ZIP includes geometry, reconstruction parameters, provenance and GPL v3. STEP does not preserve the app feature tree.',
  loading: 'Loading CAD kernel and template…', building: 'Computing solid and mesh…', exporting: 'Preparing export files…', ready: 'Model ready', invalid: 'Parameters need correction', stale: 'Model outdated; rebuilding', failed: 'Generation failed', retry: 'Recompute',
  volume: 'Solid volume', localThickness: 'Local aperture thickness', solids: 'Solid count', computeTime: 'Compute time', dimensions: 'Overall dimensions', warnings: 'Manufacturing notes', acceptWarnings: 'I have read the manufacturing notes and confirm export',
  caution: 'Camera fit, load capacity and light sealing are not certified. Support heavy lenses independently and test the fit before manufacturing.', source: 'Shutter opening source', sourceHint: 'Historical variants and machining recommendations differ; custom diameters are supported.',
  privacy: 'Local computation · no model upload', license: 'GPL v3 license', protectedHint: 'The dashed green circle is a conservative machining region; rims and attachments are protected. Camera fit is not certified.', plot: '2D hole layout', selectPosition: 'Click the 2D diagram to position the central aperture; numeric input remains authoritative.',
  resetConfirm: 'Restore defaults? This replaces the current design.', importConfirm: 'Importing will replace the current design. Continue?', invalidProject: 'Invalid project, unsupported version or mismatched template. Your current design was not replaced.', storage: 'Local storage is unavailable; download JSON to back up the project.', viewportError: 'WebGL unavailable. The 2D layout and parameter editor remain usable.',
  error_finite: 'All numeric values must be finite.', error_diameter: 'Diameter must be positive and within supported limits.', error_allowance: 'When enabled, the diameter allowance must be greater than 0 and at most 5 mm.', error_confirmThread: 'Confirm the thread diameter and pitch.', error_thread: 'Check diameter, pitch, length and clearance; maximum 40 turns.', error_tapDiameter: 'Tap-drill diameter must be positive and smaller than the nominal major diameter.',
  error_flange: 'Invalid flange or slot dimensions.', error_pattern: 'Use 1–100 holes and a positive PCD.', error_limit: 'A part supports at most 100 machining holes.', error_duplicateId: 'Duplicate hole identifiers.', error_depth: 'Depth/thread length exceeds local material or the recess breaks through.', error_recess: 'Recess diameter must exceed the pilot hole diameter.', error_angle: 'Included angle must be between 0° and 180°.', error_seat: 'Remaining thickness must be positive and less than the local original thickness.',
  error_template: 'Template loading or verification failed.', error_outside: 'No machinable solid exists at this position.', error_nonuniform: 'Material is incomplete or varies in thickness within the footprint and safety margin. Adjust dimensions or position.', error_thin: 'Remaining wall thickness is below 1.5 mm. Review manufacturing feasibility.', error_protected: 'The machining footprint enters a protected rim or attachment region.', error_overlap: 'Independent machining features intersect; adjust positions or dimensions.', error_invalidSolid: 'The result is invalid or contains unexpected fragments.', error_stale: 'Model does not match the current parameters; outdated exports are blocked.', error_kernel: 'CAD operation failed. Review parameters and retry.', error_timeout: 'Computation exceeded 60 seconds; the kernel was restarted. Reduce complexity.',
  emptyHoles: 'No individual holes yet. Add mounting holes here.', hole: 'Hole', mm: 'mm', degree: '°', language: 'Interface language', preview: 'SOLID PREVIEW', error_invalidMesh: 'STL mesh is open, non-manifold or inconsistently wound. Download was blocked.', error_threadFailed: 'Thread cutting did not create a valid profile. A smooth-hole substitute was not exported.',
};
export type Language = 'zh-CN' | 'en';
export const translator = (language: Language) => (key: Key) => (language === 'en' ? en : zh)[key];
export function errorText(code: string, language: Language): string {
  return translator(language)((`error_${code}` in zh ? `error_${code}` : 'error_kernel') as Key);
}
