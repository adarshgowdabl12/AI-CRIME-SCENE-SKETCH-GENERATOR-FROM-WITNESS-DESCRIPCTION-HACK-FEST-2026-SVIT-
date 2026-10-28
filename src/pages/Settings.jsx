import { useState } from 'react'
import { Activity, Check, Info, RefreshCw, Shield, SlidersHorizontal } from 'lucide-react'

function connectionState(status) {
  if (status.status === 'online') return 'ONLINE'
  if (status.status === 'checking') return 'CHECKING'
  return 'OFFLINE'
}

function imageState(status) {
  if (status.status === 'checking') return 'CHECKING'
  if (status.status !== 'online') return 'UNAVAILABLE'
  return status.imageGenerationConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'
}

export default function Settings({ status, onRefresh }) {
  const [checking, setChecking] = useState(false)
  async function refresh() {
    setChecking(true)
    await onRefresh()
    setChecking(false)
  }
  return <div className="settings-page page-enter"><header className="page-header-block"><div><div className="eyebrow"><span className="eyebrow-pip" /> PREFERENCES &amp; CONNECTIONS</div><h1>Settings</h1><p>Inspect available integrations and local data behavior.</p></div></header>
    <section className="settings-section"><div className="settings-section-title"><span className="settings-icon"><Activity size={17} /></span><div><h2>Backend connection</h2><p>Health is checked every five seconds. Image configuration is reported separately.</p></div></div><div className="settings-row"><div className="settings-row-copy"><strong>Health check</strong><span>{status.healthConfigured ? status.message : 'No health endpoint configured.'}</span></div><span className={`settings-status${status.status === 'online' ? ' settings-status-online' : ''}`}><i />{connectionState(status)}</span><button className="button button-small button-outline" onClick={refresh} disabled={!status.healthConfigured || checking}><RefreshCw size={13} className={checking ? 'spin' : ''} />Check</button></div><div className="settings-row"><div className="settings-row-copy"><strong>Scene analysis endpoint</strong><span>{status.analysisConfigured ? 'Configured through the local environment.' : 'No analysis endpoint configured; Generate reports unavailable.'}</span></div><span className={`settings-status${status.analysisConfigured ? ' settings-status-online' : ''}`}><i />{status.analysisConfigured ? 'Configured' : 'Demo mode'}</span></div><div className="settings-row"><div className="settings-row-copy"><strong>Image generation</strong><span>{status.status === 'online' && status.imageGenerationConfigured ? `Configured with ${status.imageModel || 'the selected image model'}.` : status.status === 'checking' ? 'Checking image-provider configuration…' : 'The backend is reachable without image generation configured.'}</span></div><span className={`settings-status${status.status === 'online' && status.imageGenerationConfigured ? ' settings-status-online' : ''}`}><i />{imageState(status)}</span></div></section>
    <section className="settings-section"><div className="settings-section-title"><span className="settings-icon"><SlidersHorizontal size={17} /></span><div><h2>Local configuration</h2><p>Set public service URLs in a local environment file. Do not put private API keys in frontend variables.</p></div></div><div className="env-guide"><div className="env-guide-head"><span>.env.local</span><span>PROJECT ROOT</span></div><pre>{'VITE_RECONSTRUCTION_URL=https://your-backend.example/analyze\nVITE_BACKEND_HEALTH_URL=https://your-backend.example/health'}</pre><p>The reconstruction endpoint should accept <code>{'{ "description": "..." }'}</code> and return JSON with a string <code>summary</code> and an <code>objects</code> array. No backend endpoint or response schema was present in the inspected project, so this is a documented adapter contract, not a claim that a service exists.</p></div><p className="settings-security"><Shield size={14} /> Keep secret credentials on a trusted server. Browser environment variables are public to app users.</p></section>
    <section className="settings-section settings-storage"><div className="settings-section-title"><span className="settings-icon"><Check size={17} /></span><div><h2>Scene storage</h2><p>Saved library entries stay in this browser’s local storage.</p></div></div><div className="settings-row"><div className="settings-row-copy"><strong>Persistence</strong><span>Browser only. Clearing site data removes saved scenes.</span></div><span className="settings-status settings-status-online"><i />Local</span></div></section>
    <div className="settings-footnote"><Info size={13} /> No profile, account sync, or cloud scene storage is implemented.</div>
  </div>
}
