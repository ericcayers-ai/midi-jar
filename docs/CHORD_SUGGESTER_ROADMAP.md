# Chord Suggester — MIDI Jar Fork Roadmap

**Fork:** `ericcayers-ai/midi-jar` · **Branch:** `feature/chord-suggester` · **Upstream:** `la-jarre-a-son/midi-jar` @ v1.7.0
**Goal:** Add a new **Chord Suggester** module (tab) that, while you improvise, names what you're playing and suggests musically sensible next chords in a chosen key/mode — the concept from `splineguy/midi-chord-suggester`, rebuilt natively inside MIDI Jar's Electron/React/TypeScript app instead of a Python CLI.

---

## 1. Why this fork, and what "native" buys us

`splineguy/midi-chord-suggester` is a ~600-line Python script (`mido` + `pygame.midi`) that:
- reads live MIDI, names chords (triads → 7ths → extensions like m9/maj7♯11/7♭9),
- maps the played root to a **scale degree** in any Tonal catalog scale and chosen tonic,
- suggests 2–3 next chords via hard-coded **modal cadence + progression-rule tables**, with pop / jazz / classical "style" flavoring and jazz secondary-dominant spice.

MIDI Jar already solves the hard 80% of that problem *better* than the reference script:

| Reference script (Python) | MIDI Jar (already in the fork) |
|---|---|
| Manual interval-set matching for chord names | `renderer/helpers/chord-detect.ts` — weighted detection over a **custom chord dictionary** with inversion + omission scoring, built on `@tonaljs` |
| `pygame.midi` device polling | Full MIDI routing engine (`main/midi/*`), device manager, virtual ports, sustain handling |
| `print()` to a terminal | React views, piano keyboard render, notation staff, OBS/browser overlay via HTTP/WebSocket server |
| Hard-coded 12-note enharmonic map | `getKeySignature` / `getNoteInKeySignature` proper key-signature spelling (`helpers/note.ts`, tonal `Key`) |
| Scale-degree lookup tables per mode | tonal `Key` + `RomanNumeral` + `Progression` (verified working, see §4) |

So the fork's real work is **not** re-detecting chords — it's adding a **harmony/suggestion layer** on top of the notes and chord the app *already* computes every keystroke, plus a new tab/view/settings/overlay wired into the existing module pattern. This is an additive feature that reuses `useNotes()` verbatim.

---

## 2. How MIDI Jar is built (verified by reading the fork)

**Stack:** Electron + Webpack (electron-react-boilerplate), TypeScript, React 18, `react-router-dom` (hash router), `@la-jarre-a-son/ui` component lib, `tonal`/`@tonaljs/chord` for music theory, `conf` for persisted settings with versioned migrations. Node pinned to **18.16.0** (`.nvmrc`) — current shell has Node 24, so use `nvm use 18` before `npm install`.

**The module pattern every feature follows** (Chord Display / Circle of Fifths / Chord Quiz / Chord Dictionary all do this identically — a new tab plugs into the same seven seams):

1. **Route** — `src/renderer/router.tsx`: a `<Route path="…" handle={{title, icon, hasSettings}}>` wrapped in `<MidiMessageManagerProvider namespace="…" source="internal">`, with a nested `settings` route rendering a `<DrawerOutlet>`.
2. **View** — `src/renderer/views/<Name>/` : `index.tsx`, `<Name>.tsx`, `<Name>.module.scss`.
3. **Live notes** — `src/renderer/hooks/useNotes.ts`: give it notation + module settings, get back `{ midiNotes, pitchClasses, playedMidiNotes, sustainedMidiNotes, chords, params:{keySignature} }`. `chords[0]` is the current best-detected chord (with `tonic`, `type`, `intervals`, `symbol`, `rootDegree`). **This is the input to the suggester — no MIDI plumbing needed.**
4. **Settings type** — `src/main/types/Settings.ts`: add `ChordSuggesterSettings` type + field on `Settings`.
5. **Settings defaults** — `src/main/store/defaults.ts`: `defaultChordSuggesterSettings` + register on `defaults.settings`.
6. **Settings JSON-schema + migration** — `Settings.schema.json` is generated (`npm run schema:settings` via `typescript-json-schema`); add a `conf` migration `'1.8.0'` in `src/main/store/migrations.ts` (+ `legacy-types.ts`) so existing users get the new settings block without a store wipe.
7. **Nav surfaces** — Home tile in `views/Home/Home.tsx`, an entry in Settings routes `views/Settings/routes.tsx` + a `<Name>Settings>` view, an icon name in `components/Icon/icons/index.tsx` (+ a `<name>.react.svg`), and (optional) overlay exposure via the existing server so it works as an OBS BrowserSource.

