import { buildTrustDetails } from '../utils/trustLayer.js'

const reconstructionUrl = import.meta.env.VITE_RECONSTRUCTION_URL
const healthUrl = import.meta.env.VITE_BACKEND_HEALTH_URL

export function getServiceConfiguration() {
  return {
    analysisConfigured: Boolean(reconstructionUrl),
    healthConfigured: Boolean(healthUrl),
  }
}

export async function checkBackendHealth() {
  if (!healthUrl) return { status: 'unconfigured', message: 'Health check URL is not configured.' }
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return { status: 'offline', message: `Health check returned ${response.status}.` }
    return { status: 'online', message: 'Backend health check succeeded.' }
  } catch {
    return { status: 'offline', message: 'Could not reach the configured health check URL.' }
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
      body: JSON.stringify({ description: statement }),
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

  if (!result || typeof result !== 'object' || typeof result.summary !== 'string' || !Array.isArray(result.objects)) {
    throw new Error('The analysis response is missing required fields: summary and objects.')
  }

  const scene = {
    ...result,
    id: crypto.randomUUID(),
    title: result.title || 'Untitled reconstruction',
    createdAt: new Date().toISOString(),
    status: 'Analyzed',
    isDemo: false,
    statement,
    objects: result.objects.map((object, index) => ({
      id: object.id || `object-${index + 1}`,
      name: object.name || 'Unspecified object',
      description: object.description || 'No description supplied.',
      source_text: object.source_text ?? object.sourceText ?? '',
      sourceText: object.source_text ?? object.sourceText ?? '',
      status: object.status || '',
      reason: object.reason || '',
      approximate_position: object.approximate_position || object.position || null,
      position: (() => {
        const position = object.approximate_position || object.position
        if (!position) return { x: 50, y: 50, label: 'Position not stated', status: 'unknown' }
        const status = String(position.status || '').toUpperCase()
        return {
          ...position,
          x: position.x ?? 50,
          y: position.y ?? 50,
          label: position.label || 'Position supplied',
          status: ['STATED', 'REPORTED'].includes(status) ? 'reported' : ['MANUAL', 'MANUALLY PLACED'].includes(status) ? 'manual' : ['INFERRED', 'ILLUSTRATIVE'].includes(status) ? 'illustrative' : 'unknown',
        }
      })(),
    })),
    people: Array.isArray(result.people) ? result.people.map((person) => ({ ...person, source_text: person.source_text ?? person.sourceText ?? '' })) : [],
    locationLighting: Array.isArray(result.locationLighting) ? result.locationLighting.map((item) => ({ ...item, source_text: item.source_text ?? item.sourceText ?? '' })) : [],
    observations: Array.isArray(result.observations) ? result.observations.map((item) => ({ ...item, source_text: item.source_text ?? item.sourceText ?? '' })) : [],
    uncertainties: Array.isArray(result.uncertainties) ? result.uncertainties : [],
    missingInformation: Array.isArray(result.missingInformation) ? result.missingInformation : [],
  }

  const trustByObjectId = new Map(buildTrustDetails(scene, statement).filter((item) => item.type === 'OBJECT' && item.objectId).map((item) => [item.objectId, item]))
  const allTrustDetails = buildTrustDetails(scene, statement)
  scene.objects = scene.objects.map((object) => {
    const trust = trustByObjectId.get(object.id)
    return trust ? { ...object, source_text: trust.source_text, sourceText: trust.source_text, status: trust.status, reason: trust.reason } : object
  })
  const normalizeEvidenceEntries = (entries, type, getName) => entries.map((entry, index) => {
    const name = getName(entry, index)
    const trust = allTrustDetails.find((item) => item.type === type && item.name === name)
    return trust ? { ...entry, source_text: trust.source_text, sourceText: trust.source_text, status: trust.status, reason: trust.reason } : entry
  })
  scene.people = normalizeEvidenceEntries(scene.people, 'PERSON', (person, index) => person.name || `Person ${index + 1}`)
  scene.locationLighting = normalizeEvidenceEntries(scene.locationLighting, 'SETTING', (entry, index) => entry.label || `Setting ${index + 1}`)
  scene.observations = normalizeEvidenceEntries(scene.observations, 'OBSERVATION', (entry, index) => entry.name || `Observation ${index + 1}`)

  return scene
}