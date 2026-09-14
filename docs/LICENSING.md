# GPL v3 许可范围与输出策略

用户于 2026-09-14 明确选择 GPL 第 3 版用于网页、自己绘制的镜头板模板与生成文件。项目按 **GPL-3.0-only** 落实，即仅第 3 版；未擅自扩展为“第 3 版或更新版本”。正式全文见 [LICENSE](../LICENSE)，从 [GNU 官方文本](https://www.gnu.org/licenses/gpl-3.0.txt) 获取，没有修改许可条款。

本文说明项目约定，不替代正式许可或发布前的合规审查。

## 1. 范围

- 本项目原创网页代码、项目自有文档及原创设计内容采用 GPL-3.0-only；第三方许可正文保持其自身的复制许可。
- 用户明确授权的 steps 中 6 个自绘 STEP 采用 GPL-3.0-only；后续登记模板须明确记录作者、来源及许可。
- 基于这些 GPL 模板修改 / 生成的可版权 STEP / STL 模型保留模板许可，并附来源与可重建参数；项目原创法兰 / 试配设计同样按该许可提供。
- 未由维护者拥有权利的第三方依赖、字体、图片和用户未来上传资产不自动换许可。steps 中的非 STEP 文件及 scadtest 始终按要求排除，不因这个许可声明变成公开资产。
- 品牌名称与事实尺寸引用不是厂家授权，不复制来源图纸、照片、网页或 ISO 标准正文。

## 2. 不以软件许可推断所有输出

[GNU 官方 FAQ](https://www.gnu.org/licenses/gpl-faq.en.html#WhatCaseIsOutputGPL) 说明，软件采用 GPL 并不一般性地让所有输出自动受 GPL 约束；输出包含受版权保护的既有内容时，相关内容的许可才会影响输出。

本项目输出策略的依据是用户对原创设计的明确许可，以及已有 GPL 模板在衍生模型中的延续，不是“任意文件只要经过 GPL 软件就自动 GPL”。如果后续允许用户上传其他资产，必须记录其真实许可 / 权利，不能靠勾选框替用户取得再许可权利。纯参数事实或不受版权保护的部分不能靠软件声明凭空产生版权。

## 3. 导出交付

v0.1.0 每次几何下载提供 ZIP：

- 几何文件 `.step` / `.stl`，模式标记和版本准确。
- 同名项目 JSON：完整几何参数、模板 ID / 版本 / 校验、模式和制造补偿，包含 `license: GPL-3.0-only` 与来源引用。
- 同名许可 / 来源说明：模板作者、来源、生成器版本、许可标识、对应重建资源引用及无担保提示。
- GPL v3 全文随 ZIP 附带，网页另有许可入口；镜头板 ZIP 附原始 STEP。首版不自动替用户发布到 GitHub。

完整重建依赖对应模板源、项目参数和兼容版本的生成器源码，不能仅留下 STL 三角网格就宣称可重新参数化。发布网页应提供对应源码与许可证入口，并保留第三方通知。

“对应源文件”需要按作品的首选修改形式处理。用户要求排除 SLDPRT 等非 STEP 文件，项目不会擅自提交它们；如果 STEP 并非某模板的首选修改形式，正式分发前应由维护者补充适当的设计源交付方式或确认修改形式，不能在文档中保证 STEP 一律等于完整对应源。此项影响正式合规发布，不阻止当前本地导入验证。

## 4. 第三方依赖

应用采用 GPL 不抹去 MIT / LGPL / OCCT 例外等原有条款。锁定实际 JS / WASM 版本后逐项检查兼容性、通知和源文件义务，发布许可证文本与必要资源；不得将 Replicad 的 MIT 标签当作整个 CAD 内核许可。

当前已安装并锁定依赖，构建附完整运行依赖通知；版本及 WASM 来源见 [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md)。尚未远端分发，不声称只添加根 LICENSE 就已完成所有发布义务。

## English summary

Original project content, the six user-authored initial STEP templates and their derivative designs use GPL-3.0-only. Third-party components and future user-uploaded assets retain their actual terms. The generator's license alone does not relicense every output.

ZIP downloads include geometry, reconstruction parameters, provenance and GPL text, plus the source STEP for lensboards. Formal distribution must address the preferred form for modification; excluded native files are not silently published, and STEP is not universally asserted to be complete corresponding source.
