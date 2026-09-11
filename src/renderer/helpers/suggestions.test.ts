import { Chord, ChordType, Scale } from 'tonal';

import {
  buildDiatonicField,
  getChordSuggestions,
  type DetectedChord,
  type SuggesterMode,
} from './suggestions';

describe('chord suggestion engine', () => {
  it('builds the expected diatonic triad qualities for every supported mode', () => {
    const expected: Record<string, string[]> = {
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

    Object.entries(expected).forEach(([mode, qualities]) => {
      expect(buildDiatonicField('C', mode as SuggesterMode).map(({ quality }) => quality)).toEqual(
        qualities
      );
    });
  });

  it('ranks the tonic as the strongest resolution after V in C', () => {
    const currentChord = Chord.get('G7') as DetectedChord;
    const suggestions = getChordSuggestions({
      tonic: 'C',
      mode: 'ionian',
      style: 'classical',
      extensionComplexity: 'sevenths',
      currentChord,
      count: 3,
    });

    expect(suggestions[0].roman).toBe('I');
    expect(suggestions[0].symbol).toBe('Cmaj7');
    expect(suggestions[0].reason).toContain('resolves');
  });

  it('adds deterministic extensions for jazz without changing the result between calls', () => {
    const currentChord = Chord.get('Dm7') as DetectedChord;
    const params = {
      tonic: 'C',
      mode: 'ionian' as const,
      style: 'jazz' as const,
      extensionComplexity: 'extended' as const,
      currentChord,
      count: 3,
    };

    const first = getChordSuggestions(params);
    const second = getChordSuggestions(params);

    expect(first).toEqual(second);
    expect(first.some(({ symbol }) => /7|9|11|13/.test(symbol))).toBe(true);
  });

  it('uses the selected key spelling for modal fields', () => {
    const field = buildDiatonicField('D', 'dorian', {
      notes: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
    });

    expect(field.map(({ root }) => root)).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C']);
  });

  it('returns no suggestions until a chord is detected', () => {
    expect(
      getChordSuggestions({
        tonic: 'C',
        mode: 'ionian',
        style: 'pop',
        extensionComplexity: 'triads',
        currentChord: null,
        count: 3,
      })
    ).toEqual([]);
  });

  it('can return a modal characteristic chord as a named next move', () => {
    const suggestions = getChordSuggestions({
      tonic: 'D',
      mode: 'dorian',
      style: 'modal',
      extensionComplexity: 'triads',
      currentChord: Chord.get('Dm') as DetectedChord,
      count: 3,
    });

    expect(
      suggestions.some(({ roman, reason }) => roman === '♭VII' && reason.includes('modal'))
    ).toBe(true);
  });

  it('builds every Tonal scale type for every theoretical tonic spelling', () => {
    const tonics = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].flatMap((letter) =>
      ['bb', 'b', '', '#', '##'].map((accidental) => `${letter}${accidental}`)
    );
    const scaleTypes = [...Scale.names(), 'ionian', 'aeolian_h', 'aeolian_m'];

    scaleTypes.forEach((scaleType) => {
      const tonalName =
        scaleType === 'ionian'
          ? 'major'
          : scaleType === 'aeolian_h'
          ? 'harmonic minor'
          : scaleType === 'aeolian_m'
          ? 'melodic minor'
          : scaleType;
      tonics.forEach((tonic) => {
        const expectedScale = Scale.get(`${tonic} ${tonalName}`);
        const field = buildDiatonicField(tonic, scaleType);
        expect(field).toHaveLength(expectedScale.notes.length);
        expect(field.length).toBeGreaterThan(0);
        field.forEach(({ root, chord, degreeIndex, scaleNotes }) => {
          expect(root).toBe(scaleNotes[degreeIndex]);
          expect(chord.notes.length).toBe(Math.min(3, field.length));
          expect(chord.intervals).toHaveLength(chord.notes.length);
        });
      });
    });
  });

  it('supports triad, seventh, and extended voicings for every scale type', () => {
    Scale.names().forEach((mode) => {
      ['triads', 'sevenths', 'extended'].forEach((extensionComplexity) => {
        const field = buildDiatonicField('C', mode);
        const suggestions = getChordSuggestions({
          tonic: 'C',
          mode,
          style: 'modal',
          extensionComplexity: extensionComplexity as 'triads' | 'sevenths' | 'extended',
          currentChord: field[0].chord,
          count: field.length,
        });
        expect(suggestions).toHaveLength(field.length);
        suggestions.forEach(({ chord }) => {
          expect(chord.notes.length).toBe(
            Math.min(
              extensionComplexity === 'triads' ? 3 : extensionComplexity === 'sevenths' ? 4 : 7,
              field.length
            )
          );
          expect(chord.intervals).toHaveLength(chord.notes.length);
        });
      });
    });
  });

  it('handles every Tonal chord symbol as the current chord', () => {
    const chords = ChordType.symbols()
      .map((symbol) => Chord.get(`C${symbol}`))
      .filter((chord) => !chord.empty);

    expect(chords.length).toBe(ChordType.symbols().length);
    chords.forEach((currentChord) => {
      const suggestions = getChordSuggestions({
        tonic: 'C',
        mode: 'major',
        style: 'jazz',
        extensionComplexity: 'extended',
        currentChord: currentChord as DetectedChord,
        count: 12,
      });
      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach(({ chord }) => {
        expect(chord.notes.length).toBeGreaterThan(0);
        expect(chord.intervals).toHaveLength(chord.notes.length);
      });
    });
  });

  it('returns all twelve chromatic degree suggestions with exact custom intervals', () => {
    const suggestions = getChordSuggestions({
      tonic: 'C',
      mode: 'chromatic',
      style: 'modal',
      extensionComplexity: 'extended',
      currentChord: Chord.get('C') as DetectedChord,
      count: 12,
    });

    expect(suggestions).toHaveLength(12);
    expect(suggestions.every(({ chord }) => chord.notes.length === 7)).toBe(true);
    expect(suggestions.every(({ chord }) => chord.intervals.length === 7)).toBe(true);
  });
});
