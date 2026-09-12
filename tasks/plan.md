# Implementation Plan: MIDI Jar Chord Suggester completion

## Scope

Carry the researched improvement roadmap through implementation, verification, fork publication, fork-only CI, installation, and runtime checks. Preserve existing user changes; do not use upstream artifacts.

## Acceptance criteria

- Local dependency installation no longer depends on the unavailable private `@la-jarre-a-son/nlf` package.
- Full local tests, lint, type checks, and production build execute successfully, or the exact external blocker is documented with CI evidence.
- Automatic context detection uses duration-aware evidence, statistically grounded profiles, calibrated posterior confidence, and causal smoothing without silently changing user settings.
- MIDI input lifecycle handles Note On velocity zero, Note Off, sustain pedal, device loss, and grouped chord commits.
- Chord recognition preserves inversions/alternatives and does not regress existing Tonal behavior.
- Record flow supports start/stop, simple and advanced modes, evidence/confidence/alternatives, manual override, and change history.
- MIDI input selection persists and recovers from hot-plug where the current MIDI abstraction supports it.
- Suggestions can be previewed without a configured DAW route, triggered from keyboard/pads, accepted into a progression, and exported as MIDI.
- Overlay exposes the suggester state without granting OBS direct MIDI ownership.
- Security, routing, updater provenance, documentation, and fork workflow are corrected.
- Fresh unit, component, build, packaged-artifact, installation, and runtime checks pass.

## Execution order

### Phase 1 — Build foundation

1. Replace the unavailable licence dependency with a public, maintained-compatible implementation or isolate licence generation from install; retain generated licence output.
2. Add the fork-only Windows workflow to the feature branch, correct fork URLs, add dependency automation, and make Electron security/routing defaults explicit.
3. Install dependencies and run the repository's real test/type/lint/build commands.

**Checkpoint:** local install and full checks are green before feature work continues.

### Phase 2 — Detection foundation

4. Add duration/velocity/pedal-aware MIDI evidence accumulation and grouped event snapshots.
5. Add profile correlation, posterior/entropy confidence, causal forward HMM smoothing, persistence gates, and alternatives.
6. Add ranked chord candidates with inversion/slash/rootless metadata and regression fixtures.

**Checkpoint:** deterministic detector tests cover cadence, modal ambiguity, sustain, rolls, inversions, rootless chords, modulation, and abstention.

### Phase 3 — User flow

7. Integrate the detector into record start/stop with Auto/Locked/Ask behavior and correction/history UI.
8. Add persistent input selection/hot-plug status and no-route built-in audition.
9. Add suggestion keyboard/pad triggering, progression canvas, undo, durations, and MIDI export.

**Checkpoint:** component tests exercise the full record and suggestion flows; production UI is launched and inspected.

### Phase 4 — Product surface

10. Add overlay state route, presets, routing wizard, MIDI learn, and transport/timing controls where supported by the existing architecture.
11. Add evidence panel, voice-leading variants, modulation timeline, and distinctive offline/explainable UX.
12. Update docs and changelog with verified behavior and bounded limitations.

**Checkpoint:** end-to-end user-visible path and overlay path are manually verified.

### Phase 5 — Currency and release

13. Upgrade dependencies incrementally only where the local suite stays green; avoid unrelated framework migration if it creates unbounded risk.
14. Run fork CI, verify provenance and artifact checksums, overwrite the installed application, launch it, and verify runtime stability.
15. Commit/push the final feature branch and report only fresh receipts.

## Risk controls

- Keep all changes on `feature/chord-suggester` and use only `ericcayers-ai/midi-jar` for build/install provenance.
- Preserve uncommitted user work; docs created by the research agents are intentional and will be included.
- Do not claim full validation from isolated tests or CI alone.
- If a dependency upgrade or feature cannot be validated locally, stop that sub-change and retain the last green state.
- Never silently overwrite the user's selected key/scale; auto-registration must be explicit or governed by the selected policy.
