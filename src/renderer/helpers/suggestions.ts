import { Chord as TonalChord } from 'tonal';
import { Note, Scale } from 'tonal';

export type SuggesterMode =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'aeolian_h'
  | 'aeolian_m'
  | 'locrian';

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
  quality: 'major' | 'minor' | 'diminished' | 'augmented';
  harmonicFunction: HarmonicFunction;
  chord: TonalChord;
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

const MODE_SCALE_NAMES: Record<SuggesterMode, string> = {
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

const MODE_ROMANS: Record<SuggesterMode, string[]> = {
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

const MODE_QUALITIES: Record<
  SuggesterMode,
  Array<'major' | 'minor' | 'diminished' | 'augmented'>
> = {
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

const MODE_FUNCTIONS: Record<SuggesterMode, HarmonicFunction[]> = {
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

const PROGRESSION_RULES: Record<SuggesterMode, Record<string, string[]>> = {
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

const MODAL_CHARACTERISTICS: Record<SuggesterMode, string[]> = {
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

function triadSuffix(quality: DiatonicChord['quality']) {
  if (quality === 'minor') return 'm';
  if (quality === 'diminished') return 'dim';
  if (quality === 'augmented') return 'aug';
  return '';
}

function baseSymbol(root: string, quality: DiatonicChord['quality']) {
  return `${root}${triadSuffix(quality)}`;
}

function getChord(symbol: string, fallback: string) {
  const chord = TonalChord.get(symbol);
  return chord.empty ? TonalChord.get(fallback) : chord;
}

function styledSymbol(
  root: string,
  quality: DiatonicChord['quality'],
  harmonicFunction: HarmonicFunction,
  style: SuggesterStyle,
  extensionComplexity: ExtensionComplexity
) {
  const base = baseSymbol(root, quality);
  if (extensionComplexity === 'triads') return base;
  if (style === 'classical') return harmonicFunction === 'D' ? `${root}7` : base;
  if (style === 'modal') return base;

  if (quality === 'diminished') return extensionComplexity === 'extended' ? `${root}m7b5` : base;
  if (quality === 'augmented') return extensionComplexity === 'extended' ? `${root}aug7` : base;
  if (harmonicFunction === 'D') return extensionComplexity === 'extended' ? `${root}13` : `${root}7`;
  if (quality === 'minor') return extensionComplexity === 'extended' ? `${root}m9` : `${root}m7`;
  return extensionComplexity === 'extended' ? `${root}maj9` : `${root}maj7`;
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
  const scale = Scale.get(`${tonic} ${MODE_SCALE_NAMES[mode]}`);
  const roots = scale.notes.map((note) => noteInKeySignature(note, keySignature));
  const romans = MODE_ROMANS[mode];
  const qualities = MODE_QUALITIES[mode];
  const functions = MODE_FUNCTIONS[mode];

  return roots.map((root, index) => {
    const quality = qualities[index];
    const symbol = baseSymbol(root, quality);
    return {
      root,
      roman: romans[index],
      quality,
      harmonicFunction: functions[index],
      chord: getChord(symbol, root),
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
  const rules = currentRoman ? PROGRESSION_RULES[params.mode][currentRoman] || [] : [];
  const ruleIndex = rules.indexOf(candidate.roman);

  if (ruleIndex >= 0) score += 120 - ruleIndex * 18;
  if (currentRoman === 'V' && candidate.roman === 'I') score += 44;
  if (currentRoman === 'ii' && candidate.roman === 'V') score += 38;
  if (current && current.harmonicFunction === 'D' && candidate.harmonicFunction === 'T') score += 32;
  if (current && current.harmonicFunction === 'SD' && candidate.harmonicFunction === 'D') score += 24;
  if (current && current.harmonicFunction === 'T' && candidate.harmonicFunction === 'SD') score += 16;
  if (current && current.harmonicFunction === candidate.harmonicFunction) score += 4;

  const distance = rootDistance(currentRoot, candidate.root);
  if (distance === 5) score += 16;
  if (distance === 1 || distance === 2 || distance === 10 || distance === 11) score += 8;
  if (distance === 6) score -= 5;

  if (params.style === 'modal' && MODAL_CHARACTERISTICS[params.mode].includes(candidate.roman)) {
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
    const rules = PROGRESSION_RULES[params.mode][current.roman] || [];
    if (current.harmonicFunction === 'D' && candidate.harmonicFunction === 'T') {
      return `Dominant resolves to ${candidate.roman}`;
    }
    if (params.style === 'modal' && MODAL_CHARACTERISTICS[params.mode].includes(candidate.roman)) {
      return `${current.roman} → ${candidate.roman} movement; modal characteristic`;
    }
    if (rules.includes(candidate.roman)) return `${current.roman} → ${candidate.roman} movement`;
  }
  if (params.style === 'modal' && MODAL_CHARACTERISTICS[params.mode].includes(candidate.roman)) {
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
  const current = field.find((candidate) => Note.chroma(candidate.root) === Note.chroma(currentRoot));
  const count = clamp(params.count ?? 3, 1, 7);
  const candidates: Array<DiatonicChord & { targetRoman?: string; applied?: boolean }> = field.map(
    (candidate) => ({ ...candidate })
  );

  if (params.style === 'jazz' || params.style === 'classical') {
    field.forEach((target, targetIndex) => {
      if (current && targetIndex === field.indexOf(current)) return;
      const dominantRoot = noteInKeySignature(Note.transpose(target.root, '5P'), params.keySignature);
      const symbol = `${dominantRoot}7`;
      candidates.push({
        root: dominantRoot,
        roman: `V/${target.roman}`,
        quality: 'major',
        harmonicFunction: 'D',
        chord: getChord(symbol, `${dominantRoot}`),
        targetRoman: target.roman,
        applied: true,
      });
    });
  }

  return candidates
    .map((candidate, index) => {
      const symbol = candidate.applied
        ? candidate.chord.symbol
        : styledSymbol(
            candidate.root,
            candidate.quality,
            candidate.harmonicFunction,
            params.style,
            params.extensionComplexity
          );
      const chord = candidate.applied
        ? candidate.chord
        : getChord(symbol, baseSymbol(candidate.root, candidate.quality));
      const score = scoreCandidate(candidate, current, currentRoot, params);
      return {
        ...candidate,
        chord,
        symbol: chord.symbol,
        reason: suggestionReason(candidate, current, params),
        confidence: Number(clamp(0.5 + score / 250, 0.05, 0.99).toFixed(2)),
        _score: score,
        _index: index,
      };
    })
    .sort((a, b) => b._score - a._score || a._index - b._index)
    .filter((suggestion, index, all) => all.findIndex((item) => item.symbol === suggestion.symbol) === index)
    .slice(0, count)
    .map(({ _score, _index, ...suggestion }) => suggestion);
}
