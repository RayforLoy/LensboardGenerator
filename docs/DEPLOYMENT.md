# 公开部署记录

## v0.3.1 — 2026-09-26

按用户授权将 Rollei X-ACT2 第十三模板、v0.3.0 自定义镜头板与凹凸板叠加功能作为 v0.3.1 推送 main。应用/参数版本为0.3.1/schema5，十三个用户自绘STEP保持原字节；代码提交：[7f19cd9](https://github.com/RayforLoy/LensboardGenerator/commit/7f19cd9658f6adde60e2c3c1acf4ebeb59e015ba)。

- [Pages构建/部署](https://github.com/RayforLoy/LensboardGenerator/actions/runs/36156452537)成功，用时42秒；公开站点实际JS包含0.3.1、`rollei-xact2-blank`与Rollei X-ACT2，非仅根据日志推断部署。
- 真实公开HTTPS专项Edge/Playwright通过：十三模板逐一完成Worker/WASM建模，Rollei模型就绪，STL ZIP下载、非法JSON保护与390px窄屏检查成功。
- [Linux Checks](https://github.com/RayforLoy/LensboardGenerator/actions/runs/36156452534)成功，用时14分26秒：30项单元、严格TypeScript/生产构建、120组CAD STEP/STL生成及native OCCT/trimesh独立重读、10项Chromium浏览器检查全部通过。
- 本地源与dist均为十三STEP且SHA-256集合一致；构建无SLDPRT、STL、SCAD、scadtest或本地测试产物。Rollei仍为experimental，未做实机、漏光、承重或制造认证。
- 后续只补充本记录的提交使用[skip ci]；已部署网页与对应源码仍指向实际构建的7f19cd9。

## v0.2.4 — 2026-09-15

按用户授权将已验证倒角及0.2.0–0.2.3本地增量合并提交并推送main；应用/参数版本为0.2.4/schema4，十个自绘STEP原字节保留。代码提交：[f048f7b](https://github.com/RayforLoy/LensboardGenerator/commit/f048f7b612f33af6e65768459007186612f0951c)。未改仓库可见性或创建其他仓库；保留已有Actions Pages、HTTPS和主页配置。

- [Pages构建/部署](https://github.com/RayforLoy/LensboardGenerator/actions/runs/34878080345)已成功，构建设置/LensboardGenerator/子路径和对应源码SHA。
- 本地26单元测试、严格生产构建、九项Edge浏览器与99组CAD及独立native OCCT/trimesh全部通过；源/构建/暂存十STEP SHA一致，无私有scadtest、非STEP资产或Downloads参数。
- 真实公开HTTPS九项Edge/Playwright全部通过（约2.1分钟）：自动1.2P/手动/关闭/撤销/重载/双语/旧schema3迁移、倒角两格式ZIP下载，ALPA端面孔与真实M65、十模板逐一加载、凸凹/翻转/世界轴/主题/Report/打印优化/非法项目和过期导出回归。首页与实际JS资产HTTP200，资产版本0.2.4及对应源码SHA=f048f7b匹配。未用localhost替代远端访问。
- [Linux Checks](https://github.com/RayforLoy/LensboardGenerator/actions/runs/34878080248)全部成功：26单元测试、严格构建、99组CAD导出/独立native STEP与STL重读及九项Chromium浏览器检查。此前只待远端确认的结果现已完成；非实物认证。
- 后续仅更新验证文档的提交使用[skip ci]，不重建未改变的网页。发布资产的对应源码仍为实际构建的f048f7b，不改写来源为文档提交。

以下v0.1.0是首次发布的历史记录。实机、打印试配、承重、遮光、Firefox/Safari和标准公差仍未验证。

## v0.1.0 — 首次公开部署

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
