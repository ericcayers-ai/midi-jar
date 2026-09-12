import { Note, Scale } from 'tonal';

export type AutoHelperMode = 'simple' | 'advanced';
export type AutoScaleScope = 'common' | 'all';
export type AutoEvidence = 'balanced' | 'notes' | 'chords';

export type RecordedChord = {
  symbol: string;
  root?: string | null;
  notes: string[];
  bass?: string | null;
  durationMs?: number;
  velocity?: number;
  observedAt?: number;
};

export type KeyPosterior = {
  tonic: string;
  scaleType: string;
  probability: number;
};

export type AutoContext = {
  tonic: string;
  scaleType: string;
  scaleName: string;
  confidence: number;
  chordCount: number;
  noteCount: number;
  evidenceMass: number;
  posterior: KeyPosterior[];
  alternatives: KeyPosterior[];
};

export type AutoContextOptions = {
  mode: AutoHelperMode;
  scaleScope: AutoScaleScope;
  evidence: AutoEvidence;
  minimumConfidence: number;
  minimumEvidenceMass?: number;
  halfLifeMs?: number;
  previousPosterior?: KeyPosterior[];
  hmmSelfTransition?: number;
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

// Relative-to-tonic profiles reproduced from the Humdrum keycor/runningkey sources.
const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const KP_MAJOR = [0.748, 0.06, 0.488, 0.082, 0.67, 0.46, 0.096, 0.715, 0.104, 0.366, 0.057, 0.4];
const KP_MINOR = [0.712, 0.084, 0.474, 0.618, 0.049, 0.46, 0.105, 0.747, 0.404, 0.067, 0.133, 0.33];
const AE_MAJOR = [
  17.7661, 0.145624, 14.9265, 0.160186, 19.8049, 11.3587, 0.291248, 22.062, 0.145624, 8.15494,
  0.232998, 4.95122,
];
const AE_MINOR = [
  18.2648, 0.737619, 14.0499, 16.8599, 0.702494, 14.4362, 0.702494, 18.6161, 4.56621, 1.93186,
  7.37619, 1.75623,
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const scaleCache = new Map<string, Set<number>>();

function scaleNameForType(scaleType: string) {
  return SCALE_ALIASES[scaleType] || scaleType;
}

function pitchClass(note: string | null | undefined) {
  if (!note) return null;
  const chroma = Note.chroma(note);
  return typeof chroma === 'number' && Number.isFinite(chroma) ? chroma : null;
}

function scalePitchClasses(tonic: string, scaleType: string) {
  const cacheKey = `${tonic}|${scaleType}`;
  const cached = scaleCache.get(cacheKey);
  if (cached) return cached;

  const notes = Scale.get(`${tonic} ${scaleNameForType(scaleType)}`).notes;
  const result = new Set(
    notes.map((note) => pitchClass(note)).filter((chroma): chroma is number => chroma !== null)
  );
  scaleCache.set(cacheKey, result);
  return result;
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

function durationWeight(recording: RecordedChord) {
  if (typeof recording.durationMs === 'number' && recording.durationMs > 0) {
    return recording.durationMs / 1000;
  }
  return 1;
}

function velocityWeight(recording: RecordedChord) {
  const velocity = clamp(recording.velocity ?? 96, 1, 127) / 127;
  return Math.sqrt(velocity);
}

type Evidence = {
  allNotes: Float64Array;
  bass: Float64Array;
  roots: Float64Array;
  mass: number;
  noteCount: number;
};

function makeEvidence(recordings: RecordedChord[], halfLifeMs: number): Evidence {
  const allNotes = new Float64Array(12);
  const bass = new Float64Array(12);
  const roots = new Float64Array(12);
  let mass = 0;
  let noteCount = 0;
  const newest = recordings.reduce(
    (latest, recording) => Math.max(latest, recording.observedAt ?? latest),
    0
  );

  recordings.forEach((recording) => {
    const age = newest && recording.observedAt ? Math.max(0, newest - recording.observedAt) : 0;
    const decay = Math.exp((-Math.LN2 * age) / Math.max(1, halfLifeMs));
    const weight = durationWeight(recording) * velocityWeight(recording) * decay;
    const rootPc = pitchClass(recording.root);
    const bassPc = pitchClass(recording.bass || recording.notes[0]);

    if (rootPc !== null) roots[rootPc] += weight;
    if (bassPc !== null) bass[bassPc] += weight;

    recording.notes.forEach((note) => {
      const pc = pitchClass(note);
      if (pc === null) return;
      allNotes[pc] += weight;
      mass += weight;
      noteCount += 1;
    });
  });

  return { allNotes, bass, roots, mass, noteCount };
}

function correlation(observed: Float64Array, profile: number[]) {
  let observedMean = 0;
  let profileMean = 0;
  for (let index = 0; index < 12; index += 1) {
    observedMean += observed[index];
    profileMean += profile[index];
  }
  observedMean /= 12;
  profileMean /= 12;

  let numerator = 0;
  let observedVariance = 0;
  let profileVariance = 0;
  for (let index = 0; index < 12; index += 1) {
    const observedDelta = observed[index] - observedMean;
    const profileDelta = profile[index] - profileMean;
    numerator += observedDelta * profileDelta;
    observedVariance += observedDelta ** 2;
    profileVariance += profileDelta ** 2;
  }
  if (observedVariance === 0 || profileVariance === 0) return 0;
  return numerator / Math.sqrt(observedVariance * profileVariance);
}

function rotatedProfile(profile: number[], tonicPc: number) {
  return profile.map((_value, absolutePc) => profile[(absolutePc - tonicPc + 12) % 12]);
}

function histogramMembership(histogram: Float64Array, scale: Set<number>) {
  const total = histogram.reduce((sum, value) => sum + value, 0);
  if (total === 0) return 0;
  let inside = 0;
  for (let pc = 0; pc < 12; pc += 1) {
    if (scale.has(pc)) inside += histogram[pc];
  }
  return (inside - (total - inside) * 1.5) / total;
}

function histogramShare(histogram: Float64Array, pc: number) {
  const total = histogram.reduce((sum, value) => sum + value, 0);
  return total === 0 ? 0 : histogram[pc] / total;
}

function isMajorScale(scaleType: string) {
  return scaleNameForType(scaleType) === 'major';
}

function isMinorScale(scaleType: string) {
  return scaleNameForType(scaleType) === 'minor';
}

function profileScore(histogram: Float64Array, tonicPc: number, scaleType: string) {
  if (isMajorScale(scaleType)) {
    return (
      (correlation(histogram, rotatedProfile(KK_MAJOR, tonicPc)) +
        correlation(histogram, rotatedProfile(KP_MAJOR, tonicPc)) +
        correlation(histogram, rotatedProfile(AE_MAJOR, tonicPc))) /
      3
    );
  }
  if (isMinorScale(scaleType)) {
    return (
      (correlation(histogram, rotatedProfile(KK_MINOR, tonicPc)) +
        correlation(histogram, rotatedProfile(KP_MINOR, tonicPc)) +
        correlation(histogram, rotatedProfile(AE_MINOR, tonicPc))) /
      3
    );
  }
  return 0;
}

function observationScore(
  tonic: string,
  scaleType: string,
  evidence: Evidence,
  recordings: RecordedChord[],
  selectedEvidence: AutoEvidence
) {
  const tonicPc = pitchClass(tonic);
  if (tonicPc === null) return null;
  const scale = scalePitchClasses(tonic, scaleType);
  if (scale.size < 2) return null;

  const membership = histogramMembership(evidence.allNotes, scale);
  const roots = histogramMembership(evidence.roots, scale);
  const bass = histogramMembership(evidence.bass, scale);
  const profile = profileScore(evidence.allNotes, tonicPc, scaleType);
  const tonicRoot = histogramShare(evidence.roots, tonicPc);
  const finalRoot = recordings.at(-1)?.root;
  const cadence = pitchClass(finalRoot) === tonicPc ? 0.12 : 0;

  const score =
    selectedEvidence === 'notes'
      ? profile * 0.62 + membership * 0.28 + tonicRoot * 0.1
      : selectedEvidence === 'chords'
      ? roots * 0.58 + bass * 0.2 + tonicRoot * 0.1 + membership * 0.12
      : profile * 0.42 + membership * 0.22 + roots * 0.18 + bass * 0.08 + tonicRoot * 0.1;

  return score + cadence;
}

function stateTransitionProbability(from: KeyPosterior, to: KeyPosterior, selfTransition: number) {
  const fromPc = pitchClass(from.tonic);
  const toPc = pitchClass(to.tonic);
  if (fromPc === null || toPc === null) return 0.001;
  if (fromPc === toPc && scaleNameForType(from.scaleType) === scaleNameForType(to.scaleType)) {
    return selfTransition;
  }
  if (fromPc === toPc) return (1 - selfTransition) * 0.45;
  const distance = Math.min((toPc - fromPc + 12) % 12, (fromPc - toPc + 12) % 12);
  return distance <= 2 ? (1 - selfTransition) * 0.12 : (1 - selfTransition) * 0.03;
}

function softmax(values: number[], temperature: number) {
  const maximum = Math.max(...values);
  const weights = values.map((value) => Math.exp((value - maximum) / temperature));
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map((value) => value / total);
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

  const evidence = makeEvidence(recordings, options.halfLifeMs ?? 8000);
  if (evidence.mass < (options.minimumEvidenceMass ?? 1)) return null;

  const candidates = tonicsFor(options).flatMap((tonic) =>
    scaleTypesFor(options)
      .map((scaleType) => ({
        tonic,
        scaleType,
        score: observationScore(tonic, scaleType, evidence, recordings, options.evidence),
      }))
      .filter(
        (candidate): candidate is typeof candidate & { score: number } => candidate.score !== null
      )
  );

  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) => b.score - a.score || tonicPreference(a.tonic) - tonicPreference(b.tonic)
  );

  const previous = options.previousPosterior ?? [];
  const selfTransition = clamp(options.hmmSelfTransition ?? 0.94, 0.5, 0.995);
  const rawProbabilities = softmax(
    candidates.map((candidate) => candidate.score),
    0.18
  );
  const smoothedScores = candidates.map((candidate, index) => {
    if (!previous.length) return Math.log(Math.max(rawProbabilities[index], 1e-12));
    const candidateState = {
      tonic: candidate.tonic,
      scaleType: candidate.scaleType,
      probability: 0,
    };
    const prior = previous.reduce(
      (sum, state) =>
        sum + state.probability * stateTransitionProbability(state, candidateState, selfTransition),
      0
    );
    return Math.log(Math.max(rawProbabilities[index], 1e-12)) + Math.log(Math.max(prior, 1e-12));
  });
  const probabilities = softmax(smoothedScores, 0.35);
  const posterior = candidates
    .map((candidate, index) => ({
      tonic: candidate.tonic,
      scaleType: candidate.scaleType,
      probability: probabilities[index],
    }))
    .sort(
      (a, b) => b.probability - a.probability || tonicPreference(a.tonic) - tonicPreference(b.tonic)
    );
  const best = posterior[0];
  if (!best || best.probability < options.minimumConfidence) return null;

  return {
    tonic: best.tonic,
    scaleType: best.scaleType,
    scaleName: scaleLabel(best.scaleType),
    confidence: Number(best.probability.toFixed(4)),
    chordCount: recordings.length,
    noteCount: evidence.noteCount,
    evidenceMass: Number(evidence.mass.toFixed(3)),
    posterior,
    alternatives: posterior.slice(0, 4),
  };
}

export { ALL_TONICS, COMMON_SCALE_TYPES, COMMON_TONICS, scaleNameForType };
