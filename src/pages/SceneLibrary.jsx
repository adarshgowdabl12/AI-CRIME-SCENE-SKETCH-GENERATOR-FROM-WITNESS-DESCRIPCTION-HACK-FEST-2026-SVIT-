import { useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, LayoutGrid, List, Plus, Search, ScanLine, Trash2 } from 'lucide-react'

export default function SceneLibrary({ scenes, onOpen, onDelete, onCreate }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [layout, setLayout] = useState('list')
  const filtered = useMemo(() => scenes.filter((scene) => {
    const matchesText = `${scene.title} ${scene.summary} ${scene.statement}`.toLowerCase().includes(query.toLowerCase())
    const matchesType = filter === 'all' || (filter === 'demo' ? scene.isDemo : !scene.isDemo)
    return matchesText && matchesType
  }), [filter, query, scenes])

  function remove(scene) {
    if (window.confirm(`Delete “${scene.title}” from this browser? This cannot be undone.`)) onDelete(scene.id)
  }

  return <div className="library-page page-enter">
    <header className="page-header-block"><div><div className="eyebrow"><span className="eyebrow-pip" /> LOCAL COLLECTION</div><h1>Scene library</h1><p>Saved reconstructions are stored in this browser only.</p></div><button className="button button-lime" onClick={onCreate}><Plus size={16} />Create reconstruction</button></header>
    <div className="library-toolbar"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search scenes or descriptions" aria-label="Search scenes" /></label><label className="filter-select"><span className="sr-only">Filter by type</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All scenes</option><option value="saved">Saved analysis</option><option value="demo">Demo cases</option></select></label><div className="layout-switch" aria-label="Scene view"><button onClick={() => setLayout('list')} className={layout === 'list' ? 'layout-active' : ''} aria-label="List view" aria-pressed={layout === 'list'}><List size={15} /></button><button onClick={() => setLayout('grid')} className={layout === 'grid' ? 'layout-active' : ''} aria-label="Grid view" aria-pressed={layout === 'grid'}><LayoutGrid size={15} /></button></div><span className="scene-total">{filtered.length} {filtered.length === 1 ? 'SCENE' : 'SCENES'}</span></div>
    {filtered.length ? <div className={`library-scenes library-${layout}`}>{filtered.map((scene) => <article className="library-scene" key={scene.id}><div className="library-scene-art"><span className="scene-art-index">TRACE / {String(scene.id).slice(-3).toUpperCase()}</span><div className="scene-art-room"><i /><i /><i /></div><ScanLine size={17} className="scene-art-icon" /><span className="scene-type-tag">{scene.isDemo ? 'DEMO' : 'SAVED LOCALLY'}</span></div><div className="library-scene-content"><div className="library-scene-title"><h2>{scene.title}</h2><span className={scene.isDemo ? 'scene-pill scene-pill-demo' : 'scene-pill'}>{scene.status || 'Saved'}</span></div><p>{scene.summary || 'No summary provided.'}</p><div className="library-scene-meta"><span><CalendarDays size={12} />{new Date(scene.savedAt || scene.createdAt).toLocaleDateString()}</span><span><ScanLine size={12} />{scene.objects?.length || 0} objects</span></div><div className="library-scene-actions"><button className="button button-small button-outline" onClick={() => onOpen(scene)}>Open reconstruction <ArrowUpRight size={13} /></button><button className="icon-control delete-scene" onClick={() => remove(scene)} aria-label={`Delete ${scene.title}`} title="Delete scene"><Trash2 size={14} /></button></div></div></article>)}</div> : <div className="library-empty"><div className="library-empty-mark"><ScanLine size={21} /></div><h2>{scenes.length ? 'No matching scenes' : 'Your library is clear'}</h2><p>{scenes.length ? 'Try another search or filter.' : 'Save a reconstruction to keep it in this browser, or start with the sample case.'}</p><button className="button button-lime" onClick={onCreate}><Plus size={15} />Create reconstruction</button></div>}
    <p className="local-storage-note">LOCAL BROWSER STORAGE <span /> No scenes are uploaded to a server by the library.</p>
  </div>
}