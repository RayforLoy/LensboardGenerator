// SPDX-License-Identifier: GPL-3.0-only
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { actualDiameter, defaultProject, newHole, parseProject, patternHoles, presets, SOURCE_URL, GENERATOR_SOURCE_URL, validate, type Project, type Hole, type Face } from './domain/project';
import { templates, templateById } from './templates';
import { translator, errorText, type Key, type Language } from './i18n';
import { useCad } from './features/useCad';
import { Viewport } from './features/Viewport';
import { download, downloadPackage, fileStem } from './features/download';
import { initialTheme, PROJECT_ISSUES_URL, type Theme } from './features/preferences';
import './style.css';

function NumberField({ label, value, onChange, unit = 'mm', step = 0.1, min }: { label: string; value: number; onChange(v: number): void; unit?: string; step?: number; min?: number }) {
  return <label className="number-field"><span>{label}</span><div><input aria-label={label} type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ''} step={step} min={min} onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))} /><small>{unit}</small></div></label>;
}
function Check({ label, checked, onChange, testId }: { label: string; checked: boolean; onChange(v: boolean): void; testId?: string }) {
  return <label className="check"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} data-testid={testId} /><span>{label}</span></label>;
}
function FaceSelect({ face, onChange, t }: { face: Face; onChange(v: Face): void; t: (k: Key) => string }) {
  return <label className="select-field"><span>{t('face')}</span><select value={face} onChange={e => onChange(e.target.value as Face)}><option value="front">{t('front')}</option><option value="back">{t('back')}</option></select></label>;
}
function initialProject(): Project {
  try { const value = localStorage.getItem('lensboard-project-v1'); if (value) return parseProject(JSON.parse(value), templates.map(t => t.id)); } catch { /* Invalid stored data is never partially applied. */ }
  return defaultProject();
}
function initialLanguage(): Language {
  try { return localStorage.getItem('lensboard-language') === 'en' ? 'en' : 'zh-CN'; } catch { return 'zh-CN'; }
}

