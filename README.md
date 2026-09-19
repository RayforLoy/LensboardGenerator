# LensboardGenerator

大画幅镜头板 / 法兰生成器 · Large-format lensboard & flange generator

实验性 v0.3.0 本地开发版，已完成自动验证但尚未提交、推送或发布；在线站点仍为 v0.2.4。纯静态网页，CAD 运算在浏览器 Web Worker 内完成，无需 MakerLab、账户或 Python 后端。支持真实实体 STEP 和二进制 STL；见 [更新日志](CHANGELOG.md) 与 [实施状态](docs/IMPLEMENTATION_STATUS.md)。

在线使用：[Lensboard Studio](https://rayforloy.github.io/LensboardGenerator/) · [Report / Issues](https://github.com/RayforLoy/LensboardGenerator/issues)。

## 中文

### 功能

- 十二个自绘 STEP 模板：Sinar、Horseman、Linhof、Graflex、ALPA、Arca 141、CAMBO TWR54、TOYO 158，新增 Graflex Pre-Anniversary 4×5 与 Linhof Technika III/IV 6×9；保留完整 / 简化版本，Horseman 完整版的附属实体保留输出。
- 自定义镜头板：通过长、宽、厚度、圆角半径生成解析 B-rep；R=0 是矩形，R=半短边是跑道形，等边时为圆形。可在背面生成向内等距的外圈遮光环和指定尺寸的内圈圆角矩形遮光台，均向 −Z 凸出；并可继续叠加凸板/凹板。完整轮廓须满足凸凹板≤内圈≤外圈内边界≤外形，关闭层跳过、等轮廓允许。
- 模板前后翻转（绕 Y 轴 180°）/ 上下翻转（绕 Z 轴 180°），附件一起旋转；先翻转再按最终 XY 坐标加工，+Z 始终正面，STEP / STL / 参数同步。预览显示世界原点的三色坐标轴、箭头及 XYZ。切换模板清除翻转。
- 凸凹基座按用户选择仅比较主板 X / Y 外尺寸范围，取消基座厚度均匀 / 材料完整校验和额外 1.5 mm 余量；允许等于范围，超过任一侧报错。跨筋位 / 台阶不因此阻断，但可能切除安装 / 遮光结构，需人工检查；真实附件干涉与有效实体检查仍保留。Linhof / CAMBO 默认 60×60 mm 凸凹已可生成，非装机认证。
- 凸板 / 凹板（默认关闭）：圆角矩形 / 圆形基座；壁厚默认 2 mm（向内、法向厚度），端面厚 2.5 mm，倾角 80°（90° 为直壁），间距 +17 mm。间距定义为原正面到新端面正面，负值为凹；两方向朝端面收窄，基座固定模板中心。小模板需减小基座；后侧干涉 / 遮光 / 承重需实物确认。
- 默认普通通孔 34.6 mm，[快门开孔预设与来源](docs/SHUTTER_PRESETS.md)，自定义孔径及 XY 偏移。
- 凸凹端面的孔 / 局部减薄按新端面内腔和 1.5 mm 孔余量校验，不套用原板保护圆区；实际原板上的孔仍受模板保护。ALPA 80×80 / 90° / +17 mm / 端面 2.5 mm 的 Ø60、M65×1 可生成，仍须检查实物配合。
- 可选「3D 打印孔径优化」，默认关闭，开启后孔径增加 **0.5 mm**，可调整。34.6 → 35.1、65 → 65.5 mm；不是半径增量，不累计叠加，也不自动应用到螺纹。
- M 型内螺纹：独立输入公称外径 D、螺距 P、有效长度、左右旋及径向间隙；真实 60°截形螺旋牙型，或明确标记的攻丝底孔模式。输入需确认；示例 M65×1 不是厂家标准。
- 螺纹入口导向倒角：新设计默认启用，自动 C=螺距×1.2，固定45°；可手动尺寸或关闭。C是深度及径向增量，从真实小径/攻丝底孔边缘起，入口在最终正面+Z，不修改公称外径。加工长度包含倒角段，完整牙型长度约为 length−C，必须保留完整牙型且不穿透当地厚度；不足2圈警告，需实物试配。预览/STEP/STL一致，ZIP附入口说明。
- 独立通孔 / 平底盲孔 / 锥形沉头 / 圆柱沉孔、正反面加工、圆周孔阵列、局部法兰座减薄。
- 参数化两级法兰及外缘扳手槽；镜头板 / 法兰分别编辑导出，未做配对装配设计。
- 3D 旋转缩放、视图切换、二维孔位图、坐标输入，撤销 / 重做、本地保存、JSON 导入导出。
- 首次默认中文，可切换 English，参数不丢失；保护区、当地厚度、孔交叠、实体及 STL 闭合检查，过期模型禁止导出。
- 亮色 / 深蓝暗色主题（首次默认暗色，保留手动记忆），不影响 CAD；真实拓扑边默认显示且可关闭，不显示三角网格线；顶栏 Report 打开本项目 GitHub Issues，不自动上传设计。

下载为 ZIP：含 STEP 或 STL、项目 JSON、GPL v3 文本、来源说明；内置模板模式另含原始 STEP，自定义板则附 CUSTOM-BOARD 参数说明且不打包闲置模板。STEP 保留实体几何而非应用参数树，继续编辑请保留 JSON。模型与参数不上传服务器；尚无离线 PWA。

项目 JSON 版本 5；完整的旧版本 1 / 2 / 3 / 4 严格迁移，旧项目保持模板模式，旧版倒角关闭规则不变，避免旧几何改变；1 / 2 保持未翻转，1保持凸凹关闭，原有加工参数不变。自动/手动倒角值独立保存；未知版本 / 损坏文件不覆盖当前设计。STL 模板导入仍未实现，未来 STL 来源默认关闭边线。

### 启动与测试

需要 Node.js 24 和 pnpm 11.19.0（以 package.json / pnpm-lock.yaml 为准）。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开 http://127.0.0.1:5273/。首次加载约 23 MB WASM（gzip 约 7.3 MB），需等待初始化。不能直接使用 file:// 打开。

```sh
pnpm build
pnpm preview
pnpm test
pnpm test:cad
pnpm test:e2e
```

浏览器测试默认使用已安装的 Microsoft Edge，自动启动或复用开发服务器。其他环境设置 TEST_BROWSER=chromium 并运行 `pnpm exec playwright install --with-deps chromium`；TEST_URL 可指定已启动的生产预览地址。

独立 STEP/STL 重读仅用于开发检查，无生产 Python 依赖：

```sh
python -m pip install -r requirements-dev.txt
python scripts/verify-exports.py
```

先运行 pnpm test:cad 生成 tmp/cad-check 样例，再用 native OCCT / trimesh 检查实体、尺寸、体积、闭合网格及左右旋牙型。

### GitHub Pages

公开仓库 RayforLoy/LensboardGenerator 使用GitHub Actions静态Pages，仓库主页及HTTPS已配置。main推送自动发布，也可手动运行Deploy GitHub Pages。v0.2.4真实公开HTTPS九项Edge测试通过：十模板、Worker/WASM、倒角与STEP/STL、凸凹/翻转/主题/Report等；[部署记录](docs/DEPLOYMENT.md)。构建使用Pages的base_path。[GitHub官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

PowerShell 模拟仓库子路径（构建和预览保持同一变量）：

```powershell
$env:VITE_BASE_PATH = '/LensboardGenerator/'
pnpm build
pnpm preview
```

访问 http://127.0.0.1:4273/LensboardGenerator/。默认构建使用相对路径，适合静态目录部署。

### 文档与限制

[PRD](PRD.md) · [AGENTS.md](AGENTS.md) · [架构](docs/ARCHITECTURE.md) · [模板规范](docs/TEMPLATE_SPEC.md) · [测试计划](docs/TEST_PLAN.md) · [模板目录](docs/TEMPLATE_CATALOG.md) · [实施状态](docs/IMPLEMENTATION_STATUS.md) · [贡献说明](CONTRIBUTING.md)。READEME.md 为拼写兼容索引；requirements.txt 无生产 Python 包，requirements-dev.txt 仅用于离线检查。

模板均为 experimental：未做装机、遮光、实际打印配合、承重或螺纹公差等级认证。保守加工区可能拒绝某些理论可行孔位，特别是 Horseman 大孔跨越非均匀板面；不会自动缩孔。请先试配，重镜头应独立支撑。

scadtest/ 整体忽略且不打包；steps/ 仅 STEP/STP 白名单纳入 Git、运行时与构建，其他原文件保持本地原样。

公开构建时设置 VITE_SOURCE_URL 为对应提交的仓库源码链接；Pages 工作流自动设置，网页和 ZIP 将携带该入口，本地未设置时来源文件提示保留完整仓库。

### 许可

原创代码、十二个用户自绘 STEP、自定义参数化板及衍生模型采用 [GPL-3.0-only](LICENSE)，第三方依赖保留原许可。构建附 GPL 文本、[第三方通知](THIRD_PARTY_NOTICES.md) 和依赖许可正文；公开分发需同时提供可修改源码、锁文件、构建说明及 WASM 对应源构建来源，见 [许可范围](docs/LICENSING.md)。

## English

Local experimental v0.3.0 adds a parametric custom-lensboard source with length, width, thickness and corner radius. R=0 is a rectangle; R at half the shorter side is a racetrack, or a circle for equal sides. Optional rear outer light-trap rings and centered rounded-rectangle bosses project toward −Z; raised/recessed boards can be stacked when full outlines satisfy relief ≤ inner boss ≤ outer-ring opening ≤ board. Disabled layers are skipped and equal outlines are allowed. Custom exports omit unrelated STEP templates. Schema5 strictly migrates complete schema1–4 projects into template mode without changing old geometry. This version has been verified locally but is not yet committed, pushed or deployed; the public site remains v0.2.4.

CAD runs locally in a Web Worker with Replicad/OpenCascade WASM. Twelve user-authored STEP templates, procedural custom boards and flanges, sourced shutter apertures, optional +0.5 mm diameter printing allowance, actual metric threads and composite machining holes are available. Hollow raised/recessed template boards remain supported separately. Templates/accessories rotate together before final-coordinate machining; preview includes world axes and optional topology edges, with dark navy/cyan defaults. Accessory interference, local-hole material and valid-solid checks remain. Simplified Chinese is default; language and view preferences persist independently. Inspect mounting/light-sealing geometry and test physical fit.

Real solid STEP and checked binary STL download in a ZIP with JSON, GPL text and provenance; built-in-template exports include the original template, while custom boards include a parameter note. Use Node.js 24 / pnpm 11.19.0: `pnpm install --frozen-lockfile`, then `pnpm dev` at http://127.0.0.1:5273/. Run pnpm build, pnpm test, pnpm test:cad and pnpm test:e2e. Browser tests default to installed Edge; TEST_BROWSER and TEST_URL override. requirements-dev.txt contains optional independent verification tools, never a backend.

Live site: [Lensboard Studio](https://rayforloy.github.io/LensboardGenerator/), with [Report / Issues](https://github.com/RayforLoy/LensboardGenerator/issues), light/dark themes and persisted preferences. GitHub Pages is configured for automatic main-branch and manual Actions deployment. Nine browser scenarios passed against the real v0.2.4 HTTPS site, including ten templates, chamfers and STEP/STL downloads; see the [deployment record](docs/DEPLOYMENT.md). VITE_BASE_PATH supports repository subpaths. Only STEP/STP assets are bundled; scadtest/ and other source CAD formats remain ignored.

Read the [implementation status](docs/IMPLEMENTATION_STATUS.md) for evidence and unfinished PRD items. No physical fit, light-tightness, load capacity or standardized thread tolerance class is certified. Original code, initial templates and derivative models use [GPL-3.0-only](LICENSE); third-party terms remain separate.
