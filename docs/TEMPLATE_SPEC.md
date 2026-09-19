# 模板与参数规范草案

状态：v0.3.0 十二模板和 schemaVersion=5 已完成本地自动验证，尚未发布；公开部署仍为 v0.2.4。下文为目标规范，元数据与验证状态见 [实施状态](IMPLEMENTATION_STATUS.md)。

## 1. 模板来源

支持两种 P0 来源：原创参数化 B-rep；明确允许修改 / 再分发的原生实体模板。优先从可靠尺寸重建旧镜头板，旧 STL 只供私有参考。P1 用户导入与内置模板登记是不同流程。

初始产品模板已确定为 [steps 中 6 个用户自绘 STEP](TEMPLATE_CATALOG.md)，以 GPL-3.0-only 登记；不需要等待 STL 重建。steps 只允许 STEP / STP（大小写不敏感），其他文件保持忽略；构建同样采用扩展名及登记清单白名单。元数据、许可说明和缩略图放在其他批准目录，不在 steps 新增非 STEP 文件。

每个模板必须记录：

| 字段 | 约定 |
| --- | --- |
| id / version | 稳定语言无关 ID；几何或基准改变必须增加版本 |
| displayName | 中文 / 英文名称，可共享品牌标识 |
| category | lensboard / flange / fitCoupon |
| sourceType | procedural / step；mesh 仅在后续已验证路线启用 |
| source / author / license | 来源说明、作者、可再分发许可及原始许可文件；原创记录由谁创建 |
| asset / checksum | 内置同源白名单资源及校验信息，禁止用户指定任意 URL |
| units | 明确 mm；原文件单位转换必须有记录 |
| datum | 原点、轴、前 / 后面、标准化导入变换 |
| nominalDimensions | 外形、厚度、关键安装尺寸；不能只保存包围盒 |
| editableRegions / protectedRegions | 可加工区、卡口 / 止口 / 遮光 / 筋位保护；使用实体或可计算的区域定义 |
| defaults / bounds | 各参数默认及合理范围；0 表示关闭的字段必须说明 |
| verification | experimental / measured / fitTested；日期、实测对象、记录路径、误差和已知限制 |

`experimental` 可用于技术预览，但必须明显告知未经实机确认。只有有装机记录的模板才可使用 `fitTested`，且记录对象需具体到型号 / 样机，不能推断所有同品牌相机兼容。

## 2. 坐标规范

v0.2.3 原模板 editableRadius 只用于实际原板材料上的孔；新端面用生成内腔轮廓与孔余量。当地上下表面需均位于新端面完整 Z 区间，孔心需在其 XY 内腔内；减薄后仍按这个区间识别，浅凹不只根据 Z 相等误豁免原板。该上下文由几何计算，不写入 schema 3、不修改源模板保护半径 / SHA。

v0.2.2 基座尺寸只核对主板（不含附件）的 XY 包围范围；按光轴原点两侧核对而非仅总长宽或面积，非对称模板不重居中，无额外 1.5 mm 余量。圆角边界、筋位、凹槽和整区厚度不作为基座阻断条件。尺寸检查是用户选择的简化规则，不代表安装 / 遮光结构安全；孔的旧规则、附件三维干涉和有效实体限制独立保留。

安装中心 X=0、Y=0，后侧基准 Z=0，前侧 +Z。模板原始 STEP 坐标须经显式变换标准化。前视图 +X 右、+Y 上，正角度逆时针；背视图视觉镜像，参数仍是同一坐标系。

阵列第 i 个孔：`x = cx + (PCD/2) × cos(θ0 + i × 360/n)`，`y = cy + (PCD/2) × sin(θ0 + i × 360/n)`，其中角度按 degree 转换后计算。孔数为 0 时关闭阵列，不计算除以零；启用时为正整数。

当地板面 / 厚度由模板几何确定。非均匀厚度中，盲孔深度与法兰座剩余厚度必须针对实际加工位置和面，不直接用整个实体最大 Z。

初始文件的文本 mm 声明不是几何检验结果，原坐标轴不一定是 Z 向厚度；必须登记实际变换。具有多个实体声明的模板识别装配 / 连通关系，并明确加工对象和输出对象；不得无说明丢弃非主板体。

## 3. 项目 JSON

schema 5 新增 `boardSource` 和完整 `customBoard` 对象。`boardSource=template` 时按登记 templateId/version 加载 STEP；`custom` 时 templateId 仅作为切回模板模式时的编辑状态，不参与实体、来源包或几何描述。customBoard 主体保存 width/height/thickness/radius；outerLightTrap 保存 enabled/width/height；innerLightTrap 保存 enabled/width/height/radius/heightMm，其中 heightMm 是凸出高度。主体及内圈半径范围为 0..min(width,height)/2；外圈内轮廓的长宽为主体各减 2×width，圆角为 max(0,主体R−width)。遮光高度向背面 −Z 延伸且不表示切槽深度。schema 4 只有通过原完整结构检查后才迁移为 template 和默认关闭的 customBoard；旧 1/2/3 继续逐级严格迁移。

