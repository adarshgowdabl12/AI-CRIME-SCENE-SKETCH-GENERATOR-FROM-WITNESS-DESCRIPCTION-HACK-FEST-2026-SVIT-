import { useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowDownToLine, ArrowUpRight, ChevronDown, CircleHelp, Crosshair, FilePlus2, Image, Info, LoaderCircle, LockKeyhole, MapPin, Save, ScanLine, ShieldAlert, Sparkles, TextQuote, Trash2 } from 'lucide-react'
import SceneCanvas, { SceneControls } from '../components/SceneCanvas.jsx'
import TrustLayer from '../components/TrustLayer.jsx'
import { buildTrustDetails } from '../utils/trustLayer.js'

function Provenance({ status }) {
  const label = { reported: 'WITNESS REPORTED', manual: 'MANUALLY PLACED', illustrative: 'ILLUSTRATIVE PLACEMENT', unknown: 'POSITION UNKNOWN' }[status] || 'POSITION UNKNOWN'
  return <span className={`provenance provenance-${status || 'unknown'}`}><i />{label}</span>
}

function EvidenceRow({ label, value, sourceText, onSelectSource }) {
  return <button type="button" className={`analysis-field${onSelectSource ? ' analysis-field-button' : ''}`} onClick={onSelectSource} disabled={!onSelectSource}><span className="analysis-field-head">{label}</span><span className="analysis-field-value">{value}</span>{sourceText ? <span className="source-quote source-quote-button"><TextQuote size={12} /> “{sourceText}”</span> : <span className="analysis-field-missing">No exact supporting sentence</span>}</button>
}

