# 贡献说明 / Contributing

目前已有实验性 v0.1.0 开发环境；启动与测试见 README，验证与待办见 docs/IMPLEMENTATION_STATUS.md。请先阅读 [PRD](PRD.md)、[AGENTS.md](AGENTS.md)、[架构](docs/ARCHITECTURE.md) 和 [测试计划](docs/TEST_PLAN.md)。

提出功能时说明用户场景、范围、几何约束和验收方法；新功能先更新 PRD，区分首版和后续。不要假设模型尺寸或厂家规格已获验证。

贡献模板须遵守 [模板规范](docs/TEMPLATE_SPEC.md)，提供来源与允许再分发的许可。不要提交 `scadtest/`、私人模型、未经授权字体 / 商标图形，或把本地参考文件改名后发布。

初始模板使用 steps 中用户自绘的 6 个 STEP；目录内只接纳 STEP / STP，其他文件不提交、不复制到构建。初始模板、项目原创代码及衍生模型以 GPL-3.0-only 发布，贡献需明确有权以兼容许可提供，保留原作者 / 来源。不要重许可第三方依赖。

后续实现采用小范围改动，保留用户更改；几何更新附参数回归与独立输出重读证据，UI 更新附双语和相关交互检查。提交前运行 pnpm test、pnpm build、pnpm test:cad 与相关浏览器检查；独立 CAD 检查命令见 README。

Original application content and initial user-authored STEP templates use GPL-3.0-only; derivative model exports carry their licensing/provenance. Third-party dependencies retain their terms. Contributions should document provenance, geometric tests and bilingual UI impact; do not redistribute private reference assets or non-STEP files in steps.
