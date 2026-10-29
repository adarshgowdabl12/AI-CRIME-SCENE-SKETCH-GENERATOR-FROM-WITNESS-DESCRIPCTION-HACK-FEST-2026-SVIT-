import { useState } from 'react'
import { AlertCircle, ArrowUpRight, Check, CircleHelp, Image, LoaderCircle, LockKeyhole, RefreshCw, ScanLine, ShieldAlert, Sparkles } from 'lucide-react'
import SubjectPortrait from './SubjectPortrait.jsx'
import { generateSceneIllustration } from '../services/traceApi.js'
import './TraceWorkspace.css'

function StatusIndicator({ configured, label, model }) {
  return <div className="trace-provider-status">
    <span className={`trace-provider-indicator${configured ? ' trace-provider-ready' : ''}`} aria-hidden="true" />
    <div><strong>{label}</strong><span>{configured ? model || 'Configured; availability unverified' : 'Not configured'}</span></div>
  </div>
}

function ScenePreview({ scene, image, loading }) {
  if (image) {
    return <figure className="trace-generated-preview">
      <img src={image.image_url} alt="AI-generated illustrative scene based on the witness description" />
      <figcaption>{image.description} · {image.provider} / {image.model}</figcaption>
    </figure>
  }

  return <div className="trace-preview-art" aria-label="Illustrative scene preview" role="img">
    <div className="trace-preview-toolbar"><span>VISUAL CONTEXT</span><span>{loading ? 'RENDERING' : scene ? 'ANALYSIS READY' : 'AWAITING INPUT'}</span></div>
    <svg viewBox="0 0 640 370" aria-hidden="true">
      <defs>
        <linearGradient id="trace-room" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#18211c" />
          <stop offset="1" stopColor="#101416" />
        </linearGradient>
        <linearGradient id="trace-floor" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#181e1c" />
          <stop offset="1" stopColor="#20271f" />
        </linearGradient>
      </defs>
      <path d="M75 48 320 24l245 24v210l-245 75L75 258Z" fill="url(#trace-room)" stroke="#38463a" />
      <path d="m75 258 245 75 245-75v37l-245 53-245-53Z" fill="url(#trace-floor)" stroke="#354034" />
      <path d="m320 24 0 309M75 48l245 28 245-28M75 258l245-72 245 72" fill="none" stroke="#28332c" strokeDasharray="4 8" />
      <g fill="none" stroke="#c7ff55" strokeOpacity=".7" strokeWidth="2">
        <path d="M190 166h112v62H190zM207 228v21m78-21v21" />
        <path d="M382 156h54v78h-54zM390 156v-16h38v16" />
      </g>
      <g fill="#c7ff55">
        <circle cx="190" cy="166" r="4" /><circle cx="302" cy="166" r="4" />
        <circle cx="382" cy="156" r="4" /><circle cx="436" cy="156" r="4" />
      </g>
      <g fill="#93a18f" fontFamily="monospace" fontSize="10" letterSpacing="2">
        <text x="188" y="152">OBJECT A</text><text x="381" y="142">OBJECT B</text>
      </g>
      <g stroke="#c7ff55" strokeOpacity=".2" fill="none">
        <circle cx="320" cy="201" r="114" /><circle cx="320" cy="201" r="148" strokeDasharray="2 8" />
      </g>
      <path d="M320 190v22m-11-11h22" stroke="#c7ff55" strokeWidth="1.5" opacity=".8" />
    </svg>
    <div className="trace-preview-caption">
      <span>{scene ? 'STRUCTURED ANALYSIS READY' : 'A CLEARER VIEW OF THE ACCOUNT'}</span>
      <strong>{scene ? `${scene.objects?.length || 0} objects · ${scene.people?.length || 0} people` : 'Turn witness words into visual context.'}</strong>
      <small>{scene ? 'Generate an illustration when you are ready.' : 'The diagram is illustrative, not evidence.'}</small>
    </div>
  </div>
}

