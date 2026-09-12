import { encodeMidiFile, type ProgressionChord } from './midiExport';

describe('encodeMidiFile', () => {
  it('writes a valid format-zero MIDI file with timed chord note events', () => {
    const chords: ProgressionChord[] = [
      { symbol: 'C', notes: [60, 64, 67], durationBeats: 2 },
      { symbol: 'G', notes: [67, 71, 74], durationBeats: 1 },
    ];

    const bytes = encodeMidiFile(chords, 480);
    const text = new TextDecoder().decode(bytes.slice(0, 8));

    expect(text).toBe('MThd\0\0\0\x06');
    expect(new DataView(bytes.buffer).getUint16(8)).toBe(0);
    expect(new DataView(bytes.buffer).getUint16(10)).toBe(1);
    expect(new DataView(bytes.buffer).getUint16(12)).toBe(480);
    expect(new TextDecoder().decode(bytes.slice(14, 18))).toBe('MTrk');
    expect(bytes[bytes.length - 3]).toBe(0xff);
    expect(bytes[bytes.length - 2]).toBe(0x2f);
    expect(bytes[bytes.length - 1]).toBe(0);
  });

  it('ignores invalid MIDI notes and clamps durations', () => {
    const bytes = encodeMidiFile(
      [{ symbol: 'invalid', notes: [-1, 60, 200, 60.5], durationBeats: 0 }],
      480
    );

    expect(Array.from(bytes).filter((value) => value === 60).length).toBe(2);
  });
});
