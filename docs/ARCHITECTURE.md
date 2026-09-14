# 技术架构与决策草案

状态：v0.1.0 已实施核心静态 CAD 路线；本文件保留完整目标架构，未完成项及验证见 [实施状态](IMPLEMENTATION_STATUS.md)。需求以 [PRD](../PRD.md) 为准，不隐藏降级。

## 1. 核心决策

| 决策 | 原因 | 尚待验证 |
| --- | --- | --- |
| 纯静态前端、浏览器本地计算 | 适合 GitHub Pages，不需要 CAD 后端或账户 | 实际 Pages 子路径资源初始化 |
| TypeScript + React + Vite | 明确参数类型、组件化编辑、静态构建 | 实现时确认兼容版本并锁定 |
| Three.js 仅用于显示 | 预览网格不充当实体 CAD 内核 | 网格传输、选中特征映射、尺寸叠加 |
| Replicad + OpenCascade.js WASM | B-rep 建模、官方 STEP / STL 导出入口 | 真实螺纹扫掠 / 布尔、实体有效性、输出重读 |
| 单个普通 Web Worker | 不阻塞表单，不要求 WASM 共享内存多线程 | 内存释放、取消和 Worker 重建 |
| 参数 JSON 是设计来源 | 可重载、迁移、语言独立 | schema 与模板版本兼容规则 |

暂不引入 Python 后端、云数据库、用户脚本解释器或第二套网格内核。P1 旧 STL 编辑若需要另一内核，必须先独立评估并补充决策，不能把未经验证的导入功能挂到 UI。

