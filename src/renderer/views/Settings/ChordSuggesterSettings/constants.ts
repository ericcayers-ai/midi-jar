export const fields = {
  mode: {
    choices: [
      { value: 'ionian', label: 'Ionian (major)' },
      { value: 'dorian', label: 'Dorian' },
      { value: 'phrygian', label: 'Phrygian' },
      { value: 'lydian', label: 'Lydian' },
      { value: 'mixolydian', label: 'Mixolydian' },
      { value: 'aeolian', label: 'Aeolian (natural minor)' },
      { value: 'aeolian_h', label: 'Harmonic minor' },
      { value: 'aeolian_m', label: 'Melodic minor' },
      { value: 'locrian', label: 'Locrian' },
    ],
  },
  style: {
    choices: [
      { value: 'pop', label: 'Pop' },
      { value: 'jazz', label: 'Jazz' },
      { value: 'classical', label: 'Classical' },
      { value: 'modal', label: 'Modal' },
    ],
  },
  suggestionCount: {
    choices: [1, 2, 3, 4, 5].map((value) => ({ value: `${value}`, label: `${value}` })),
  },
  extensionComplexity: {
    choices: [
      { value: 'triads', label: 'Triads' },
      { value: 'sevenths', label: 'Sevenths' },
      { value: 'extended', label: 'Extended (9ths, 11ths, 13ths)' },
    ],
  },
};
