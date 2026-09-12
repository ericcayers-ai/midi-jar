# MIDI Jar fork — improvement roadmap

Research baseline. The implementation work described in this file is now in progress on `feature/chord-suggester`; the current working tree contains the first implementation slice and its focused tests. The research companion documents remain:

- `docs/research/key-detection-sota.md` — algorithms, verified profile vectors, HMM design, validation plan
- `docs/research/competitive-gap-analysis.md` — Scaler 3 / Captain / Hookpad / DAW feature comparison, 20 ranked gaps

Findings below were verified against this working copy at commit `738963c`
(`feature/chord-suggester`, version 1.9.0) unless marked as external research.

---

## 1. The single highest-leverage fix: unblock the local build

`npm ci` cannot complete locally. Root cause verified in this tree:

- `.npmrc` contains exactly one line: `@la-jarre-a-son:registry=https://npm.pkg.github.com/`
- `package-lock.json` resolves `node_modules/nlf@3.0.0` to
  `https://npm.pkg.github.com/download/@la-jarre-a-son/nlf/3.0.0/...` (private, `EALLOWREMOTE`)
- `nlf` is imported by exactly one file: `.erb/scripts/licenses.js`
- That script is invoked by `npm run licenses`, which is chained into `postinstall`

So a private licence-report dependency blocks `npm test`, `npm run types`,
`npm run lint`, and `npm run build` — which is why every verification to date has
had to round-trip through GitHub Actions.

Public `nlf` is version 2.1.1, last published 2019-03-12 — unmaintained.

**Options, best first**

1. Replace `nlf` with `license-checker-rseidelsohn` (5.0.1) or `license-report` (6.8.5),
   rewrite `.erb/scripts/licenses.js` to the new API, drop the `.npmrc` scope line.
2. Remove `licenses` from `postinstall` and run it only in the release workflow.
3. Vendor the generated `ThirdPartyLicenses.json` and regenerate on demand.

Payoff: sub-minute local test/lint/type/build loops instead of ~10-minute CI round trips,
plus the ability to run the app in dev mode (`npm start`) for real visual/MIDI testing —
which has never been done for the Chord Suggester.

## 2. Dependency currency

Verified against the npm registry:

| Package | In repo | Latest | Note |
|---|---|---|---|
| `electron` | ^24.8.3 | 44.3.0 | **EOL.** Supported window is the latest 3 majors (42–44). Electron 24 ended support 2023. |
| `electron-builder` | ^24.9.1 | 26.15.3 | |
| `tonal` | ^5.0.0 | 6.4.3 | Major behind; the whole suggester rests on it |
| `react` / `react-dom` | ^18.2.0 | 19.3.0 | |
| `react-flow-renderer` | ^10.3.14 | — | **Deprecated by npm**: renamed to `reactflow` (11.11.4), now `@xyflow/react` (12.11.6) |
| `@julusian/midi` | ^3.0.1 | 3.8.1 | Native module — matters for hot-plug and Windows MIDI stability |
| `typescript` | ^5.2.2 | 7.0.2 | |
| `jest` | ^29.7.0 | 30.5.1 | |
| `eslint` | ^8.50.0 | 10.10.0 | airbnb preset chain is the blocker for a v9+ flat-config move |
| `express` | ^4.18.2 | 5.2.1 | |
| `electron-store` | ^8.1.0 | 11.0.2 | |
| `vexflow` | ^4.2.3 | 5.0.0 | |

There is no `dependabot.yml` or Renovate config in `.github/`.

Recommended order: unblock local build → Electron 24→latest LTS-ish major (biggest security
delta, native rebuild risk) → `tonal` 5→6 → `react-flow-renderer`→`@xyflow/react` →
tooling (TS/Jest/ESLint) → React 19.

## 3. Auto key/scale detection — replace the heuristic

Current `src/renderer/helpers/autoContext.ts`:

- binary in-scale / out-of-scale pitch-class counting, out-of-scale penalised 1.5×
- a tonic-root bonus (`0.24 × fraction of chords rooted on tonic`)
- a hardcoded `0.16` bonus if the *last* chord root equals the tonic
- confidence = `0.5 + margin × 0.45 + min(0.15, n/80)` — an arbitrary formula, not a probability
- no note durations, no velocity, no recency decay, no modulation model
- brute-forces 35 tonics × ~92 `Scale.names()` in advanced mode, re-run on **every** recorded
  chord when `autoRegisterWhileRecording` is on

Nothing in the tonal-analysis literature works this way. Established practice
(details and verified numeric vectors in `key-detection-sota.md`):

1. Build a 12-bin pitch-class histogram weighted by **sounding duration** (Note On → effective
   Note Off, respecting CC64 sustain), with a mild velocity curve.
2. Score all 24 major/minor candidates by Pearson correlation against published profiles —
   Krumhansl-Kessler, Temperley-Kostka-Payne, Aarden-Essen, Bellman-Budge. Verified vectors are
   in the briefing, sourced from Sapp's Humdrum `keycor` implementation. Ensemble them.
3. Keep bass-note, chord-root and cadence evidence as **separate features**, not as extra copies
   of the note histogram. The current code effectively triple-counts a repeated root.
4. Run a causal 24-state forward HMM over the emission distribution (high self-transition,
   circle-of-fifths-weighted transitions) so modulation is tracked instead of averaged away.
5. Derive confidence from the posterior — softmax probability, top-vs-runner-up margin,
   normalised entropy — and calibrate it on labelled captures. Abstain below a mass threshold
   rather than returning a fabricated percentage.

