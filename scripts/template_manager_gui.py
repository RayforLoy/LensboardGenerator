# SPDX-License-Identifier: GPL-3.0-only
"""Local STEP template registration tool for Lensboard Generator.

Run from any directory with: python scripts/template_manager_gui.py
The tool reads exactly the STEP file selected by the user. It never scans the
selection directory and does not open sibling CAD files.
"""
from __future__ import annotations

import difflib
import hashlib
import json
import os
import queue
import re
import subprocess
import threading
import tkinter as tk
import uuid
from datetime import date
from pathlib import Path
from tkinter import filedialog, messagebox, ttk


ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "src/templates/index.ts"
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$")
SAFE_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def read_text(path: Path) -> str:
    return path.read_bytes().decode("utf-8")


def app_version() -> str:
    return json.loads(read_text(ROOT / "package.json"))["version"]


def semver_tuple(value: str) -> tuple[int, int, int]:
    match = SEMVER.fullmatch(value.strip())
    if not match:
        raise ValueError("应用版本必须使用 major.minor.patch 格式，例如 0.3.2。")
    return tuple(map(int, match.groups()))


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def ts_quote(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'").replace("\r", "\\r").replace("\n", "\\n") + "'"


def markdown_text(value: str) -> str:
    return re.sub(r"([\\`*_{}\[\]|])", r"\\\1", value)


def template_id_from_filename(filename: str) -> str:
    stem = Path(filename).stem.lower().replace("×", "x")
    slug = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")
    return slug or "new-lensboard"


def git(*args: str, check: bool = True) -> str:
    result = subprocess.run(["git", *args], cwd=ROOT, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            encoding="utf-8", errors="replace")
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or f"git {args[0]} 失败")
    return result.stdout.strip()


def require_clean_main() -> None:
    branch = git("branch", "--show-current")
    if branch != "main":
        raise RuntimeError(f"当前分支为 {branch or '(detached)'}，仅允许在 main 分支导入模板。")
    dirty = git("status", "--porcelain")
    if dirty:
        raise RuntimeError("Git 工作区不是干净状态。请先提交或暂存当前变更，再重新打开模板管理器。")
    if "origin" not in git("remote").splitlines():
        raise RuntimeError("仓库尚未配置 origin 远程，无法推送。")


def step_text_info(data: bytes) -> dict:
    text = data.decode("latin-1", errors="ignore")
    if "ISO-10303-21" not in text or "END-ISO-10303-21" not in text:
        raise ValueError("文件缺少 STEP Part 21 文件标记。")
    schema_match = re.search(r"FILE_SCHEMA\s*\(\s*\((.*?)\)\s*\)", text, re.I | re.S)
    unit_mm = bool(re.search(r"SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\.\s*\)", text, re.I))
    if not schema_match:
        raise ValueError("未找到 STEP FILE_SCHEMA 声明。")
    if not unit_mm:
        raise ValueError("STEP 文件未声明毫米（SI_UNIT(.MILLI., .METRE.)）；请先确认并转换为 mm。")
    schemas = re.findall(r"'([^']+)'", schema_match.group(1))
    solids = len(re.findall(r"\bMANIFOLD_SOLID_BREP\s*\(", text, re.I))
    return {"schema": ", ".join(schemas), "solidDeclarations": solids}


def registry_info(source: str) -> tuple[set[str], set[str], list[str]]:
    ids = set(re.findall(r"\bid:\s*'([^']+)'", source))
    files = set(re.findall(r"\bfile:\s*'([^']+)'", source))
    names = []
    for match in re.finditer(r"\bname:\s*(\'(?:\\.|[^'\\])*\'|\"(?:\\.|[^\"\\])*\")", source):
        token = match.group(1)
        value = json.loads(token) if token.startswith('"') else token[1:-1].replace("\\'", "'").replace("\\\\", "\\")
        names.append(value)
    names = list(dict.fromkeys(names))
    return ids, files, names


def update_once(text: str, old: str, new: str, description: str) -> str:
    if old not in text:
        raise ValueError(f"无法定位文档中的{description}，为避免生成不完整变更已停止。")
    return text.replace(old, new, 1)


