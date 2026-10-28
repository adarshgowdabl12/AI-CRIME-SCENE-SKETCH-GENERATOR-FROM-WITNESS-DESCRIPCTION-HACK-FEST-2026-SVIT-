import { Activity, BookOpen, ChevronLeft, ChevronRight, CircleHelp, Crosshair, PanelLeftClose, PanelLeftOpen, Settings2, Sparkles } from 'lucide-react'

const items = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'reconstruction', label: 'New Reconstruction', icon: Sparkles },
  { id: 'library', label: 'Scene Library', icon: BookOpen },
  { id: 'how-it-works', label: 'How It Works', icon: CircleHelp },
]

export default function Sidebar({ page, onNavigate, collapsed, onToggle, mobileOpen, onClose }) {
  return <>
    {mobileOpen && <button className="mobile-scrim" onClick={onClose} aria-label="Close navigation" />}
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' sidebar-mobile-open' : ''}`}>
      <a className="trace-brand" href="#dashboard" onClick={(event) => { event.preventDefault(); onNavigate('dashboard') }} aria-label="TRACE AI dashboard">
        <span className="trace-symbol"><Crosshair size={19} strokeWidth={1.7} /></span>
        <span className="trace-wordmark">TRACE<span>AI</span><small>SCENE INTELLIGENCE</small></span>
      </a>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {items.map(({ id, label, icon: Icon }) => <button key={id} className={`side-link${page === id ? ' side-link-active' : ''}`} onClick={() => { onNavigate(id); onClose() }} aria-current={page === id ? 'page' : undefined} title={collapsed ? label : undefined}>
          <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{page === id && <span className="active-tick" />}
        </button>)}
      </nav>
      <div className="side-bottom">
        <button className={`side-link${page === 'settings' ? ' side-link-active' : ''}`} onClick={() => { onNavigate('settings'); onClose() }} title={collapsed ? 'Settings' : undefined}><Settings2 size={17} /><span>Settings</span></button>
        <div className="side-rule" />
        <div className="workspace-chip"><div className="workspace-avatar">T</div><div className="workspace-copy"><strong>Personal workspace</strong><small>Local environment</small></div><ChevronLeft className="workspace-chevron" size={14} /></div>
        <button className="sidebar-collapse" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}<span>{collapsed ? 'Expand' : 'Collapse sidebar'}</span><ChevronRight size={13} className="collapse-chevron" /></button>
      </div>
    </aside>
  </>
}