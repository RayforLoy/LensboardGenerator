# Repository instructions / 项目协作约定

## Scope and current stage

本文件是仓库级代理协作说明（用户请求的 `agents.md`，使用规范名称 `AGENTS.md`，便于在 Linux / GitHub 上识别）。项目当前版本 v0.2.4 / schema 4，公开版本见部署记录；验证与未完成需求见 `docs/IMPLEMENTATION_STATUS.md`。

- 先阅读 `PRD.md`、`docs/ARCHITECTURE.md`、`docs/TEMPLATE_SPEC.md` 和 `docs/TEST_PLAN.md`。
- 写应用代码前，将任何新功能、范围调整、技术降级和验收变化写入 PRD，并向用户说明。不得把未验证的设计写成已实现。
- 后续实现遵循 M1 → M2 → M3。STEP / 真实螺纹先做最小验证，失败时报告证据，不无声替换目标。
- 不主动创建子代理 / 并行代理任务；仅在用户明确要求时使用。

## Preserve private references

- `scadtest/` 仅供本地功能研究，必须保持被忽略。不要修改、删除、提交、上传，或通过构建复制它。
- `steps/` 是初始模板源目录，仅允许 `.step` / `.stp`（大小写不敏感）进入模板清单、Git 和构建。其他文件保持本地忽略，不读取其模型内容、不删除、不重命名发布；导入检查不修改原 STEP 字节。
- 用户已确认初始及新增 STEP 为自绘（当前十个），并选择 GPL-3.0-only 用于网页原创代码、模板及基于它们的衍生输出。遵循 `LICENSE` 和 `docs/LICENSING.md`，第三方许可不改写。
- 不假设参考 STL 可再分发，不把代码里的演示尺寸宣称为厂家标准。
- 可发布模板、字体和其他资产必须有来源、许可及验证状态。应用许可不覆盖第三方资产许可。
- 保留已有用户更改；不运行破坏性 git 回滚，不自动推送或发布。

## Geometry rules

- 内部 mm / degree，原点、正反面、PCD 和角度遵照 PRD。PCD 是直径，不是半径。
- 公称值、最终几何值、径向间隙与直径增量分开建模。
- 镜头板默认普通通孔，快门预设及来源见 `docs/SHUTTER_PRESETS.md`；不能把普通通孔径当作 M 螺纹外径。M 螺纹主要输入为公称外径 D 和螺距 P，默认右旋单线，显示 M{D}×{P}；切换模式要求确认螺纹参数。
- 区分 countersink、counterbore、盲孔和剩余厚度。复合孔必须作为一个受校验的特征。
- 真实螺纹必须是真实几何；底孔模式是另一种明确标记的产物。不得以光滑孔冒充螺纹。
- 新设计螺纹入口默认 45° / C=1.2P，C 为轴向深度及径向增量，从小径/底孔边缘计算；可关闭/手动。保护包络包含倒角入口，实际底孔不能跟随包络扩大；检查当地厚度及剩余完整牙型。schema 1/2/3 严格迁移到 4 时倒角关闭，不静默改变旧几何。
- STEP 必须来自有效实体；不得把三角 STL 包装后宣称精确参数化 STEP。
- 预览可简化，导出不允许静默简化。禁用过期模型导出，Worker 请求使用版本 / request ID。
- 校验当地实体、保护区和残余壁厚，不只看包围盒。失败时保留参数并报告对应特征。
- 用户指定例外（v0.2.2）：凸凹基座仅核对主板 XY 外尺寸范围，取消基座材料均匀 / 完整及边缘余量校验，跨筋位提示警告；不重新添加该阻断。孔的当地材料 / 端面检查、附件干涉及有效实体检查仍保留。
- 显式释放 WASM 实体、临时对象与下载 URL；终止 / 重建 Worker 后丢弃旧引用。

## Frontend and localization

- 暂定 TypeScript 严格模式，React / Vite；依赖以验证后的 `package.json` 和锁文件为准。
- 不在主线程执行 CAD 运算，不依赖服务端 API、不执行用户上传脚本。
- 所有用户可见文字来自 `zh-CN` / `en` 资源，首次默认中文；语言不进入几何参数和模型缓存键。
- 语言切换不丢失设计；数字输入规则明确，导出参数使用语言无关 JSON。
- 支持键盘操作、字段错误关联、非颜色状态提示。
- WASM / Worker / 模板路径必须兼容 GitHub Pages 仓库子路径；不要写死根路径 `/assets/...`。

## Tests and handoff

- 未有代码时不声称 `npm install`、测试或构建已经可用。
- 加代码后运行实际存在的类型检查、单元测试、构建和相关浏览器测试；说明未运行的检查及原因。
- 更改几何必须有尺寸 / 有效性 / 导出重读回归；文件存在或截图不算 CAD 验证。
- 加语言键必须检查两种语言完整性；改异步流程必须测竞态和过期导出。
- 发布前检查源代码及 dist 均不含私人目录 / 未授权资产，许可证通知随构建输出。
- 对 steps 使用扩展名白名单，测试非 STEP 文件不进入 dist；导出必须带许可 / 来源说明与可重建 JSON，并提供 GPL v3 文本，不声称输出因为生成器 GPL 而自动给所有外来资产换许可。
- 交付时说明完成项、验证证据和未解决事项，更新 PRD / README 中实际状态。

## Layout

`src/domain/` 参数与校验；`src/geometry/` CAD 适配；`src/workers/` Worker 协议；`src/features/` 编辑界面；`src/i18n/` 语言；`src/templates/` 注册元数据；`steps/` 白名单模板；`scripts/` CAD 检查；`tests/` 回归；`docs/` 规范；`.github/workflows/` 检查与手动 Pages 发布。

Node 依赖由 package.json / pnpm-lock.yaml 管理。requirements.txt 无生产 Python 包；requirements-dev.txt 仅用于离线独立导出检查。
