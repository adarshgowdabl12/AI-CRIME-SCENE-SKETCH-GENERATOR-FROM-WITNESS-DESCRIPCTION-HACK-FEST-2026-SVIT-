import { buildTrustDetails } from '../utils/trustLayer.js'

const environment = import.meta.env || {}
const reconstructionUrl = environment.VITE_RECONSTRUCTION_URL || '/api/analyze-scene'
const healthUrl = environment.VITE_BACKEND_HEALTH_URL || '/health'
const imageGenerationUrl = environment.VITE_IMAGE_GENERATION_URL || '/api/generate-scene-image'
const apiBaseUrl = String(environment.VITE_API_BASE_URL || '').replace(/\/+$/, '')

const portraitApiUrl = (path) => `${apiBaseUrl}${path}`

export function getGeneratedImageUrl(path) {
  if (typeof path !== 'string' || !path.startsWith('/generated/')) {
    throw new Error('Image service returned an unsupported image path.')
  }
  return `${apiBaseUrl}${path}`
}

async function postPortraitRequest(path, body, timeout, errorLabel) {
  let response
  try {
    response = await fetch(portraitApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError') throw new Error(`${errorLabel} timed out. Try again later.`, { cause: error })
    throw new Error(`Could not reach the ${errorLabel.toLowerCase()} service. Check the backend connection.`, { cause: error })
  }

  let result
  try {
    result = await response.json()
  } catch {
    throw new Error(`The ${errorLabel.toLowerCase()} service returned an invalid response.`)
  }
  if (!response.ok) {
    const detail = result?.detail
    const message = typeof detail === 'string' ? detail : detail?.message
    throw new Error(message || `${errorLabel} failed with status ${response.status}.`)
  }
  return result
}

export async function analyzePersonDescription(witnessDescription) {
  const result = await postPortraitRequest(
    '/api/analyze-person-description',
    { witness_description: witnessDescription },
    90_000,
    'Appearance analysis',
  )
  if (
    !result
    || typeof result.target_unclear !== 'boolean'
    || !result.attributes
    || typeof result.attributes !== 'object'
  ) {
    throw new Error('The appearance-analysis service returned incomplete trait data.')
  }
  return result
}

export async function generateSuspectPortrait(request) {
  const result = await postPortraitRequest(
    '/api/generate-suspect-portrait',
    request,
    160_000,
    'Portrait generation',
  )
  if (result?.generation_status !== 'generated' || typeof result.image_url !== 'string') {
    throw new Error('The portrait service did not return a usable image.')
  }
  return { ...result, image_url: getGeneratedImageUrl(result.image_url) }
}

export function getServiceConfiguration() {
  return {
    analysisConfigured: Boolean(reconstructionUrl),
    healthConfigured: Boolean(healthUrl),
  }
}

export function getImageGenerationUrl() {
  return imageGenerationUrl
}

function offlineHealth(message) {
  return {
    status: 'offline',
    message,
    imageGenerationConfigured: false,
    imageProvider: 'not_configured',
    imageModel: null,
    portraitAnalysisConfigured: false,
    portraitGenerationConfigured: false,
  }
}

export async function checkBackendHealth() {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return offlineHealth(`Health check returned ${response.status}.`)
    const body = await response.json()
    if (body?.status !== 'ok' || !['demo', 'live'].includes(body.analysis_mode)) {
      return offlineHealth('Health endpoint returned an unsupported status.')
    }
    return {
      status: 'online',
      analysisMode: body.analysis_mode,
      message: `Backend healthy; ${body.analysis_mode === 'demo' ? 'rule-based demo analyzer' : 'live AI analyzer'}.`,
      imageGenerationConfigured: body.image_generation_configured === true,
      imageProvider: typeof body.image_provider === 'string' ? body.image_provider : 'not_configured',
      imageModel: typeof body.image_model === 'string' ? body.image_model : null,
      portraitAnalysisConfigured: body.portrait_analysis_configured === true,
      portraitGenerationConfigured: body.portrait_generation_configured === true,
    }
  } catch {
    return offlineHealth('Could not reach the configured health check URL.')
  }
}

