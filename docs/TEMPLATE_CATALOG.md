# 初始 STEP 模板目录

登记日期：2026-09-14 · 清单版本：0.1 · 来源：用户自己绘制并提供的 `steps/` 文件。

用户已确认这些镜头板模板按 [GPL 第 3 版](../LICENSE)（GPL-3.0-only）开源。初始模板使用原始 STEP，不从 scadtest 重新复制 STL。所有原 STEP 保持字节不变；v0.1.0 已进行 WASM CAD 导入和导出后的独立 native OCCT 检查，尚未实物验收，见 [实施状态](IMPLEMENTATION_STATUS.md)。

## 模板清单

| 建议稳定 ID | 显示名称 | 文件 | 字节数 | 文本中的 MANIFOLD_SOLID_BREP 数量 |
| --- | --- | --- | --- | --- |
| `graflex-pacemaker45-simplified-blank` | Graflex Pacemaker 4×5 简化空白板 | [Graflex_pacemaker45_Lensboard_simplified_blank.STEP](../steps/Graflex_pacemaker45_Lensboard_simplified_blank.STEP) | 86785 | 1 |
| `horseman-blank` | Horseman 空白板 | [Horseman_Lensboard_blank.STEP](../steps/Horseman_Lensboard_blank.STEP) | 308050 | 2 |
| `horseman-simplified-blank` | Horseman 简化空白板 | [Horseman_Lensboard_simplified_blank.STEP](../steps/Horseman_Lensboard_simplified_blank.STEP) | 194295 | 1 |
| `linhof-blank` | Linhof 空白板 | [Linhof_Lensboard_blank.STEP](../steps/Linhof_Lensboard_blank.STEP) | 98548 | 1 |
| `sinar-blank` | Sinar 空白板 | [Sinar_Lensboard_blank.STEP](../steps/Sinar_Lensboard_blank.STEP) | 327988 | 1 |
| `sinar-simplified-blank` | Sinar 简化空白板 | [Sinar_Lensboard_simplified_blank.STEP](../steps/Sinar_Lensboard_simplified_blank.STEP) | 173128 | 1 |

显示名称仅依据用户文件名，具体相机兼容范围尚待装机记录。原有完整 / 简化版本分别登记，不只保留一个版本。

## 已检查与未检查

6 个文件均有 ISO-10303-21 文本标记、`CONFIG_CONTROL_DESIGN`（AP203）schema 和 mm 的 SI_UNIT 声明。这仅是文本检查，不证明实体有效、没有已有孔、只有一个零件，或坐标已经符合网页基准。

特别是 `Horseman_Lensboard_blank.STEP` 中有 2 个 MANIFOLD_SOLID_BREP 声明，其他文件各有 1 个。M1 必须识别实体 / 装配关系、主板体及可能的附属体，明确哪些体可加工、哪些需要一起输出；不得自动取最大体后丢弃其余内容。声明数量不是内核导入后的连通实体数量验收结果。

当前导入变换和当地厚度见下表；仍需补齐安装中心实测、卡口 / 筋位 / 遮光的精确保护区域与实机配合。六个源文件均以 Y 为厚度轴，绕 X +90°，即 x'=x、y'=-z、z'=y，再移动使源最小 Y 映射至 Z=0；Graflex 另将 X 平移 -150 mm。变换只作用于运行时模型，不改原 STEP。

| 模板 | 标准化外形包围盒 mm | 中央当地厚度 mm | 加工区候选半径 mm |
| --- | --- | --- | --- |
| Graflex 简化 | 94.3 × 92.7 × 5 | 2.0（Z=3…5） | 35 |
| Horseman 完整 | 79.8 × 79.8 × 21.7（含附属体） | 1.8（Z=5.8…7.6） | 35 |
| Horseman 简化 | 79.8 × 79.8 × 7.6 | 1.8 | 35 |
| Linhof | 96 × 98.6 × 4.45 | 2.5（Z=1.95…4.45） | 35 |
| Sinar 完整 | 139.5 × 139.5 × 5.15 | 3.15（Z=0…3.15） | 54 |
| Sinar 简化 | 139.5 × 139.5 × 5 | 3.15 | 54 |

候选圆区不是厂家保护区认证；每个孔另以「孔外半径 +1.5 mm」实体探针检查当地完整均匀材料。Horseman 的较大孔会跨越非均匀区域而被拒绝；附属实体保留在 STEP / STL 中，禁止加工其 XY 投影附近。Linhof 的 Y 包围盒不对称，不自动将光轴移动到包围盒中心。

状态暂定为 `experimental`；文件来源与许可已确认，几何和适配没有冒充为 fitTested。网页默认使用普通通孔，可选择快门预设；某孔径不适合模板时提示，不改变模板结构或静默缩小孔径。

## 原文件校验

- `Graflex_pacemaker45_Lensboard_simplified_blank.STEP`：`cedd27ada02959bd200d4916438f101240282fb46b2ba1d14a76f59f4b027ecc`
- `Horseman_Lensboard_blank.STEP`：`ced885b0320723dc0844e26b7b632e69629800f64d52f48486f26411774f902d`
- `Horseman_Lensboard_simplified_blank.STEP`：`177010be377336d4d0e5faacf5b08fd44e8b46e6d00dbee940f86e763201fcd3`
- `Linhof_Lensboard_blank.STEP`：`3f648ccce649828d3de797bf779991610c879fa9ec90cce2a05f0c2d3def9bdb`
- `Sinar_Lensboard_blank.STEP`：`c872fb79b3f8086298246c724a03df2e63bd32291a5753b6b488ae19e9d6e9a5`
- `Sinar_Lensboard_simplified_blank.STEP`：`180436f325463362d749aef3dbe200838985d6f47640b1c5a2d14e197816e20a`

后续文件内容变化需更新模板版本和校验值，旧项目不得静默指向新几何。SHA-256 用于身份和完整性检查，不等于质量认证。

## 文件白名单

`steps/` 仅接受扩展名 `.step` / `.stp`，大小写不敏感，未来子目录遵循相同规则。同目录中的 SLDPRT 及所有其他文件被 .gitignore 排除，运行时清单和构建同样必须使用白名单，不复制整个 steps 目录。非 STEP 文件保持本地原样，不删除、不改名发布、不读取其模型内容。

本清单放在 docs 中，不在 steps 添加会被忽略的说明文件。模板注册元数据同样放在 src/templates 或 docs；许可正文位于仓库根目录。
