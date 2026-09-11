import { Chord as TonalChord, Interval, Note, Pcset, Scale } from 'tonal';

export type SuggesterMode = string;

export type SuggesterStyle = 'pop' | 'jazz' | 'classical' | 'modal';
export type ExtensionComplexity = 'triads' | 'sevenths' | 'extended';
export type HarmonicFunction = 'T' | 'SD' | 'D';

export type KeySignatureLike = {
  notes: string[];
};

export type DetectedChord = {
  tonic?: string | null;
  root?: string | null;
  symbol?: string;
};

export type DiatonicChord = {
  root: string;
  roman: string;
  quality: string;
  harmonicFunction: HarmonicFunction;
  chord: ReturnType<typeof TonalChord.get>;
  degreeIndex: number;
  scaleNotes: string[];
  scaleName: string;
};

export type ChordSuggestion = DiatonicChord & {
  symbol: string;
  reason: string;
  confidence: number;
  targetRoman?: string;
};

export type SuggestionParams = {
  tonic: string;
  mode: SuggesterMode;
  style: SuggesterStyle;
  extensionComplexity: ExtensionComplexity;
  currentChord: DetectedChord | null | undefined;
  keySignature?: KeySignatureLike;
  count?: number;
  recentRomans?: string[];
};

const MODE_SCALE_NAMES: Record<string, string> = {
  ionian: 'major',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  aeolian: 'minor',
  aeolian_h: 'harmonic minor',
  aeolian_m: 'melodic minor',
  locrian: 'locrian',
};

const SCALE_DEGREE_LABELS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
];

const COMPLEXITY_NOTE_COUNTS: Record<ExtensionComplexity, number> = {
  triads: 3,
  sevenths: 4,
  extended: 7,
};

function scaleNameForMode(mode: SuggesterMode) {
  return MODE_SCALE_NAMES[mode] || mode;
}

function legacyModeForScale(mode: SuggesterMode) {
  if (mode === 'major') return 'ionian';
  if (mode === 'minor') return 'aeolian';
  return mode;
}

const MODE_ROMANS: Record<string, string[]> = {
  ionian: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  dorian: ['i', 'ii', '♭III', 'IV', 'v', 'vi°', '♭VII'],
  phrygian: ['i', '♭II', '♭III', 'iv', 'v°', '♭VI', '♭VII'],
  lydian: ['I', 'II', 'iii', '#iv°', 'V', 'vi', 'vii'],
  mixolydian: ['I', 'ii', 'iii°', 'IV', 'v', 'vi°', '♭VII'],
  aeolian: ['i', 'ii°', '♭III', 'iv', 'v', '♭VI', '♭VII'],
  aeolian_h: ['i', 'ii°', '♭III+', 'iv', 'V', 'VI', 'vii°'],
  aeolian_m: ['i', 'ii', '♭III+', 'IV', 'V', 'vi°', 'vii°'],
  locrian: ['i°', '♭II', '♭III', 'iv', '♭V', '♭VI', '♭VII'],
};

const MODE_QUALITIES: Record<string, string[]> = {
  ionian: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
  dorian: ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major'],
  phrygian: ['minor', 'major', 'major', 'minor', 'diminished', 'major', 'minor'],
  lydian: ['major', 'major', 'minor', 'diminished', 'major', 'minor', 'minor'],
  mixolydian: ['major', 'minor', 'diminished', 'major', 'minor', 'minor', 'major'],
  aeolian: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
  aeolian_h: ['minor', 'diminished', 'augmented', 'minor', 'major', 'major', 'diminished'],
  aeolian_m: ['minor', 'minor', 'augmented', 'major', 'major', 'diminished', 'diminished'],
  locrian: ['diminished', 'major', 'minor', 'minor', 'major', 'major', 'minor'],
};

const MODE_FUNCTIONS: Record<string, HarmonicFunction[]> = {
  ionian: ['T', 'SD', 'T', 'SD', 'D', 'T', 'D'],
  dorian: ['T', 'SD', 'T', 'SD', 'T', 'D', 'SD'],
  phrygian: ['T', 'SD', 'T', 'T', 'D', 'SD', 'SD'],
  lydian: ['T', 'SD', 'T', 'D', 'D', 'T', 'T'],
  mixolydian: ['T', 'SD', 'D', 'T', 'T', 'T', 'SD'],
  aeolian: ['T', 'D', 'T', 'SD', 'T', 'SD', 'SD'],
  aeolian_h: ['T', 'D', 'T', 'SD', 'D', 'T', 'D'],
  aeolian_m: ['T', 'D', 'T', 'SD', 'D', 'T', 'D'],
  locrian: ['D', 'SD', 'T', 'T', 'D', 'SD', 'SD'],
};

