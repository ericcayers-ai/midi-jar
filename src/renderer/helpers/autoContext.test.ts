import { Scale } from 'tonal';

import {
  ALL_TONICS,
  COMMON_SCALE_TYPES,
  inferAutoContext,
  type RecordedChord,
} from './autoContext';

const recording = (root: string, notes: string[]): RecordedChord => ({
  symbol: `${root}(${notes.join(',')})`,
  root,
  notes,
});

describe('automatic harmonic context', () => {
  it('registers a simple major-key recording deterministically', () => {
    const recordings = [
      recording('C', ['C', 'E', 'G']),
      recording('F', ['F', 'A', 'C']),
      recording('G', ['G', 'B', 'D']),
      recording('C', ['C', 'E', 'G']),
    ];
    const options = {
      mode: 'simple' as const,
      scaleScope: 'common' as const,
      evidence: 'balanced' as const,
      minimumConfidence: 0,
    };

    const first = inferAutoContext(recordings, options);
    const second = inferAutoContext(recordings, options);

    expect(first).toEqual(second);
    expect(first?.tonic).toBe('C');
    expect(first?.scaleType).toBe('ionian');
    expect(first?.chordCount).toBe(4);
  });

  it('searches all Tonal scales and theoretical tonics in advanced mode', () => {
    const result = inferAutoContext([recording('C', ['C', 'E', 'G', 'B', 'D'])], {
      mode: 'advanced',
      scaleScope: 'all',
      evidence: 'notes',
      minimumConfidence: 0,
    });

    expect(result).not.toBeNull();
    expect(ALL_TONICS).toContain(result?.tonic);
    expect(Scale.names()).toContain(result?.scaleType);
  });

  it('accepts all common-scale candidates through the advanced scope', () => {
    const result = inferAutoContext(
      [recording('D', ['D', 'F', 'A']), recording('G', ['G', 'B', 'D'])],
      {
        mode: 'advanced',
        scaleScope: 'common',
        evidence: 'chords',
        minimumConfidence: 0,
      }
    );

    expect(result).not.toBeNull();
    expect(COMMON_SCALE_TYPES).toContain(result?.scaleType);
  });

  it('returns null when no chord has been recorded', () => {
    expect(
      inferAutoContext([], {
        mode: 'simple',
        scaleScope: 'common',
        evidence: 'balanced',
        minimumConfidence: 0,
      })
    ).toBeNull();
  });
});
