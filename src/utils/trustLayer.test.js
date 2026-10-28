import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTrustDetails, resolveSourceSentence, splitWitnessSentences } from './trustLayer.js'

test('resolves a source fragment to its exact original sentence', () => {
  const statement = 'I saw a person standing near a table. A chair was beside the table.'
  assert.equal(resolveSourceSentence(statement, 'person standing near a table'), 'I saw a person standing near a table.')
  assert.deepEqual(splitWitnessSentences(statement), ['I saw a person standing near a table.', 'A chair was beside the table.'])
})

test('labels supported objects STATED and unsupported claims INFERRED', () => {
  const details = buildTrustDetails({
    statement: 'I saw a person standing near a table. A chair was beside the table.',
    objects: [
      { id: 'person', name: 'Person', description: 'Standing near a table.', source_text: 'person standing near a table', status: 'STATED' },
      { id: 'table', name: 'Table', source_text: 'standing near a table', status: 'STATED' },
      { id: 'distance', name: 'Exact distance', description: 'Exact distance is not provided.', source_text: 'the witness said the exact distance was 3 feet', status: 'STATED' },
    ],
    missingInformation: ['Exact room dimensions'],
  })

  assert.equal(details[0].status, 'STATED')
  assert.equal(details[0].source_text, 'I saw a person standing near a table.')
  assert.equal(details[1].source_text, 'I saw a person standing near a table.')
  assert.equal(details[2].status, 'INFERRED')
  assert.equal(details[2].source_text, '')
  assert.match(details[2].reason, /No exact supporting sentence/)
  assert.equal(details[3].status, 'UNKNOWN')
  assert.equal(details[3].source_text, '')
})

test('does not attribute missing or malformed source text', () => {
  assert.equal(resolveSourceSentence('', 'a sentence'), '')
  assert.equal(resolveSourceSentence('The room was dim.', 'the suspect confessed'), '')
  assert.deepEqual(buildTrustDetails(null), [])
})

test('preserves explicit unknown status even if a source quote is present', () => {
  const [detail] = buildTrustDetails({
    statement: 'The exact dimensions are unknown to the witness.',
    objects: [{ id: 'dimensions', name: 'Room dimensions', source_text: 'exact dimensions are unknown to the witness', status: 'UNKNOWN' }],
  })
  assert.equal(detail.status, 'UNKNOWN')
  assert.equal(detail.source_text, 'The exact dimensions are unknown to the witness.')
})

test('preserves explicit inferred status even if a matching sentence is supplied', () => {
  const [detail] = buildTrustDetails({
    statement: 'The room was dark.',
    objects: [{ id: 'mood', name: 'Fearful atmosphere', source_text: 'The room was dark.', status: 'INFERRED' }],
  })
  assert.equal(detail.status, 'INFERRED')
  assert.equal(detail.source_text, 'The room was dark.')
})