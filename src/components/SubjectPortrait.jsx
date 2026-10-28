import { useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowDownToLine, ExternalLink, LoaderCircle, ScanFace, Sparkles } from 'lucide-react'
import { analyzePersonDescription, generateSuspectPortrait } from '../services/sceneApi.js'
import './SubjectPortrait.css'

const TRAITS = [
  ['apparent_age', 'Apparent age or range'],
  ['height', 'Height'],
  ['build', 'Build'],
  ['hair_color', 'Hair color'],
  ['hair_length_style', 'Hair length / style'],
  ['facial_hair', 'Facial hair'],
  ['face_shape', 'Face shape'],
  ['skin_tone', 'Skin tone'],
  ['eyebrows', 'Eyebrows'],
  ['eye_details', 'Eye details'],
  ['nose', 'Nose'],
  ['lips', 'Lips'],
  ['glasses', 'Glasses'],
  ['headwear', 'Headwear'],
  ['clothing_type', 'Clothing type'],
  ['clothing_color', 'Clothing color'],
  ['distinctive_marks', 'Distinctive marks'],
]

const DISCLAIMER = 'AI-generated composite based on selected witness-described traits. Missing details may be visually invented by the image model. This is not verified evidence and must not be used alone to identify or accuse a person.'

function isUsableTrait(trait, statement) {
  if (trait.status === 'USER_CONFIRMED') return Boolean(trait.value?.trim() && trait.user_confirmed)
  return trait.status === 'STATED'
    && Boolean(trait.value?.trim())
    && Boolean(trait.source_text && statement.includes(trait.source_text))
}

function TraitRow({ name, label, trait, statement, disabled, onDraftChange, onConfirm, onMarkUnknown, onSelectSource }) {
  const [draft, setDraft] = useState(trait.value || '')
  const isDirty = draft !== (trait.value || '')
  const status = trait.status || 'UNKNOWN'
  const canConfirm = Boolean(draft.trim()) && (isDirty || status !== 'USER_CONFIRMED')

  return <article className="portrait-trait-row">
    <div className="portrait-trait-head">
      <label htmlFor={`portrait-trait-${name}`}>{label}</label>
      <span className={`portrait-status portrait-status-${status.toLowerCase().replace('_', '-')}`}>{status === 'USER_CONFIRMED' ? 'USER CONFIRMED' : status}</span>
    </div>
    <div className="portrait-trait-editor">
      <input
        id={`portrait-trait-${name}`}
        type="text"
        value={draft}
        maxLength={160}
        disabled={disabled}
        onChange={(event) => {
          setDraft(event.target.value)
          onDraftChange(name, event.target.value)
        }}
        placeholder="Not stated"
        aria-describedby={`portrait-trait-source-${name}`}
      />
      <button
        className="button button-small button-muted"
        type="button"
        onClick={() => onConfirm(name, draft)}
        disabled={disabled || !canConfirm}
      >
        Confirm edit
      </button>
      <button className="button button-small button-quiet" type="button" onClick={() => { setDraft(''); onDraftChange(name, ''); onMarkUnknown(name) }} disabled={disabled}>
        Mark unknown
      </button>
    </div>
    <div className="portrait-trait-source" id={`portrait-trait-source-${name}`}>
      {status === 'STATED' && trait.source_text && statement.includes(trait.source_text)
        ? <><span>WITNESS SOURCE</span><button className="portrait-source-link" type="button" onClick={() => onSelectSource(trait.source_text)}>{trait.source_text}</button></>
        : status === 'USER_CONFIRMED'
          ? <span className="portrait-manual-note">Confirmed manually; not a witness quotation.</span>
          : status === 'AMBIGUOUS' && trait.source_text && statement.includes(trait.source_text)
            ? <><span>UNCLEAR SOURCE</span><q>{trait.source_text}</q></>
            : <span className="portrait-no-source">No exact supporting quote.</span>}
    </div>
  </article>
}

