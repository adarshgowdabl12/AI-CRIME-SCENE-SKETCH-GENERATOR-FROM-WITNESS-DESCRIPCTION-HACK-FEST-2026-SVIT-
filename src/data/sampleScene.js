export const SAMPLE_STATEMENT =
  'I saw a person wearing a black jacket near a broken window. The room was dimly lit, a chair was overturned, and a bag was lying near the door.'

export const sampleScene = {
  id: 'trace-sample-window',
  title: 'Broken window · Sample case',
  createdAt: '2026-10-28T12:00:00.000Z',
  status: 'Demo',
  isDemo: true,
  statement: SAMPLE_STATEMENT,
  summary:
    'The witness describes a person in a black jacket near a broken window inside a dimly lit room. An overturned chair and a bag near the door were also observed.',
  objects: [
    {
      id: 'window',
      name: 'Broken window',
      description: 'A window described as broken; the type and extent of damage are unspecified.',
      source_text: 'I saw a person wearing a black jacket near a broken window.',
      sourceText: 'I saw a person wearing a black jacket near a broken window.',
      status: 'STATED',
      reason: '',
      position: { x: 25, y: 29, label: 'Near window', status: 'reported' },
    },
    {
      id: 'chair',
      name: 'Overturned chair',
      description: 'A chair described as overturned. Its location in the room was not stated.',
      source_text: 'The room was dimly lit, a chair was overturned, and a bag was lying near the door.',
      sourceText: 'The room was dimly lit, a chair was overturned, and a bag was lying near the door.',
      status: 'STATED',
      reason: '',
      position: { x: 49, y: 63, label: 'Not stated', status: 'illustrative' },
    },
    {
      id: 'bag',
      name: 'Bag',
      description: 'A bag was described near the door. Its type and contents are unknown.',
      source_text: 'The room was dimly lit, a chair was overturned, and a bag was lying near the door.',
      sourceText: 'The room was dimly lit, a chair was overturned, and a bag was lying near the door.',
      status: 'STATED',
      reason: '',
      position: { x: 75, y: 65, label: 'Near door', status: 'reported' },
    },
  ],
  people: [
    {
      id: 'witness-person',
      name: 'Person',
      description: 'One person wearing a black jacket.',
      source_text: 'I saw a person wearing a black jacket near a broken window.',
      sourceText: 'I saw a person wearing a black jacket near a broken window.',
      status: 'STATED',
    },
  ],
  locationLighting: [
    { label: 'Setting', value: 'Room; further details not provided.', source_text: 'The room was dimly lit, a chair was overturned, and a bag was lying near the door.', status: 'STATED' },
    { label: 'Lighting', value: 'Dimly lit.', source_text: 'The room was dimly lit, a chair was overturned, and a bag was lying near the door.', status: 'STATED' },
  ],
  observations: [
    { id: 'person-window', objectId: 'window', name: 'Person near window', text: 'A person was near a broken window.', source_text: 'I saw a person wearing a black jacket near a broken window.', status: 'STATED' },
    { id: 'chair-overturned', objectId: 'chair', name: 'Chair overturned', text: 'A chair was overturned.', source_text: 'The room was dimly lit, a chair was overturned, and a bag was lying near the door.', status: 'STATED' },
    { id: 'bag-door', objectId: 'bag', name: 'Bag near door', text: 'A bag was near the door.', source_text: 'The room was dimly lit, a chair was overturned, and a bag was lying near the door.', status: 'STATED' },
  ],
  uncertainties: [
    { name: 'Person’s face, age, and direction of travel', text: 'The witness did not describe the person’s face, age, or direction of travel.', status: 'UNKNOWN', reason: 'These details are absent from the witness account.' },
    { name: 'Window damage and bag contents', text: 'The window damage extent and bag contents cannot be determined from the statement.', status: 'UNKNOWN', reason: 'The statement does not provide these details.' },
    { name: 'Chair placement', text: 'The chair’s exact location was not stated; its map position is illustrative.', status: 'UNKNOWN', reason: 'The chair is stated, but its exact position is not.' },
  ],
  missingInformation: [
    'Exact distance between objects',
    'Exact room dimensions',
    'When the observation occurred',
    'Whether anyone else was present',
  ],
}