export default function App() {
  const [history, setHistory] = useState<{ past: Project[]; present: Project; future: Project[] }>(() => ({ past: [], present: initialProject(), future: [] }));
  const p = history.present;
  const [language, setLanguage] = useState<Language>(initialLanguage), [banner, setBanner] = useState<Key>();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [acceptWarnings, setAcceptWarnings] = useState(false), [packaging, setPackaging] = useState(false);
  const importInput = useRef<HTMLInputElement>(null), t = translator(language);
  const cad = useCad(p, (format, bytes, snapshot) => {
    setPackaging(true);
    void downloadPackage(format, bytes, snapshot).catch(() => setBanner('error_template')).finally(() => setPackaging(false));
  });
  function update(recipe: (draft: Project) => void) {
    setHistory(h => { const next = structuredClone(h.present); recipe(next); if (JSON.stringify(next) === JSON.stringify(h.present)) return h; return { past: [...h.past, h.present].slice(-50), present: next, future: [] }; });
  }
  function replace(next: Project) { setHistory(h => ({ past: [...h.past, h.present].slice(-50), present: next, future: [] })); }
  function undo() { setHistory(h => h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h); }
  function redo() { setHistory(h => h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h); }
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111b17' : '#f5f6f1');
    try { localStorage.setItem('lensboard-theme', theme); } catch { /* Theme still works without storage. */ }
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = language; document.title = `${t('title')} · Lensboard Studio`;
    try { localStorage.setItem('lensboard-language', language); } catch { setBanner('storage'); }
  }, [language]);
  useEffect(() => {
    setAcceptWarnings(false);
    if (validate(p).length) return;
    try { localStorage.setItem('lensboard-project-v1', JSON.stringify(p)); } catch { setBanner('storage'); }
  }, [p]);
  const selected = templateById(p.templateId)!;
  const busy = cad.state === 'loading' || cad.state === 'building' || cad.state === 'exporting' || packaging;
  const effective = actualDiameter(p);
  const canExport = cad.ready && acceptWarnings && !packaging;
  const model = cad.model;
  const field = (label: Key, value: number, set: (draft: Project, value: number) => void, unit = 'mm', step = 0.1, min?: number) => <NumberField label={t(label)} value={value} onChange={v => update(d => set(d, v))} unit={unit} step={step} min={min} />;
  async function importFile(file: File) {
    try {
      if (file.size > 1024 * 1024) throw Error();
      const next = parseProject(JSON.parse(await file.text()), templates.map(t => t.id));
      if (window.confirm(t('importConfirm'))) { replace(next); setBanner(undefined); }
    } catch { setBanner('invalidProject'); }
  }
  function editHole(id: string, recipe: (hole: Hole) => void) { update(d => { const hole = d.holes.find(h => h.id === id); if (hole) recipe(hole); }); }
  return <>
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">◈</span><span>LENSBOARD<span className="brand-secondary"> STUDIO</span></span><small>v0.1 / ALPHA</small></a>
      <div className="top-actions"><span className="privacy"><span className="live-dot" />{t('privacy')}</span><a className="report-button" href={PROJECT_ISSUES_URL} target="_blank" rel="noopener noreferrer" aria-label={t('reportHint')} title={t('reportHint')} data-testid="report-link">Report ↗</a><button className="theme-button" aria-label={t(theme === 'dark' ? 'switchLight' : 'switchDark')} title={t(theme === 'dark' ? 'switchLight' : 'switchDark')} aria-pressed={theme === 'dark'} onClick={() => setTheme(value => value === 'dark' ? 'light' : 'dark')} data-testid="theme-toggle">◐ {t('theme')}</button><div className="language" role="group" aria-label={t('language')}><button aria-pressed={language === 'zh-CN'} onClick={() => setLanguage('zh-CN')}>中文</button><button aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button></div></div>
    </header>
    <main>
      <section className="intro"><div><p className="eyebrow">PARAMETRIC DESIGN / LARGE FORMAT</p><h1>{t('title')}</h1><p>{t('subtitle')}</p></div><span className="intro-tag">STEP → B-REP → STEP / STL</span></section>
      {banner && <div className="banner" role="alert">{t(banner)}<button aria-label={t('remove')} onClick={() => setBanner(undefined)}>×</button></div>}
      <div className="workspace">
        <aside className="editor">
          <div className="segmented" role="group" aria-label={t('template')}>{(['board', 'flange'] as const).map(kind => <button key={kind} aria-pressed={p.kind === kind} onClick={() => update(d => { d.kind = kind; })}>{t(kind)}</button>)}</div>
          {p.kind === 'board' ? <section className="panel">
            <h2><span>01</span>{t('template')}</h2>
            <select className="template-select" aria-label={t('template')} value={p.templateId} onChange={e => update(d => { d.templateId = e.target.value; d.templateVersion = '1'; })}>{templates.map(item => <option value={item.id} key={item.id}>{item.name} · {t(item.variant)}</option>)}</select>
            <div className="template-note"><span>STEP / GPL v3</span><small>{t('experimental')}</small></div>
          </section> : <section className="panel"><h2><span>01</span>{t('flange')}</h2><div className="field-grid">
            {field('outer', p.flange.diameter, (d, v) => { d.flange.diameter = v; })}
            {field('thickness', p.flange.thickness, (d, v) => { d.flange.thickness = v; })}
            {field('stepDiameter', p.flange.stepDiameter, (d, v) => { d.flange.stepDiameter = v; })}
            {field('stepHeight', p.flange.stepHeight, (d, v) => { d.flange.stepHeight = v; })}
            {field('slotCount', p.flange.slotCount, (d, v) => { d.flange.slotCount = v; }, '', 1)}
            {field('slotWidth', p.flange.slotWidth, (d, v) => { d.flange.slotWidth = v; })}
            {field('slotDepth', p.flange.slotDepth, (d, v) => { d.flange.slotDepth = v; })}
            {field('slotAngle', p.flange.slotAngle, (d, v) => { d.flange.slotAngle = v; }, '°', 1)}
          </div></section>}
          <section className="panel">
            <h2><span>02</span>{t('central')}</h2>
            <Check label={t('enabled')} checked={p.central.enabled} onChange={v => update(d => { d.central.enabled = v; })} />
            {p.central.enabled && <>
              <div className="segmented modes">{(['plain', 'thread'] as const).map(mode => <button key={mode} aria-pressed={p.central.mode === mode} onClick={() => update(d => { d.central.mode = mode; })}>{t(mode)}</button>)}</div>
              {p.central.mode === 'plain' ? <>
                <label className="select-field"><span>{t('preset')}</span><select aria-label={t('preset')} value={presets.find(s => s.id === p.central.presetId)?.diameter === p.central.diameter ? p.central.presetId : 'custom'} onChange={e => update(d => { const s = presets.find(s => s.id === e.target.value); d.central.presetId = s?.id ?? 'custom'; if (s) d.central.diameter = s.diameter; })}><option value="custom">{t('custom')}</option>{presets.map(s => <option key={s.id} value={s.id}>{s.name} / {s.diameter.toFixed(1)} mm</option>)}</select></label>
                {field('nominal', p.central.diameter, (d, v) => { d.central.diameter = v; })}
                {p.kind === 'board' && <div className={`print-option ${p.central.print.enabled ? 'active' : ''}`}>
                  <Check label={t('print')} checked={p.central.print.enabled} onChange={v => update(d => { d.central.print.enabled = v; })} testId="print-checkbox" />
                  {p.central.print.enabled && field('allowance', p.central.print.diameterAllowanceMm, (d, v) => { d.central.print.diameterAllowanceMm = v; }, 'mm', 0.1, 0.01)}
                  <p>{t('printHint')}</p>
                </div>}
                <div className="diameter-result"><span>{t('actual')}</span><output data-testid="actual-diameter">{Number.isFinite(effective) ? effective.toFixed(2) : '—'}<small> mm</small></output></div>
              </> : <>
                <div className="field-grid">{field('major', p.central.thread.diameter, (d, v) => { d.central.thread.diameter = v; d.central.thread.confirmed = false; })}{field('pitch', p.central.thread.pitch, (d, v) => { d.central.thread.pitch = v; d.central.thread.confirmed = false; })}{field('length', p.central.thread.length, (d, v) => { d.central.thread.length = v; })}{field('clearance', p.central.thread.clearance, (d, v) => { d.central.thread.clearance = v; })}</div>
                <p className="thread-spec">M{p.central.thread.diameter} × {p.central.thread.pitch} / {p.central.thread.leftHand ? 'LH' : 'RH'}</p>
                <Check label={t('leftHand')} checked={p.central.thread.leftHand} onChange={v => update(d => { d.central.thread.leftHand = v; })} />
                <label className="select-field"><span>{t('threadMode')}</span><select value={p.central.thread.mode} onChange={e => update(d => { d.central.thread.mode = e.target.value as 'modeled' | 'tapDrill'; })}><option value="modeled">{t('modeled')}</option><option value="tapDrill">{t('tapDrill')}</option></select></label>
                {p.central.thread.mode === 'tapDrill' && field('tapDiameter', p.central.thread.tapDiameter, (d, v) => { d.central.thread.tapDiameter = v; })}
                <Check label={t('confirm')} checked={p.central.thread.confirmed} onChange={v => update(d => { d.central.thread.confirmed = v; })} />
                <p className="help">{t('threadHint')}</p>
              </>}
              <div className="field-grid">{field('x', p.central.x, (d, v) => { d.central.x = v; })}{field('y', p.central.y, (d, v) => { d.central.y = v; })}</div>
            </>}
          </section>
          <details className="panel" open={p.holes.length > 0}><summary><span>03</span>{t('holes')}<small>{p.holes.length}</small></summary>
            {!p.holes.length && <p className="help">{t('emptyHoles')}</p>}
            {p.holes.map((h, i) => <div className="hole-card" key={h.id} data-testid={`hole-${i}`}>
              <div className="hole-heading"><Check label={`${t('hole')} ${i + 1}`} checked={h.enabled} onChange={v => editHole(h.id, d => { d.enabled = v; })} /><div><button title={t('copy')} onClick={() => update(d => { d.holes.push({ ...h, id: crypto.randomUUID(), x: h.x + 8 }); })}>⧉</button><button aria-label={`${t('remove')} ${t('hole')} ${i + 1}`} onClick={() => update(d => { d.holes = d.holes.filter(item => item.id !== h.id); })}>×</button></div></div>
              <select aria-label={`${t('holeType')} ${i + 1}`} value={h.kind} onChange={e => editHole(h.id, d => { d.kind = e.target.value as Hole['kind']; })}>{(['through', 'blind', 'countersink', 'counterbore'] as const).map(k => <option value={k} key={k}>{t(k)}</option>)}</select>
              <div className="field-grid"><NumberField label={t('diameter')} value={h.diameter} onChange={v => editHole(h.id, d => { d.diameter = v; })} /><NumberField label={t('x')} value={h.x} onChange={v => editHole(h.id, d => { d.x = v; })} /><NumberField label={t('y')} value={h.y} onChange={v => editHole(h.id, d => { d.y = v; })} />
                {h.kind !== 'through' && <FaceSelect face={h.face} onChange={v => editHole(h.id, d => { d.face = v; })} t={t} />}
                {(h.kind === 'blind' || h.kind === 'counterbore') && <NumberField label={t('depth')} value={h.depth} onChange={v => editHole(h.id, d => { d.depth = v; })} />}
                {(h.kind === 'countersink' || h.kind === 'counterbore') && <NumberField label={t('recessDiameter')} value={h.recessDiameter} onChange={v => editHole(h.id, d => { d.recessDiameter = v; })} />}
                {h.kind === 'countersink' && <NumberField label={t('angle')} value={h.angle} unit="°" onChange={v => editHole(h.id, d => { d.angle = v; })} />}
              </div>
            </div>)}
            <button className="add-button" disabled={p.holes.length >= 100} onClick={() => update(d => { d.holes.push(newHole()); })}>＋ {t('addHole')}</button>
          </details>
          <details className="panel"><summary><span>04</span>{t('pattern')}</summary>
            <Check label={t('enabled')} checked={p.pattern.enabled} onChange={v => update(d => { d.pattern.enabled = v; })} />
            <div className="field-grid">{field('count', p.pattern.count, (d, v) => { d.pattern.count = v; }, '', 1)}{field('pcd', p.pattern.pcd, (d, v) => { d.pattern.pcd = v; })}{field('diameter', p.pattern.diameter, (d, v) => { d.pattern.diameter = v; })}{field('startAngle', p.pattern.startAngle, (d, v) => { d.pattern.startAngle = v; }, '°', 1)}{field('x', p.pattern.x, (d, v) => { d.pattern.x = v; })}{field('y', p.pattern.y, (d, v) => { d.pattern.y = v; })}</div>
            <Check label={t('patternSink')} checked={p.pattern.countersink} onChange={v => update(d => { d.pattern.countersink = v; })} />
            {p.pattern.countersink && <div className="field-grid">{field('recessDiameter', p.pattern.recessDiameter, (d, v) => { d.pattern.recessDiameter = v; })}{field('angle', p.pattern.angle, (d, v) => { d.pattern.angle = v; }, '°', 1)}<FaceSelect face={p.pattern.face} onChange={v => update(d => { d.pattern.face = v; })} t={t} /></div>}
          </details>
          <details className="panel"><summary><span>05</span>{t('seat')}</summary>
            <Check label={t('enabled')} checked={p.seat.enabled} onChange={v => update(d => { d.seat.enabled = v; })} />
            <div className="field-grid">{field('seatDiameter', p.seat.diameter, (d, v) => { d.seat.diameter = v; })}{field('remaining', p.seat.remainingThickness, (d, v) => { d.seat.remainingThickness = v; })}<FaceSelect face={p.seat.face} onChange={v => update(d => { d.seat.face = v; })} t={t} /></div>
          </details>
        </aside>
        <section className="preview-area">
          <div className="preview-toolbar"><span>{p.kind === 'board' ? `${selected.name} / ${t(selected.variant)}` : t('flange')}</span><div><button disabled={!history.past.length} onClick={undo}>↶ {t('undo')}</button><button disabled={!history.future.length} onClick={redo}>↷ {t('redo')}</button><button onClick={() => { if (window.confirm(t('resetConfirm'))) replace(defaultProject()); }}>{t('reset')}</button></div></div>
          <div className="preview-shell"><Viewport model={model} language={language} /><div className={`model-status ${cad.ready ? 'ready' : ''}`} role="status" data-testid="model-status">{busy && <span className="spinner" />}{t(packaging ? 'exporting' : cad.state)}{model && cad.ready && <small>{(model.elapsedMs / 1000).toFixed(2)} s</small>}</div></div>
          {(cad.error || cad.issues.length > 0) && <div className="error-card" role="alert">{cad.issues.map((issue, i) => <p key={i}>{issue.feature ? `${issue.feature}: ` : ''}{errorText(issue.code, language)}</p>)}{cad.error && <p>{cad.error.feature ? `${cad.error.feature}: ` : ''}{errorText(cad.error.code, language)}</p>}<button onClick={cad.retry}>{t('retry')}</button></div>}
          <div className="preview-bottom">
            <section className="plot-panel"><h2>{t('plot')}<small>XY / mm</small></h2><HolePlot project={p} radius={p.kind === 'board' ? selected.editableRadius : p.flange.diameter / 2} bounds={model?.bounds} onPosition={(x, y) => update(d => { d.central.x = x; d.central.y = y; })} label={t('selectPosition')} /><p className="help">{t('protectedHint')}</p></section>
            <section className="metrics-panel"><h2>{t('dimensions')}</h2><div className="dimension-numbers">{model ? `${(model.bounds[1][0] - model.bounds[0][0]).toFixed(1)} × ${(model.bounds[1][1] - model.bounds[0][1]).toFixed(1)}` : '—'}<small>mm</small></div><dl><div><dt>{t('localThickness')}</dt><dd>{model?.localThickness.toFixed(2) ?? '—'} mm</dd></div><div><dt>{t('solids')}</dt><dd>{model?.solidCount ?? '—'}</dd></div><div><dt>{t('volume')}</dt><dd>{model ? (model.volume / 1000).toFixed(2) : '—'} cm³</dd></div></dl><a href={SOURCE_URL} target="_blank" rel="noreferrer">{t('source')} ↗</a><p className="help">{t('sourceHint')}</p></section>
          </div>
          <section className="export-panel"><div><h2>{t('export')}</h2><p>{t('packageHint')}</p></div><div className="export-options"><label className="select-field"><span>{t('quality')}</span><select value={p.meshQuality} onChange={e => update(d => { d.meshQuality = e.target.value as Project['meshQuality']; })}><option value="standard">{t('standard')}</option><option value="fine">{t('fine')}</option></select></label><div className="export-buttons"><button className="primary-button" disabled={!canExport} onClick={() => cad.exportModel('step')} data-testid="export-step">↓ {t('step')}</button><button disabled={!canExport} onClick={() => cad.exportModel('stl')} data-testid="export-stl">↓ {t('stl')}</button></div></div></section>
          <section className="manufacturing-note"><h3>{t('warnings')}</h3><p>{t('caution')}</p>{model?.warnings.filter(w => w.code !== 'experimental').map((w, i) => <p key={i}>{w.feature}: {errorText(w.code, language)}</p>)}<Check label={t('acceptWarnings')} checked={acceptWarnings} onChange={setAcceptWarnings} testId="accept-warnings" /></section>
          <div className="project-actions"><button disabled={validate(p).length > 0} onClick={() => download(`${fileStem(p)}.json`, JSON.stringify(p, null, 2), 'application/json')}>{t('json')}</button><button onClick={() => importInput.current?.click()}>{t('import')}</button><input ref={importInput} type="file" accept=".json,application/json" hidden onChange={e => { const file = e.target.files?.[0]; if (file) void importFile(file); e.target.value = ''; }} /><a href={`${import.meta.env.BASE_URL}LICENSE`} target="_blank" rel="noreferrer">{t('license')} ↗</a></div>
        </section>
      </div>
    </main><footer><span>LENSBOARD STUDIO / OPEN DESIGN</span><a href={`${import.meta.env.BASE_URL}THIRD_PARTY_NOTICES.md`} target="_blank" rel="noreferrer">{t('thirdParty')}</a>{GENERATOR_SOURCE_URL && <a href={GENERATOR_SOURCE_URL} target="_blank" rel="noreferrer">{t('generatorSource')} ↗</a>}<span>mm · GPL-3.0-only · v0.1.0</span></footer>
  </>;
}

