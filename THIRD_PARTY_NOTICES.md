# Third-party notices / 第三方通知

v0.1.0 已安装依赖，实际版本由 pnpm-lock.yaml 锁定。项目原创代码 / 自绘模板为 GPL-3.0-only，不改写第三方许可。生产构建的 licenses/ 目录附运行依赖的完整许可和 runtime-packages.json（不含本地绝对路径）。

| 组件 | 实际版本 | 许可 | 源码 / 来源 |
| --- | --- | --- | --- |
| React / React DOM | 19.3.0 | MIT | https://github.com/facebook/react |
| scheduler | 0.28.0 | MIT | React 仓库 |
| Three.js | 0.180.0 | MIT | https://github.com/mrdoob/three.js |
| Replicad | 1.1.0 | MIT | https://github.com/sgenoud/replicad |
| replicad-opencascadejs（JS / WASM） | 1.1.0 | LGPL-2.1-only | 同一 Replicad 仓库 packages/replicad-opencascadejs |
| fflate | 0.8.3 | MIT | https://github.com/101arrowz/fflate |
| flatbush / flatqueue | 4.6.2 / 3.1.0 | ISC | https://github.com/mourner/flatbush / https://github.com/mourner/flatqueue |
| opentype.js | 1.3.4 | MIT | https://github.com/opentypejs/opentype.js |
| tiny-inflate | 1.0.3 | MIT | https://github.com/devongovett/tiny-inflate |
| string.prototype.codepointat | 0.2.1 | MIT | https://github.com/mathiasbynens/String.prototype.codePointAt |
| @types/opentype.js（类型依赖） | 1.3.10 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |

Replicad 传递字体解析依赖并不表示本项目引入了外部字体或刻字功能；目前使用系统字体，无照片、品牌图形或远程字体。

## WASM corresponding source / 对应源构建

已安装 replicad-opencascadejs 包记录 gitHead 为 e4b05f67dc4e2393a876ce8c5064a9c93db05bf1。对应 [源码及构建配置目录](https://github.com/sgenoud/replicad/tree/e4b05f67dc4e2393a876ce8c5064a9c93db05bf1/packages/replicad-opencascadejs)；此提交的 package.json 与安装包一致。单线程脚本使用 ytt 配置及 ghcr.io/taucad/opencascade.js:canary-ebd263f1-single-threaded 构建镜像。没有修改 JS / WASM 内核，发布时保留 LGPL 正文及对应源 / 构建来源，不将内核标记为 MIT。正式分发方应确认这些源可取得，并提供适用的对应源交付方式；本文件不是只附通知即可完成全部许可义务的承诺。

浏览器 Worker 单独加载 WASM 资产，项目源码与锁文件允许更换或重建兼容内核。应用可修改源码需与公开站点提供对应版本；Pages 工作流记录构建提交作为源码入口。

## Assets / 模板与私有参考

六个 steps STEP 由用户自绘并授权 GPL-3.0-only，原字节与 SHA-256 保留；衍生输出附参数、原始模板、GPL 文本与来源。是否完整满足首选修改形式仍按 [许可范围](docs/LICENSING.md) 复核，不自动发布被排除的 SLDPRT。

scadtest 全部私有忽略，无代码 / STL / 字体复制进网页；steps 中非 STEP 文件不读取模型内容、不提交、不打包。快门预设只整理事实尺寸与来源，不复制网页、照片或图纸。品牌名称仅识别目标设备，不表示厂家认证。

Optional native OCCT/trimesh packages in requirements-dev.txt are offline validation tools, not bundled browser components. Build/test dependencies remain under their own licenses; this file and licenses/ describe distributed runtime components, not a relabeling of all dependencies.
