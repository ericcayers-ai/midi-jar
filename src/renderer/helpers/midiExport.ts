export type ProgressionChord = {
  symbol: string;
  notes: number[];
  durationBeats: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function variableLength(value: number) {
  let buffer = value & 0x7f;
  const bytes = [];
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

function writeUint32(value: number) {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function writeUint16(value: number) {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function validNotes(notes: number[]) {
  return [...new Set(notes)].filter((note) => Number.isInteger(note) && note >= 0 && note <= 127);
}

export function encodeMidiFile(chords: ProgressionChord[], pulsesPerQuarter = 480) {
  const ppq = clamp(Math.round(pulsesPerQuarter), 24, 32767);
  const track: number[] = [];

  chords.forEach((chord) => {
    const notes = validNotes(chord.notes);
    if (!notes.length) return;
    const durationTicks = Math.max(1, Math.round(clamp(chord.durationBeats, 0.25, 64) * ppq));

    notes.forEach((note) => {
      track.push(0, 0x90, note, 96);
    });
    notes.forEach((note, index) => {
      track.push(...variableLength(index === 0 ? durationTicks : 0), 0x80, note, 0);
    });
  });

  track.push(0, 0xff, 0x2f, 0);
  return new Uint8Array([
    ...[0x4d, 0x54, 0x68, 0x64],
    ...writeUint32(6),
    ...writeUint16(0),
    ...writeUint16(1),
    ...writeUint16(ppq),
    ...[0x4d, 0x54, 0x72, 0x6b],
    ...writeUint32(track.length),
    ...track,
  ]);
}