export async function analyzeWitnessStatement(statement) {
  if (!reconstructionUrl) {
    const error = new Error('Analysis backend is not configured. You can explore the clearly labeled sample case instead.')
    error.code = 'BACKEND_UNAVAILABLE'
    throw error
  }

  let response
  try {
    response = await fetch(reconstructionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ witness_description: statement }),
      signal: AbortSignal.timeout(30000),
    })
  } catch {
    throw new Error('Could not reach the configured analysis endpoint. Check the backend connection, or use Load Sample to explore demo mode.')
  }

  if (!response.ok) throw new Error(`Analysis endpoint returned ${response.status}.`)

  let result
  try {
    result = await response.json()
  } catch {
    throw new Error('The analysis endpoint returned invalid JSON.')
  }

  if (!result || typeof result !== 'object' || typeof (result.scene_summary || result.summary) !== 'string' || !Array.isArray(result.objects)) {
    throw new Error('The analysis response is missing required fields: scene_summary and objects.')
  }

  const toPosition = (position) => {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null
    const status = String(position.status || '').toUpperCase()
    return {
      ...position,
      label: position.label || 'Position supplied',
      status: ['STATED', 'REPORTED'].includes(status) ? 'reported' : ['MANUAL', 'MANUALLY PLACED'].includes(status) ? 'manual' : ['INFERRED', 'ILLUSTRATIVE'].includes(status) ? 'illustrative' : 'unknown',
    }
  }
  const toUiObject = (object, index) => ({
    id: object.id || object.object_id || `object-${index + 1}`,
    name: object.name || `Object ${index + 1}`,
    description: object.description || 'No description supplied.',
    source_text: object.source_text || '',
    sourceText: object.source_text || '',
    status: object.status || '',
    reason: object.reason || '',
    approximate_position: object.approximate_position || null,
    position: toPosition(object.approximate_position),
  })
  const toUiEntry = (entry, index, labelPrefix) => ({
    ...entry,
    id: entry.name ? `${labelPrefix}-${index + 1}` : `${labelPrefix}-${index + 1}`,
    label: entry.name || `${labelPrefix} ${index + 1}`,
    value: entry.description || '',
    text: entry.description || '',
    source_text: entry.source_text || '',
    sourceText: entry.source_text || '',
    status: entry.status || 'UNKNOWN',
    reason: entry.reason || '',
    objectId: entry.object_id || null,
  })
  const apiObjects = result.objects.map(toUiObject)
  const apiPeople = (result.people_descriptions || result.people || []).map((person, index) => ({
    ...toUiEntry(person, index, 'Person'),
    description: person.description || '',
  }))
  const apiObservations = (result.explicit_observations || result.observations || []).map((observation, index) => ({
    ...toUiEntry(observation, index, 'Observation'),
    name: observation.name || `Observation ${index + 1}`,
    objectId: observation.object_id || observation.objectId || null,
  }))
  const apiSettings = [result.location, result.lighting]
    .filter(Boolean)
    .map((entry, index) => toUiEntry(entry, index, 'Setting'))
  const apiUncertainties = (result.uncertain_details || result.uncertainties || []).map((item) => ({
    ...item,
    text: item.description || item.text || '',
    source_text: item.source_text || '',
    status: item.status || 'UNKNOWN',
    reason: item.reason || '',
  }))
  const apiMissing = (result.missing_information || result.missingInformation || []).map((item) => ({
    ...item,
    text: item.description || item.text || '',
    source_text: item.source_text || '',
    status: 'UNKNOWN',
    reason: item.reason || '',
  }))

  const scene = {
    ...result,
    id: crypto.randomUUID(),
    title: result.title || 'Untitled reconstruction',
    createdAt: new Date().toISOString(),
    status: result.analysis_mode === 'demo' ? 'Demo analysis' : 'Analyzed',
    isDemo: result.analysis_mode === 'demo',
    analysisMode: result.analysis_mode || 'live',
    statement,
    summary: result.scene_summary || result.summary,
    objects: apiObjects,
    people: apiPeople,
    locationLighting: apiSettings,
    observations: apiObservations,
    uncertainties: apiUncertainties,
    missingInformation: apiMissing,
  }

  const trustDetails = buildTrustDetails(scene, statement)
  const normalizedByType = (type) => new Map(trustDetails.filter((detail) => detail.type === type).map((detail) => [detail.id.split(':')[1], detail]))
  const objectEvidence = normalizedByType('OBJECT')
  scene.objects = scene.objects.map((object) => {
    const evidence = objectEvidence.get(object.id) || trustDetails.find((detail) => detail.type === 'OBJECT' && detail.name === object.name)
    return evidence ? { ...object, source_text: evidence.source_text, sourceText: evidence.source_text, status: evidence.status, reason: evidence.reason } : object
  })

  for (const [entries, type] of [[scene.people, 'PERSON'], [scene.locationLighting, 'SETTING'], [scene.observations, 'OBSERVATION']]) {
    for (const entry of entries) {
      const evidence = trustDetails.find((detail) => detail.type === type && detail.name === (entry.name || entry.label))
      if (evidence) Object.assign(entry, { source_text: evidence.source_text, sourceText: evidence.source_text, status: evidence.status, reason: evidence.reason })
    }
  }

  return scene
}
