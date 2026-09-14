# LensboardGenerator

大画幅镜头板 / 法兰生成器 · Large-format lensboard & flange generator

实验性首版 v0.1.0。纯静态网页，CAD 运算在浏览器 Web Worker 内完成，无需 MakerLab、账户或 Python 后端。支持真实实体 STEP 和二进制 STL；验证与未完成项见 [实施状态](docs/IMPLEMENTATION_STATUS.md)。

## 中文

### 功能

- 六个自绘 STEP 初始模板：Sinar、Horseman、Linhof、Graflex，保留完整 / 简化版本；Horseman 完整版的附属实体保留输出。
- 默认普通通孔 34.6 mm，[快门开孔预设与来源](docs/SHUTTER_PRESETS.md)，自定义孔径及 XY 偏移。
- 可选「3D 打印孔径优化」，默认关闭，开启后孔径增加 **0.5 mm**，可调整。34.6 → 35.1、65 → 65.5 mm；不是半径增量，不累计叠加，也不自动应用到螺纹。
- M 型内螺纹：独立输入公称外径 D、螺距 P、有效长度、左右旋及径向间隙；真实 60°截形螺旋牙型，或明确标记的攻丝底孔模式。输入需确认；示例 M65×1 不是厂家标准。
- 独立通孔 / 平底盲孔 / 锥形沉头 / 圆柱沉孔、正反面加工、圆周孔阵列、局部法兰座减薄。
- 参数化两级法兰及外缘扳手槽；镜头板 / 法兰分别编辑导出，未做配对装配设计。
- 3D 旋转缩放、视图切换、二维孔位图、坐标输入，撤销 / 重做、本地保存、JSON 导入导出。
- 首次默认中文，可切换 English，参数不丢失；保护区、当地厚度、孔交叠、实体及 STL 闭合检查，过期模型禁止导出。
- 亮色 / 暗色主题（首次跟随系统，手动选择后记忆），不影响 CAD；顶栏 Report 打开本项目 GitHub Issues，不自动上传设计。

下载为 ZIP：含 STEP 或 STL、项目 JSON、GPL v3 文本、来源说明；镜头板另含原始 STEP 模板。STEP 保留实体几何而非应用参数树，继续编辑请保留 JSON。模型与参数不上传服务器；尚无离线 PWA。

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

已提供 CI、main 分支推送自动发布及手动 Pages 工作流。本次正在将已有公开仓库 RayforLoy/LensboardGenerator 设置为 GitHub Actions 静态发布。构建使用 Pages 的 base_path；最终公开网址与访问验证见实施状态。[GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

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

原创代码、六个用户自绘 STEP 及衍生模型采用 [GPL-3.0-only](LICENSE)，第三方依赖保留原许可。构建附 GPL 文本、[第三方通知](THIRD_PARTY_NOTICES.md) 和依赖许可正文；公开分发需同时提供可修改源码、锁文件、构建说明及 WASM 对应源构建来源，见 [许可范围](docs/LICENSING.md)。

## English

Experimental v0.1.0 static web app. All CAD runs locally in a Web Worker with Replicad/OpenCascade WASM. Features include six user-authored STEP lensboards, a procedural flange, sourced shutter-opening presets, XY offsets, optional **+0.5 mm diameter** printing allowance (off by default), modeled metric internal threads or an explicitly labeled tap-drill mode, holes/recesses/patterns and local thinning. The initial language is Simplified Chinese; English and project preferences persist locally.

Real solid STEP and checked binary STL download in a ZIP with JSON, GPL text and provenance; lensboard exports include the original template. Use Node.js 24 / pnpm 11.19.0: `pnpm install --frozen-lockfile`, then `pnpm dev` at http://127.0.0.1:5273/. Run pnpm build, pnpm test, pnpm test:cad and pnpm test:e2e. Browser tests default to installed Edge; TEST_BROWSER and TEST_URL override. requirements-dev.txt contains optional independent verification tools, never a backend.

Manual Pages deployment is included, but remote deployment has not been performed. VITE_BASE_PATH supports repository subpaths; keep the same value for build and preview. Only STEP/STP assets from steps/ are bundled; scadtest/ and other source CAD formats remain ignored.

Read the [implementation status](docs/IMPLEMENTATION_STATUS.md) for evidence and unfinished PRD items. No physical fit, light-tightness, load capacity or standardized thread tolerance class is certified. Original code, initial templates and derivative models use [GPL-3.0-only](LICENSE); third-party terms remain separate.
