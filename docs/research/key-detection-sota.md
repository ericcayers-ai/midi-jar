# Key, scale, mode, and real-time MIDI chord recognition

**Scope.** This briefing targets MIDI Jar's `autoContext.ts`: a causal, low-latency detector receiving note events and/or already grouped chord events. The central recommendation is to replace the current binary in-scale/out-of-scale brute-force score with (1) duration-aware pitch-class evidence, (2) calibrated profile/template matching, and (3) a small forward HMM. This is substantially more defensible than adding more hand-tuned bonuses, while remaining cheap in TypeScript.

## Executive recommendations

1. **Low effort / highest payoff:** maintain active notes by `(channel, pitch)`, process both `0x80` Note Off and `0x90 velocity=0`, track CC64 sustain, and commit chord snapshots after a short quiet/settling window. Use a 12-bin histogram weighted by sounding duration and a mild velocity curve; retain bass and metrical features separately. MIDI message semantics: [MIDI 1.0 specification](https://ccrma.stanford.edu/~esteban/teaching/McGill_MUMT306/M1_v4-2-1_MIDI_1-0_Detailed_Specification_96-1-4.pdf), [CC64 threshold and note-on/off summary](https://handwiki.org/wiki/MIDI_1.0).
2. **Low/medium effort:** score all 24 major/minor candidates with Pearson correlation against Krumhansl-Kessler (KK), Temperley-Kostka-Payne (KP), and Aarden-Essen (AE) profiles; optionally ensemble the normalized scores. Add chord-root and bass evidence as *separate* features, not as extra copies of the pitch histogram.
3. **Medium effort / best realtime behavior:** convert scores to an emission distribution and run a causal 24-state forward HMM. Make self-transition high, favor nearby/circle-of-fifths transitions, and expose stable/balanced/reactive half-life presets. Use posterior entropy and top-vs-runner-up probability for abstention.
4. **Medium effort:** replace one-shot chord matching with a candidate scorer over `(root, quality, bass/inversion)`, allowing omitted fifths, rootless voicings, extensions, and slash chords. Keep the top few interpretations and pass their weighted evidence to the key HMM.
5. **Higher effort:** train a small model on MIDI Jar’s own labeled captures before importing neural audio models. Audio SOTA is not automatically MIDI SOTA; MIDI already supplies exact pitch, onset, release, velocity, and controller events.

## 1. Classical key finding: profile matching

### 1.1 Common representation

Collapse sounding notes to pitch classes `0..11` and accumulate a feature vector `h`. For a MIDI note with onset `t_on`, effective release `t_off`, pitch class `pc`, duration `d = max(0, t_off-t_on)`, and velocity `v`, a practical baseline is:

```ts
h[pc] += d * velocityWeight(v) * articulationWeight(note);
```

For each profile `p` (major/minor), rotate it for tonic `k`, then compute Pearson correlation:

```text
r(k,p) = corr(h, rotate(p, k))
```

This is the Krumhansl-Schmuckler procedure: compare a pitch-class duration histogram against rotated key prototypes and select the maximum. Humdrum's `keycor` and `mkeyscape` document this exact procedure and its alternatives: [keycor](https://extras.humdrum.org/man/keycor), [mkeyscape](https://extras.humdrum.org/man/mkeyscape/index.html). Craig Sapp's implementation explicitly constructs duration histograms and supports continuous/sliding analysis: [runningkey.cpp](http://sig.sapp.org/doc/examples/museinfo/humdrum/runningkey/runningkey.html).

Pearson is invariant to overall volume and total duration, but not to a flat or tiny histogram. Return `unknown` when effective mass is too small or variance is near zero.

### 1.2 Verified numeric profiles

All vectors below are in **relative scale-degree order**, starting at the candidate tonic: `[1, b2/2, 2, b3/#2, 3, 4, #4/b5, 5, b6/#5, 6, b7/#6, 7]`. Rotate to the absolute pitch-class origin. The values are not interchangeable probability distributions; correlation normally mean-centers them. Source code and tables: [Sapp keycor source](https://museinfo.sapp.org/doc/examples/humdrum/keycor/keycor.html), [Sapp runningkey source](http://sig.sapp.org/doc/examples/museinfo/humdrum/runningkey/runningkey.html), [Humdrum keycor manpage](https://extras.humdrum.org/man/keycor).

**Krumhansl-Kessler (perceptual probe-tone profiles).**

```text
major = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
minor = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
```

These are the published Krumhansl/Kessler values reproduced by Sapp; the primary context is Krumhansl, *Cognitive Foundations of Musical Pitch* (1990), with the probe-tone experiments originally Krumhansl & Kessler (1982). A citable implementation and the page attribution are in [runningkey.cpp](http://sig.sapp.org/doc/examples/museinfo/humdrum/runningkey/runningkey.html).

**Temperley-Kostka-Payne (corpus-derived segment-presence profiles).** Temperley changed from perceptual stability values to corpus frequencies of whether a scale degree occurs in a metrical segment. His Bayesian interpretation is described in [Temperley, “A Bayesian Approach to Key-Finding”](http://davidtemperley.com/wp-content/uploads/2015/11/temperley-maai.pdf); the verified vectors are in Sapp's source:

```text
major = [0.748, 0.060, 0.488, 0.082, 0.670, 0.460, 0.096, 0.715, 0.104, 0.366, 0.057, 0.400]
minor = [0.712, 0.084, 0.474, 0.618, 0.049, 0.460, 0.105, 0.747, 0.404, 0.067, 0.133, 0.330]
```

For the literal Bayesian version, use a binary presence vector `x_pc` per segment and Bernoulli likelihood:

```text
log P(x | key) = Σpc [ x_pc log q_pc + (1-x_pc) log(1-q_pc) ] + log P(key)
```

Do not use `q` as a duration-weighted probability without acknowledging that this changes the model. Temperley reports that flat segment inputs can outperform the original duration-weighted input for short segments; see the discussion and caveats in the paper above.

**Aarden-Essen (corpus-derived continuity/intermediate profile).** Verified numeric values from `keycor`/Sapp are:

```text
major = [17.7661, 0.145624, 14.9265, 0.160186, 19.8049, 11.3587,
         0.291248, 22.0620, 0.145624, 8.15494, 0.232998, 4.95122]
minor = [18.2648, 0.737619, 14.0499, 16.8599, 0.702494, 14.4362,
         0.702494, 18.6161, 4.56621, 1.93186, 7.37619, 1.75623]
```

The source labels these as Aarden's dissertation values and points to Aarden (2003); use the implementation as the numeric source rather than copying a secondary plot: [runningkey.cpp](http://sig.sapp.org/doc/examples/museinfo/humdrum/runningkey/runningkey.html), [keycor manpage](https://extras.humdrum.org/man/keycor).

**Bellman-Budge.** This is a chord-frequency-derived profile based on Budge's corpus, published/implemented by Bellman. Verified values:

```text
major = [16.80, 0.86, 12.95, 1.41, 13.49, 11.93, 1.25, 20.28,
         1.80, 8.04, 0.62, 10.57]
minor = [18.16, 0.69, 12.99, 13.34, 1.07, 11.15, 1.38, 21.07,
         7.49, 1.53, 0.92, 10.21]
```

See [Humdrum `keycor`](https://extras.humdrum.org/man/keycor) and the directly readable [Sapp source](https://museinfo.sapp.org/doc/examples/humdrum/keycor/keycor.html). Bellman-Budge can be useful when the input is chordal, but should not automatically replace KK/AE for a single melodic line.

**Sapp/Humdrum simple profile.** Sapp's `-s` profile is a control baseline, not a learned state-of-the-art model: scale degrees receive 1, tonic and fifth receive 2, non-scale tones 0. The source is [keycor.cpp](https://museinfo.sapp.org/doc/examples/humdrum/keycor/keycor.html). It is useful for regression tests and for showing why the current binary scale score loses tonal hierarchy.

**Albrecht-Shanahan.** Albrecht & Shanahan, “The Use of Large Corpora to Train a New Type of Key-Finding Algorithm” (2013), trained profiles on 490 `**kern` pieces and tested on 492, using Euclidean distance rather than correlation; they report better minor-mode behavior and that an AE+new-model combination improves overall results. Primary citation: [doi:10.1525/mp.2013.31.1.59](https://doi.org/10.1525/mp.2013.31.1.59), author PDF [GitHub](https://github.com/shanahdt/biblios/blob/master/pdfs/albrechtshanahan2013.pdf). The exact trained vector values should be taken from the paper's supplementary/code artifact; do not substitute KK numbers and call them Albrecht-Shanahan.

## 2. Weighting practice for MIDI

* **Duration:** use effective sounding time, not event count. A note held for 2 seconds should contribute more than a 30 ms grace note. The MIDI tonality literature explicitly defines note-class weight as the sum from Note On to Note Off: [“Automatic detection of tonality using note distribution”](https://doi.org/10.1080/09298219608570711).
* **Velocity:** use `w_v = ((v+1)/128)^γ`, typically `γ` in the 0.5–1 range as an initial tunable parameter. Avoid velocity as a literal physical loudness model: MIDI velocity is controller data, and instruments map it differently. Compare ablations (duration only, duration×velocity, capped velocity).
* **Bass:** retain a second histogram for the lowest active pitch (or lowest note at each event), with a modest weight, e.g. 0.2–0.5 of the all-note evidence. Bass can imply root/inversion, but blindly treating bass as tonic creates errors on inversions and pedal tones.
* **Meter:** if MIDI timing and tempo are available, weight strong beat/bar positions separately. A practical feature is `w_meter = 1.0` on beat 1, 0.7 on other quarter-note beats, 0.4 on offbeats; calibrate rather than hard-code as truth. Temperley and Raphael's symbolic models both use metrical/rhythmic information; see [Temperley](http://davidtemperley.com/wp-content/uploads/2015/11/temperley-maai.pdf) and [Raphael, harmonic analysis with graphical models](https://ismir2003.ismir.net/papers/Raphael.pdf).
* **Recency:** for causal local-key tracking, decay event mass by `exp(-ln(2)*Δt/halfLife)`. Use a ring buffer of events or maintain decayed bins at each update. Suggested UI presets: reactive 1–2 s, balanced 4–8 s, stable 20–30 s. The half-life defines the question being answered: immediate local key versus settled section key. A concrete causal 24-state implementation with this design is documented in [WhatChord's streaming key detector](https://whatchord.earthmanmuons.com/articles/key-detection-algorithm.html).

Keep `allNotes`, `bass`, `chordRoot`, and `chordQuality` evidence separate. Otherwise a repeated root is counted once as a note, again as a chord root, and again through an arbitrary tonic bonus.

## 3. Modulation and key-change detection

A single global maximum cannot represent modulation. Compute local evidence on overlapping windows, then smooth the key sequence.

### Lightweight causal HMM

States are 24 keys (or 12 tonics × a mode set). At update `t`:

```text
prediction[j] = Σi posterior[t-1][i] * transition[i][j]
emission[j]   = softmax((profileScore[j] + chordEvidence[j]) / temperature)
posterior[t][j] ∝ prediction[j] * emission[j]
```

Use a large self-transition (start around 0.90–0.98 per committed chord), distribute remaining mass by circle-of-fifths/key-signature distance, and discount major↔minor changes. These are starting parameters, not universal facts. The update is the forward algorithm; it is causal. Offline Viterbi finds the most likely complete path but uses future evidence and should be offered only for recorded-file analysis. A 24-state HMM and Viterbi decoding are established in key/chord research: [Noland & Sandler, Key Estimation Using an HMM](https://ismir2006.ismir.org/PAPERS/ISMIR0691_Paper.pdf), [Mearns et al., automatic modulation detection](https://openaccess.city.ac.uk/id/eprint/2767/1/%5BMearns11%5D%20Automatically%20detecting%20key%20modulations%20in%20J.S.%20Bach%20chorale%20recordings.pdf).

### Change points

Flag a candidate modulation only when the new key's posterior remains above a threshold for several committed observations or when a cumulative log-likelihood ratio crosses a threshold. Add hysteresis: a new key must beat the current key by a margin and persist; a single secondary dominant must not switch the display. For recorded MIDI, Bayesian online change-point detection or offline dynamic programming is viable; for a desktop live tab, the HMM plus persistence rule is the right effort/payoff.

## 4. Modes and scales beyond major/minor

A pitch-class set does **not** identify a mode. C major and D Dorian share the same seven pitch classes; a histogram of set membership cannot decide which note is tonic. Modes require *both* collection and tonal center. Evidence that can resolve it includes:

* tonic recurrence, longer duration, strong metrical placement, low register, drone, and first/last bass note;
* tonic-triad quality (major-ish: Ionian/Lydian/Mixolydian; minor-ish: Aeolian/Dorian/Phrygian/Locrian);
* characteristic degrees: Dorian has raised `6` relative to natural minor; Phrygian has lowered `2`; Lydian has raised `4`; Mixolydian has lowered `7`. [Open Music Theory, diatonic modes](https://viva.pressbooks.pub/openmusictheorycopy/chapter/diatonic-modes/), [Baylor mode comparison](https://openbooks.library.baylor.edu/pianobasics/chapter/modes-dorian-aeolian-and-phrygian/).
* harmonic syntax: Dorian's characteristic IV–i (major IV above a minor tonic) is stronger evidence than merely seeing a major sixth; cadential behavior and tonic bass matter. [Modal schemas](https://human.libretexts.org/Bookshelves/Music/Music_Theory/Open_Music_Theory_2e_(Gotham_et_al.)/07%3A_Popular_Music/7.12%3A_Modal_Schemas).

Implementation: add candidate modes only after the major/minor baseline works. For each tonic/mode, use a profile built from the mode's scale degrees plus tonic/bass/cadence features. Do not claim Dorian if scale degree 6 never occurs; return “minor-family / ambiguous”. A mode detector should abstain when the distinguishing degree has insufficient weighted mass.

## 5. Confidence that means something

Never map an arbitrary margin to a percentage. Maintain the full 24-way distribution.

* **Correlation:** report raw Pearson `r` and effective sample mass. A high `r` from two notes is not comparable to a high `r` from 100 notes.
* **Softmax posterior:** `p_k = exp((s_k-s_max)/T) / Σj exp((s_j-s_max)/T)`. Temperature `T` controls sharpness; fit it on held-out labeled MIDI captures.
* **Entropy:** `H = -Σ p_k log p_k`; normalize by `log(24)` and display `1-H/log(24)` as certainty only after calibration.
* **Margin:** `(p1-p2)` and posterior odds are useful abstention signals, but not probabilities by themselves.
* **Calibration:** collect labeled sessions, bin predictions, and measure reliability/ECE; fit temperature scaling without changing the argmax. The streaming detector should separately expose `confidence`, `abstain`, `stale`, and `candidateKeys`.

A useful product rule is: show a key only if effective mass exceeds a minimum, posterior `p1` exceeds a threshold, and `p1-p2` persists for N updates. Preserve raw scores for debugging.

## 6. Real-time chord recognition from raw MIDI

### Event/state layer

Maintain a multiset of active notes keyed by `(channel, MIDI pitch)`, including onset time, velocity, and release state. Treat Note On velocity 0 as Note Off. On CC64, values `>=64` mean pedal down and `<=63` pedal up; while down, a key release marks the key-up time but the note remains sounding for harmonic evidence until pedal-up. Flush stuck notes on port/device loss and All Notes Off. Sources: [MIDI detailed specification](https://ccrma.stanford.edu/~esteban/teaching/McGill_MUMT306/M1_v4-2-1_MIDI_1-0_Detailed_Specification_96-1-4.pdf), [Cubase's explicit CC64 behavior](https://www.steinberg.help/r/cubase-artist/15.0/en/cubase_nuendo/topics/note_expression/note_expression_recording_sustain_pedal_c.html).

### Segmentation

Do not label a chord on every Note On. Group near-simultaneous onsets into an onset cluster (start with 30–80 ms, configurable), and hold the candidate briefly to admit finger rolls. Commit on quiet time, a clearly new onset cluster, or a maximum chord window. For legato changes, a fixed window alone smears two chords; a change detector over the active pitch-class bitmask is better. If beat/tempo is known, commit at beat boundaries; Essentia's audio counterpart estimates chords in a fixed 2-second window or between beats: [ChordsDetection](https://essentia.upf.edu/reference/std_ChordsDetection.html), [ChordsDetectionBeats](https://mtg.github.io/essentia.js/docs/api/EssentiaExtractor.html).

### Candidate generation and naming

For each plausible root (played pitch classes plus, optionally, a small rootless-voicing set), rotate intervals and score chord templates. Required tones should be weighted more than optional fifths/extensions; penalize contradictory tones. Test major, minor, diminished, augmented, sus2/sus4, dominant-7, maj7, min7, half-diminished, diminished-7, add9/6, and user-configurable jazz templates. For each candidate retain:

```ts
{ rootPc, quality, bassMidi, inversion, slashBassPc, score,
  matched, missing, extras }
```

Use lowest sounding pitch as bass and name `/bass` when bass differs from root. Return ranked alternatives because C6 and Am7 can be the same pitch-class set, and rootless voicings are intrinsically ambiguous. Do not require the perfect fifth: real chord recognizers explicitly treat it as optional in many voicings; see [ChordKit's documented template strategy](https://github.com/LongKelvin/midi-chord-detector-plugin/blob/main/Docs/Algorithm-Explanation.md). Tonal's detector already handles inversions/slash names and has an option for assuming an omitted perfect fifth: [@tonaljs/chord-detect](https://cdn.jsdelivr.net/npm/@tonaljs/chord-detect@4.9.1/README.md).

Use temporal smoothing: penalize rapid label changes, but allow a new candidate to win if its score margin persists. Feed the top K chord candidates into key evidence rather than throwing away uncertainty at argmax.

## 7. HMM, CRF, and ML approaches

The established audio chord-recognition pipeline is chroma/HPCP features → chord templates or learned emission distributions → HMM/CRF/DBN decoding. Sheh & Ellis use PCP features and EM-trained HMM segmentation; Lee & Slaney use a 36-state HMM with major/minor/diminished roots and Viterbi decoding: [Sheh & Ellis](https://ismir2003.ircam.fr/papers/Sheh.PDF), [Lee & Slaney](https://ccrma.stanford.edu/~kglee/pubs/klee-ismir06.pdf). Reviews note progression from simple Viterbi HMMs to factorial HMMs and dynamic Bayesian networks for inversions/sevenths: [Mauch & Dixon review](https://ieeexplore.ieee.org/document/6705583).

Madmom exposes a trained CRF chord recognizer and related processors: [madmom.features.chords](https://madmom.readthedocs.io/en/v0.16/modules/features/chords.html). Essentia provides template-style major/minor chord detection and key extraction from HPCP, not a MIDI event recognizer: [Essentia ChordsDetection](https://essentia.upf.edu/reference/std_ChordsDetection.html), [KeyExtractor](https://essentia.upf.edu/reference/std_KeyExtractor.html).

Neural key models include CNNs trained directly on spectrograms and newer pretrained/self-supervised representations; e.g. [Korzeniowski & Widmer, end-to-end CNN key estimation](https://arxiv.org/pdf/1706.02921), and [KeyMyna](https://arxiv.org/html/2604.10021v1). Neural chord systems such as BTC/HCQT operate primarily on audio and have model/data/license/latency costs; a recent benchmark reports open-model chord root accuracy plateauing roughly in the 77–82% range on its selected benchmarks, so “SOTA” must be tied to dataset and metric: [benchmark discussion](https://selektaudio.com/chord-recognition).

For MIDI Jar, porting a neural **audio** model to JS/WASM is feasible in principle but low payoff: it needs audio feature extraction, model weights, worker scheduling, and a validation corpus. Essentia.js is a practical WASM route and has TypeScript APIs, real-time/offline support, and pretrained-model add-ons: [Essentia.js API](https://mtg.github.io/essentia.js/docs/api/), [npm](https://www.npmjs.com/package/essentia.js). A compact hand-built HMM and template scorer will be faster, explainable, and better matched to exact MIDI.

## 8. Relevant JS/TS libraries

| Package | Provides | Does not provide |
|---|---|---|
| [`tonal`](https://tonaljs.github.io/tonal/docs) / `@tonaljs/scale`, `@tonaljs/scale-type`, `@tonaljs/mode` | Theory objects, scale/mode dictionaries, note/interval/chord utilities | Statistical key inference or temporal MIDI recognition |
| [`@tonaljs/key`](https://www.npmjs.com/package/%40tonaljs%2Fkey) | Major/minor key scales, triads, seventh chords, relative keys | Key detection from observations |
| [`@tonaljs/chord-detect`](https://www.npmjs.com/package/@tonaljs/chord-detect) | Note-name chord candidates, inversions/slash chords, optional omitted fifth assumption | MIDI event segmentation, pedal state, probabilities, temporal smoothing |
| [`music21j`](https://www.npmjs.com/package/music21j) | JS musicology/notation framework and key-related analysis port | A lightweight purpose-built live detector; beta and substantially broader than needed |
| [`essentia.js`](https://www.npmjs.com/package/essentia.js) | WASM audio MIR, HPCP, KeyExtractor, ChordsDetection, TypeScript API, optional TF.js models | Direct raw-MIDI chord grouping; AGPL licensing must be checked |
| [`meyda`](https://meyda.js.org/reference/modules/Meyda.html) | Real-time audio features including `chroma`, FFT-derived features | MIDI note identity/event lifecycle; not a key HMM |
| [`pitch-detection`](https://www.npmjs.com/package/pitch-detection) | JS audio chroma/chord/key convenience pipeline (package-level implementation) | MIDI-specific correctness; verify maintenance before adoption |
| [`pitchfinder`](https://www.npmjs.com/package/pitchfinder) | Monophonic audio pitch algorithms (YIN, McLeod, AMDF, etc.) | Polyphonic chord/key inference |
| [`@markusstrasser/pitchplease`](https://github.com/markusstrasser/pitchplease) | Browser polyphonic audio pitch/chord detector with frame stability | MIDI event semantics and key/modulation model |

## 9. Concrete TypeScript design

```ts
type KeyState = { tonicPc: number; mode: "major" | "minor" };
type Evidence = {
  allPc: Float64Array; bassPc: Float64Array; rootPc: Float64Array;
  durationMs: number; effectiveMass: number;
};

// On every causal update:
// 1. decay evidence by exp(-ln(2) * dt / halfLife)
// 2. add committed chord's sounding notes using duration × velocityWeight
// 3. score 24 rotated profiles (and optionally flat KP likelihood)
// 4. add small independent bass/root/cadence features
// 5. softmax emissions; forward-update 24-state posterior
// 6. abstain or publish only after mass + posterior + persistence gates
```

Start with three profiles (KK, KP, AE), z-score/normalize each score family before averaging, and log the top 5 candidates. A simple ensemble avoids betting the entire UX on one profile: Albrecht & Shanahan's results specifically motivate combining models, especially for minor keys ([paper](https://doi.org/10.1525/mp.2013.31.1.59)).

For chord scoring, normalize by the number of observed notes and compare the best candidate against the runner-up. Keep inversion in the result but do not let bass determine root when the interval template strongly supports another root. For rootless voicings, mark “inferred” and lower confidence.

## 10. Validation plan

Create a deterministic fixture corpus of MIDI event streams: major/minor cadences, relative-major/minor ambiguity, Dorian versus Aeolian with and without the sixth, inversions, rootless seventh chords, finger rolls, legato changes, sustain pedal, repeated notes, and modulations. Compare:

* exact key accuracy and MIREX-style related-key error;
* mode accuracy conditional on tonic;
* chord root/quality/inversion accuracy and abstention rate;
* median detection lag and false key-switches per minute;
* calibration (reliability diagram, ECE, Brier score) and coverage-versus-accuracy;
* CPU time/update and worst-case active-note count.

The acceptance criterion should be a held-out, labeled MIDI capture set, not agreement with the old heuristic. Report the detector's intended timescale (local chordal key versus stable section key), because a short reactive window and a long stable window can both be correct answers to different questions.

## References

* Krumhansl/Kessler profile implementation and numeric vectors: [Sapp runningkey](http://sig.sapp.org/doc/examples/museinfo/humdrum/runningkey/runningkey.html).
* Humdrum profile variants and correlation procedure: [keycor](https://extras.humdrum.org/man/keycor), [mkeyscape](https://extras.humdrum.org/man/mkeyscape/index.html).
* Temperley, Bayesian key finding: [paper PDF](http://davidtemperley.com/wp-content/uploads/2015/11/temperley-maai.pdf).
* Albrecht & Shanahan (2013): [DOI](https://doi.org/10.1525/mp.2013.31.1.59).
* Noland & Sandler (2006), HMM key estimation: [ISMIR paper](https://ismir2006.ismir.org/PAPERS/ISMIR0691_Paper.pdf).
* Sheh & Ellis (2003), EM-trained chord HMM: [paper](https://ismir2003.ircam.fr/papers/Sheh.PDF).
* Lee & Slaney (2006), supervised chord HMM: [paper](https://ccrma.stanford.edu/~kglee/pubs/klee-ismir06.pdf).
* Essentia tonal algorithms: [chords](https://essentia.upf.edu/reference/std_ChordsDetection.html), [key](https://essentia.upf.edu/reference/std_KeyExtractor.html), [JS API](https://mtg.github.io/essentia.js/docs/api/).
* Tonal JS modules: [documentation](https://tonaljs.github.io/tonal/docs), [chord detect](https://cdn.jsdelivr.net/npm/@tonaljs/chord-detect@4.9.1/README.md).