function HolePlot({ project, radius, bounds, onPosition, label }: { project: Project; radius: number; bounds?: [[number, number, number], [number, number, number]]; onPosition(x: number, y: number): void; label: string }) {
  const size = Math.max(bounds ? Math.max(bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]) + 12 : radius * 2 + 20, 60);
  const half = size / 2, c = project.central, diameter = c.mode === 'plain' ? actualDiameter(project) : c.thread.diameter;
  const holes = [...project.holes.filter(h => h.enabled), ...patternHoles(project.pattern)].filter(h => Number.isFinite(h.x + h.y + h.diameter) && h.diameter > 0);
  return <svg className="hole-plot" viewBox={`${-half} ${-half} ${size} ${size}`} role="img" aria-label={label} onClick={e => {
    const svg = e.currentTarget, point = svg.createSVGPoint(); point.x = e.clientX; point.y = e.clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return; const local = point.matrixTransform(ctm.inverse());
    onPosition(Math.round(local.x * 10) / 10, -Math.round(local.y * 10) / 10);
  }}>
    <defs><pattern id="plot-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e0e5df" strokeWidth="0.35" /></pattern></defs>
    <rect x={-half} y={-half} width={size} height={size} fill="url(#plot-grid)" />
    <g transform="scale(1,-1)">
      <line x1={-half} y1="0" x2={half} y2="0" stroke="#b0bbb1" strokeWidth="0.4" /><line x1="0" y1={-half} x2="0" y2={half} stroke="#b0bbb1" strokeWidth="0.4" />
      {Number.isFinite(radius) && <circle r={radius} fill="none" stroke="#74958a" strokeWidth="0.6" strokeDasharray="2 2" />}
      {project.seat.enabled && Number.isFinite(project.seat.diameter + c.x + c.y) && <circle cx={c.x} cy={c.y} r={project.seat.diameter / 2} fill="none" stroke="#bbaa87" strokeWidth="0.7" />}
      {c.enabled && Number.isFinite(diameter + c.x + c.y) && diameter > 0 && <><circle cx={c.x} cy={c.y} r={diameter / 2} fill="#d6e4db" fillOpacity="0.65" stroke="#315b48" strokeWidth="0.8" /><path d={`M ${c.x-2} ${c.y} h 4 M ${c.x} ${c.y-2} v 4`} stroke="#315b48" strokeWidth="0.5" /></>}
      {holes.map(h => <g key={h.id}><circle cx={h.x} cy={h.y} r={h.diameter / 2} fill="#f1dfc7" stroke="#997c55" strokeWidth="0.7" />{['countersink', 'counterbore'].includes(h.kind) && h.recessDiameter > 0 && <circle cx={h.x} cy={h.y} r={h.recessDiameter / 2} fill="none" stroke="#997c55" strokeWidth="0.4" />}</g>)}
    </g>
    <text x={half-7} y="-2" fontSize="4" fill="#779185">X</text><text x="2" y={-half+7} fontSize="4" fill="#779185">Y</text>
  </svg>;
}