Mode disambiguation deserves explicit handling: **a pitch-class set does not identify a mode.**
C major and D Dorian share identical pitch classes. The current scorer cannot in principle
distinguish them except through the ad-hoc tonic bonus. Correct evidence is tonic recurrence
and duration, metrical placement, first/last bass note, tonic-triad quality, and characteristic
degrees (Dorian ♮6, Phrygian ♭2, Lydian ♯4, Mixolydian ♭7). When the distinguishing degree
never sounds, the honest answer is "minor-family, ambiguous" — not a confident Dorian.

Performance: with duration-weighted evidence the candidate scoring becomes a fixed 24-way
(or 12 × N-modes) correlation per update instead of a 3,220-candidate sweep per chord.

## 4. Convenience / plug-and-play gaps

From the competitive analysis, the gaps that most affect "does this feel finished":

**P0**

1. **MIDI input persistence and hot-plug recovery** — remember the device, show
   connected / waiting-for-*name* / last-message-time, auto-rebind when it returns, never
   silently fall back to a different keyboard.
2. **Audible preview with zero routing.** Today `audition` is off by default and requires
   picking a MIDI output; with no output selected the UI just says "Select a MIDI output in
   Settings". A first-run user cannot hear a single suggestion. A built-in preview instrument
   (Web Audio in the renderer) plus a visible "Preview only / Send MIDI" switch fixes this.
3. **A progression canvas.** A ranked list is not a workflow. Chord slots with add / replace /
   delete / duration / loop / undo, kept separate from the detected-input history.
4. **MIDI export / drag-and-drop.** Every competitor makes output portable. `.mid` export of a
   suggestion or the whole progression.
5. **Pad and computer-keyboard triggering** of the visible suggestions, with panic / all-notes-off.
6. **Confidence, evidence and alternatives surfaced** on the key detection, with an explicit
   Auto / Locked / Ask-before-changing mode. Right now `registerContext` silently overwrites
   the user's tonic and mode in persisted settings with no undo.

**P1** — detection history with correction, modulation change-point UI, voice-leading-aware
voicing variants, ranking controls that actually change rules rather than labels, a MIDI routing
wizard (Windows has no native virtual MIDI port; macOS IAC must be enabled), MIDI learn, tempo /
transport sync, named presets, and a dedicated Suggester **overlay route** — the existing
HTTP/WebSocket OBS support is this fork's strongest unexploited wedge.

## 5. Correctness and hygiene issues found in the tree

- **`build-fork-windows.yml` exists on `origin/main` but not on `feature/chord-suggester`.**
  The feature branch cannot build itself; artifact runs depend on the workflow living on another
  branch. Cherry-pick it onto the feature branch.
- **`src/main/menu.ts:145` still opens `https://github.com/la-jarre-a-son/midi-jar/issues`** —
  fork users reporting fork bugs land upstream.
- **No explicit `contextIsolation` / `sandbox` / `nodeIntegration` in `src/main/main.ts`
  `webPreferences`.** Electron 24 defaults are safe (`contextIsolation: true`,
  `nodeIntegration: false`), but they should be stated explicitly so an Electron upgrade or an
  accidental edit cannot silently weaken them. `sandbox: true` is worth testing.
- **No Content-Security-Policy** anywhere in `src/` — neither a meta tag nor
  `onHeadersReceived`. The renderer loads a dev webpack server in development.
- **The overlay HTTP/WS server binds every interface.** `app.listen(port)` with no host argument
  binds `0.0.0.0`, and `getAddresses()` deliberately advertises every LAN IPv4. Default port
  25011, enabled by default. That is intentional for OBS-on-another-machine, but it should be an
  explicit, documented choice with a bind-address setting (`127.0.0.1` default) rather than an
  accident of `express` defaults.
- **No test coverage of the UI.** Only `suggestions.test.ts`, `autoContext.test.ts` and the
  stock `App.test.tsx` exist. `ChordSuggester.tsx` (407 lines, all the record/register state
  machine) has zero tests, and the record flow has never been exercised against real MIDI input.
- **No Dependabot/Renovate**, and `.github/stale.yml` is inherited from upstream.
- `docs/research/` is currently untracked — commit or ignore it deliberately.

## 6. Suggested sequencing

**Phase 1 — make the project workable (hours)**
Replace `nlf`, drop the `.npmrc` scope, restore `npm ci` / `test` / `lint` / `types` / `build`
locally. Cherry-pick the fork build workflow onto the feature branch. Repoint the issues menu
link. Add Dependabot. Run the app in dev mode and actually play into the Chord Suggester.

**Phase 2 — make the feature trustworthy (days)**
Duration-weighted pitch-class evidence + profile correlation + forward HMM in `autoContext.ts`,
with a deterministic MIDI fixture corpus (cadences, relative major/minor, Dorian with and
without ♮6, inversions, rootless voicings, pedal, modulations) and calibrated confidence.
Add the Auto/Locked/Ask mode so detection never silently rewrites the user's settings.
Add tests for `ChordSuggester.tsx`.

**Phase 3 — make it convenient (days–weeks)**
Built-in preview instrument, device persistence and hot-plug, progression canvas, `.mid` export,
pad/keyboard triggering, presets.

**Phase 4 — make it distinctive (weeks)**
Suggester overlay route for OBS, explainable "why this chord" evidence panel, voice-leading
variants, modulation timeline. Position as an offline, explainable, controller-aware harmonic
co-pilot and streaming HUD rather than a Scaler clone.

**Phase 5 — dependency modernisation**
Electron, tonal 6, `@xyflow/react`, TS/Jest/ESLint, React 19 — each behind a green local suite,
which Phase 1 makes possible.
