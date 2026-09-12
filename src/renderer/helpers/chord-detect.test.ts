import { detect } from './chord-detect';

describe('chord detection edge cases', () => {
  it('returns no candidates for an empty or invalid note list', () => {
    expect(detect([])).toEqual([]);
    expect(detect(['not-a-note'])).toEqual([]);
  });
});
