import { useRef, useState } from 'react'
import { Crosshair, DoorOpen, Grid2X2, Minus, Plus, RotateCcw, ScanLine } from 'lucide-react'

const positionStyle = {
  reported: { color: '#c7ff55', label: 'REPORTED' },
  manual: { color: '#a78bfa', label: 'MANUAL' },
  illustrative: { color: '#f5ae58', label: 'ILLUSTRATIVE' },
  unknown: { color: '#9ca3af', label: 'UNKNOWN' },
}

export function SceneControls({ gridVisible, onGridToggle, zoom, onZoom, onReset, mode, onMode }) {
  return <div className="scene-controls">
    <div className="view-tabs" role="tablist" aria-label="Visualization mode">
      <button role="tab" aria-selected={mode === 'layout'} className={mode === 'layout' ? 'view-tab view-tab-active' : 'view-tab'} onClick={() => onMode('layout')}><Crosshair size={14} /> Layout</button>
      <button role="tab" aria-selected={mode === 'image'} className={mode === 'image' ? 'view-tab view-tab-active' : 'view-tab'} onClick={() => onMode('image')}><ScanLine size={14} /> Image preview</button>
    </div>
    {mode === 'layout' && <div className="canvas-tools">
      <button className={`tool-button${gridVisible ? ' tool-button-active' : ''}`} onClick={onGridToggle} title="Toggle grid" aria-label="Toggle grid" aria-pressed={gridVisible}><Grid2X2 size={15} /></button>
      <span className="tool-divider" />
      <button className="tool-button" onClick={() => onZoom(-1)} title="Zoom out" aria-label="Zoom out"><Minus size={15} /></button>
      <span className="zoom-readout">{Math.round(zoom * 100)}%</span>
      <button className="tool-button" onClick={() => onZoom(1)} title="Zoom in" aria-label="Zoom in"><Plus size={15} /></button>
      <button className="tool-button" onClick={onReset} title="Reset view" aria-label="Reset view"><RotateCcw size={14} /></button>
    </div>}
  </div>
}

export default function SceneCanvas({ objects = [], selectedId, onSelect, onMove, gridVisible, zoom }) {
  const svgRef = useRef(null)
  const [draggingId, setDraggingId] = useState(null)

  function toScenePoint(event) {
    const bounds = svgRef.current.getBoundingClientRect()
    const centerX = bounds.left + bounds.width / 2
    const centerY = bounds.top + bounds.height / 2
    const x = 50 + ((event.clientX - centerX) / bounds.width) * (100 / zoom)
    const y = 50 + ((event.clientY - centerY) / bounds.height) * (100 / zoom)
    return { x: Math.max(8, Math.min(92, x)), y: Math.max(10, Math.min(90, y)) }
  }

  return <svg ref={svgRef} className={`scene-svg${gridVisible ? '' : ' scene-no-grid'}`} viewBox="0 0 100 100" role="img" aria-label="Interactive top-down illustrative room layout. Object placements are marked by their provenance." onPointerMove={(event) => { if (draggingId) onMove(draggingId, toScenePoint(event)) }} onPointerUp={() => setDraggingId(null)} onPointerCancel={() => setDraggingId(null)}>
    <defs>
      <pattern id="scene-grid" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M 4 0 L 0 0 0 4" fill="none" stroke="#2b323a" strokeWidth=".12" /></pattern>
      <pattern id="scene-hatch" width="1.7" height="1.7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.7" stroke="#a78bfa" strokeWidth=".22" opacity=".55" /></pattern>
    </defs>
    <rect width="100" height="100" fill="#13171a" />
    {gridVisible && <rect width="100" height="100" fill="url(#scene-grid)" />}
    <g className="room-art" transform={`translate(${50 - 50 * zoom} ${50 - 50 * zoom}) scale(${zoom})`}>
      <path d="M12 17 H82 V82 H12 Z" fill="#1a1f21" stroke="#69736b" strokeWidth=".5" />
      <path d="M12 17 H82 V82 H12 Z" fill="url(#scene-hatch)" opacity=".12" />
      <path d="M12 28 H82 M12 71 H82 M24 17 V82 M75 17 V82" stroke="#29302e" strokeWidth=".25" strokeDasharray="1 1" />
      <path d="M18 22 H76 V77 H18 Z" fill="none" stroke="#3a433e" strokeWidth=".3" />
      <path d="M12 17 H25" stroke="#b4c0a9" strokeWidth="1" />
      <path d="M12 17 H25" stroke="#c7ff55" strokeWidth=".38" strokeDasharray="1 1" />
      <text x="12" y="13.5" className="map-technical">NORTH WINDOW</text>
      <path d="M70 82 H82 V68" fill="none" stroke="#8f8171" strokeWidth=".8" />
      <path d="M70 82 A12 12 0 0 1 82 70" fill="none" stroke="#4a4036" strokeWidth=".25" strokeDasharray="1 1" />
      <text x="69" y="88" className="map-technical">DOOR</text>
      <DoorOpen x="76.5" y="77" width="5" height="5" color="#b4a58c" strokeWidth="1.2" />
      <text x="37" y="22" className="map-technical">ROOM / DIM</text>
      <path d="M39 54 L48 50 L53 57 L50 65 L40 63 Z" fill="#202522" stroke="#70796f" strokeWidth=".35" />
      <path d="M40 56 L49 60 M46 51 L44 62" stroke="#4c554d" strokeWidth=".3" />
      {objects.map((object) => {
        if (!Number.isFinite(object.position?.x) || !Number.isFinite(object.position?.y)) return null
        const status = positionStyle[object.position?.status] || positionStyle.unknown
        const active = selectedId === object.id
        const x = object.position?.x ?? 50
        const y = object.position?.y ?? 50
        return <g key={object.id} className={`scene-marker${active ? ' scene-marker-selected' : ''}`} transform={`translate(${x} ${y})`} role="button" tabIndex="0" aria-label={`${object.name}; ${status.label} placement. Select and drag to reposition, or use arrow keys.`} aria-pressed={active} onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setDraggingId(object.id); onSelect(object.id) }} onClick={() => onSelect(object.id)} onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect(object.id)
          } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault()
            onSelect(object.id)
            const step = event.shiftKey ? 3 : 1
            onMove(object.id, {
              x: Math.max(8, Math.min(92, x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0))),
              y: Math.max(10, Math.min(90, y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0))),
            })
          }
        }}>
          <circle r={active ? '3.2' : '2.7'} fill="#111518" stroke={status.color} strokeWidth=".5" />
          <circle r=".65" fill={status.color} />
          {active && <circle r="4.3" fill="none" stroke={status.color} strokeWidth=".25" strokeDasharray=".6 .7" />}
          <path d="M0 -3 V-5.3 H1.1" fill="none" stroke={status.color} strokeWidth=".28" />
          <rect x="1" y="-6.5" width={Math.min(23, Math.max(9, object.name.length * 1.24))} height="4.4" rx=".5" fill="#0c0f11" stroke="#39413d" strokeWidth=".2" />
          <text x="2" y="-3.5" className="map-object-label">{object.name.length > 17 ? `${object.name.slice(0, 15)}...` : object.name}</text>
          <circle cx="-3.3" cy="3.2" r=".8" fill={status.color} />
        </g>
      })}
    </g>
    <text x="4" y="96" className="map-technical">SCHEMATIC / NOT TO SCALE</text>
    <text x="89" y="7" className="map-technical map-north">N</text>
    <path d="M90 9 L90 13 M89 10 L90 9 L91 10" fill="none" stroke="#aab3a4" strokeWidth=".35" />
  </svg>
}