function AnalysisPanel({ scene, selectedId, onSelect, onSelectDetail, trustDetails, onSave, onExport, isSaved }) {
  const [expanded, setExpanded] = useState('objects')
  const toggle = (id) => setExpanded((current) => current === id ? '' : id)
  const personDescriptions = scene?.people || []
  const locations = scene?.locationLighting || []
  const observations = scene?.observations || []
  return <aside className="analysis-panel">
    <div className="panel-heading"><div><span className="mini-label">03 / OBSERVATIONS</span><h2>Analysis</h2></div><span className="analysis-mark"><ScanLine size={16} /></span></div>
    {!scene ? <div className="analysis-placeholder"><CircleHelp size={20} /><strong>Awaiting scene input</strong><span>Load a sample case or connect an analysis service to review structured details.</span></div> : <>
      <div className="analysis-summary"><div className="analysis-summary-top"><span className="mini-label">SCENE SUMMARY</span><span className={scene.isDemo ? 'demo-tag' : 'live-tag'}>{scene.isDemo ? 'SAMPLE' : 'API RESPONSE'}</span></div><p>{scene.summary || 'The analysis response did not include a scene summary.'}</p></div>
      <div className="analysis-accordions">
        <section className="analysis-section"><button className="analysis-section-toggle" onClick={() => toggle('objects')} aria-expanded={expanded === 'objects'}><span>Objects identified <i>{scene.objects?.length || 0}</i></span><ChevronDown size={15} /></button>{expanded === 'objects' && <div className="analysis-section-body">{scene.objects?.length ? scene.objects.map((object) => <button key={object.id} className={`object-analysis${selectedId === object.id ? ' object-analysis-active' : ''}`} onClick={() => onSelect(object.id)}><span className="object-analysis-name"><strong>{object.name}</strong><Provenance status={object.position?.status} /></span><span className="object-description">{object.description || 'No description supplied.'}</span>{object.sourceText && <span className="object-source"><TextQuote size={11} /> “{object.sourceText}”</span>}<span className="object-location"><MapPin size={11} />{object.position?.label || 'Position not stated'}</span></button>) : <p className="analysis-muted">No objects were returned.</p>}</div>}</section>
        <section className="analysis-section"><button className="analysis-section-toggle" onClick={() => toggle('people')} aria-expanded={expanded === 'people'}><span>People descriptions <i>{personDescriptions.length}</i></span><ChevronDown size={15} /></button>{expanded === 'people' && <div className="analysis-section-body">{personDescriptions.length ? personDescriptions.map((person, index) => { const detail = trustDetails.find((item) => item.type === 'PERSON' && item.source_text === (person.source_text || person.sourceText)); return <EvidenceRow key={`${person.description}-${index}`} label={`PERSON ${String(index + 1).padStart(2, '0')}`} value={person.description || person.text || 'Description not supplied.'} sourceText={detail?.source_text} onSelectSource={() => detail && onSelectDetail(detail)} /> }) : <p className="analysis-muted">No person details available.</p>}</div>}</section>
        <section className="analysis-section"><button className="analysis-section-toggle" onClick={() => toggle('setting')} aria-expanded={expanded === 'setting'}><span>Location &amp; lighting <i>{locations.length}</i></span><ChevronDown size={15} /></button>{expanded === 'setting' && <div className="analysis-section-body">{locations.length ? locations.map((entry, index) => { const detail = trustDetails.find((item) => item.type === 'SETTING' && item.name === entry.label); return <EvidenceRow key={`${entry.label}-${index}`} label={entry.label || 'DETAIL'} value={entry.value || entry.text || 'Not specified.'} sourceText={detail?.source_text} onSelectSource={() => detail && onSelectDetail(detail)} /> }) : <p className="analysis-muted">No location or lighting details available.</p>}</div>}</section>
        <section className="analysis-section"><button className="analysis-section-toggle" onClick={() => toggle('observations')} aria-expanded={expanded === 'observations'}><span>Explicit observations <i>{observations.length}</i></span><ChevronDown size={15} /></button>{expanded === 'observations' && <div className="analysis-section-body">{observations.length ? observations.map((entry, index) => { const detail = trustDetails.find((item) => item.type === 'OBSERVATION' && item.name === (entry.name || `Observation ${index + 1}`)); return <EvidenceRow key={`${entry.text}-${index}`} label={`OBSERVATION ${String(index + 1).padStart(2, '0')}`} value={entry.text || entry.value || ''} sourceText={detail?.source_text} onSelectSource={() => detail && onSelectDetail(detail)} /> }) : <p className="analysis-muted">No explicit observations available.</p>}</div>}</section>
        <section className="analysis-section analysis-caution"><button className="analysis-section-toggle" onClick={() => toggle('uncertainties')} aria-expanded={expanded === 'uncertainties'}><span>Uncertain details <i>{scene.uncertainties?.length || 0}</i></span><ChevronDown size={15} /></button>{expanded === 'uncertainties' && <div className="analysis-section-body">{scene.uncertainties?.length ? <ul className="caution-list">{scene.uncertainties.map((item, index) => <li key={`${item}-${index}`}>{typeof item === 'string' ? item : item.text}</li>)}</ul> : <p className="analysis-muted">No uncertainty notes supplied. This is not a confirmation of certainty.</p>}</div>}</section>
        <section className="analysis-section"><button className="analysis-section-toggle" onClick={() => toggle('missing')} aria-expanded={expanded === 'missing'}><span>Missing information <i>{scene.missingInformation?.length || 0}</i></span><ChevronDown size={15} /></button>{expanded === 'missing' && <div className="analysis-section-body">{scene.missingInformation?.length ? <ul className="caution-list">{scene.missingInformation.map((item, index) => <li key={`${item}-${index}`}>{typeof item === 'string' ? item : item.text}</li>)}</ul> : <p className="analysis-muted">No missing-information notes supplied.</p>}</div>}</section>
      </div>
      <div className="analysis-actions"><button className="button button-small button-muted" onClick={onSave}><Save size={14} />{isSaved ? 'Saved locally' : 'Save scene'}</button><button className="icon-control" onClick={onExport} aria-label="Export scene data" title="Export scene data"><ArrowDownToLine size={15} /></button></div>
      <p className="analysis-disclaimer"><ShieldAlert size={12} /> AI-assisted content requires human review.</p>
    </>}
  </aside>
}

