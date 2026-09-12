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

  it('uses sounding duration instead of chord-event count as the main evidence mass', () => {
    const recordings: RecordedChord[] = [
      recording('C', ['C', 'E', 'G']),
      recording('G', ['G', 'B', 'D']),
      recording('C', ['C', 'E', 'G']),
      recording('C', ['C', 'E', 'G']),
      { ...recording('F', ['F', 'A', 'C']), durationMs: 4000 },
      { ...recording('G', ['G', 'B', 'D']), durationMs: 4000 },
      { ...recording('C', ['C', 'E', 'G']), durationMs: 8000 },
    ];

    const result = inferAutoContext(recordings, {
      mode: 'simple',
      scaleScope: 'common',
      evidence: 'balanced',
      minimumConfidence: 0,
    });

    expect(result?.tonic).toBe('C');
    expect(result?.evidenceMass).toBeGreaterThan(20);
  });

  it('returns a normalized posterior and explicit alternatives', () => {
    const result = inferAutoContext(
      [
        { ...recording('D', ['D', 'F', 'A']), durationMs: 1200, bass: 'D' },
        { ...recording('G', ['G', 'B', 'D']), durationMs: 1200, bass: 'G' },
        { ...recording('C', ['C', 'E', 'G']), durationMs: 1800, bass: 'C' },
      ],
      {
        mode: 'simple',
        scaleScope: 'common',
        evidence: 'balanced',
        minimumConfidence: 0,
      }
    );

    const posteriorTotal = result?.posterior.reduce((total, item) => total + item.probability, 0);
    expect(posteriorTotal).toBeCloseTo(1, 5);
    expect(result?.alternatives.length).toBe(4);
    expect(result?.alternatives[0].probability).toBeGreaterThanOrEqual(
      result?.alternatives[1].probability ?? 0
    );
  });

  it('uses the previous posterior as causal smoothing across chord changes', () => {
    const previous = [
      { tonic: 'C', scaleType: 'ionian', probability: 0.92 },
      { tonic: 'G', scaleType: 'ionian', probability: 0.08 },
    ];
    const unsmoothed = inferAutoContext([recording('D', ['D', 'F#', 'A'])], {
      mode: 'simple',
      scaleScope: 'common',
      evidence: 'notes',
      minimumConfidence: 0,
    });
    const result = inferAutoContext([recording('D', ['D', 'F#', 'A'])], {
      mode: 'simple',
      scaleScope: 'common',
      evidence: 'notes',
      minimumConfidence: 0,
      previousPosterior: previous,
      hmmSelfTransition: 0.96,
    });

    const smoothedC = result?.posterior.find(
      (candidate) => candidate.tonic === 'C' && candidate.scaleType === 'ionian'
    )?.probability;
    const unsmoothedC = unsmoothed?.posterior.find(
      (candidate) => candidate.tonic === 'C' && candidate.scaleType === 'ionian'
    )?.probability;
    expect(smoothedC).toBeGreaterThan(unsmoothedC ?? 0);
  });
});
