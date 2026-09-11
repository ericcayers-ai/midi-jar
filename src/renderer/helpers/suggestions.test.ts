import { Chord } from 'tonal';

import { buildDiatonicField, getChordSuggestions, type DetectedChord } from './suggestions';

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
      expect(buildDiatonicField('C', mode as never).map(({ quality }) => quality)).toEqual(
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
    expect(suggestions[0].symbol).toBe('C');
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
});
