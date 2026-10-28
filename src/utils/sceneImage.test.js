import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSceneImageRequest, generateSceneImage } from '../services/sceneImage.js'

const sampleScene = {
  statement: 'A chair was beside the table.',
  summary: 'A chair and table were described.',
  analysisMode: 'demo',
  locationLighting: [
    { label: 'Setting', value: 'Location not specified.', status: 'UNKNOWN' },
    { label: 'Lighting', value: 'Lighting not specified.', status: 'UNKNOWN' },
  ],
  objects: [{
    id: 'chair',
    name: 'Chair',
    description: 'A chair beside the table.',
    source_text: 'A chair was beside the table.',
    status: 'STATED',
    approximate_position: { label: 'beside table', status: 'STATED' },
  }],
  people: [],
  observations: [{
    name: 'Observation 1',
    text: 'A chair was beside the table.',
    source_text: 'A chair was beside the table.',
    status: 'STATED',
  }],
  uncertainties: [{ name: 'Identity', text: 'Identity unknown.', status: 'UNKNOWN' }],
  missingInformation: ['Exact room dimensions'],
}

test('builds a structured image request from the existing analysis and statement', () => {
  const request = buildSceneImageRequest(sampleScene)

  assert.equal(request.witness_statement, sampleScene.statement)
  assert.equal(request.scene_analysis.objects[0].approximate_position.label, 'beside table')
  assert.equal(request.scene_analysis.uncertain_details[0].status, 'UNKNOWN')
  assert.equal(request.scene_analysis.missing_information[0].description, 'Exact room dimensions')
})

test('rejects image generation without a scene analysis', () => {
  assert.throws(() => buildSceneImageRequest(null), /Generate a scene analysis/)
})

test('returns a valid generated image response', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/generate-scene-image')
    assert.equal(JSON.parse(options.body).witness_statement, sampleScene.statement)
    return {
      ok: true,
      json: async () => ({
        generation_status: 'generated',
        image_data_url: 'data:image/png;base64,AA==',
        provider: 'openai',
        mode: 'gpt-image-1',
        description: 'Illustrative rendering.',
        warnings: [],
      }),
    }
  }
  try {
    const result = await generateSceneImage(sampleScene)
    assert.equal(result.generation_status, 'generated')
    assert.equal(result.provider, 'openai')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('surfaces missing provider configuration from the backend', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ detail: 'Set OPENAI_API_KEY in backend/.env.' }),
  })
  try {
    await assert.rejects(generateSceneImage(sampleScene), /Set OPENAI_API_KEY/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('surfaces provider and connection errors instead of showing a fake image', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('offline')
  }
  try {
    await assert.rejects(generateSceneImage(sampleScene), /Could not reach the image-generation service/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('surfaces an image-generation timeout clearly', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    const error = new Error('request timed out')
    error.name = 'TimeoutError'
    throw error
  }
  try {
    await assert.rejects(generateSceneImage(sampleScene), /Image generation timed out/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('rejects malformed or oversized successful image responses', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ generation_status: 'generated', image_data_url: 'not-an-image' }),
  })
  try {
    await assert.rejects(generateSceneImage(sampleScene), /invalid or oversized image/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