def generated_files(data: bytes, info: dict, fields: dict) -> dict[str, bytes]:
    """Return the complete, explicit set of files the manager will write."""
    filename = fields["filename"]
    template_id = fields["template_id"]
    display_name = fields["display_name"]
    variant = fields["variant"]
    version = fields["template_version"]
    new_app = fields["app_version"]
    angle = fields["rotation_x"]
    shift_x = fields["shift_x"]
    radius = fields["editable_radius"]
    digest = hashlib.sha256(data).hexdigest()

    registry = read_text(REGISTRY)
    ids, files, names = registry_info(registry)
    if template_id in ids:
        raise ValueError(f"模板 ID 已存在：{template_id}")
    if filename.casefold() in {name.casefold() for name in files}:
        raise ValueError(f"模板文件名已登记：{filename}")
    if (ROOT / "steps" / filename).exists():
        raise ValueError(f"目标文件已存在：steps/{filename}")
    alias_base = re.sub(r"[^A-Za-z0-9]+", " ", template_id).title().replace(" ", "")
    alias = alias_base[:1].lower() + alias_base[1:] + "Template"
    if not alias[0].isalpha(): alias = "lensboard" + alias
    if re.search(rf"\b{re.escape(alias)}\b", registry):
        alias += hashlib.sha256(template_id.encode()).hexdigest()[:5]
    import_line = f"import {alias} from {ts_string('../../steps/' + filename + '?url')};"
    object_line = (
        "  { id: " + ts_quote(template_id) + ", name: " + ts_quote(display_name)
        + f", variant: '{variant}', url: {alias}, file: {ts_quote(filename)}, sha256: '{digest}',"
        + f" rotationX: {angle:g}, editableRadius: {radius:g}, version: {ts_quote(version)}"
        + (f", sourceShiftX: {shift_x:g}" if shift_x else "") + " },"
    )
    if "export interface Template" not in registry or "export const templates: Template[] = [" not in registry:
        raise ValueError("模板注册文件结构和工具预期不一致，未写入任何文件。")
    registry = registry.replace("export interface Template {", import_line + "\n\nexport interface Template {", 1)
    registry = registry.replace("export const templates: Template[] = [", "export const templates: Template[] = [\n" + object_line, 1)

    files_out: dict[str, bytes] = {f"steps/{filename}": data,
                                   "src/templates/index.ts": registry.encode("utf-8")}

    package = json.loads(read_text(ROOT / "package.json"))
    old_app = package["version"]
    if semver_tuple(new_app) <= semver_tuple(old_app):
        raise ValueError(f"应用版本 {new_app} 必须高于当前版本 {old_app}。")
    package["version"] = new_app
    files_out["package.json"] = (json.dumps(package, ensure_ascii=False, indent=2) + "\n").encode()
    project = read_text(ROOT / "src/domain/project.ts")
    files_out["src/domain/project.ts"] = update_once(
        project, f"export const APP_VERSION = '{old_app}';",
        f"export const APP_VERSION = '{new_app}';", "应用版本号").encode()

    catalog = read_text(ROOT / "docs/TEMPLATE_CATALOG.md")
    catalog = re.sub(r"登记日期：[^·]+· 清单版本：([\d.]+)",
                     lambda m: f"登记日期：{date.today().isoformat()} · 清单版本：{float(m.group(1)) + 0.1:.1f}", catalog, count=1)
    old_catalog_row = "| `rollei-xact2-blank` | Rollei X-ACT2 空白板 | [Rollei_xact2_lensboard_blank.STEP](../steps/Rollei_xact2_lensboard_blank.STEP) | 34456 | 1 |"
    display_md = markdown_text(display_name)
    new_catalog_row = f"| `{template_id}` | {display_md} {('简化' if variant == 'simple' else '')}空白板 | [{filename}](../steps/{filename}) | {len(data)} | {info['solidDeclarations']} |"
    catalog = update_once(catalog, old_catalog_row, old_catalog_row + "\n" + new_catalog_row, "模板清单表尾")
    dimension_line = (f"| {display_md} | {info['bounds'][1][0]-info['bounds'][0][0]:.4f} × "
                      f"{info['bounds'][1][1]-info['bounds'][0][1]:.4f} × {info['bounds'][1][2]-info['bounds'][0][2]:.4f} | "
                      f"{info['centralThickness']:.4f}（Z={info['centerBounds'][0][2]:.4f}…{info['centerBounds'][1][2]:.4f}） | {radius:g} |")
    catalog = update_once(catalog, "| Rollei X-ACT2 | 90.8 × 90.8 × 7.5 | 2（Z=0…2） | 35 |",
                          "| Rollei X-ACT2 | 90.8 × 90.8 × 7.5 | 2（Z=0…2） | 35 |\n" + dimension_line, "模板尺寸表尾")
    source_note = markdown_text(fields["source_note"].replace("\r", " ").replace("\n", " "))
    catalog = update_once(catalog, "- `Rollei_xact2_lensboard_blank.STEP`：`28bbc59c8396f4cf42f186eb1b25012a0e1a3abb86aca50db08d39dd6a27ddb9`",
        "- `Rollei_xact2_lensboard_blank.STEP`：`28bbc59c8396f4cf42f186eb1b25012a0e1a3abb86aca50db08d39dd6a27ddb9`\n"
        + f"- `{filename}`：`{digest}`（来源：{source_note}；许可：GPL-3.0-only）", "模板 SHA-256 清单尾")
    catalog = catalog.replace("十三个源文件均以 Y 为厚度轴，绕 X +90°，即 x'=x、y'=-z、z'=y，再移动使源最小 Y 映射至 Z=0；仅旧 Graflex Pacemaker 简化板另将 X 平移 -150 mm，其余模板无该平移。",
        "每个文件按下表所列的 X 轴角度 / X 平移独立标准化，并将旋转后最低 Z 映射至 Z=0；只改变运行时模型，不修改原 STEP 字节。")
    catalog = re.sub(r"\d+ 个文件均有", f"{len(ids)+1} 个文件均有", catalog, count=1)
    files_out["docs/TEMPLATE_CATALOG.md"] = catalog.encode()

    def textfile(path: str) -> str:
        return read_text(ROOT / path)

    # Keep the maintained current-version summaries aligned with the registry.
    readme = textfile("README.md")
    current_names = list(dict.fromkeys([*names, display_name]))
    joined_zh = "、".join(markdown_text(name) for name in current_names)
    readme = re.sub(r"- (?:\d+|[一二三四五六七八九十百]+)\s*个已登记的自绘 STEP 模板：[^\n]*", f"- {len(ids)+1} 个已登记的自绘 STEP 模板：{joined_zh}；保留完整 / 简化版本。", readme, count=1)
    readme = re.sub(r"(?:公开网页当前为 v[\d.]+；本地源码 v[\d.]+ 新增 Python/Tkinter 模板维护器，项目 schema 仍为 5。|公开站点的实际版本与部署状态见 \[部署记录\]\(docs/DEPLOYMENT.md\)；本地源码 v[\d.]+ 登记 .*? 模板，项目 schema 仍为 5。)",
                    f"公开站点的实际版本与部署状态见 [部署记录](docs/DEPLOYMENT.md)；本地源码 v{new_app} 登记 {display_name} 模板，项目 schema 仍为 5。", readme, count=1)
    readme = re.sub(r"Original project content,.*? derivative designs use GPL-3.0-only\.",
                    "Original project content, user-authored STEP templates and derivative designs use GPL-3.0-only.", readme, count=1)
    readme = re.sub(r"原创代码、[^\n]*个用户自绘 STEP、自定义参数化板", f"原创代码、{len(ids)+1} 个用户自绘 STEP、自定义参数化板", readme, count=1)
    readme = re.sub(r"(?:十三|十四|十五|十六|十七|十八|十九|二十|二十一|二十二|二十三) user-authored STEP templates", f"{len(ids)+1} user-authored STEP templates", readme)
    readme = re.sub(r"Experimental v[\d.]+ includes the local Python/Tkinter template manager and \d+ registered user-authored STEP templates, including .*?; schema 5 remains unchanged\.",
        f"Experimental v{new_app} includes the local Python/Tkinter template manager and {len(ids)+1} registered user-authored STEP templates, including {display_name}; schema 5 remains unchanged.", readme, count=1)
    readme = re.sub(r"Thirteen user-authored STEP templates, procedural custom boards and flanges|\d+ registered user-authored STEP templates, procedural custom boards and flanges",
        f"{len(ids)+1} registered user-authored STEP templates, procedural custom boards and flanges", readme, count=1)
    files_out["README.md"] = readme.encode()

    license_doc = textfile("docs/LICENSING.md")
    license_doc = re.sub(r"the thirteen user-authored STEP templates \(six initial plus seven additions\)",
                         f"the {len(ids)+1} user-authored STEP templates", license_doc)
    license_doc = license_doc.replace("（初始六个及后续新增七个）", f"（当前共{len(ids)+1}个已授权登记模板）")
    files_out["docs/LICENSING.md"] = license_doc.encode()

    agents = textfile("AGENTS.md")
    agents = re.sub(r"(?:公开网页为 v[\d.]+；)?本地源码为 v[\d.]+ / schema 5，包含.*?；(?:公开部署证据见 docs/DEPLOYMENT.md；)?验证与未完成需求",
        f"本地源码为 v{new_app} / schema 5，包含模板维护器和 {len(ids)+1} 个已登记模板；公开部署证据见 docs/DEPLOYMENT.md；验证与未完成需求", agents, count=1)
    agents = re.sub(r"（当前(?:十三个|\d+个)）", f"（当前{len(ids)+1}个）", agents)
    files_out["AGENTS.md"] = agents.encode()

    prd = textfile("PRD.md")
    prd = re.sub(r"版本：1\.0 · 日期：[^·]+ · 状态：[^\n]+",
        f"版本：1.0 · 日期：{date.today().isoformat()} · 状态：本地源码 v{new_app} 登记 {len(ids)+1} 个模板，schema 5 不变；Pages 发布状态见 docs/DEPLOYMENT.md。详见 docs/IMPLEMENTATION_STATUS.md。", prd, count=1)
    prd = re.sub(r"(?:v0\.3\.1 计划新增 Rollei X-ACT2，目前目标为十三模板。|当前登记\s*(?:\d+|十三个)\s*模板，支持本地模板维护器添加后续自绘模型。)",
        f"当前登记 {len(ids)+1} 个模板，支持本地模板维护器添加后续自绘模型。", prd, count=1)
    prd = re.sub(r"v0\.3\.1 目标为十三个|当前登记\s*(?:\d+|十三个)", f"当前登记 {len(ids)+1} 个", prd, count=1)
    prd = re.sub(r"\| A01 \| 从 Pages 项目子路径直接加载，13 个内置 STEP 模板可选，", f"| A01 | 从 Pages 项目子路径直接加载，所有已登记 STEP 模板可选，", prd)
    prd = re.sub(r"\| 相机模板 \| [^\n]+",
        f"| 相机模板 | {len(ids)+1} 个模板已登记；新模板由本地 CAD 检查器验证单位 / 变换 / 有效性与当地厚度，全部仍缺精确保护区和实机配合记录 |",
        prd, count=1)
    files_out["PRD.md"] = prd.encode()

    arch = textfile("docs/ARCHITECTURE.md")
    arch = re.sub(r"状态：[^\n]+", f"状态：本地源码 v{new_app} 登记 {len(ids)+1} 个模板；Pages 部署状态见部署记录，schema 5 不变。", arch, count=1)
    files_out["docs/ARCHITECTURE.md"] = arch.encode()
    spec = textfile("docs/TEMPLATE_SPEC.md")
    spec = re.sub(r"状态：[^\n]+", f"状态：本地源码 v{new_app} 登记 {len(ids)+1} 个模板；Pages 部署状态见部署记录，schemaVersion=5 不变。", spec, count=1)
    files_out["docs/TEMPLATE_SPEC.md"] = spec.encode()

    # Existing regression files enumerate assets dynamically; only update the current app-version literals.
    preferences_test = textfile("tests/preferences.test.ts")
    preferences_test = preferences_test.replace("registers exactly the thirteen provided STEP files", "registers every provided STEP file")
    preferences_test = preferences_test.replace("expect(templates).toHaveLength(13);", "expect(templates).toHaveLength(files.length);")
    preferences_test = preferences_test.replace("expect(new Set(templates.map(t => t.id)).size).toBe(13);", "expect(new Set(templates.map(t => t.id)).size).toBe(files.length);")
    files_out["tests/preferences.test.ts"] = preferences_test.encode()

    e2e = textfile("tests/e2e/app.spec.ts")
    e2e = e2e.replace("all thirteen templates load, STL downloads, and invalid JSON preserves the design",
                      "all registered templates load, STL downloads, and invalid JSON preserves the design")
    e2e = e2e.replace("  await expect(templates.locator('option')).toHaveCount(13);\n  for (const id of ['horseman-blank', 'horseman-simplified-blank', 'linhof-blank', 'linhof-technika-iii-iv-69-blank', 'graflex-pacemaker45-simplified-blank', 'graflex-pre-anniversary-45-blank', 'rollei-xact2-blank', 'sinar-simplified-blank', 'alpa-blank', 'arca141-blank', 'cambo-twr54-simplified-blank', 'toyo158-simplified-blank', 'sinar-blank']) {",
                      "  const templateIds = await templates.locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).filter(Boolean));\n  expect(templateIds.length).toBeGreaterThan(0);\n  for (const id of templateIds) {")
    e2e = e2e.replace(f"'{old_app}'", ts_string(new_app))
    files_out["tests/e2e/app.spec.ts"] = e2e.encode()

    changelog = textfile("CHANGELOG.md")
    entry = (f"## {new_app} — {date.today().isoformat()}（本地开发）\n\n"
             f"- 新增本地 Python/Tkinter 模板维护器，可选择 STEP、录入 `{template_id}` 元数据、检查实体并预览明确的文件改动，再由操作者提交推送。\n"
             f"- 登记用户提供的 `{filename}`（{display_name}，{variant}，模板版本 {version}）；保留原文件字节，更新模板目录 / SHA-256、版本号、许可和动态模板回归清单。\n"
             "- 几何检查由现有 Replicad/OpenCascade WASM 内核执行。此版本尚未运行自动测试或独立 native CAD 重读；新模板默认为 experimental，未声明实机适配认证。schema 5 不变。\n\n")
    changelog = changelog.replace("# Changelog / 更新日志\n\n", "# Changelog / 更新日志\n\n" + entry, 1)
    files_out["CHANGELOG.md"] = changelog.encode()

    status = textfile("docs/IMPLEMENTATION_STATUS.md")
    status_entry = (f"## v{new_app} — 本地模板管理器\n\n"
                    "实现了 Python/Tkinter 桌面维护器、明确的文件变更预览、单独的提交/推送按钮和单文件 CAD 检查器。应用版本 / 模板版本 / schema 各自独立；本轮没有运行测试或 Pages 发布。\n\n"
                    f"新模板 `{filename}`：SHA-256 `{digest}`；声明 schema `{info['schema']}`，文本实体声明 {info['solidDeclarations']} 个；WASM 检查 {info['solidCount']} 个实体，B-rep 有效性 `{info['valid']}`，标准化包围盒 {info['bounds'][1][0]-info['bounds'][0][0]:.4f} × {info['bounds'][1][1]-info['bounds'][0][1]:.4f} × {info['bounds'][1][2]-info['bounds'][0][2]:.4f} mm。新模板状态保持 `experimental`。\n\n")
    files_out["docs/IMPLEMENTATION_STATUS.md"] = status_entry.encode() + status.encode()
    return files_out


