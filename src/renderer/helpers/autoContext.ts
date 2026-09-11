import { Note, Scale } from 'tonal';

export type AutoHelperMode = 'simple' | 'advanced';
export type AutoScaleScope = 'common' | 'all';
export type AutoEvidence = 'balanced' | 'notes' | 'chords';

export type RecordedChord = {
  symbol: string;
  root?: string | null;
  notes: string[];
};

export type AutoContext = {
  tonic: string;
  scaleType: string;
  scaleName: string;
  confidence: number;
  chordCount: number;
  noteCount: number;
};

export type AutoContextOptions = {
  mode: AutoHelperMode;
  scaleScope: AutoScaleScope;
  evidence: AutoEvidence;
  minimumConfidence: number;
};

const SCALE_ALIASES: Record<string, string> = {
  ionian: 'major',
  aeolian: 'minor',
  aeolian_h: 'harmonic minor',
  aeolian_m: 'melodic minor',
};

const COMMON_SCALE_TYPES = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'aeolian_h',
  'aeolian_m',
  'locrian',
];

const COMMON_TONICS = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
  'Cb',
  'D#',
  'G#',
  'A#',
  'E#',
  'Fb',
  'B#',
];

const ALL_TONICS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].flatMap((letter) =>
  ['bb', 'b', '', '#', '##'].map((accidental) => `${letter}${accidental}`)
);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function scaleNameForType(scaleType: string) {
  return SCALE_ALIASES[scaleType] || scaleType;
}

function pitchClass(note: string) {
  const chroma = Note.chroma(note);
  return chroma === undefined ? null : chroma;
}

function scalePitchClasses(tonic: string, scaleType: string) {
  return new Set(
    Scale.get(`${tonic} ${scaleNameForType(scaleType)}`)
      .notes.map(pitchClass)
      .filter((chroma): chroma is number => chroma !== null)
  );
}

function tonicPreference(tonic: string) {
  const index = COMMON_TONICS.indexOf(tonic);
  return index === -1 ? COMMON_TONICS.length + ALL_TONICS.indexOf(tonic) : index;
}

function scaleTypesFor(options: AutoContextOptions) {
  if (options.mode === 'simple' || options.scaleScope === 'common') {
    return COMMON_SCALE_TYPES;
  }
  return Scale.names();
}

function tonicsFor(options: AutoContextOptions) {
  return options.mode === 'simple' ? COMMON_TONICS : ALL_TONICS;
}

function observationScore(
  tonic: string,
  scaleType: string,
  recordings: RecordedChord[],
  evidence: AutoEvidence
) {
  const scale = scalePitchClasses(tonic, scaleType);
  let matchingNotes = 0;
  let outsideNotes = 0;
  let matchingRoots = 0;
  let outsideRoots = 0;
  const tonicChroma = pitchClass(tonic);

  recordings.forEach((recording) => {
    const rootChroma = recording.root ? pitchClass(recording.root) : null;
    if (rootChroma !== null) {
      if (scale.has(rootChroma)) matchingRoots += 1;
      else outsideRoots += 1;
    }
    recording.notes.forEach((note) => {
      const chroma = pitchClass(note);
      if (chroma === null) return;
      if (scale.has(chroma)) matchingNotes += 1;
      else outsideNotes += 1;
    });
  });

  const noteTotal = matchingNotes + outsideNotes;
  const rootTotal = matchingRoots + outsideRoots;
  const noteScore = noteTotal === 0 ? 0 : (matchingNotes - outsideNotes * 1.5) / noteTotal;
  const rootScore = rootTotal === 0 ? 0 : (matchingRoots - outsideRoots * 1.5) / rootTotal;
  const tonicRootCount = recordings.filter(
    ({ root }) => root && pitchClass(root) === tonicChroma
  ).length;
  const cadenceBonus =
    recordings.at(-1)?.root && pitchClass(recordings.at(-1)!.root!) === tonicChroma ? 0.16 : 0;
  const tonicBonus = recordings.length === 0 ? 0 : (tonicRootCount / recordings.length) * 0.24;

  const baseScore =
    evidence === 'notes'
      ? noteScore
      : evidence === 'chords'
      ? rootScore
      : noteScore * 0.62 + rootScore * 0.38;

  return baseScore + tonicBonus + cadenceBonus;
}

function scaleLabel(scaleType: string) {
  if (scaleType === 'ionian') return 'Ionian (major)';
  if (scaleType === 'aeolian') return 'Aeolian (natural minor)';
  if (scaleType === 'aeolian_h') return 'Harmonic minor';
  if (scaleType === 'aeolian_m') return 'Melodic minor';
  return scaleType.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function inferAutoContext(
  recordings: RecordedChord[],
  options: AutoContextOptions
): AutoContext | null {
  if (recordings.length === 0) return null;

  const candidates = tonicsFor(options).flatMap((tonic) =>
    scaleTypesFor(options).map((scaleType) => ({
      tonic,
      scaleType,
      score: observationScore(tonic, scaleType, recordings, options.evidence),
    }))
  );
  candidates.sort(
    (a, b) => b.score - a.score || tonicPreference(a.tonic) - tonicPreference(b.tonic)
  );

  const best = candidates[0];
  const second = candidates[1];
  if (!best) return null;

  const margin = best.score - (second?.score ?? best.score - 0.4);
  const confidence = clamp(
    0.5 + margin * 0.45 + Math.min(0.15, recordings.length / 80),
    0.05,
    0.99
  );
  if (confidence < options.minimumConfidence) return null;

  return {
    tonic: best.tonic,
    scaleType: best.scaleType,
    scaleName: scaleLabel(best.scaleType),
    confidence: Number(confidence.toFixed(2)),
    chordCount: recordings.length,
    noteCount: recordings.reduce((total, recording) => total + recording.notes.length, 0),
  };
}

export { ALL_TONICS, COMMON_SCALE_TYPES, COMMON_TONICS, scaleNameForType };
