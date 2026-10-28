import { useMemo, useState } from 'react'
import { AlertTriangle, AudioLines, CircleHelp, FileCheck2, MapPin, Quote, ScanLine, ShieldCheck } from 'lucide-react'
import { splitWitnessSentences } from '../utils/trustLayer.js'

const filters = [
  { id: 'ALL', label: 'All details' },
  { id: 'STATED', label: 'Stated' },
  { id: 'INFERRED', label: 'Inferred' },
  { id: 'UNKNOWN', label: 'Unknown' },
]

const statusLabels = {
  STATED: 'STATED',
  INFERRED: 'INFERRED',
  UNKNOWN: 'UNKNOWN',
}

function TrustStatus({ status }) {
  const Icon = status === 'STATED' ? FileCheck2 : status === 'UNKNOWN' ? CircleHelp : AlertTriangle
  return <span className={`trust-status trust-status-${status.toLowerCase()}`}><Icon size={11} />{statusLabels[status] || 'INFERRED'}</span>
}

export default function TrustLayer({ statement, details, selectedDetailId, onSelectDetail }) {
  const [filter, setFilter] = useState('ALL')
  const sentences = splitWitnessSentences(statement)
  const selected = details.find((detail) => detail.id === selectedDetailId) || null
  const visibleDetails = useMemo(() => filter === 'ALL' ? details : details.filter((detail) => detail.status === filter), [details, filter])

  return <section className="trust-panel" aria-labelledby="trust-heading">
    <header className="trust-panel-header">
      <div className="trust-heading-copy"><span className="trust-emblem"><ShieldCheck size={17} /></span><div><span className="mini-label">SOURCE TRACEABILITY / 04</span><h2 id="trust-heading">TRACE TrustLayer — Evidence &amp; Confidence</h2><p>Every detail is linked to its sentence, labeled as an inference, or marked unknown.</p></div></div>
      <span className="trust-total">{details.length} DETAILS</span>
    </header>
    <div className="trust-toolbar" aria-label="Filter evidence details">{filters.map(({ id, label }) => <button key={id} className={`trust-filter trust-filter-${id.toLowerCase()}${filter === id ? ' trust-filter-active' : ''}`} onClick={() => setFilter(id)} aria-pressed={filter === id}>{label}<span>{id === 'ALL' ? details.length : details.filter((detail) => detail.status === id).length}</span></button>)}</div>
    <div className="trust-layout">
      <div className="trust-detail-column">
        <div className="trust-list-heading"><span>EXTRACTED SCENE DETAILS</span><span>STATUS / SOURCE</span></div>
        {visibleDetails.length ? <div className="trust-detail-list">{visibleDetails.map((detail) => <button key={detail.id} className={`trust-detail-row${selectedDetailId === detail.id ? ' trust-detail-selected' : ''}`} onClick={() => onSelectDetail(detail)}>
          <span className="trust-detail-main"><span className="trust-detail-type">{detail.type}</span><strong>{detail.name}</strong><span className="trust-detail-description">{detail.description}</span>{detail.source_text ? <span className="trust-row-source"><Quote size={11} />{detail.source_text}</span> : <span className="trust-row-missing"><AlertTriangle size={11} />No supporting sentence</span>}</span>
          <span className="trust-detail-state"><TrustStatus status={detail.status} />{detail.approximate_position && <span className={`trust-position trust-position-${(detail.approximate_position.status || 'unknown').toLowerCase()}`}><MapPin size={10} />{detail.approximate_position.label || 'Position'} · {(detail.approximate_position.status || 'unknown').toUpperCase()}</span>}</span>
        </button>)}</div> : <div className="trust-filter-empty">{filter === 'ALL' ? 'No details are available for this scene.' : `No ${filter.toLowerCase()} details in this scene.`}</div>}
      </div>
      <aside className="trust-evidence-column" aria-live="polite">
        <div className="trust-evidence-heading"><span className="mini-label">SELECTED DETAIL</span>{selected && <TrustStatus status={selected.status} />}</div>
        {selected ? <>
          <h3>{selected.name}</h3>
          <p className="trust-selected-description">{selected.description || 'No description supplied.'}</p>
          {selected.source_text ? <div className="trust-quote-card"><span><Quote size={13} /> EXACT SOURCE SENTENCE</span><blockquote>{selected.source_text}</blockquote></div> : <div className="trust-no-evidence"><AlertTriangle size={15} /><div><strong>Evidence sentence missing</strong><p>{selected.reason || 'No exact supporting sentence was found in the witness account. This detail must not be presented as directly stated.'}</p></div></div>}
          {selected.reason && selected.status !== 'STATED' && <p className="trust-reason"><CircleHelp size={12} />{selected.reason}</p>}
          {selected.approximate_position && <div className="trust-position-detail"><MapPin size={13} /><span><strong>Approximate placement</strong><small>{selected.approximate_position.label || 'No textual location specified'} · {(selected.approximate_position.status || 'unknown').toUpperCase()}</small></span></div>}
          {selected.objectId && <button className="trust-jump-button" onClick={() => onSelectDetail(selected)}><ScanLine size={13} /> Focus scene marker</button>}
        </> : <div className="trust-unselected"><AudioLines size={19} /><strong>Select a detail to inspect its evidence.</strong><span>Choosing a detail highlights its source sentence and scene marker when available.</span></div>}
      </aside>
    </div>
    <div className="trust-statement-block">
      <div className="trust-statement-heading"><div><span className="mini-label">ORIGINAL WITNESS ACCOUNT</span><p>Select a sentence to find linked scene details.</p></div><span>{statement.length} CHARACTERS</span></div>
      {statement ? <p className="trust-original-statement">{sentences.map((sentence, index) => {
        const linked = details.filter((detail) => detail.source_text === sentence)
        const active = selected?.source_text === sentence
        return <button key={`${sentence}-${index}`} className={`trust-sentence${linked.length ? ' trust-sentence-linked' : ''}${active ? ' trust-sentence-active' : ''}`} onClick={() => {
          const target = linked.find((detail) => detail.objectId) || linked[0]
          if (target) onSelectDetail(target)
        }} disabled={!linked.length} aria-label={linked.length ? `Select source sentence: ${sentence}` : `No linked detail: ${sentence}`} title={linked.length ? `Linked to ${linked.map((detail) => detail.name).join(', ')}` : 'No extracted detail is linked to this sentence'}>{sentence}{index < sentences.length - 1 ? ' ' : ''}</button>
      })}</p> : <p className="trust-statement-empty">No witness statement is available to link against.</p>}
      <div className="trust-statement-legend"><span><i className="trust-legend-linked" />Sentence supports a stated detail</span><span><i className="trust-legend-active" />Selected evidence</span></div>
    </div>
  </section>
}