export default function TraceWorkspace({
  backendStatus,
  onRefreshBackend,
  onAnalyze,
  analysisLoading = false,
  analysisError = '',
  onClearAnalysisError,
}) {
  const [description, setDescription] = useState('')
  const [scene, setScene] = useState(null)
  const [sceneImage, setSceneImage] = useState(null)
  const [sceneLoading, setSceneLoading] = useState(false)
  const [sceneError, setSceneError] = useState('')

  async function submitAnalysis(event) {
    event.preventDefault()
    if (description.trim().length < 10 || analysisLoading) return
    setSceneError('')
    setSceneImage(null)
    const result = await onAnalyze(description.trim())
    if (result) setScene(result)
    else setScene(null)
  }

  async function createIllustration() {
    if (!scene || sceneLoading || !backendStatus?.imageGenerationConfigured) return
    setSceneLoading(true)
    setSceneError('')
    try {
      setSceneImage(await generateSceneIllustration(scene))
    } catch (error) {
      setSceneError(error.message || 'Scene illustration failed. Try again.')
    } finally {
      setSceneLoading(false)
    }
  }

  function updateDescription(value) {
    setDescription(value)
    setScene(null)
    setSceneImage(null)
    setSceneError('')
    onClearAnalysisError?.()
  }

  const backendOnline = backendStatus?.status === 'online'
  const sceneReady = Boolean(scene)

  return <div className="trace-workspace page-enter">
    <header className="trace-workspace-heading">
      <div>
        <span className="eyebrow"><span className="eyebrow-pip" /> TRACE AI / FIELD WORKSPACE</span>
        <h1>From witness words<br /><span>to visual context.</span></h1>
        <p>A focused workspace for careful scene illustration and reviewable subject composites.</p>
      </div>
      <div className="trace-health-card">
        <div className="trace-health-top">
          <span className={`trace-health-dot${backendOnline ? ' is-online' : ''}`} />
          <strong>{backendStatus?.status === 'checking' ? 'CHECKING CONNECTION' : backendOnline ? 'BACKEND CONNECTED' : 'BACKEND OFFLINE'}</strong>
          <button type="button" className="trace-refresh-button" onClick={onRefreshBackend} aria-label="Refresh backend status" title="Refresh backend status"><RefreshCw size={14} /></button>
        </div>
        <StatusIndicator configured={backendStatus?.imageGenerationConfigured} label="Gemini image generation" model={backendStatus?.imageModel} />
        <StatusIndicator configured={backendStatus?.portraitAnalysisConfigured} label="Gemini portrait analysis" model={backendStatus?.textModel} />
        {backendOnline && (backendStatus?.imageGenerationConfigured || backendStatus?.portraitAnalysisConfigured) && <span className="trace-health-note">Key and model are configured; Google quota is checked only when you request generation.</span>}
        {!backendOnline && <span className="trace-health-note">{backendStatus?.message || 'Waiting for backend health check.'}</span>}
      </div>
    </header>

    <div className="trace-workspace-grid">
      <section className="trace-work-card trace-scene-card">
        <div className="trace-card-heading">
          <span className="trace-card-index">01</span>
          <div><span className="mini-label">SCENE ILLUSTRATION</span><h2>Visualize a described scene</h2></div>
          <ScanLine size={17} />
        </div>
        <form className="trace-description-form" onSubmit={submitAnalysis}>
          <label htmlFor="trace-witness-description">Witness description</label>
          <textarea
            id="trace-witness-description"
            value={description}
            maxLength={5000}
            onChange={(event) => updateDescription(event.target.value)}
            placeholder="Describe what was seen. Keep observations separate from assumptions."
            aria-describedby="trace-description-help"
          />
          <div className="trace-input-meta"><span id="trace-description-help"><LockKeyhole size={12} /> Avoid names and identifying details.</span><span>{description.length} / 5,000</span></div>
          <button className="button button-lime trace-primary-action" type="submit" disabled={analysisLoading || description.trim().length < 10}>
            {analysisLoading ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}
            {analysisLoading ? 'Analyzing description…' : 'Analyze description'}
            {!analysisLoading && <ArrowUpRight size={14} />}
          </button>
          {analysisError && <p className="trace-inline-error" role="alert"><AlertCircle size={14} />{analysisError}</p>}
        </form>

        <ScenePreview scene={scene} image={sceneImage} loading={sceneLoading} />
        {sceneImage?.warnings?.length > 0 && <ul className="trace-warning-list">{sceneImage.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
        {sceneError && <p className="trace-inline-error" role="alert"><AlertCircle size={14} />{sceneError}</p>}
        <div className="trace-card-footer">
          <span><ShieldAlert size={13} /> Illustrative only · not verified evidence</span>
          <button type="button" className="button button-lime" onClick={createIllustration} disabled={!sceneReady || sceneLoading || !backendOnline || !backendStatus?.imageGenerationConfigured}>
            {sceneLoading ? <LoaderCircle className="spin" size={14} /> : sceneImage ? <Check size={14} /> : <Image size={14} />}
            {sceneLoading ? 'Generating…' : sceneImage ? 'Generate again' : 'Generate scene image'}
          </button>
        </div>
        {(!backendOnline || !backendStatus?.imageGenerationConfigured) && <div className="trace-config-note"><CircleHelp size={13} /> Scene image generation requires an online backend and configured Gemini image model.</div>}
      </section>

      <section className="trace-work-card trace-portrait-card">
        <div className="trace-card-heading">
          <span className="trace-card-index">02</span>
          <div><span className="mini-label">REVIEWABLE COMPOSITE</span><h2>Build from stated traits</h2></div>
          <Sparkles size={17} />
        </div>
        <div className="trace-portrait-intro">
          <p>Analyze a witness description, review exact source quotes, and confirm any edits before creating a neutral composite.</p>
          <span><Check size={13} /> User-reviewed traits only</span>
        </div>
        <SubjectPortrait backendStatus={backendStatus} />
      </section>
    </div>
    <footer className="trace-workspace-disclaimer"><ShieldAlert size={14} /><span>AI-generated illustrations are not verified evidence or an identification. Human review is required.</span><span>TRACE AI · LOCAL WORKSPACE</span></footer>
  </div>
}