const PROGRESSION_RULES: Record<string, Record<string, string[]>> = {
  ionian: {
    I: ['IV', 'V', 'vi'],
    ii: ['V'],
    iii: ['vi'],
    IV: ['I', 'V'],
    V: ['I'],
    vi: ['ii', 'IV'],
    'vii°': ['I'],
  },
  dorian: {
    i: ['IV', 'v', '♭VII'],
    ii: ['v'],
    '♭III': ['vi°'],
    IV: ['i', '♭VII'],
    v: ['♭VII', 'i'],
    'vi°': ['ii'],
    '♭VII': ['i'],
  },
  phrygian: {
    i: ['♭II', '♭VI', '♭VII'],
    '♭II': ['♭VII'],
    '♭III': ['♭VI'],
    '♭VI': ['♭VII', 'i'],
    '♭VII': ['i'],
  },
  lydian: {
    I: ['II', 'V', 'vi'],
    II: ['V'],
    iii: ['vi'],
    '#iv°': ['V'],
    V: ['I'],
    vi: ['II', 'iii'],
  },
  mixolydian: {
    I: ['IV', 'v', '♭VII'],
    ii: ['v'],
    'iii°': ['vi'],
    IV: ['I', 'v'],
    v: ['I'],
    vi: ['ii'],
    '♭VII': ['I'],
  },
  aeolian: {
    i: ['iv', '♭VI', '♭VII'],
    'ii°': ['iv'],
    '♭III': ['♭VI'],
    iv: ['♭VII', 'i'],
    v: ['♭VI', 'i'],
    '♭VI': ['♭VII', 'i'],
    '♭VII': ['i'],
  },
  aeolian_h: {
    i: ['iv', 'V', '♭VI'],
    'ii°': ['V'],
    '♭III+': ['VI'],
    iv: ['V'],
    V: ['i'],
    VI: ['ii°'],
    'vii°': ['i'],
  },
  aeolian_m: {
    i: ['IV', 'V'],
    ii: ['V'],
    '♭III+': ['VI'],
    IV: ['V'],
    V: ['i'],
    'vi°': ['ii'],
    'vii°': ['i'],
  },
  locrian: {
    'i°': ['♭III', 'iv'],
    '♭II': ['♭V'],
    '♭III': ['♭VI'],
    iv: ['♭VII'],
    '♭V': ['i°'],
    '♭VI': ['♭VII'],
    '♭VII': ['i°'],
  },
};

const MODAL_CHARACTERISTICS: Record<string, string[]> = {
  ionian: ['IV', 'V'],
  dorian: ['IV', '♭VII'],
  phrygian: ['♭II', '♭VI'],
  lydian: ['II', '#iv°'],
  mixolydian: ['IV', '♭VII'],
  aeolian: ['♭VI', '♭VII'],
  aeolian_h: ['V', 'VI'],
  aeolian_m: ['IV', 'V'],
  locrian: ['♭II', '♭V'],
};

const POP_SEQUENCE = ['I', 'V', 'vi', 'IV'];
const JAZZ_SEQUENCE = ['ii', 'V', 'I', 'vi'];
const CLASSICAL_SEQUENCE = ['ii', 'V', 'I', 'iv'];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function noteInKeySignature(note: string, keySignature?: KeySignatureLike) {
  const chroma = Note.chroma(note);
  const spelling = chroma === undefined ? undefined : keySignature?.notes[chroma];
  return spelling ? Note.enharmonic(note, spelling) : note;
}

function normalizeQuality(quality: string) {
  return quality.toLowerCase();
}

function degreeLabel(mode: SuggesterMode, index: number) {
  const legacyMode = legacyModeForScale(mode);
  return MODE_ROMANS[legacyMode]?.[index] || SCALE_DEGREE_LABELS[index] || `${index + 1}`;
}

function harmonicFunctionForDegree(root: string, tonic: string, index: number): HarmonicFunction {
  if (index === 0) return 'T';
  if (rootDistance(tonic, root) === 7) return 'D';
  return index % 2 === 0 ? 'T' : 'SD';
}

