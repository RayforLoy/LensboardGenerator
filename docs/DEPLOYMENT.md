# 首次公开部署记录

2026-09-14（UTC），实验性 v0.1.0。公开站点：[Lensboard Studio](https://rayforloy.github.io/LensboardGenerator/)；[仓库](https://github.com/RayforLoy/LensboardGenerator)；[Report / Issues](https://github.com/RayforLoy/LensboardGenerator/issues)。

## 配置与版本

- 保留现有公开仓库及 main 分支，不改可见性，不创建其他仓库。Issues 已开启。
- Pages 设为 GitHub Actions（build_type=workflow），HTTPS 开启，仓库 homepage 指向站点。
- main 推送自动部署，并保留 workflow_dispatch。构建 base_path 由 configure-pages 提供；源码入口记录实际构建 SHA。
- 最新发布代码 / 工具提交：09acae6c2fb1aabb396181d9e69b83a2faec70f8；[成功部署工作流](https://github.com/RayforLoy/LensboardGenerator/actions/runs/34865583890)。
- 源码追踪只含六个 STEP，不含 scadtest、SLDPRT、生成 STL、WASM 二进制或本地测试输出。WASM 从锁定依赖构建并保留许可通知。STEP 原字节通过 .gitattributes 禁止换行转换；Git 暂存字节与原文件 SHA-256 全部相同。

## 实际访问与功能验证

公开 HTTPS 首页返回 200；GPL、第三方通知、运行依赖许可清单返回 200；Report 目标 Issues 返回 200。不是仅根据部署日志认定可访问。

四项 Edge / Playwright 用例在真实站点全部通过（首个发布提交 2bd07cc）：

1. 跟随系统暗色、主题切换 / 刷新记忆、中英文按钮说明、主题 / 语言不增加 CAD build 请求、不改参数；Report 目标与安全新标签页属性、暗色警告和 390 px 无横向溢出。
2. 默认中文、真实模型初始化、34.6+0.5=35.1 / 65+0.5=65.5 mm、英文记忆和实际 STEP ZIP。
3. 越界拒绝 / 禁止过期导出、撤销恢复及确认后生成真实 M 内螺纹。
4. 六模板逐一初始化、真实 STL ZIP、无效 JSON 不覆盖设计及手机布局。

实际从站点下载的 STEP ZIP：原始模板字节与本地源完全一致，GPL / JSON / 构建提交源码入口存在；native OCCT 重读为有效实体，开孔后体积 51675.52342743818 mm³，与 65.5 mm 孔径的理论切除体积一致。上述两个提交的网页功能相同，09acae6 仅补充离线验证工具依赖；最新部署另经浏览器确认源码入口匹配 09acae6、模型初始化成功，Worker / WASM / STEP 资源均返回 200。

生成截图、ZIP 和独立检查临时文件位于被忽略的 test-results/、tmp/；不提交生成产物，命令见 README。

## CI 过程与限制

第一次构建因测试文件漏纳入 Git 而失败，已补齐三份测试文件后通过 Pages 构建。Linux CI 的独立检查随后报告 no graph engines available：干净环境缺少 trimesh 分件所需的可选依赖。已添加 networkx=3.4.2，显式选择 networkx engine，本地再次重验 20 个 STEP / STL 全部通过；不绕过网格检查。

最终 [Linux Checks](https://github.com/RayforLoy/LensboardGenerator/actions/runs/34865583976) 全部成功：12 项单元测试、严格 TypeScript / 生产构建、20 组 CAD 导出及独立 STEP / STL 重读、四项 Chromium 浏览器检查。公开站点四项 Edge 功能验证亦独立通过。后续仅补充部署文档的提交使用 [skip ci]，不重新构建已验证且未改变的网页代码。

未做实机装配、打印试配、承重、遮光或标准螺纹公差等级认证；Firefox / Safari 仍未验证。首次 WASM 下载约 23 MB，弱网络需等待初始化；无离线 PWA。对应源与第三方分发责任仍按许可文档复核，不将部署成功当作制造或完整合规认证。
