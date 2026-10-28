import { useState } from 'react'
import { Activity, AlertTriangle, ArrowUpRight, Check, ChevronDown, Clock3, Crosshair, FileText, Fingerprint, History, Info, MapPin, Menu, Plus, ScanLine, Shield, Sparkles, Target, Upload, X } from 'lucide-react'
import './App.css'

const demo = {
  caseId: 'FG-2025-0842',
  title: 'Riverside Gallery — North entrance',
  description: 'It was just after 9:15 pm when I saw someone leave through the north entrance. They had a dark jacket and were carrying a canvas bag. The glass panel by the door looked cracked, and there was a bicycle leaning near the alley wall. I also noticed a small metal object on the floor inside.',
  summary: 'A witness describes a person leaving through the north entrance shortly after 9:15 pm. A cracked glass panel, a nearby bicycle, and a small metal object inside the entrance were also observed.',
  objects: [
    { name: 'Cracked glass panel', type: 'Structural feature', confidence: 96 },
    { name: 'Canvas bag', type: 'Personal item', confidence: 91 },
    { name: 'Bicycle', type: 'Transport', confidence: 87 },
    { name: 'Small metal object', type: 'Unspecified item', confidence: 74 },
  ],
  notes: [
    'The witness did not specify the person’s height, age, or direction of travel after leaving.',
    'The small metal object is not described in enough detail to identify.',
    'The exact location and extent of glass damage should be independently verified.',
  ],
}

const navigation = [
  { name: 'Dashboard', icon: Activity },
  { name: 'New Reconstruction', icon: Plus },
  { name: 'Scene History', icon: History },
  { name: 'About', icon: Info },
]