class TemplateManager:
    def __init__(self, root: tk.Tk):
        self.root = root
        root.title("Lensboard Generator — STEP 模板管理器")
        root.geometry("900x850")
        root.minsize(760, 700)
        self.events: queue.Queue = queue.Queue()
        self.source: Path | None = None
        self.data: bytes | None = None
        self.inspection: dict | None = None
        self.pending: dict[str, bytes] | None = None
        self.written_snapshots: dict[str, bytes | None] = {}
        self.pushed = False
        self.committed = False
        self.busy = False

        self.file_var = tk.StringVar(value="尚未选择 STEP 文件")
        self.id_var = tk.StringVar()
        self.name_var = tk.StringVar()
        self.variant_var = tk.StringVar(value="full")
        self.template_version_var = tk.StringVar(value="1")
        current = app_version()
        major, minor, patch = semver_tuple(current)
        self.app_version_var = tk.StringVar(value=f"{major}.{minor}.{patch+1}")
        self.rotation_var = tk.StringVar(value="90")
        self.shift_var = tk.StringVar(value="0")
        self.radius_var = tk.StringVar(value="35")
        self.source_note_var = tk.StringVar(value="用户提供 / 自绘")
        self.license_var = tk.BooleanVar(value=False)
        self.status_var = tk.StringVar(value="选择一个 STEP/STP 文件开始；只会读取该文件本身。")
        self._layout()
        root.after(120, self._drain_events)
        root.protocol("WM_DELETE_WINDOW", self._close)

    def _layout(self) -> None:
        outer = ttk.Frame(self.root, padding=14)
        outer.pack(fill="both", expand=True)
        ttk.Label(outer, text="本地镜头板 STEP 模板管理器", font=("Segoe UI", 16, "bold")).pack(anchor="w")
        ttk.Label(outer, text="单文件检查 · 原字节登记 · 预览后由你决定提交和推送", foreground="#536273").pack(anchor="w", pady=(2, 12))
        file_row = ttk.Frame(outer); file_row.pack(fill="x", pady=(0, 8))
        ttk.Button(file_row, text="选择 STEP / STP…", command=self._choose_file).pack(side="left")
        ttk.Label(file_row, textvariable=self.file_var, wraplength=690).pack(side="left", padx=10)

        fields = ttk.LabelFrame(outer, text="模板登记参数", padding=10); fields.pack(fill="x")
        specs = [
            ("稳定 ID（小写连字符）", self.id_var), ("模板显示名称", self.name_var),
            ("模板版本", self.template_version_var), ("应用版本（SemVer）", self.app_version_var),
            ("X 轴标准化角度（度）", self.rotation_var), ("来源 X 平移（mm）", self.shift_var),
            ("保守可加工半径（mm）", self.radius_var), ("来源 / 权利说明", self.source_note_var),
        ]
        for i, (label, variable) in enumerate(specs):
            row, col = divmod(i, 2)
            ttk.Label(fields, text=label).grid(row=row, column=col*2, sticky="w", padx=(0, 7), pady=5)
            ttk.Entry(fields, textvariable=variable, width=27).grid(row=row, column=col*2+1, sticky="ew", padx=(0, 18), pady=5)
        ttk.Label(fields, text="模板类型").grid(row=4, column=0, sticky="w", pady=5)
        variant = ttk.Combobox(fields, textvariable=self.variant_var, state="readonly", values=("full", "simple"), width=24)
        variant.grid(row=4, column=1, sticky="ew", pady=5)
        fields.columnconfigure(1, weight=1); fields.columnconfigure(3, weight=1)
        ttk.Checkbutton(fields, text="我拥有该模型或获准按 GPL-3.0-only 发布此模型", variable=self.license_var).grid(row=5, column=0, columnspan=4, sticky="w", pady=(9, 0))

        actions = ttk.Frame(outer); actions.pack(fill="x", pady=10)
        ttk.Button(actions, text="检查所选模板", command=self._inspect).pack(side="left")
        ttk.Button(actions, text="生成并预览变更", command=self._preview).pack(side="left", padx=7)
        ttk.Button(actions, text="写入本地文件", command=self._write).pack(side="left")
        self.push_button = ttk.Button(actions, text="提交并推送到 GitHub…", command=self._push, state="disabled")
        self.push_button.pack(side="right")

        ttk.Label(outer, text="检查结果与变更预览").pack(anchor="w")
        self.output = tk.Text(outer, height=20, wrap="word", font=("Consolas", 9), state="disabled")
        self.output.pack(fill="both", expand=True, pady=(4, 8))
        self.output.tag_configure("error", foreground="#ad2424")
        self.output.tag_configure("heading", foreground="#075c8e", font=("Segoe UI", 10, "bold"))
        ttk.Label(outer, textvariable=self.status_var, wraplength=850).pack(anchor="w")

    def _append(self, value: str, tag: str | None = None) -> None:
        self.output.configure(state="normal")
        self.output.insert("end", value + "\n", tag or ())
        self.output.see("end")
        self.output.configure(state="disabled")

    def _set_output(self, value: str) -> None:
        self.output.configure(state="normal"); self.output.delete("1.0", "end")
        self.output.insert("end", value); self.output.configure(state="disabled")

    def _choose_file(self) -> None:
        if self.busy:
            messagebox.showinfo("操作进行中", "请等待当前 CAD / Git 操作完成后再更换文件。")
            return
        path = filedialog.askopenfilename(title="仅选择要登记的 STEP 模板", filetypes=[("STEP CAD", "*.step *.stp *.STEP *.STP"), ("All files (extension checked)", "*.*")])
        if not path: return
        candidate = Path(path)
        if candidate.suffix.lower() not in (".step", ".stp"):
            messagebox.showerror("不是 STEP 文件", "只接受 .step 或 .stp。没有读取该文件。")
            return
        self.source = candidate
        self.data = None; self.inspection = None; self.pending = None
        self.file_var.set(str(candidate)); self.id_var.set(template_id_from_filename(candidate.name))
        self.name_var.set(candidate.stem.replace("_", " ").replace("-", " ").strip())
        self.status_var.set("所选文件尚未检查。")
        self._set_output("")

    def _number(self, label: str, value: str, low: float, high: float) -> float:
        try: number = float(value.strip())
        except ValueError as exc: raise ValueError(f"{label}必须是数字。") from exc
        if not low <= number <= high: raise ValueError(f"{label}范围应为 {low:g}…{high:g}。")
        return number

    def _validate_fields(self) -> dict:
        if not self.source or not self.source.is_file(): raise ValueError("请先选择存在的 STEP 文件。")
        if self.source.suffix.lower() not in (".step", ".stp"): raise ValueError("只接受 .step / .stp 文件。")
        if not re.fullmatch(r"[A-Za-z0-9 _().-]+\.(?:step|stp)", self.source.name, re.I):
            raise ValueError("为保证跨平台构建与 Git 导入稳定，文件名仅可使用英文、数字、空格、下划线、括号、点和连字符。")
        template_id = self.id_var.get().strip()
        if not SAFE_ID.fullmatch(template_id): raise ValueError("稳定 ID 只能含小写字母、数字和单个连字符。")
        name = self.name_var.get().strip()
        if not name or len(name) > 100: raise ValueError("显示名称不能为空且最多 100 字符。")
        try: template_version = self.template_version_var.get().strip()
        except Exception as exc: raise ValueError("模板版本无效。") from exc
        if not re.fullmatch(r"[0-9A-Za-z][0-9A-Za-z.+-]{0,31}", template_version): raise ValueError("模板版本最多 32 字符，需以字母或数字开头。")
        app = self.app_version_var.get().strip()
        semver_tuple(app)
        angle = self._number("X 轴角度", self.rotation_var.get(), -360, 360)
        shift = self._number("来源 X 平移", self.shift_var.get(), -10000, 10000)
        radius = self._number("保守可加工半径", self.radius_var.get(), 0.1, 1000)
        source_note = self.source_note_var.get().strip()
        if not source_note or len(source_note) > 240: raise ValueError("来源 / 权利说明不能为空且最多 240 字符。")
        if self.variant_var.get() not in ("full", "simple"): raise ValueError("请选择 full 或 simple 模板类型。")
        if not self.license_var.get(): raise ValueError("请确认模型自有或已获发布授权，并按 GPL-3.0-only 登记。")
        return {"filename": self.source.name, "template_id": template_id, "display_name": name,
                "template_version": template_version, "app_version": app,
                "rotation_x": angle, "shift_x": shift, "editable_radius": radius,
                "variant": self.variant_var.get(), "source_note": source_note}

    def _background(self, label: str, action) -> None:
        self.busy = True
        self.status_var.set(label); self.root.configure(cursor="watch")
        def run():
            try: self.events.put((True, action()))
            except Exception as error: self.events.put((False, str(error)))
        threading.Thread(target=run, daemon=True).start()

    def _inspect(self) -> None:
        if self.busy: return
        try:
            fields = self._validate_fields()
            require_clean_main()
        except Exception as error:
            messagebox.showerror("无法开始检查", str(error)); return
        source = self.source
        def action():
            if source.stat().st_size > 100 * 1024 * 1024:
                raise ValueError("所选 STEP 超过 100 MiB 导入上限。")
            raw = source.read_bytes()
            if not raw: raise ValueError("所选文件为空。")
            info = step_text_info(raw)
            command = ["node", "--import", "tsx", "scripts/inspect-template.ts", str(source),
                       str(fields["rotation_x"]), str(fields["shift_x"])]
            result = subprocess.run(command, cwd=ROOT, text=True, stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE, encoding="utf-8", errors="replace", timeout=240)
            if result.returncode: raise RuntimeError("CAD 内核导入失败：\n" + result.stderr.strip())
            lines = [line for line in result.stdout.splitlines() if line.strip().startswith("{")]
            if not lines: raise RuntimeError("CAD 检查器没有返回结果：\n" + result.stdout + result.stderr)
            model = json.loads(lines[-1]); info.update(model)
            if not model["valid"]: raise ValueError("B-rep 几何有效性检查失败，已阻止登记。")
            if model["solidCount"] < 1: raise ValueError("CAD 内核未识别出实体，已阻止登记。")
            if model["centralThickness"] <= 0: raise ValueError("中心探针未命中材料；中心局部厚度为 0，已阻止登记。")
            main = max(model["solids"], key=lambda item: item["volume"])
            max_radius = min(main["bounds"][1][0] - main["bounds"][0][0], main["bounds"][1][1] - main["bounds"][0][1]) / 2
            if fields["editable_radius"] > max_radius + 1e-6:
                raise ValueError(f"保守可加工半径超过候选主板最短 XY 尺寸的一半（{max_radius:.3f} mm）。")
            return (raw, info, fields)
        self._background("正在读取所选 STEP 并运行 Replicad/OpenCascade 检查…", action)

    def _preview(self) -> None:
        if self.busy: return
        if not self.inspection:
            messagebox.showinfo("先检查模型", "请先点击“检查所选模板”，通过 CAD 检查后再预览。")
            return
        try:
            current_fields = self._validate_fields()
            if current_fields != self.inspection["fields"]:
                raise ValueError("检查后模板字段有修改，请重新检查模型后再生成预览。")
            if self.source.read_bytes() != self.data:
                raise ValueError("所选 STEP 文件在检查后发生变化，请重新检查。")
            require_clean_main()
            planned = generated_files(self.data, self.inspection, self.inspection["fields"])
        except Exception as error:
            messagebox.showerror("无法生成预览", str(error)); return
        self.pending = planned
        text = [f"将要写入 {len(planned)} 个路径（包括原字节 STEP）：", ""]
        for relative, content in planned.items():
            target = ROOT / relative
            if target.exists():
                before = target.read_bytes().decode("utf-8", errors="replace")
                after = content.decode("utf-8", errors="replace")
                diff = list(difflib.unified_diff(before.splitlines(), after.splitlines(),
                            fromfile=f"a/{relative}", tofile=f"b/{relative}", lineterm=""))
                text.append("\n".join(diff) if diff else f"{relative}: 无文本差异")
            else:
                digest = hashlib.sha256(content).hexdigest()
                text.append(f"{relative}: 新文件，{len(content)} bytes，SHA-256 {digest}")
            text.append("")
        self._set_output("\n".join(text)); self.status_var.set("请检查完整预览；确认后再写入本地文件。")

    def _write(self) -> None:
        if self.busy: return
        if not self.pending:
            messagebox.showinfo("还没有变更", "先检查模型并生成变更预览。")
            return
        if not messagebox.askyesno("确认写入", "已检查的预览将写入工作区。当前工具不会自动提交或推送。继续？"):
            return
        try:
            if self._validate_fields() != self.inspection["fields"] or self.source.read_bytes() != self.data:
                raise ValueError("字段或 STEP 文件在预览后发生变化，请重新检查并生成预览。")
        except Exception as error:
            messagebox.showerror("预览已过期", str(error)); self.pending = None; return
        try: require_clean_main()
        except Exception as error: messagebox.showerror("工作区状态改变", str(error)); return
        try:
            snapshots = {relative: (ROOT / relative).read_bytes() if (ROOT / relative).exists() else None
                         for relative in self.pending}
            written: list[str] = []
            for relative, content in self.pending.items():
                target = ROOT / relative; target.parent.mkdir(parents=True, exist_ok=True)
                temp = target.with_name(f".{target.name}.{uuid.uuid4().hex}.tmp")
                try:
                    temp.write_bytes(content); os.replace(temp, target); written.append(relative)
                finally:
                    if temp.exists(): temp.unlink()
            self.written_snapshots = snapshots
            self.status_var.set("变更已写入本地工作区。请检查 Git diff；推送需另行确认。")
            self.push_button.configure(state="normal")
            self._append("\n写入成功。可用 GitHub 按钮提交并推送，或关闭工具保留本地文件。")
        except Exception as error:
            # Restore only paths that this operation touched, using in-memory originals.
            snapshots = locals().get("snapshots", {})
            for relative in locals().get("written", []):
                target = ROOT / relative
                if target.exists() and target.read_bytes() != self.pending[relative]:
                    messagebox.showerror("检测到并发编辑", f"{relative} 已被修改；为保护人工更改，没有回滚该批文件。请人工核对。")
                    return
            for relative in locals().get("written", []):
                target = ROOT / relative
                old = snapshots[relative]
                if old is None:
                    if target.exists(): target.unlink()
                elif target.exists(): target.write_bytes(old)
            messagebox.showerror("写入失败，已尽力恢复原文件", str(error))

    def _push(self) -> None:
        if self.busy: return
        if not self.written_snapshots or not self.pending:
            messagebox.showerror("没有可推送的变更", "请先预览并写入变更。")
            return
        try:
            if self._validate_fields() != self.inspection["fields"] or self.source.read_bytes() != self.data:
                raise ValueError("检查参数或所选 STEP 已更改，请重新检查后再推送。")
            for relative, content in self.pending.items():
                if (ROOT / relative).read_bytes() != content:
                    raise ValueError(f"{relative} 已在预览后被修改；请审阅 Git diff 后手动处理。")
        except Exception as error:
            messagebox.showerror("预览已过期", str(error)); return
        if not messagebox.askyesno("最后确认", "将只暂存本次模板登记文件，创建本地提交并推送到 origin/main。确定继续？"):
            return
        self.push_button.configure(state="disabled")
        allowed = sorted(self.pending)
        def action():
            require_clean_main_for_generated(allowed)
            git("fetch", "origin", "main")
            head = git("rev-parse", "HEAD")
            remote = git("rev-parse", "origin/main")
            if head != remote: raise RuntimeError("本地 main 与 origin/main 不一致。为避免非快进推送，请先同步并重新生成预览。")
            try:
                for path in allowed: git("add", "--", path)
                git("diff", "--cached", "--check")
                staged = {entry for entry in git("diff", "--cached", "--name-only", "-z").split("\0") if entry}
                if staged != set(allowed): raise RuntimeError("暂存区文件与本次预览不一致，已阻止提交。")
                git("commit", "-m", f"feat: add {self.inspection['fields']['template_id']} template")
                self.committed = True
            except Exception:
                staged = {entry for entry in git("diff", "--cached", "--name-only", "-z").split("\0") if entry}
                if staged == set(allowed): git("restore", "--staged", "--", *allowed)
                raise
            try: git("push", "origin", "HEAD:main")
            except Exception as error:
                return {"pushFailed": str(error), "commit": git("rev-parse", "--short", "HEAD")}
            return {"pushed": True, "commit": git("rev-parse", "--short", "HEAD")}
        self._background("正在检查远程 main、提交并推送…", action)

    def _drain_events(self) -> None:
        try:
            while True:
                success, payload = self.events.get_nowait()
                self.busy = False
                self.root.configure(cursor="")
                if not success:
                    self.status_var.set("操作失败；工作区未自动推送。")
                    if self.written_snapshots and not self.committed: self.push_button.configure(state="normal")
                    messagebox.showerror("操作失败", payload)
                    continue
                if isinstance(payload, tuple) and len(payload) == 3:
                    self.data, self.inspection, fields = payload
                    self.inspection["fields"] = fields
                    i = self.inspection
                    solid_details = "\n".join(f"  #{n+1}: {solid['volume']:.3f} mm³, bounds={json.dumps(solid['bounds'])}" for n, solid in enumerate(i["solids"]))
                    main_volume = max(i["solids"], key=lambda item: item["volume"])["volume"]
                    report = (f"文件：{fields['filename']}\n字节：{len(self.data)}\nSHA-256：{hashlib.sha256(self.data).hexdigest()}\n"
                              f"schema：{i['schema']}\n毫米声明：是\n文本 MANIFOLD_SOLID_BREP：{i['solidDeclarations']}\n\n"
                              f"WASM B-rep 有效：{i['valid']}\n内核实体数：{i['solidCount']}\n"
                              f"实体包围盒：{json.dumps(i['bounds'], ensure_ascii=False)}\n"
                              f"最大体积主板候选：{main_volume:.3f} mm³；其余 {max(0, i['solidCount']-1)} 个实体作为附件候选保留\n"
                              + "实体详情：\n" + solid_details + "\n"
                              + f"中心当地厚度：{i['centralThickness']:.4f} mm\n"
                              + f"标准化中心厚度区间：{json.dumps(i['centerBounds'], ensure_ascii=False)}\n\n"
                              + "注意：导入器状态仍为 experimental；这是 CAD 几何检查，不是装机兼容认证。")
                    self._set_output(report); self.status_var.set("检查通过，可生成变更预览。")
                elif isinstance(payload, dict) and payload.get("pushed"):
                    self.status_var.set(f"已推送。提交 {payload['commit']}；GitHub Actions 结果请在仓库查看。")
                    self._append(f"\n已推送 origin/main：{payload['commit']}。本工具不代表 Pages 部署或浏览器验收。")
                    self.pushed = True
                elif isinstance(payload, dict) and payload.get("pushFailed"):
                    self.committed = True
                    self.status_var.set(f"提交 {payload['commit']} 已在本地创建，但 push 失败。文件和提交均保留。")
                    messagebox.showerror("Push 失败", payload["pushFailed"] + f"\n\n本地提交 {payload['commit']} 保留，请检查后手动推送。")
        except queue.Empty:
            pass
        self.root.after(120, self._drain_events)

    def _close(self) -> None:
        if self.busy:
            messagebox.showinfo("操作进行中", "当前文件检查 / Git 操作完成后再关闭工具。")
            return
        if self.written_snapshots and not self.committed:
            answer = messagebox.askyesnocancel("保留本地变更？", "是：保留工作区文件；否：撤销本次工具生成的文件；取消：返回工具。")
            if answer is None: return
            if answer is False:
                try:
                    for relative in self.written_snapshots:
                        target = ROOT / relative
                        if not target.exists() or target.read_bytes() != self.pending[relative]:
                            raise RuntimeError(f"{relative} 已在工具写入后被修改；为保护人工更改，没有执行撤销。")
                    for relative, old in self.written_snapshots.items():
                        target = ROOT / relative
                        if old is None:
                            if target.exists(): target.unlink()
                        else: target.write_bytes(old)
                except Exception as error:
                    messagebox.showerror("无法完全撤销", str(error)); return
        self.root.destroy()


def require_clean_main_for_generated(allowed: list[str]) -> None:
    branch = git("branch", "--show-current")
    if branch != "main": raise RuntimeError("当前分支已不是 main，已阻止推送。")
    changes = {entry for entry in git("status", "--porcelain=v1", "-z").split("\0") if entry}
    if not changes: raise RuntimeError("本次预览变更已不存在。")
    if len(changes) > len(allowed): raise RuntimeError("除本次生成文件外还检测到其他 Git 变更；已阻止提交。")
    # Compare the precise status path suffixes, including rename-free paths with spaces.
    seen = set()
    for line in changes:
        status_path = line[3:]
        if status_path not in allowed: raise RuntimeError(f"检测到非本工具生成的变更：{status_path}")
        seen.add(status_path)
    if seen != set(allowed): raise RuntimeError("工作区变更与预览清单不一致，已阻止提交。")


def main() -> None:
    root = tk.Tk()
    try: ttk.Style(root).theme_use("vista")
    except tk.TclError: pass
    TemplateManager(root)
    root.mainloop()


if __name__ == "__main__":
    main()
