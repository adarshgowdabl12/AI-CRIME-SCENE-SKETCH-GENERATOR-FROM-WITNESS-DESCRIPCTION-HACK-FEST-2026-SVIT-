const TRUST_STATUSES = new Set(['STATED', 'INFERRED', 'UNKNOWN'])

export function splitWitnessSentences(statement = '') {
  return statement.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || []
}

export function resolveSourceSentence(statement, candidate) {
  if (!statement || typeof candidate !== 'string' || !candidate.trim()) return ''
  const sentences = splitWitnessSentences(statement)
  const needle = candidate.trim().replace(/^['"“”]+|['"“”]+$/g, '')
  return sentences.find((sentence) => sentence.includes(needle)) || ''
}

function classify(status, sourceSentence) {
  const requested = typeof status === 'string' ? status.toUpperCase() : ''
  if (requested === 'UNKNOWN') return 'UNKNOWN'
  if (requested === 'INFERRED') return 'INFERRED'
  if (sourceSentence) return 'STATED'
  return TRUST_STATUSES.has(requested) && requested === 'UNKNOWN' ? 'UNKNOWN' : 'INFERRED'
}

function detail({ id, type, name, description, sourceText, statement, status, reason, objectId, approximatePosition }) {
  const sourceSentence = resolveSourceSentence(statement, sourceText)
  const finalStatus = classify(status, sourceSentence)
  return {
    id,
    type,
    name,
    description: description || '',
    source_text: sourceSentence,
    status: finalStatus,
    reason: reason || (finalStatus === 'UNKNOWN' ? 'This information is not specified in the witness account.' : finalStatus === 'INFERRED' ? 'No exact supporting sentence was found in the witness account.' : ''),
    objectId: objectId || null,
    approximate_position: approximatePosition || null,
  }
}

export function buildTrustDetails(scene, statement = scene?.statement || '') {
  if (!scene) return []
  const details = []
  const add = (input) => details.push(detail({ ...input, statement }))

  for (const [index, object] of (scene.objects || []).entries()) {
    add({
      id: `object:${object.id || index}`,
      objectId: object.id || null,
      type: 'OBJECT',
      name: object.name || `Object ${index + 1}`,
      description: object.description,
      sourceText: object.source_text ?? object.sourceText,
      status: object.status ?? (object.source_text || object.sourceText ? 'STATED' : 'INFERRED'),
      reason: object.reason,
      approximatePosition: object.position || object.approximate_position,
    })
  }

  for (const [index, person] of (scene.people || []).entries()) {
    add({
      id: `person:${person.id || index}`,
      type: 'PERSON',
      name: person.name || `Person ${index + 1}`,
      description: person.description || person.text,
      sourceText: person.source_text ?? person.sourceText,
      status: person.status ?? (person.source_text || person.sourceText ? 'STATED' : 'INFERRED'),
      reason: person.reason,
    })
  }

  for (const [index, observation] of (scene.observations || []).entries()) {
    add({
      id: `observation:${observation.id || index}`,
      type: 'OBSERVATION',
      name: observation.name || `Observation ${index + 1}`,
      description: observation.description || observation.text || observation.value,
      sourceText: observation.source_text ?? observation.sourceText,
      status: observation.status ?? (observation.source_text || observation.sourceText ? 'STATED' : 'INFERRED'),
      reason: observation.reason,
      objectId: observation.objectId,
    })
  }

  for (const [index, entry] of (scene.locationLighting || []).entries()) {
    add({
      id: `setting:${entry.id || index}`,
      type: 'SETTING',
      name: entry.label || `Setting ${index + 1}`,
      description: entry.value || entry.text,
      sourceText: entry.source_text ?? entry.sourceText,
      status: entry.status ?? (entry.source_text || entry.sourceText ? 'STATED' : 'INFERRED'),
      reason: entry.reason,
    })
  }

  for (const [index, item] of (scene.uncertainties || []).entries()) {
    const text = typeof item === 'string' ? item : item.text || item.description || ''
    add({
      id: `uncertainty:${item.id || index}`,
      type: 'UNCERTAINTY',
      name: typeof item === 'string' ? 'Uncertain detail' : item.name || 'Uncertain detail',
      description: text,
      sourceText: typeof item === 'string' ? '' : item.source_text ?? item.sourceText,
      status: typeof item === 'string' ? 'UNKNOWN' : item.status || 'UNKNOWN',
      reason: typeof item === 'string' ? text : item.reason,
    })
  }

  for (const [index, item] of (scene.missingInformation || []).entries()) {
    const text = typeof item === 'string' ? item : item.text || item.description || ''
    add({
      id: `missing:${item.id || index}`,
      type: 'MISSING INFORMATION',
      name: typeof item === 'string' ? 'Unspecified information' : item.name || 'Unspecified information',
      description: text,
      sourceText: typeof item === 'string' ? '' : item.source_text ?? item.sourceText,
      status: 'UNKNOWN',
      reason: typeof item === 'string' ? text : item.reason || text,
    })
  }

  return details
}