**Chord data available per keystroke** (`useNotes` → `getChordInfo`): each detected chord already carries `{ tonic, type, aliases, intervals, notes, symbol, root, rootInterval, rootDegree }`. We derive its Roman-numeral degree in the selected key from this — no re-parsing.

---

## 3. The suggestion engine (design)

Ported and upgraded from the reference script, implemented as a **pure, unit-testable helper** `src/renderer/helpers/suggestions.ts` (no React, no MIDI — just data in, ranked suggestions out). This is the intellectual core and is deliberately isolated so it can be tested with `jest` (already configured).

### 3.1 Inputs
```ts
interface SuggestParams {
  tonic: string;              // e.g. "C", "Bb" (from settings)
  mode: ModeId;              // ionian|dorian|phrygian|lydian|mixolydian|aeolian|aeolian_h|aeolian_m|locrian
  currentChord: DetectedChord | null;  // chords[0] from useNotes, or null when <3 notes held
  style: 'pop' | 'jazz' | 'classical' | 'modal';
  keySignature: KeySignatureConfig;    // for correct enharmonic spelling
}
```

### 3.2 Pipeline
1. **Build the diatonic field** for `tonic`+`mode` using tonal (`Key.majorKey`, `Key.minorKey`, or `Scale.get('<tonic> <mode>')` for the church modes). Each degree → `{ roman, chordSymbol, quality, harmonicFunction }`. Verified output in §4.
2. **Locate the current chord's degree** — match `currentChord.tonic` pitch-class against the scale degrees to get its Roman numeral (reuse `rootDegree`/`Interval.distance`, mirroring `getChordInfo`).
3. **Rank next-chord candidates** by combining three scored signals (weighted, not a single hard-coded table — this is the upgrade over the reference's static dict):
   - **Progression rules** — a per-mode successor table (ported from the reference's `get_progression_rules` + `modal_cadences`, e.g. Ionian `V→I`, `ii→V`, `vi→ii/IV`) → strong weight on tonal-gravity moves and cadences.
   - **Harmonic function** — tonal's `chordsHarmonicFunction` (`T`/`SD`/`D`): reward T→SD→D→T motion, penalize retro moves, per common-practice voice-leading. (Verified: C major → `["T","SD","T","SD","D","T","D"]`.)
   - **Root-motion heuristic** — favor descending-fifth / stepwise root motion (jazz ii-V, pop root-by-4th), lightly penalize tritone/awkward leaps unless style=jazz.
4. **Style flavoring** (ported from the reference's `suggest_next_chords` style switch):
   - `pop` → triads / sus / add9, prefers I–V–vi–IV neighborhoods.
   - `jazz` → 7th/9th/11th/13th extensions, secondary dominants (V7/x), tritone subs, ii–V insertion.
   - `classical` → functional cadences, applied dominants, restrained extensions.
   - `modal` → emphasize the mode's characteristic chord (e.g. Dorian ♭VII & IV, Mixolydian ♭VII, Lydian II) and avoid the leading-tone pull that collapses the mode to major/minor.
5. **Output** top *N* (default 3) as `{ symbol, roman, reason, confidence }`, so the UI can show *why* ("V → I cadence", "secondary dominant of vi", "modal ♭VII").

### 3.3 Determinism note
The reference script uses `random.choice` for jazz spice — non-reproducible. The fork replaces randomness with a **seeded, weighted ranking** so the same held chord + settings always yields the same suggestions (better for practice, and unit-testable). A "reroll / show more" affordance covers exploration.

---

## 4. Proof the harmony layer works (tonal, verified in scratch env)

Ran against `tonal@^5` (the fork's pinned major):
```
Key.majorKey('C').chords                 = ["Cmaj7","Dm7","Em7","Fmaj7","G7","Am7","Bm7b5"]
Key.majorKey('C').chordsHarmonicFunction = ["T","SD","T","SD","D","T","D"]
Key.minorKey('A').natural.chords         = ["Am7","Bm7b5","Cmaj7","Dm7","Em7","Fmaj7","G7"]
Progression.fromRomanNumerals('C', ['I','V','vi','IV']) = ["C","G","A","F"]
Scale.get('D dorian').notes              = ["D","E","F","G","A","B","C"]
RomanNumeral.get('bVII')                 = { step:6, alt:-1, name:"bVII" }
```
This confirms tonal alone supplies diatonic chords, harmonic function, modal scales, and Roman-numeral ↔ chord conversion — so the engine leans on a maintained library for theory and keeps only the *taste* (progression weights, style rules) as fork-authored code.

---

## 5. UI / UX design

**New tab: "Chord Suggester"** (route `/suggestions` or `/improvise`).

Layout (reusing existing components — `PianoKeyboard`, `ChordName`, `ChordNameLink`, `Notation`):
- **Header strip:** current Key + Mode + Style selectors (mirrors Circle-of-Fifths settings controls), always visible.
- **Now Playing:** the live-detected chord big and centered (`ChordNameLink chord={chords[0]}`) with its Roman-numeral degree badge and scale-degree label — reuses the exact render path Chord Display uses.
- **Suggestions row:** 3 action cards, each displaying the suggested chord + a small "reason" caption + confidence bar. Clicking a card highlights those notes on the keyboard and, when configured, sends a short note-on/note-off phrase to one selected physical MIDI output.
- **Keyboard:** `PianoKeyboard` at the bottom showing what's held now; on suggestion hover, ghost-highlight the suggested chord's notes so the player sees the shape before playing it.
- **Optional "progression trail":** last 3–4 chords played, so suggestions can consider recent context (the reference only looks at the current chord — cheap win to consider the previous one for ii–V–I detection).

**Settings drawer** (`ChordSuggesterSettings` view + the `DrawerOutlet` pattern): tonic, mode, style, number of suggestions, extension complexity (triads↔13ths), audition on/off, selected physical audition output, show-reason on/off, consider-previous-chord on/off, and display toggles.

**Overlay:** register the route with the HTTP/WS server like the other modules so it's usable as an OBS BrowserSource for streamers (a stated MIDI Jar audience).

---

## 6. Work plan (phased, each phase independently verifiable)

### Phase 0 — Environment & baseline (verify before building)
- `nvm use 18` (`.nvmrc` = 18.16.0), `npm install`, `npm run start` — confirm the **unmodified** app boots. Baseline receipt before any change.
- `npm test` (jest) green baseline.
- **Exit criterion:** app launches, existing tabs work, test suite passes.

### Phase 1 — Engine (pure logic, TDD)
- `src/renderer/helpers/suggestions.ts` — mode tables, diatonic-field builder, degree locator, weighted ranker, style flavoring.
- `src/renderer/helpers/autoContext.ts` — deterministic record-stop tonic/scale inference with simple common-mode and advanced full-catalog strategies.
- `src/renderer/helpers/__tests__/suggestions.test.ts` — exhaustive tests across the complete Tonal scale catalog, all theoretical tonic spellings, every generated voicing size, known progressions, style switches, and all Tonal chord symbols.
- **Exit criterion:** `npm test` green with meaningful coverage of the engine; zero React/MIDI imports in the helper.

### Phase 2 — Settings plumbing
- Add `ChordSuggesterSettings` to `Settings.ts`, `defaultChordSuggesterSettings` to `defaults.ts`, register on `Settings` + `defaults.settings`.
- Regenerate schema: `npm run schema:settings`.
- Add migration `'1.8.0'` in `migrations.ts` (+ legacy types) that injects the default block; bump `package.json` version.
- **Exit criterion:** app starts with a pre-existing store and gains the new settings without error; new install shows defaults.

### Phase 3 — View + route + nav
- `views/ChordSuggester/` (index/view/scss) consuming `useNotes()` and calling the Phase-1 engine.
- `ChordSuggesterSettings` view + register in both `router.tsx` and `Settings/routes.tsx`.
- Add `music`-family icon name (reuse `music`/`piano` or add `suggest.react.svg`) and a Home tile + thumbnail.
- **Exit criterion:** tab appears, navigates, renders live chord + suggestions from a real/virtual MIDI input.

### Phase 4 — Interaction polish
- Suggestion click → keyboard highlight + optional audition via the selected physical output.
- Previous-chord context, reason captions, confidence display.
- Overlay/server exposure parity with other modules.
- **Exit criterion:** clicking a suggestion highlights/auditions; overlay URL renders the tab.

### Phase 5 — Verification & docs (before "done")
- Manual: virtual MIDI (loopMIDI) → play I, ii, V, vi in several keys/modes/styles; confirm named chord + sensible, correctly-spelled suggestions; verify against music-theory expectations and the reference script's behavior on the same input.
- `npm test`, `npm run lint`, `npm run build` (package) all green.
- Launch the built app and **visually inspect** the rendered tab (screenshots) before claiming completion.
- Update `README.md` (feature list + Chord Suggester section) and `CHANGELOG.md`.
- **Exit criterion:** all commands green, tab visually confirmed, docs updated, PR-ready.

---

## 7. Risks & decisions

- **Node version drift** — shell has Node 24; build boilerplate is pinned to 18.16.0. Use `nvm use 18`; do not build on 24 without testing. *(Low risk, known mitigation.)*
- **`Settings.schema.json` is generated** — hand-editing it will be overwritten. Always edit the `.ts` type and regenerate. *(Process risk.)*
- **Migration correctness** — a bad `conf` migration can corrupt a user's store. Migration only *adds* a defaulted block, never mutates existing keys; test with a copied real store. *(Contained.)*
- **Suggestion "taste" is subjective** — mitigated by grounding in tonal's functional harmony + documented progression rules, exposing style presets, and unit-testing against textbook progressions rather than asserting one "right" answer.
- **Scope discipline** — this is an *additive* module; it must not modify `useNotes`, chord detection, or other modules' behavior. If the engine needs richer chord data, extend `getChordInfo`'s return additively.
- **Upstream sync** — keep `feature/chord-suggester` rebased on upstream `main`; the module pattern is stable, so conflicts should be limited to the 7 registration seams.

---

## 8. Implementation status

Implemented on `feature/chord-suggester`:

- Pure deterministic suggestion engine with exhaustive scale/key/voicing/chord coverage, V→I ranking, modal characteristic chords, key spelling, empty input, custom interval preservation, and repeatability.
- Version 1.8.0 settings defaults, generated schema, migration, and previous-chord context.
- Desktop and overlay routes, home tiles, settings drawer, responsive live view, keyboard ghost highlighting, and selected-output audition bridge.
- README and changelog documentation.

Repository-wide npm test/type/lint/build commands are currently blocked before execution because the host npm rejects the repository's existing `devEngines.node` property, and `npm ci` separately refuses the locked GitHub Packages license dependency with `EALLOWREMOTE`. Focused engine and source checks are recorded in the implementation handoff.

## 9. Immediate next actions

1. Run `npm ci` under the repository's supported Node/npm toolchain with authorized access to the locked `@la-jarre-a-son/nlf` package.
2. Run `npm test`, `npm run types`, `npm run lint`, and `npm run build` in that environment.
3. Launch the built app with a virtual MIDI route, exercise the desktop and `/suggestions` overlay paths, and visually inspect the rendered module.
4. Open a draft PR from `feature/chord-suggester` after those environment-gated checks.

---

*Roadmap authored against the fork's actual source (router, `useNotes`, store schema/migrations, module pattern) and the reference repo's real algorithm; harmony claims verified against `tonal@^5` live output. Nothing here is assumed — every seam cited was read in `ericcayers-ai/midi-jar@feature/chord-suggester`.*