function scaleStack(notes: string[], degreeIndex: number, requestedSize: number) {
  const size = Math.min(requestedSize, notes.length);
  return Array.from(
    { length: size },
    (_, index) => notes[(degreeIndex + index * 2) % notes.length]
  );
}

function chordFromNotes(root: string, notes: string[], degreeIndex: number, scaleName: string) {
  const detected = TonalChord.detect(notes)
    .map((symbol) => TonalChord.get(symbol))
    .find(
      (chord) =>
        !chord.empty &&
        chord.tonic !== null &&
        Note.chroma(chord.tonic) === Note.chroma(root) &&
        chord.notes.length === notes.length &&
        Pcset.isEqual(chord.notes, notes)
    );

  if (detected) return detected;

  const pcset = Pcset.get(notes);
  const customType = `[${notes.join(',')}]`;
  return {
    ...pcset,
    name: `${root} custom degree ${degreeIndex + 1} (${scaleName})`,
    quality: 'Unknown' as const,
    aliases: [customType, customType, customType, customType],
    tonic: root,
    type: 'custom',
    root,
    rootDegree: degreeIndex + 1,
    symbol: `${root}${customType}`,
    notes,
    intervals: notes.map((note) => Interval.distance(root, note)),
  } as ReturnType<typeof TonalChord.get>;
}

function chordRoot(chord: DetectedChord) {
  return chord.tonic || chord.root || null;
}

function rootDistance(from: string, to: string) {
  const fromChroma = Note.chroma(from);
  const toChroma = Note.chroma(to);
  if (fromChroma === undefined || toChroma === undefined) return null;
  return (toChroma - fromChroma + 12) % 12;
}

export function buildDiatonicField(
  tonic: string,
  mode: SuggesterMode,
  keySignature?: KeySignatureLike
): DiatonicChord[] {
  const scaleName = scaleNameForMode(mode);
  const scale = Scale.get(`${tonic} ${scaleName}`);
  const roots = scale.notes.map((note) => noteInKeySignature(note, keySignature));
  const legacyMode = legacyModeForScale(mode);
  const qualities = MODE_QUALITIES[legacyMode] || [];
  const functions = MODE_FUNCTIONS[legacyMode] || [];

  return roots.map((root, index) => {
    const chord = chordFromNotes(root, scaleStack(roots, index, 3), index, scaleName);
    return {
      root,
      roman: degreeLabel(mode, index),
      quality: normalizeQuality(chord.quality) || qualities[index] || 'unknown',
      harmonicFunction: functions[index] || harmonicFunctionForDegree(root, tonic, index),
      chord,
      degreeIndex: index,
      scaleNotes: roots,
      scaleName,
    };
  });
}

function scoreCandidate(
  candidate: DiatonicChord & { targetRoman?: string; applied?: boolean },
  current: DiatonicChord | undefined,
  currentRoot: string,
  params: SuggestionParams
) {
  const currentRoman = current?.roman;
  let score = 0;
  const rules = currentRoman
    ? PROGRESSION_RULES[legacyModeForScale(params.mode)]?.[currentRoman] || []
    : [];
  const ruleIndex = rules.indexOf(candidate.roman);

  if (ruleIndex >= 0) score += 120 - ruleIndex * 18;
  if (currentRoman === 'V' && candidate.roman === 'I') score += 44;
  if (currentRoman === 'ii' && candidate.roman === 'V') score += 38;
  if (current && current.harmonicFunction === 'D' && candidate.harmonicFunction === 'T')
    score += 32;
  if (current && current.harmonicFunction === 'SD' && candidate.harmonicFunction === 'D')
    score += 24;
  if (current && current.harmonicFunction === 'T' && candidate.harmonicFunction === 'SD')
    score += 16;
  if (current && current.harmonicFunction === candidate.harmonicFunction) score += 4;

  const distance = rootDistance(currentRoot, candidate.root);
  if (distance === 5) score += 16;
  if (distance === 1 || distance === 2 || distance === 10 || distance === 11) score += 8;
  if (distance === 6) score -= 5;

  if (
    params.style === 'modal' &&
    MODAL_CHARACTERISTICS[legacyModeForScale(params.mode)]?.includes(candidate.roman)
  ) {
    score += 28;
  }
  if (params.style === 'pop') {
    const sequenceIndex = POP_SEQUENCE.indexOf(candidate.roman);
    if (sequenceIndex >= 0) score += 18 - sequenceIndex * 2;
  }
  if (params.style === 'jazz') {
    const sequenceIndex = JAZZ_SEQUENCE.indexOf(candidate.roman);
    if (sequenceIndex >= 0) score += 20 - sequenceIndex * 2;
  }
  if (params.style === 'classical') {
    const sequenceIndex = CLASSICAL_SEQUENCE.indexOf(candidate.roman);
    if (sequenceIndex >= 0) score += 20 - sequenceIndex * 2;
  }
  if (candidate.applied) score += params.style === 'jazz' ? 24 : 12;

  params.recentRomans?.forEach((roman, index) => {
    if (roman === candidate.roman) score += (index + 1) * 3;
  });

  return score;
}

