# 1.10.0 (Unreleased)

## Features
- **Chord Suggester**: duration- and velocity-weighted key/scale evidence with published profile ensembles, posterior alternatives, and causal smoothing.
- **Chord Suggester**: explicit Auto, Ask, and Locked context-registration policies; evidence mass and alternative candidates are visible.
- **Chord Suggester**: remembers a MIDI input, reconnects after hot-plug, previews suggestions locally, triggers suggestions with number keys, and builds/export progressions as MIDI.
- **MIDI**: handles sustain-controller thresholds, all-notes-off messages, and resets active note state when an input disappears.
- **Security**: production windows use context isolation, sandboxing, disabled node integration, and restricted navigation; overlay binding defaults to localhost.
- **Fork**: package metadata, updater metadata, issue links, release conditions, and Windows build workflow target `ericcayers-ai/midi-jar`.

## Fixes
- Replaced the unavailable private `@la-jarre-a-son/nlf` alias and private `conf` alias with public package metadata so the lockfile no longer requires those packages.
- Fixed empty-note chord detection and state mutation while toggling sustain.

# 1.9.0 (Unreleased)

## Features
- **Chord Suggester**: record/stop context helper that registers the detected tonic, scale, and mode automatically
- **Chord Suggester**: simple common-scale helper plus advanced full-catalog inference with configurable evidence and confidence
- **Chord Suggester**: live chord detection with deterministic next-chord suggestions across Tonal's complete scale catalog, all tonic spellings, and four style presets
- **Chord Suggester**: generates every scale degree and triad/seventh/extended voicing, preserving exact intervals for unnamed chord sets
- **Chord Suggester**: optional piano ghost highlighting, recent-chord trail, and key/mode-aware harmonic explanations
- **MIDI**: audition selected suggestions through a chosen physical output

# 1.7.0 (2024-01-05)

## Features
- **ChordDictionary**: added a new module for displaying all available chords
- **PianoKeyboard**: added target notes (for future use & dictionary)
- **ChordDisplay**: detect on release option
- **ChordDisplay**: added chord link to dictionary
- **Layout**: added a bottom bar with key signature and latency

## Fixes
- **Notation**: adapt centering when single stave
- **CircleOfFifths**: dominant sector not correclty detected


# 1.6.2 (2023-12-19)

## Fixes
- **Chord Display:** increase keyboard label font-size
- **Chord Display:** added chordNote as a label (note name in chord with correct alteration instead of keysignature)
- **chord-dictionary:** fix some issue in tonal chord dictionary
- **Home:** correct card aspect ratio and chord-display icon
- **Settings:** correctly reflect startup minimized option

# 1.6.1 (2023-12-11)

## Fixes
- **Chord Display:** allow keyboard key height up to 16

# 1.6.0 (2023-12-23)

## Features
- **Chord Display:** Fully customizable Piano (sizes, colors and labels above keys)
- **Chord Display:** disable sustain pedal for detection or display
- **Chord Display:** wrap keyboard option

# 1.5.1 (2023-11-21)

## Features
- **window:** retain window maximized, aot and path

## Fixes

- **Chords:** correctly order chord inversion vs omissions on detect
- **Chords:** remove M & maj notation for major chord
- **chore:** Use a published fork of nlf
- **chore:** Add flatpak build target
- disable autoupdate and add an update modal

# 1.5.0 (2023-11-07)

## Features

- **Chords:** Custom chord dictionary with detect omissions and 3 chord notations
- **Settings:** allow chord omissions & change chord notation
- **Chord Display:**: display chord full name & highlight alterations

## Fixes

- **chore:** Upgraded tonal to v5

# 1.4.0 (2023-09-25)

## Features

- **ui:** Rewrite UI entirely
- **ui:** Added settings drawer for all modules
- **Home:** new app launch page with startup changelog modal
- **About:** added Changelog
- **Chord Display:** multiple modules can be added
- **window:** retain window position on close

## Fixes

- **chore:** Upgraded all dependencies and fix security warnings
- **Midi:** Rewrite midi routing with @julusian/midi package
- **Credits:** correctly list all licenses from dependencies

# 1.3.0 (2023-05-04)

## Features

- **ChordQuiz:** Added a quiz module with customizable difficulty, modes, and game infos
- **Chord Display:** Added intervals display

## Fixes

- **Circle of Fifths:** Ensure the current key is highlighted (can happen with strange key signatures)
- **Music Notation:** Fixed parsing for notes with multiple alterations when using strange key signatures (like B## or Ebb)
- **Settings:** Swapped default toggle order (N / Y instead of Y / N)
- **Settings:** Fixed migrations and ensure settings are always defaulted
- **misc**: Double-clicking the task icon opens window directly
- **macos**: Avoid MacOS Ventura to trigger notificatons at startup + start minimized

# 1.2.1 (2022-11-05)

## Fixes

- **Midi**: Consider NOTE_ON with velocity 0 as NOTE_OFF

# 1.2.0 (2022-09-21)

## Features

- **Circle of Fifths:** Added a Circle of Fifths module with customizable rendering
- **Overlay:** Circle of Fifths also available in overlay
- **Settings:** Moved Music Notation settings to its own section (affecting all modules now)
- **Staff Notation:** Added clef and transpose settings for transposing instruments

## Fixes

- **Music Notation:** Fixed notation in C# giving C instead of B#

# 1.1.0 (2022-08-07)

## Features

- **Chord Display:** Added music notation with VexFlow
- **Chord Display:** Added Key Signature with note names in key
- **Settings:** Input for Notes + Midi Learn
- **Debugger:** Filter Midi Clock
- **Overlay:** auto reconnect websocket
- **chore:** Added Linux AppImage build + fix traffic lights

## Fixes

- **Settings:** Fixed Input Color accepting any text
- **Chord Display:** Fixed Keyboard size overflowing in some windows sizes
- **Debugger:** Fixed message manager being disposed in useMidiMessages hook
- **Home:** Wrong link to report issues
- **chore:** upgrade dependencies and Electron v19

# 1.0.0 (2022-07-26)

## Features

- **MIDI:** discover, connect, routing, latency monitoring
- **Chord Display:** Detect chord, display piano with notes with sustain, UI customization
- **Overlay:** HTTP/WS server for external integration
- **Debugger:** Display All MIDI messages received
- **General:** Launch at startup, Always on Top + Window interactions