export default function SubjectPortrait() {
  const [description, setDescription] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [attributes, setAttributes] = useState({})
  const [drafts, setDrafts] = useState({})
  const [image, setImage] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [imageStyle, setImageStyle] = useState('photorealistic_composite')
  const descriptionRef = useRef(null)

  const hasUsableDescription = useMemo(
    () => TRAITS.some(([name]) => isUsableTrait(attributes[name] || {}, description))
      && !TRAITS.some(([name]) => Object.hasOwn(drafts, name) && drafts[name] !== (attributes[name]?.value || '')),
    [attributes, description, drafts],
  )

  async function analyze(event) {
    event.preventDefault()
    if (busy) return
    const trimmed = description.trim()
    if (trimmed.length < 10) {
      setError('Enter at least 10 characters describing observable appearance details.')
      return
    }

    setBusy('analysis')
    setError('')
    setAnalysis(null)
    setAttributes({})
    setDrafts({})
    setImage(null)
    try {
      const result = await analyzePersonDescription(trimmed)
      const reviewed = Object.fromEntries(TRAITS.map(([name]) => {
        const attribute = result.attributes[name] || {}
        return [name, {
          value: attribute.value ?? null,
          status: attribute.status || 'UNKNOWN',
          source_text: attribute.source_text ?? null,
          user_confirmed: false,
        }]
      }))
      setAnalysis(result)
      setAttributes(reviewed)
    } catch (requestError) {
      setError(requestError.message || 'Appearance analysis failed. Try again.')
    } finally {
      setBusy('')
    }
  }

  function updateDraft(name, value) {
    setDrafts((current) => ({ ...current, [name]: value }))
    setImage(null)
  }

  function confirmEdit(name, value) {
    const trimmed = value.trim()
    if (!trimmed) return
    setAttributes((current) => ({
      ...current,
      [name]: { value: trimmed, status: 'USER_CONFIRMED', source_text: null, user_confirmed: true },
    }))
    setDrafts((current) => ({ ...current, [name]: trimmed }))
    setImage(null)
  }

  function markUnknown(name) {
    setAttributes((current) => ({
      ...current,
      [name]: { value: null, status: 'UNKNOWN', source_text: null, user_confirmed: false },
    }))
    setDrafts((current) => ({ ...current, [name]: '' }))
    setImage(null)
  }

  function selectSource(sourceText) {
    const start = description.indexOf(sourceText)
    if (start < 0 || !descriptionRef.current) return
    descriptionRef.current.focus({ preventScroll: true })
    descriptionRef.current.setSelectionRange(start, start + sourceText.length)
  }

  async function generatePortrait() {
    if (busy || !analysis || !hasUsableDescription) return
    setBusy('generation')
    setError('')
    setImage(null)
    try {
      const reviewedAttributes = TRAITS.map(([name]) => ({
        name,
        ...attributes[name],
        user_confirmed: attributes[name]?.status === 'USER_CONFIRMED' && attributes[name]?.user_confirmed === true,
      }))
      const result = await generateSuspectPortrait({
        witness_description: description.trim(),
        attributes: reviewedAttributes,
        image_style: imageStyle,
      })
      setImage(result)
    } catch (requestError) {
      setError(requestError.message || 'Portrait generation failed. Try again.')
    } finally {
      setBusy('')
    }
  }

  function changeDescription(value) {
    setDescription(value)
    setAnalysis(null)
    setAttributes({})
    setDrafts({})
    setImage(null)
    setError('')
  }

  return <section className="subject-portrait" aria-labelledby="subject-portrait-title">
    <header className="portrait-intro">
      <div className="portrait-intro-icon"><ScanFace size={18} /></div>
      <div>
        <span className="mini-label">WITNESS-TO-COMPOSITE</span>
        <h3 id="subject-portrait-title">Person described by witness</h3>
        <p>Turn a text-only witness description into a composite portrait, review every source, and confirm any edits before generation.</p>
      </div>
    </header>

    <form className="portrait-description-form" onSubmit={analyze}>
      <label htmlFor="portrait-description">Witness description of the person</label>
      <textarea
        ref={descriptionRef}
        id="portrait-description"
        value={description}
        maxLength={5000}
        disabled={Boolean(busy)}
        onChange={(event) => changeDescription(event.target.value)}
        placeholder="Describe only what was visibly observed, for example clothing, hair, glasses, or visible marks."
        aria-describedby="portrait-description-help portrait-description-count"
      />
      <div className="portrait-description-meta">
        <span id="portrait-description-help">Avoid names and identifying information. The statement is sent to the backend for trait analysis.</span>
        <span id="portrait-description-count">{description.length} / 5,000</span>
      </div>
      <button className="button button-lime" type="submit" disabled={Boolean(busy) || description.trim().length < 10}>
        {busy === 'analysis' ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}
        {busy === 'analysis' ? 'Analyzing traits...' : 'Analyze Description'}
      </button>
    </form>

    {error && <div className="service-error portrait-error" role="alert"><AlertCircle size={14} /><span>{error}</span></div>}

    {analysis && <>
      {analysis.target_unclear && <div className="portrait-clarification" role="status"><AlertCircle size={15} /><span>{analysis.clarification_message || 'More than one person may be described. Clarify who you want analyzed and analyze the revised description.'}</span></div>}
      <div className="portrait-traits-heading">
        <div><span className="mini-label">REVIEW BEFORE GENERATION</span><h4>Appearance traits</h4></div>
        <span>{TRAITS.filter(([name]) => attributes[name]?.status === 'STATED').length} witness-stated</span>
      </div>
      <div className="portrait-traits-list">
        {TRAITS.map(([name, label]) => <TraitRow
          key={name}
          name={name}
          label={label}
          trait={attributes[name] || { status: 'UNKNOWN', value: null, source_text: null }}
          statement={description}
          disabled={Boolean(busy)}
          onDraftChange={updateDraft}
          onConfirm={confirmEdit}
          onMarkUnknown={markUnknown}
          onSelectSource={selectSource}
        />)}
      </div>
      <div className="portrait-generation-controls">
        <label htmlFor="portrait-style">Portrait style</label>
        <select id="portrait-style" value={imageStyle} onChange={(event) => setImageStyle(event.target.value)} disabled={Boolean(busy)}>
          <option value="photorealistic_composite">Photorealistic composite</option>
          <option value="neutral_illustration">Neutral illustration</option>
          <option value="pencil_sketch">Pencil sketch</option>
          <option value="soft_color_illustration">Soft color</option>
        </select>
        <button className="button button-lime" type="button" onClick={generatePortrait} disabled={Boolean(busy) || !hasUsableDescription || !analysis || analysis.target_unclear}>
          {busy === 'generation' ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}
          {busy === 'generation' ? 'Generating portrait...' : image ? 'Regenerate portrait' : 'Generate Subject Portrait'}
        </button>
      </div>
      {!hasUsableDescription && <p className="portrait-generate-hint">At least one witness-stated or manually confirmed trait is required.</p>}
    </>}

    {image && <div className="portrait-result" aria-live="polite">
      <div className="portrait-result-heading"><div><span className="mini-label">ILLUSTRATIVE COMPOSITE</span><h4>Generated portrait</h4></div><span className="portrait-result-model">{image.model}</span></div>
      <figure className="portrait-image-figure">
        <img src={image.image_url} alt="AI-generated illustrative composite portrait based on selected witness-described traits" />
        <figcaption>{DISCLAIMER}</figcaption>
      </figure>
      <div className="portrait-image-actions">
        <a className="button button-small button-muted" href={image.image_url} download="trace-subject-portrait.png"><ArrowDownToLine size={14} />Download PNG</a>
        <a className="button button-small button-quiet" href={image.image_url} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open image</a>
      </div>
    </div>}

    <p className="portrait-disclaimer">{DISCLAIMER}</p>
  </section>
}