function suggestionReason(
  candidate: DiatonicChord & { targetRoman?: string; applied?: boolean },
  current: DiatonicChord | undefined,
  params: SuggestionParams
) {
  if (candidate.applied && candidate.targetRoman) {
    return `Secondary dominant prepares ${candidate.targetRoman}`;
  }
  if (current) {
    const rules = PROGRESSION_RULES[legacyModeForScale(params.mode)]?.[current.roman] || [];
    if (current.harmonicFunction === 'D' && candidate.harmonicFunction === 'T') {
      return `Dominant resolves to ${candidate.roman}`;
    }
    if (
      params.style === 'modal' &&
      MODAL_CHARACTERISTICS[legacyModeForScale(params.mode)]?.includes(candidate.roman)
    ) {
      return `${current.roman} → ${candidate.roman} movement; modal characteristic`;
    }
    if (rules.includes(candidate.roman)) return `${current.roman} → ${candidate.roman} movement`;
  }
  if (
    params.style === 'modal' &&
    MODAL_CHARACTERISTICS[legacyModeForScale(params.mode)]?.includes(candidate.roman)
  ) {
    return `${candidate.roman} is characteristic of ${params.mode.replace('_', ' ')}`;
  }
  if (candidate.harmonicFunction === 'D') return 'Dominant creates forward motion';
  if (candidate.harmonicFunction === 'SD') return 'Predominant moves toward resolution';
  return 'Stable diatonic option';
}

export function getChordSuggestions(params: SuggestionParams): ChordSuggestion[] {
  const currentRoot = params.currentChord ? chordRoot(params.currentChord) : null;
  if (!currentRoot) return [];

  const field = buildDiatonicField(params.tonic, params.mode, params.keySignature);
  const current = field.find(
    (candidate) => Note.chroma(candidate.root) === Note.chroma(currentRoot)
  );
  const candidates: Array<DiatonicChord & { targetRoman?: string; applied?: boolean }> = field.map(
    (candidate) => ({ ...candidate })
  );

  if (params.style === 'jazz' || params.style === 'classical') {
    field.forEach((target, targetIndex) => {
      if (current && targetIndex === field.indexOf(current)) return;
      const dominantRoot = noteInKeySignature(
        Note.transpose(target.root, '5P'),
        params.keySignature
      );
      const symbol = `${dominantRoot}7`;
      candidates.push({
        root: dominantRoot,
        roman: `V/${target.roman}`,
        quality: 'major',
        harmonicFunction: 'D',
        chord: TonalChord.get(symbol),
        degreeIndex: -1,
        scaleNotes: [],
        scaleName: scaleNameForMode(params.mode),
        targetRoman: target.roman,
        applied: true,
      });
    });
  }

  const count = clamp(params.count ?? 3, 1, candidates.length);
  return candidates
    .map((candidate, index) => {
      const chord = candidate.applied
        ? candidate.chord
        : chordFromNotes(
            candidate.root,
            scaleStack(
              candidate.scaleNotes,
              candidate.degreeIndex,
              COMPLEXITY_NOTE_COUNTS[params.extensionComplexity]
            ),
            candidate.degreeIndex,
            candidate.scaleName
          );
      const score = scoreCandidate(candidate, current, currentRoot, params);
      return {
        suggestion: {
          ...candidate,
          chord,
          symbol: chord.symbol,
          reason: suggestionReason(candidate, current, params),
          confidence: Number(clamp(0.5 + score / 250, 0.05, 0.99).toFixed(2)),
        },
        score,
        candidateIndex: index,
      };
    })
    .sort((a, b) => b.score - a.score || a.candidateIndex - b.candidateIndex)
    .filter(
      (suggestion, index, all) =>
        all.findIndex((item) => item.suggestion.symbol === suggestion.suggestion.symbol) === index
    )
    .slice(0, count)
    .map(({ suggestion }) => suggestion);
}
