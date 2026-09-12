import { Scale } from 'tonal';

const LEGACY_SCALE_CHOICES = [
  { value: 'ionian', label: 'Ionian (major)' },
  { value: 'dorian', label: 'Dorian' },
  { value: 'phrygian', label: 'Phrygian' },
  { value: 'lydian', label: 'Lydian' },
  { value: 'mixolydian', label: 'Mixolydian' },
  { value: 'aeolian', label: 'Aeolian (natural minor)' },
  { value: 'aeolian_h', label: 'Harmonic minor' },
  { value: 'aeolian_m', label: 'Melodic minor' },
  { value: 'locrian', label: 'Locrian' },
];

const legacyValues = new Set(LEGACY_SCALE_CHOICES.map(({ value }) => value));
const formatScaleLabel = (name: string) => name.replace(/\b\w/g, (letter) => letter.toUpperCase());

export const scaleTypeChoices = [
  ...LEGACY_SCALE_CHOICES,
  ...Scale.names()
    .filter((name) => !legacyValues.has(name))
    .map((name) => ({ value: name, label: formatScaleLabel(name) })),
];

const tonicNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].flatMap((letter) =>
  ['bb', 'b', '', '#', '##'].map((accidental) => `${letter}${accidental}`)
);

export const tonicChoices = tonicNames.map((value) => ({
  value,
  label: value,
}));

export const fields = {
  tonic: {
    choices: tonicChoices,
  },
  mode: {
    choices: scaleTypeChoices,
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
    choices: Array.from({ length: 12 }, (_, index) => index + 1).map((value) => ({
      value: `${value}`,
      label: `${value}`,
    })),
  },
  extensionComplexity: {
    choices: [
      { value: 'triads', label: 'Triads' },
      { value: 'sevenths', label: 'Sevenths' },
      { value: 'extended', label: 'Extended (9ths, 11ths, 13ths)' },
    ],
  },
  autoHelperMode: {
    choices: [
      { value: 'simple', label: 'Simple auto helper' },
      { value: 'advanced', label: 'Advanced auto helper' },
    ],
  },
  autoScaleScope: {
    choices: [
      { value: 'common', label: 'Common scales' },
      { value: 'all', label: 'All Tonal scales' },
    ],
  },
  autoEvidence: {
    choices: [
      { value: 'balanced', label: 'Balanced notes + chord roots' },
      { value: 'notes', label: 'Note content' },
      { value: 'chords', label: 'Chord roots' },
    ],
  },
  autoMinimumConfidence: {
    choices: [
      { value: '0.25', label: '25% — permissive' },
      { value: '0.45', label: '45% — balanced' },
      { value: '0.65', label: '65% — confident' },
      { value: '0.8', label: '80% — strict' },
    ],
  },
};