function Sidebar({ activeItem, onNavigate, isOpen, onClose }) {
  return <>
    {isOpen && <button className="sidebar-scrim" onClick={onClose} aria-label="Close navigation" />}
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <a className="brand" href="#dashboard"><span className="brand-mark"><Crosshair size={19} /></span><span className="brand-copy">FIELDNOTE<span>FORENSIC INTELLIGENCE</span></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="navigation" aria-label="Main navigation">{navigation.map(({ name, icon: Icon }) => <button className={`nav-item${activeItem === name ? ' nav-item-active' : ''}`} key={name} onClick={() => onNavigate(name)} aria-current={activeItem === name ? 'page' : undefined}><Icon size={17} /><span>{name}</span>{name === 'Scene History' && <span className="nav-count">0</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="offline-status"><span className="status-dot" />LOCAL WORKSPACE</div><div className="profile-row"><div className="profile-avatar">JD</div><div className="profile-copy"><strong>Investigator</strong><span>Field analyst</span></div><ChevronDown size={15} /></div></div>
    </aside>
  </>
}

function SectionHeading({ icon: Icon, eyebrow, title, action }) {
  return <div className="section-heading"><div className="section-heading-left"><span className="section-icon"><Icon size={16} /></span><div><span className="section-eyebrow">{eyebrow}</span><h2>{title}</h2></div></div>{action}</div>
}

function EmptyState({ icon: Icon, title, detail }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={21} /></span><strong>{title}</strong><span>{detail}</span></div>
}

function SceneMap({ hasObjects }) {
  return <div className="scene-map" aria-label="Illustrative top-down scene layout"><div className="map-grid" /><div className="map-compass"><span>N</span><ArrowUpRight size={17} /></div><div className="map-room room-gallery"><span>GALLERY FLOOR</span></div><div className="map-room room-foyer"><span>NORTH FOYER</span></div><div className="map-wall wall-horizontal" /><div className="map-wall wall-vertical" /><div className="map-door"><span>ENTRY</span></div><div className="map-alley">SERVICE ALLEY</div>{hasObjects && <><span className="map-pin pin-glass"><span><ScanLine size={12} /></span><small>GLASS</small></span><span className="map-pin pin-object"><span><Target size={12} /></span><small>ITEM</small></span><span className="map-pin pin-bicycle"><span><Crosshair size={12} /></span><small>BIKE</small></span><span className="route-line" /></>}<div className="map-scale"><span /> 5 M</div></div>
}

function App() {
  const [incident, setIncident] = useState(null)
  const [description, setDescription] = useState('')
  const [activeItem, setActiveItem] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')

  function loadDemo() {
    setDescription(demo.description)
    setIncident(demo)
    setNotice('Fictional demo scene loaded. No real case data is being used.')
  }

  function startNew() {
    setDescription('')
    setIncident(null)
    setNotice('')
    setActiveItem('New Reconstruction')
  }

  function generateScene(event) {
    event.preventDefault()
    setNotice(description.trim() ? 'Scene generation is not connected yet. Your description remains in this local prototype.' : 'Enter a witness description or load the fictional demo first.')
  }

  function navigate(name) {
    setActiveItem(name)
    setSidebarOpen(false)
    if (name === 'New Reconstruction') startNew()
    else if (name === 'Dashboard') setNotice('')
    else if (name === 'Scene History') setNotice('Scene history is empty. Scenes will appear here once saved.')
    else setNotice('Fieldnote is a local prototype for organizing witness descriptions. It does not generate evidence or replace forensic analysis.')
  }

  return <div className="app-shell" id="dashboard">
    <Sidebar activeItem={activeItem} onNavigate={navigate} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="breadcrumb"><span>WORKSPACE</span><span className="breadcrumb-slash">/</span><strong>{activeItem.toUpperCase()}</strong></div><div className="topbar-right"><span className="secure-label"><Shield size={14} /> PRIVATE WORKSPACE</span><span className="topbar-divider" /><span className="topbar-date">OCT 28, 2026</span></div></header>
      <div className="content-wrap">
        <div className="page-heading"><div><div className="page-eyebrow"><span className="eyebrow-line" /> INVESTIGATION WORKSPACE</div><h1>AI Crime Scene Reconstruction</h1><p>Translate witness accounts into a structured scene overview.</p></div><div className="case-chip"><Fingerprint size={16} /><span>NEW CASE</span><span className="case-chip-dot" /></div></div>
        <section className="intake-panel" aria-labelledby="intake-title"><div className="intake-header"><div><span className="panel-kicker">01 / CASE INTAKE</span><h2 id="intake-title">Witness description</h2></div><button type="button" className="text-button" onClick={() => setDescription('')} disabled={!description}><X size={14} /> Clear</button></div><form onSubmit={generateScene}><label className="sr-only" htmlFor="witness-description">Witness account of the incident</label><textarea id="witness-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what the witness observed. Include the setting, people, objects, and sequence of events..." maxLength={1500} /><div className="textarea-footer"><span><Info size={13} /> Avoid including personally identifying information.</span><span>{description.length} / 1,500</span></div><div className="form-actions"><button type="submit" className="button-primary"><Sparkles size={16} /> Generate Scene <ArrowUpRight size={15} /></button><button type="button" className="button-secondary" onClick={loadDemo}><Upload size={15} /> Load Demo</button><span className="local-note"><span className="status-dot" /> LOCAL PROTOTYPE</span></div></form></section>
        {notice && <div className="notice" role="status"><Info size={15} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}
        <div className="results-heading"><div><span className="panel-kicker">02 / SCENE ANALYSIS</span><h2>Reconstruction overview</h2></div><span className={`result-status${incident ? ' result-status-ready' : ''}`}><span />{incident ? 'DEMO DATA' : 'AWAITING DESCRIPTION'}</span></div>
        <div className="results-grid">
          <section className="result-panel summary-panel"><SectionHeading icon={FileText} eyebrow="CASE OVERVIEW" title="Scene Summary" action={incident && <span className="case-reference">{incident.caseId}</span>} />{incident ? <div className="summary-content"><h3>{incident.title}</h3><div className="summary-meta"><span><MapPin size={13} /> North District</span><span><Clock3 size={13} /> 9:15 PM · Witness reported</span></div><p>{incident.summary}</p><div className="summary-foot"><span className="summary-foot-icon"><Check size={13} /></span><span>Summary reflects witness account only</span></div></div> : <EmptyState icon={FileText} title="No scene summary yet" detail="Load the demo to preview a fictional scene." />}</section>
          <section className="result-panel objects-panel"><SectionHeading icon={ScanLine} eyebrow="DETECTED DETAILS" title="Objects Identified" action={incident && <span className="object-count">{incident.objects.length} ITEMS</span>} />{incident ? <div className="objects-list">{incident.objects.map((object, index) => <div className="object-row" key={object.name}><span className="object-index">0{index + 1}</span><div className="object-info"><strong>{object.name}</strong><span>{object.type}</span></div><div className="confidence"><span>{object.confidence}%</span><span className="confidence-track"><span style={{ width: `${object.confidence}%` }} /></span></div></div>)}</div> : <EmptyState icon={Target} title="Nothing identified" detail="Detected details will appear here." />}</section>
          <section className="result-panel visualization-panel"><SectionHeading icon={Crosshair} eyebrow="SPATIAL OVERVIEW" title="Scene Visualization" action={<span className="map-label"><span /> SCHEMATIC</span>} />{incident ? <SceneMap hasObjects /> : <div className="map-empty"><SceneMap hasObjects={false} /><div className="map-empty-overlay"><span className="map-empty-icon"><MapPin size={17} /></span><strong>Scene visualization</strong><span>A schematic will appear when scene data is available.</span></div></div>}<div className="map-footer"><span><span className="legend-dot legend-verified" /> Witness detail</span><span><span className="legend-dot legend-route" /> Reported route</span><span className="map-disclaimer">ILLUSTRATIVE · NOT TO SCALE</span></div></section>
          <section className="result-panel uncertainty-panel"><SectionHeading icon={AlertTriangle} eyebrow="REVIEW REQUIRED" title="Uncertainty Notes" action={incident && <span className="review-badge"><AlertTriangle size={12} /> REVIEW</span>} />{incident ? <div className="uncertainty-content"><div className="uncertainty-intro"><span className="uncertainty-mark"><AlertTriangle size={15} /></span><p>Details below are unconfirmed and require independent verification.</p></div><ul>{incident.notes.map((note) => <li key={note}>{note}</li>)}</ul><div className="human-review"><Shield size={14} /><span>AI-assisted output requires human review</span></div></div> : <EmptyState icon={AlertTriangle} title="No notes to review" detail="Uncertainties will be listed alongside scene data." />}</section>
        </div>
        <footer className="page-footer"><span><span className="footer-mark"><Crosshair size={12} /></span> FIELDNOTE <span className="footer-divider">/</span> FORENSIC INTELLIGENCE</span><span>PROTOTYPE · FICTIONAL DATA ONLY</span></footer>
      </div>
    </main>
  </div>
}

export default App