自定义板的参数来源说明取代源 STEP 清单；ZIP 不附带闲置 templateId 对应资产。自定义与模板模式都必须保存相同单位、孔和制造参数，切换来源不把语言或显示偏好写入 JSON。自定义板可启用 relief；解析及建模按 relief 外轮廓≤内圈外轮廓≤外圈内轮廓≤板外轮廓逐级检查，关闭的层跳过、等轮廓允许。

schema 4 在 central.thread 中保存 chamfer={enabled:boolean,mode:pitch|custom,sizeMm:number}；新设计默认 enabled=true / pitch / 1.2 mm，实际自动尺寸=1.2P，关闭返回0但保留手动值。固定45°，不保存可变角度；真实模式从基本小径加径向间隙、底孔模式从确认底孔起倒角。保护半径包含入口最大外径，但底孔圆柱仍使用原小径/底孔值。length是含倒角段的加工长度，完整牙型约length−C，不能自动延伸超厚。完整 schema 1/2/3 按各自旧结构严格检查后逐级迁移到4，并添加 enabled=false 的倒角；拒绝新版缺失倒角、旧版伪造倒角、额外字段、未知模式。旧版本叙述以下保留为历史。

JSON 只保存语言无关的可验证数据；schemaVersion 与模板 version 不互相替代。

- 文件必须包含单位、模板 ID / 版本、零件列表、加工特征、制造补偿、螺纹导出模式和网格设置。
- 模板几何更新后旧项目不得静默加载新模板；找不到版本时要求明确迁移或重新选模板。
- 如果以后支持上传模板，JSON 保存校验标识和基准设置；单独 JSON 不能恢复缺失的原模型。需要用户重新选择匹配文件，或另设计包含资产的项目包。
- feature ID 稳定且唯一；数组顺序作为加工顺序记录，镜头板和法兰引用共享孔阵列参数时必须有明确关联，不复制后失去同步却仍显示“配对”。
- 名义尺寸、补偿、最终尺寸分开记录。圆孔 diameterAllowance 是直径增量，thread radialClearance 是径向量，禁止用同名 tolerance 混合含义。
- 保存右旋 / 左旋、公称径、螺距、有效长度、入口面、牙型和真实 / 底孔模式；不把螺纹说明仅留在 UI 文本中。
- 普通通孔保留参考 presetId 和实际 diameterMm，M 螺纹保存独立 majorDiameterMm / pitchMm；预设孔径不是螺纹外径。切换模式恢复独立参数，未确认 D/P 不生成螺纹。
- 记录项目许可、模板许可 / 来源引用与参数重建信息；初始模板衍生设计采用 GPL-3.0-only，第三方 / 后续用户资产许可不自动改写，见 [许可范围](LICENSING.md)。

导入前完整校验，成功后一次性替换当前项目；失败不部分应用参数。迁移必须有旧 / 新样例和回归测试。

v0.2.0 的 relief 字段存储 enabled、shape、width / height / radius / diameter、wall、faceThickness、angle、spacing；shape 为 roundedRectangle / circle，中心固定模板原点。wall 是法向向内厚度，faceThickness 是 Z 厚度，spacing 从原正面到新正面（有符号），定义见 PRD。schema 1 必须先符合完整旧结构（拒绝多余字段），再添加默认关闭 relief 并升级生成器版本；不丢旧孔、补偿、法兰或网格参数。主题 / 语言 / 边线均不进入该结构。

## 4. 模板贡献验收

v0.2.1 orientation={frontBack:boolean,upDown:boolean} 是设计级方向，不修改模板身份 / SHA-256。标准化后以主板 Z 范围中点绕 Y 180°翻面，再绕 Z 180°上下翻转；附件高度不影响旋转基准，非对称模板 XY 不自动按包围盒居中。孔位和新特征用最终世界坐标加工。schema 1 按完整无 relief / orientation 的旧结构验证，添加关闭 relief；schema 2 按完整有 relief、无 orientation 的结构验证；二者最终添加 false / false 方向升级为 schema 3。缺字段、多字段、非布尔方向及未知版本拒绝；方向属于几何 revision、撤销与 JSON，坐标轴显示不是几何参数。

1. 提交来源、许可、尺寸 / 基准说明和缩略图，不提交未经许可的厂家模型或本地参考目录。
2. 在无加工特征情况下检查模板实体有效性、尺寸、前后基准和保护区。
3. 在推荐孔径与接近边界孔位测试，确认不会遗漏背面筋位 / 卡口结构。
4. STEP 与 STL 独立重读，记录包围盒、体积和关键安装尺寸。
5. 对宣称兼容的模板补充实物测量、装机和遮光检查；暂未实测就保留 experimental。
6. 登记版本、已知限制、日期，并补充第三方通知。

当前本地 Sinar STL 的来源和再分发许可未确认，因此不自动复制进公共模板目录。

此限制不适用于已由用户明确授权的 steps 自绘 STEP；它们可作为初始源资产，几何与实机验证仍必须补齐。
