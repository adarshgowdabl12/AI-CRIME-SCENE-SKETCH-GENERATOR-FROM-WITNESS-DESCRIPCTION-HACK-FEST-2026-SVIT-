import { ArrowDownRight, ArrowRight, ArrowUpRight, AudioLines, CircleHelp, Clock3, Layers3, ScanLine, ShieldAlert, Sparkles } from 'lucide-react'
import SceneCanvas from '../components/SceneCanvas.jsx'

const steps = [
  { index: '01', title: 'Describe', detail: 'Start with what a witness actually observed.', icon: AudioLines },
  { index: '02', title: 'Structure', detail: 'Separate details, source text, and unknowns.', icon: Layers3 },
  { index: '03', title: 'Visualize', detail: 'Review a schematic without implying certainty.', icon: ScanLine },
]

export default function Dashboard({ sample, savedScenes, backendStatus, onCreate, onSample, onOpenScene, onExploreLibrary }) {
  const recent = savedScenes.slice(0, 3)
  return <div className="dashboard-page page-enter">
    <section className="hero-section">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-pip" /> FORENSIC CONTEXT, MADE VISIBLE</div>
        <h1>Turn witness accounts<br /><span>into visual context.</span></h1>
        <p>Explore witness descriptions through structured observations, scene visualization, and transparent uncertainty analysis.</p>
        <div className="hero-actions"><button className="button button-lime" onClick={onCreate}>Create Reconstruction <ArrowUpRight size={16} /></button><button className="button button-quiet" onClick={onSample}>Explore Sample Case <ArrowRight size={15} /></button></div>
        <div className="hero-ethics"><ShieldAlert size={14} /><span>Visualization aid only. Never evidence or a determination of what happened.</span></div>
      </div>
      <div className="hero-art" aria-label="Sample scene preview">
        <div className="hero-art-top"><span><i /> SAMPLE SCENE / 001</span><span>DEMO DATA</span></div>
        <div className="hero-map"><SceneCanvas objects={sample.objects} selectedId="window" onSelect={() => {}} onMove={() => {}} gridVisible zoom={1} /></div>
        <div className="hero-art-bottom"><span><span className="hero-art-dot" /> Layout schematic</span><span>ILLUSTRATIVE · NOT TO SCALE</span></div>
      </div>
      <div className="hero-index">TRACE / VISUAL INTELLIGENCE <span>NO. 001</span></div>
      <div className="hero-sideword" aria-hidden="true">OBSERVE</div>
    </section>

    <section className="workflow-strip" aria-label="Three-step workflow">
      <div className="workflow-intro"><span className="mini-label">A CLEARER PROCESS</span><h2>From statement<br />to scene context.</h2><span className="workflow-arrow"><ArrowDownRight size={18} /></span></div>
      {steps.map(({ index, title, detail, icon: Icon }) => <article className="workflow-step" key={index}><div className="workflow-step-top"><span>{index}</span><Icon size={16} /></div><h3>{title}</h3><p>{detail}</p></article>)}
    </section>

    <section className="dashboard-lower">
      <div className="recent-section">
        <div className="section-title-row"><div><span className="mini-label">YOUR WORKSPACE</span><h2>Recent scenes</h2></div><button className="inline-link" onClick={onExploreLibrary}>Open library <ArrowRight size={14} /></button></div>
        {recent.length ? <div className="recent-list">{recent.map((scene) => <button className="recent-row" key={scene.id} onClick={() => onOpenScene(scene)}><span className="recent-icon"><ScanLine size={16} /></span><span className="recent-info"><strong>{scene.title}</strong><small>{new Date(scene.savedAt || scene.createdAt).toLocaleDateString()} <i /> {scene.objects?.length || 0} objects</small></span><span className="scene-state">{scene.isDemo ? 'DEMO' : 'SAVED'}</span><ArrowUpRight size={15} className="recent-arrow" /></button>)}</div> : <div className="recent-empty"><span className="recent-icon"><Clock3 size={16} /></span><span><strong>No saved scenes yet</strong><small>Your locally saved reconstructions appear here.</small></span><button aria-label="Create your first reconstruction" onClick={onCreate}><ArrowUpRight size={16} /></button></div>}
      </div>
      <aside className="system-card"><div className="section-title-row"><div><span className="mini-label">ENVIRONMENT</span><h2>System status</h2></div><span className="status-indicator"><i className={backendStatus.status === 'online' ? 'indicator-online' : ''} />{backendStatus.status === 'online' ? 'CONNECTED' : backendStatus.status === 'offline' ? 'OFFLINE' : 'DEMO MODE'}</span></div><div className="system-line"><span>Scene analysis</span><strong className="system-unavailable"><i />{backendStatus.analysisConfigured ? (backendStatus.status === 'online' ? 'Endpoint configured' : 'Endpoint unavailable') : 'Not configured'}</strong></div><div className="system-line"><span>Health check</span><strong className={backendStatus.status === 'online' ? 'system-ok' : ''}><i />{backendStatus.healthConfigured ? backendStatus.message : 'Not configured'}</strong></div><p><Sparkles size={13} /> The layout canvas and sample case work without an AI service.</p></aside>
    </section>

    <section className="product-note"><span className="note-mark"><CircleHelp size={17} /></span><div><span className="mini-label">WHAT TRACE AI IS FOR</span><p>A structured way to examine witness descriptions. TRACE AI does not identify people, establish guilt, or determine what actually happened.</p></div><span className="note-tail">HUMAN REVIEW<br />ALWAYS REQUIRED</span></section>
  </div>
}