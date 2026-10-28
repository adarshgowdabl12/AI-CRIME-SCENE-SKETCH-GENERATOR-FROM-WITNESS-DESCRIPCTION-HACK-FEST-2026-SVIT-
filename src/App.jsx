import { useEffect, useState } from 'react'
import { Menu, ShieldCheck } from 'lucide-react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import HowItWorks from './pages/HowItWorks.jsx'
import Reconstruction from './pages/Reconstruction.jsx'
import SceneLibrary from './pages/SceneLibrary.jsx'
import Settings from './pages/Settings.jsx'
import { sampleScene } from './data/sampleScene.js'
import { analyzeWitnessStatement, checkBackendHealth, getServiceConfiguration } from './services/sceneApi.js'
import { deleteScene, getSavedScenes, saveScene } from './services/sceneStorage.js'
import './App.css'

const pageTitles = {
  dashboard: 'Dashboard',
  reconstruction: 'New Reconstruction',
  library: 'Scene Library',
  'how-it-works': 'How It Works',
  settings: 'Settings',
}

function App() {
  const [pageId, setPageId] = useState('dashboard')
  const [scene, setScene] = useState(null)
  const [savedScenes, setSavedScenes] = useState(() => getSavedScenes())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [backendStatus, setBackendStatus] = useState(() => ({
    ...getServiceConfiguration(),
    status: 'checking',
    message: 'Checking backend health…',
    imageGenerationConfigured: false,
    imageProvider: 'not_configured',
    imageModel: null,
    portraitAnalysisConfigured: false,
    portraitGenerationConfigured: false,
  }))

  useEffect(() => {
    let active = true
    async function pollHealth() {
      const configuration = getServiceConfiguration()
      if (!configuration.healthConfigured) {
        if (active) setBackendStatus({
          ...configuration,
          status: 'offline',
          message: 'Health check URL is not configured.',
          imageGenerationConfigured: false,
          imageProvider: 'not_configured',
          imageModel: null,
        })
        return
      }
      if (active) setBackendStatus((current) => ({ ...current, ...configuration, status: 'checking', message: 'Checking backend health…' }))
      const health = await checkBackendHealth()
      if (active) setBackendStatus((current) => ({ ...current, ...configuration, ...health }))
    }
    void pollHealth()
    const intervalId = window.setInterval(() => { void pollHealth() }, 5_000)
    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [])

  function navigate(nextPage) {
    setPageId(nextPage)
    setToast('')
    setError('')
  }

  function startNew() {
    setScene(null)
    setPageId('reconstruction')
    setError('')
    setToast('')
  }

  function openSample() {
    setScene({ ...sampleScene, objects: sampleScene.objects.map((object) => ({ ...object, position: { ...object.position } })) })
    setPageId('reconstruction')
    setError('')
    setToast('Sample case loaded. All content is fictional; placements are labeled by source.')
  }

  async function generate(statement) {
    setLoading(true)
    setError('')
    setToast('')
    try {
      const result = await analyzeWitnessStatement(statement)
      setScene(result)
      setBackendStatus((current) => ({
        ...current,
        status: 'online',
        analysisMode: result.analysisMode,
        message: `Backend healthy; ${result.analysisMode === 'demo' ? 'rule-based demo analyzer' : 'live AI analyzer'}.`,
      }))
      setToast(result.analysisMode === 'demo'
        ? 'Rule-based demo analysis received. Review every detail against the original statement.'
        : 'Live analysis response received. Review every detail against the original statement.')
    } catch (requestError) {
      setError(requestError.message || 'Analysis failed. Try again or explore the sample case.')
    } finally {
      setLoading(false)
    }
  }

  function persistScene() {
    if (!scene) return
    try {
      setSavedScenes(saveScene(scene))
      setToast('Scene saved to this browser only.')
    } catch {
      setError('Could not save this scene in browser storage. Check available site storage.')
    }
  }

  function removeScene(id) {
    setSavedScenes(deleteScene(id))
    setToast('Scene removed from this browser.')
  }

  function exportScene() {
    if (!scene) return
    const file = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(file)
    link.download = `trace-scene-${scene.id}.json`
    link.click()
    URL.revokeObjectURL(link.href)
    setToast('Scene JSON exported.')
  }

  async function refreshBackend() {
    const configuration = getServiceConfiguration()
    setBackendStatus((current) => ({ ...current, ...configuration, status: 'checking', message: 'Checking backend health…' }))
    const health = await checkBackendHealth()
    setBackendStatus((current) => ({ ...current, ...configuration, ...health }))
  }

  const page = pageTitles[pageId] ? pageId : 'dashboard'
  const isSaved = Boolean(scene && savedScenes.some((saved) => saved.id === scene.id))
  const connectionLabel = backendStatus.status === 'online'
    ? backendStatus.analysisMode === 'live' ? 'AI CONNECTED' : 'DEMO ANALYZER'
    : backendStatus.status === 'offline'
      ? 'BACKEND OFFLINE'
      : backendStatus.status === 'checking'
        ? 'CHECKING'
      : backendStatus.analysisConfigured
        ? 'ANALYSIS CONFIGURED'
        : 'DEMO MODE'

  return <div className={`trace-app${sidebarCollapsed ? ' trace-sidebar-collapsed' : ''}`}>
    <Sidebar page={page} onNavigate={navigate} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    <main className="main-shell">
      <header className="app-topbar">
        <button className="mobile-nav-toggle" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={18} /></button>
        <div className="topbar-page"><span>TRACE AI</span><span className="topbar-slash">/</span><strong>{pageTitles[page]}</strong></div>
        <div className="topbar-status"><span className={`connection-dot connection-${backendStatus.status}`} /><span>{connectionLabel}</span><span className="topbar-status-separator" /><ShieldCheck size={14} /><span>LOCAL WORKSPACE</span></div>
      </header>
      {toast && <div className="app-toast" role="status"><span>{toast}</span><button onClick={() => setToast('')} aria-label="Dismiss message">×</button></div>}
      <div className="page-container">
        {page === 'dashboard' && <Dashboard sample={sampleScene} savedScenes={savedScenes} backendStatus={backendStatus} onCreate={startNew} onSample={openSample} onOpenScene={(saved) => { setScene(saved); setPageId('reconstruction') }} onExploreLibrary={() => navigate('library')} />}
        {page === 'reconstruction' && <Reconstruction scene={scene} onSetScene={setScene} onGenerate={generate} onLoadSample={openSample} onSave={persistScene} onExport={exportScene} isSaved={isSaved} backendStatus={backendStatus} loading={loading} error={error} onClearError={() => setError('')} />}
        {page === 'library' && <SceneLibrary scenes={savedScenes} onOpen={(saved) => { setScene(saved); setPageId('reconstruction') }} onDelete={removeScene} onCreate={startNew} />}
        {page === 'how-it-works' && <HowItWorks onStart={openSample} />}
        {page === 'settings' && <Settings status={backendStatus} onRefresh={refreshBackend} />}
      </div>
      <footer className="global-footer"><span><span className="footer-logo"><ShieldCheck size={12} /></span> TRACE AI <i /> FROM WITNESS WORDS TO VISUAL CONTEXT</span><span>PROTOTYPE · HUMAN REVIEW REQUIRED</span></footer>
    </main>
  </div>
}

export default App
