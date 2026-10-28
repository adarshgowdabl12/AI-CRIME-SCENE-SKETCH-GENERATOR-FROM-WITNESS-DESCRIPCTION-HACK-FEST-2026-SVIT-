import { getGeneratedImageUrl } from './sceneApi.js'

function normalizeStatus(status) {
  const normalized = String(status || '').toUpperCase()
  return ['STATED', 'INFERRED', 'UNKNOWN'].includes(normalized) ? normalized : 'UNKNOWN'
}

function normalizeDetail(detail = {}, fallbackName = 'Unspecified detail') {
  if (typeof detail === 'string') {
    return {
      name: fallbackName,
      description: detail,
      source_text: '',
      status: 'UNKNOWN',
      approximate_position: null,
      reason: '',
      object_id: null,
    }
  }
  return {
    name: detail.name || detail.label || fallbackName,
    description: detail.description || detail.text || detail.value || 'Not specified.',
    source_text: detail.source_text || detail.sourceText || '',
    status: normalizeStatus(detail.status),
    approximate_position: detail.approximate_position || (
      detail.position?.status === 'reported'
        ? { label: detail.position.label, status: 'STATED' }
        : null
    ),
    reason: detail.reason || '',
    object_id: detail.object_id || detail.objectId || detail.id || null,
  }
}

export function buildSceneImageRequest(scene) {
  if (!scene || typeof scene.statement !== 'string' || !scene.statement.trim()) {
    throw new Error('Generate a scene analysis before requesting an illustration.')
  }

  const locationDetails = scene.locationLighting || []
  const setting = locationDetails.find((detail) => /setting|location/i.test(detail.label || detail.name || ''))
  const lighting = locationDetails.find((detail) => /lighting/i.test(detail.label || detail.name || ''))
  const sceneAnalysis = {
    scene_summary: scene.scene_summary || scene.summary,
    location: normalizeDetail(scene.location || setting, 'Location'),
    lighting: normalizeDetail(scene.lighting || lighting, 'Lighting'),
    objects: (scene.objects || []).map((detail, index) => normalizeDetail(detail, `Object ${index + 1}`)),
    people_descriptions: (scene.people_descriptions || scene.people || [])
      .map((detail, index) => normalizeDetail(detail, `Person ${index + 1}`)),
    explicit_observations: (scene.explicit_observations || scene.observations || [])
      .map((detail, index) => normalizeDetail(detail, `Observation ${index + 1}`)),
    uncertain_details: (scene.uncertain_details || scene.uncertainties || [])
      .map((detail, index) => normalizeDetail(detail, `Uncertain detail ${index + 1}`)),
    missing_information: (scene.missing_information || scene.missingInformation || [])
      .map((detail, index) => normalizeDetail(detail, `Missing information ${index + 1}`)),
    analysis_mode: scene.analysis_mode || scene.analysisMode || 'demo',
  }

  if (
    typeof sceneAnalysis.scene_summary !== 'string'
    || !sceneAnalysis.scene_summary.trim()
    || !Array.isArray(sceneAnalysis.objects)
  ) {
    throw new Error('A valid structured scene analysis is required to generate an illustration.')
  }

  return {
    witness_statement: scene.statement,
    scene_analysis: sceneAnalysis,
  }
}

export async function generateSceneImage(scene, endpoint = '/api/generate-scene-image') {
  const request = buildSceneImageRequest(scene)
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(150_000),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError') {
      throw new Error('Image generation timed out. Try again later.', { cause: error })
    }
    throw new Error('Could not reach the image-generation service. Check the backend connection.', { cause: error })
  }

  let result
  try {
    result = await response.json()
  } catch {
    throw new Error('The image-generation service returned an invalid response.')
  }

  if (!response.ok) {
    const detail = result?.detail
    const message = typeof detail === 'string' ? detail : detail?.message
    throw new Error(message)
  }

  if (
    result?.generation_status !== 'generated'
    || typeof result.image_url !== 'string'
    || !result.image_url.startsWith('/generated/')
  ) {
    throw new Error('The image-generation service returned an invalid generated-image URL.')
  }

  return { ...result, mode: result.model, image_url: getGeneratedImageUrl(result.image_url) }
}