function IllustrationUnavailable() {
  return <div className="illustration-unavailable"><div className="illustration-frame"><div className="illustration-cross"><Image size={24} strokeWidth={1.2} /></div><span>NO IMAGE PROVIDER CONNECTED</span><p>Scene illustrations are not generated in this prototype.</p><div className="illustration-placeholder-lines"><i /><i /><i /></div><button className="button button-small button-muted" disabled title="Image generation is not configured"><LockKeyhole size={13} /> Unavailable</button></div><p className="illustration-disclaimer">Illustrative reconstruction — not verified evidence.</p></div>
}

export default function Reconstruction({ scene, onSetScene, onGenerate, onLoadSample, onSave, onExport, isSaved, backendStatus, loading, error, onClearError }) {
  const [statement, setStatement] = useState(scene?.statement || '')
  const [selectedDetailId, setSelectedDetailId] = useState('')
  const [gridVisible, setGridVisible] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [mode, setMode] = useState('layout')
  const [validation, setValidation] = useState('')
  const statementRef = useRef(null)
  const trustDetails = useMemo(() => buildTrustDetails(scene, scene?.statement || statement), [scene, statement])
  const selectedDetail = trustDetails.find((detail) => detail.id === selectedDetailId)
  const selectedId = selectedDetail?.objectId || ''
  const connectionLabel = backendStatus.status === 'online'
    ? 'AI CONNECTED'
    : backendStatus.status === 'offline'
      ? 'BACKEND OFFLINE'
      : backendStatus.analysisConfigured
        ? 'ANALYSIS CONFIGURED'
        : 'DEMO MODE'

  function submit(event) {
    event.preventDefault()
    if (statement.trim().length < 20) {
      setValidation('Add at least 20 characters describing observable details.')
      return
    }
    setValidation('')
    onGenerate(statement.trim())
  }

  function updateObjectPosition(id, point) {
    if (!scene) return
    const objects = scene.objects.map((object) => object.id === id ? { ...object, position: { ...object.position, ...point, label: `${Math.round(point.x)}%, ${Math.round(point.y)}%`, status: 'manual' } } : object)
    onSetScene({ ...scene, objects })
  }

  function selectTrustDetail(detail) {
    setSelectedDetailId(detail.id)
    if (detail.source_text && statementRef.current) {
      const start = statement.indexOf(detail.source_text)
      if (start >= 0) {
        statementRef.current.focus({ preventScroll: true })
        statementRef.current.setSelectionRange(start, start + detail.source_text.length)
      }
    }
  }

  function selectSceneObject(id) {
    const detail = trustDetails.find((item) => item.type === 'OBJECT' && item.objectId === id)
    if (detail) selectTrustDetail(detail)
  }

  function loadSample() {
    setStatement('I saw a person wearing a black jacket near a broken window. The room was dimly lit, a chair was overturned, and a bag was lying near the door.')
    setValidation('')
    setSelectedDetailId('')
    onLoadSample()
  }

  return <div className="reconstruction-page page-enter">
    <header className="workspace-titlebar"><div><div className="eyebrow"><span className="eyebrow-pip" /> RECONSTRUCTION WORKSPACE</div><h1>New reconstruction</h1><p>Capture the account. Keep observation separate from interpretation.</p></div><div className="workspace-title-meta"><span className={`mode-chip${backendStatus.status === 'online' ? ' mode-chip-live' : ''}`}><i />{connectionLabel}</span><span className="workspace-index">TRACE / 001</span></div></header>
    <div className="workspace-grid">
      <section className="statement-panel">
        <div className="panel-heading"><div><span className="mini-label">01 / SOURCE</span><h2>Witness Account</h2></div><span className="panel-number">A</span></div>
        <form className="statement-form" onSubmit={submit}>
          <label htmlFor="statement-editor">Verbatim or carefully paraphrased account</label>
          <textarea ref={statementRef} id="statement-editor" value={statement} maxLength={3000} onChange={(event) => { setStatement(event.target.value); setValidation(''); setSelectedDetailId(''); if (scene) onSetScene(null); onClearError() }} placeholder="Describe what was seen or heard. Include people, objects, lighting, setting, and sequence. Keep assumptions separate from observations." aria-describedby="statement-hint statement-counter" />
          <div className="editor-meta"><span id="statement-hint"><Info size={12} /> Remove names and identifying details.</span><span id="statement-counter">{statement.length} / 3,000</span></div>
          {validation && <p className="form-error"><AlertCircle size={13} />{validation}</p>}
          <div className="statement-actions"><button className="button button-lime button-generate" type="submit" disabled={loading}><span>{loading ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}</span>{loading ? 'Analyzing...' : 'Generate Scene Analysis'}<ArrowUpRight size={14} /></button><button className="button button-muted" type="button" onClick={loadSample}><FilePlus2 size={14} />Load Sample</button><button className="icon-control clear-statement" type="button" onClick={() => { setStatement(''); setValidation(''); setSelectedDetailId(''); onSetScene(null); onClearError() }} aria-label="Clear account" title="Clear account"><Trash2 size={14} /></button></div>
        </form>
        <div className="privacy-callout"><LockKeyhole size={13} /><span>Local browser session. Avoid entering sensitive case data.</span></div>
        {!backendStatus.analysisConfigured && <div className="service-warning"><AlertCircle size={14} /><span><strong>Analysis unavailable</strong> No reconstruction endpoint is configured. Load the sample to explore the workspace.</span></div>}
        {error && <div className="service-error" role="alert"><AlertCircle size={14} /><span>{error}</span><button onClick={onClearError} aria-label="Dismiss error">×</button></div>}
      </section>

      <section className="scene-panel">
        <div className="panel-heading scene-panel-heading"><div><span className="mini-label">02 / VISUAL CONTEXT</span><h2>Scene reconstruction</h2></div><span className="schematic-badge"><i /> SCHEMATIC</span></div>
        <SceneControls gridVisible={gridVisible} onGridToggle={() => setGridVisible((visible) => !visible)} zoom={zoom} onZoom={(amount) => setZoom((current) => Math.max(.7, Math.min(1.6, current + amount * .15)))} onReset={() => { setZoom(1); setSelectedDetailId('') }} mode={mode} onMode={setMode} />
        {mode === 'layout' ? <div className="canvas-stage"><SceneCanvas objects={scene?.objects || []} selectedId={selectedId} onSelect={selectSceneObject} onMove={updateObjectPosition} gridVisible={gridVisible} zoom={zoom} />{!scene && <div className="canvas-empty"><span className="canvas-empty-icon"><Crosshair size={18} /></span><strong>Your scene, at a glance.</strong><span>Load a sample case to explore the interactive layout.</span></div>}{loading && <div className="canvas-loading"><LoaderCircle className="spin" size={23} /><span>Awaiting analysis response</span></div>}</div> : <IllustrationUnavailable />}
        <div className="canvas-legend"><span><i className="legend-reported" /> Witness reported</span><span><i className="legend-manual" /> Manually placed</span><span><i className="legend-illustrative" /> Illustrative / unknown</span><span className="legend-disclaimer">ILLUSTRATIVE · NOT VERIFIED EVIDENCE</span></div>
        {selectedId && scene?.objects.find((object) => object.id === selectedId) && <div className="selection-note"><MapPin size={12} /> Drag marker to reposition. Manual placement is clearly labeled, not a witness-reported fact.</div>}
      </section>

      <AnalysisPanel scene={scene} selectedId={selectedId} onSelect={selectSceneObject} onSelectDetail={selectTrustDetail} trustDetails={trustDetails} onSave={onSave} onExport={onExport} isSaved={isSaved} />
    </div>
    <TrustLayer statement={scene?.statement || statement} details={trustDetails} selectedDetailId={selectedDetailId} onSelectDetail={selectTrustDetail} />
    <footer className="workspace-footnote"><ShieldAlert size={13} /><span>Illustrative reconstruction — not verified evidence.</span><span className="footnote-separator" /> <span>Human review required.</span></footer>
  </div>
}