官方依据：[Pages 静态托管](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[Replicad STEP / STL API](https://replicad.xyz/docs/api/classes/Shape/)、[应用集成及 Worker 建议](https://github.com/sgenoud/replicad/blob/main/packages/replicad-docs/docs/use-as-a-library.md)。这些接口支持路线选择，不构成项目已经成功运行的证明。

## 2. 数据与边界

UI 编辑暂存值 → 语言无关的参数归一化 → schema / 制造校验 → Worker 实体构建 → 有效性检查 → 预览网格 / 导出。

- `domain`：纯参数类型、公式和校验，不能导入 React、Three.js 或 WASM。
- `geometry`：将模板和特征转为实体；所有 CAD 内核调用在 Worker 侧；错误关联到特征 ID。
- `viewer`：接收顶点、索引、边和包围盒；不持有 WASM 指针。精确点选用已定义的板面投影，不以粗网格交点替代精确输入。
- `project`：schemaVersion、generatorVersion、templateId、templateVersion、units、features、manufacturing、exportSettings；模板元数据中的来源 / 许可引用随参数说明导出。
- `preferences`：语言、视图等本地偏好；不影响几何 hash。项目 JSON 不把语言作为孔类型或枚举值。

特征采用明确的判别类型，例如 `throughHole`、`blindHole`、`countersink`、`counterbore`、`threadedHole`、`circularPattern`、`flangeSeat`。每种类型保存自己的必要字段，避免所有字段都可选的万能对象。稳定 ID 用于选择、撤销和错误定位。

导入 JSON 只解析数据，限制文件大小、数组长度及数值范围；拒绝脚本、函数表达式、任意资源 URL。内置模板 ID 只能查已注册清单，不能变为服务器路径拼接。

## 3. 异步协议与失败状态

Worker 协议计划包含 `initialize`、`build`、`export`、`dispose` 请求；每个请求携带 requestId，建模请求另有 designRevision / 几何配置标识。

1. 参数变化后立即标记当前预览“过期”，输入短暂防抖后提交完整参数快照。
2. Worker 顺序执行；主线程合并尚未执行的快速编辑，只保留最新一次。
3. 返回结果若 revision 不匹配当前设计则丢弃；旧 mesh、旧下载和旧错误都不能覆盖新状态。
4. 导出绑定当前已验证快照与模式。当前构建未完成、参数错误或对象无效时禁用导出。
5. 内核同步调用不保证可被协作取消；用户取消长任务或达到超时后终止 Worker，并重新初始化。参数保留，实体引用全部失效。
6. 导出失败分别报告内核未就绪、特征布尔失败、实体无效、STEP 写出失败、网格化失败、内存 / 超时。只有有效实体仍可网格化时才提供 STL 替代选项。

不能因 Worker 已收到消息而显示“完成”。进度只报告真实阶段；不伪造连续百分比。

## 4. 模板与建模

原生参数化模板或授权 STEP 导入形成有效 B-rep。模板自身的安装 / 遮光轮廓先验证，再按顺序切除特征。每个切削工具延伸量使用命名的小量 / 模型尺度规则，避免硬编码旧脚本中 `h=20` 而导致厚板加工不全。

初始模板明确使用 [steps 的 6 个自绘 STEP](TEMPLATE_CATALOG.md)。文本检查均声明 AP203 / mm，内核导入仍需验证有效性、实际单位、坐标轴及板面。Horseman 完整版存在两个实体声明，需要识别与保留正确的多体关系，不自动丢弃较小体。构建按登记清单只复制 STEP / STP 到公共资产，保留原始源文件，不读取非 STEP 原生 CAD 文件。

普通通孔与 M 内螺纹使用不同参数集合，镜头板默认普通 #0 通孔。快门预设的数据与来源独立于内核；切换 M 模式时确认公称外径 D / 螺距 P，内核不得使用预设的通孔 diameter 代替 thread majorDiameter。M1 检查 60°基本牙型、截形、有效长度、方向和实际大小径，不提前宣称标准等级合格。

布尔运算失败保留最后一个成功步骤用于诊断，但不可把它当作当前最终产物导出。共面、切线、零厚度等边界需要专门样例。多个零件在领域模型中独立，组合视图偏移仅在 viewer 层。

真实螺纹验证先覆盖大直径细牙内螺纹（参考 M65 × 1 的手动演示参数）、小安装孔、左右旋和入口端面。扫掠牙型只是候选算法，不能提前声称已实现准确 ISO 公差。限制圈数及特征数防止资源耗尽，导出不能因此截短有效长度。

STL 导入不在 P0 主路线。后续如支持，只允许网格编辑与 STL 下载，除非有明确的解析重建能力和独立质量验收。不得用改扩展名或逐三角面 STEP 冒充精确转换。

## 5. 部署与依赖

- Pages 项目 URL 通常带仓库名子路径，使用构建工具 base / 资源 URL 机制；Worker 入口及 WASM locateFile 同样要受该机制控制。
- WASM、模板与字体（若后续加入）尽量同源固定版本，不依赖运行时 CDN 解析最新版。
- 先用无需 SharedArrayBuffer 的单线程 WASM 构建。[多线程 OpenCascade.js 对跨源隔离有额外要求](https://ocjs.org/docs/advanced/multi-threading/intro)，首版不以修改 Pages 响应头作为前提。
- GitHub Actions 工作流只需构建与静态发布权限；用户于本轮授权推送至已有 RayforLoy/LensboardGenerator 并开启 Pages，不创建其他仓库。主题偏好独立于模型；Report 仅外链至该仓库 Issues。
- 发布产物使用资产白名单：不把整个仓库复制进 dist，不遍历读取 `scadtest`。源码忽略和打包排除是两件独立的检查。
- steps 中非 STEP / STP 文件同样禁止复制，扩展名检查大小写不敏感；模板元数据置于 docs / src，而非忽略其他文件的 steps 目录。
- 项目原创内容 / 初始模板采用 GPL-3.0-only；提供对应源码、模板、重建 JSON 和许可入口，第三方通知独立保留，详见 [许可范围](LICENSING.md)。导出附许可 / 来源说明，不给任意外来资产自动换许可。
- 兼容版本验证后提交 `package.json` 和唯一包管理器锁文件。CI 使用确定性安装，不在文档阶段写未验证的版本号。
- 普通网页访问不主动上传模型、参数或分析数据；静态托管平台自身日志不等于应用“零数据收集”。

## 6. M1 通过 / 失败条件

通过需有：6 个用户 STEP 模板导入与基准检查（包含 Horseman 多体处理）；纯浏览器普通通孔与法兰；偏心孔 / 沉头尺寸正确；M 型真实内螺纹及基本牙型存在且方向正确；STEP 独立重读为有效实体；STL 流形；Pages 子路径可初始化 Worker / WASM；记录时间和资源。

失败需输出最小复现、所用版本、浏览器、参数、失败阶段和日志。可选方向：修正兼容版本 / B-rep 算法、缩小已确认的首版范围、另评估网格路线。增加服务器或降为仅 STL 属于产品决策，须明确告知并确认，不自动改变“Pages 本地生成 STEP”目标。
