# MIDI Jar Chord Suggester: competitive feature-gap analysis

**Research snapshot:** 12 September 2026 (NZST).  
**Scope:** chord identification, next-chord suggestion, harmonic exploration, MIDI performance, and the “plug-and-play” path from controller to DAW/stream.  
**Target:** the MIDI Jar fork’s Chord Suggester tab: detected chord via tonal.js; key/scale/mode, style, and complexity controls; ranked next chords with Roman numerals, intervals, and reasons; MIDI audition; and a record flow that infers key/scale.

## Executive summary

MIDI Jar already has a credible differentiator: it is a lightweight, open-source, standalone MIDI/streaming utility rather than a large composition suite. Its existing routing, chord display, OBS/browser integration, chord dictionary, circle of fifths, and quiz are strong foundations ([MIDI Jar README](https://github.com/la-jarre-a-son/midi-jar)). The Suggester adds the right harmonic core, but the current experience is still closer to a theory-aware display than to the “press one key, hear a useful result, drag it into the DAW” standard established by Scaler, Captain, ChordPrism, ChordPotion, and modern DAWs.

The most important gaps are not another large chord vocabulary or an AI label. They are workflow gaps:

1. **A zero-configuration play path:** remember the last usable input, recover from disconnects, expose clear MIDI status, and provide a one-click output route.
2. **Commitment:** suggestions need to become a progression with durations, looping, undo, presets, and keyboard/pad triggering—not only a ranked list.
3. **Export:** drag-and-drop or one-click MIDI export of the accepted chord/progression, retaining voicing, timing, velocity, and optionally separate parts.
4. **Detection trust:** show confidence and evidence, keep a detection history, allow correction/locking, and represent modulation instead of silently replacing the key.
5. **Musical usefulness:** voice-leading-aware variants, borrowed chords/modal interchange, tension/release labels, and distinct “safe / familiar / surprising” controls.
6. **Streamer mode:** a clean, low-latency overlay with readable state, configurable privacy, and stable HTTP/WebSocket output.

Do not copy the heavy parts of Scaler 3 wholesale. Its breadth is impressive, but public user feedback also reports that the new workflow is dense, unintuitive, and sometimes awkward for drag/drop and touch. MIDI Jar can win by making a smaller number of actions exceptionally immediate and transparent.

---

## 1. Competitor and reference scan

### 1.1 Scaler 3 — the broad commercial benchmark

**Verified features worth copying**

- Detects chords/scales from MIDI and audio; the manual separates **Detect MIDI**, **Detect Audio**, **Capture MIDI**, and **Detection History** ([Scaler 3 User Guide](https://downloads.scalermusic.com/Scaler-3_User_Guide.pdf)).
- Browse-first discovery: scales, chord sets, curated progressions, and artist/mood material, followed by a create/arrange workflow. The guide documents chord sets, user chord-set management, Suggest Mode, Circle of Fifths, modulation tools, voice grouping, and export ([User Guide](https://downloads.scalermusic.com/Scaler-3_User_Guide.pdf)).
- **Live Suggest Mode** maps suggested chords to MIDI keys for real-time experimentation; chord binding lets incoming MIDI notes trigger chord rows/groups. This is a direct model for making MIDI Jar suggestions playable rather than merely clickable ([User Guide](https://downloads.scalermusic.com/Scaler-3_User_Guide.pdf)).
- Auto voice leading, inversions, drop/guitar voicings, chord substitutions, and modulation routes including progression, secondary scale, modal interchange, mediants, and Neo-Riemannian movement are documented in the product/manual ecosystem ([Scaler 3 User Guide](https://downloads.scalermusic.com/Scaler-3_User_Guide.pdf); [KVR overview](https://kvraudio.com/product/scaler-3-by-scaler-music)).
- DAW sync follows transport, tempo, time signature, and play position; this makes auditioning feel like part of the session rather than a detached web widget ([Scaler 3 User Guide](https://downloads.scalermusic.com/Scaler-3_User_Guide.pdf)).

**What users praise**

- Large harmonic library, chord progression emphasis, detection, suggestions, voice-leading possibilities, and the ability to move from an idea to an arrangement. A contemporary review highlights the Browse/Create/Arrange structure, 860 chord sets, nearly 1,000 “Motions,” MIDI/audio detection, and plugin hosting ([Bedroom Producers Blog review](https://bedroomproducersblog.com/2025/08/01/scaler-3-review)).

**Complaints / caution**

- Public Scaler forum feedback reports drag/drop landing or replacement mistakes, difficulty entering slash chords, voicing/inversion confusion, and a less tactile workflow than Scaler 2 ([Scaler forum feedback](https://forum.scalerplugin.com/t/scaler-3-user-feedback-suggestions/20730?page=10)).
- App Store feedback praises feature depth but complains about small controls, accidental taps, and poor touch friendliness ([Scaler 3 App Store reviews](https://apps.apple.com/us/app/scaler-3/id6749147552?platform=ipad&see-all=reviews)). Other user discussions describe the feature set as unintuitive or overcomplicated ([Scaler thread](https://forum.scalerplugin.com/t/scaler-3-user-feedback-suggestions/20730?page=10)).

**Implication for MIDI Jar:** copy detection history, keyboard binding, voice-leading variants, and a clear separation between “listen,” “accept,” and “arrange.” Avoid a multi-page mini-DAW before the one-chord-to-next-chord loop is effortless.

### 1.2 Captain Chords / Captain Plugins Epic — the connected songwriting workflow

**Verified features worth copying**

- Set one project key and scale; use workspaces for verse/chorus/bridge-like sections; use presets, rhythm presets, complexity buttons, octave controls, and Magic Buttons to build a progression quickly ([Captain Chords product page](https://mixedinkey.com/captain-plugins/captain-chords/)).
- Import MIDI, use Captain Play with computer keyboard or MIDI keyboard, trigger complex chords with one key, and use MIDI OUT or integrated instruments. Finished material can be rendered as audio or dragged to the DAW as MIDI ([Captain Chords product page](https://mixedinkey.com/captain-plugins/captain-chords/)).
- The Captain suite links chords to melody, bass, beat, and play modules so changes propagate rather than requiring repeated manual edits ([Captain Plugins](https://mixedinkey.com/captain-plugins); [Captain Chords guide](https://mixedinkey.com/captain-epic-tutorials/captain-chords-epic-how-to-guide)).
- Captain Play exposes in-scale notes, chord palettes, inversions, sevenths, and “pretty”/borrowed options to a keyboard performer ([Captain Chords how-to guide](https://mixedinkey.com/captain-plugins/how-to-guide/captain-chords)).

**What users praise**

- Reviewers praise the slick interface, preset patterns, onboard audition sounds, linked plugins, and the ability to jam without advanced theory ([MusicRadar review](https://www.musicradar.com/reviews/mixed-in-key-captain-plugins)).
- Artist testimonials repeatedly emphasize speed, inspiration, and accessibility; treat these as marketing/user testimonials, not independent benchmarks ([Captain Plugins](https://mixedinkey.com/captain-plugins)).

**Complaints / caution**

- A review’s contemporary limitation was restricted manual note editing; “MIDI editing is coming soon” was specifically called out ([MusicRadar review](https://www.musicradar.com/reviews/mixed-in-key-captain-plugins)).
- Independent user reports complain about always-online behavior, crashes, MIDI keyboard discovery, linking, and support. These are anecdotal and version-dependent, but they identify an opportunity for an offline-first open-source alternative ([user discussion](https://www.reddit.com/r/FL_Studio/comments/ksxse6/anyone_have_any_experience_with_the_captain_plugins/); [offline complaint and vendor response](https://jcx.life/2025/09/avoid-mixed-in-key-and-captain-plugins-requires-internet-to-function-not-just-for-activation/)).

**Implication:** MIDI Jar should copy the one-key Play mode, section/workspace concept, presets, and export—but keep all core detection/suggestion local and available offline.

### 1.3 InstaChord 2 — performance mapping and humanized patterns

**Verified features worth copying**

- Separates **chord/fret keys** from **pick/action keys**: one hand selects the chord and the other triggers a hit, strum, individual notes, arpeggio, or pattern. It supports up to 24 chord keys and 24 action keys per preset ([InstaChord 2 manual](https://www.lootaudio.com/_media/images/loot/wa-production/instachord-2/Instachord_2_Manual.pdf)).
- Custom chords, multiple voicings/inversions, hold modes, transpose, pattern editor, multiple playback modes, factory presets, and MIDI drag-and-drop are documented in the manual/product material ([InstaChord 2 manual](https://www.lootaudio.com/_media/images/loot/wa-production/instachord-2/Instachord_2_Manual.pdf); [W.A. Production](https://www.waproduction.com/plugins/view/instachord)).
- Version 2 adds a scale-based chord progression generator and procedural pattern generation. The vendor describes the result as MIDI-only and requiring routing to an instrument ([manual](https://www.lootaudio.com/_media/images/loot/wa-production/instachord-2/Instachord_2_Manual.pdf)).

**Praise / complaints**

- Its strength is immediacy in a live/controller setting: one key can select or play a sophisticated chord, and presets avoid setup work. Community comparisons also describe it as more EDM-oriented and less useful for theory discovery than Scaler ([community comparison](https://forum.scalerplugin.com/t/wap-bring-instachord-to-version-2/11391)).

**Implication:** copy the split “select chord / perform chord” model, but make mapping learnable and visible; expose a simple eight-pad mode first, with an advanced mapping page later.

### 1.4 Cthulhu — small, fast, memorable

**Verified features worth copying**

- Two focused modules: chord memorizer/player and pattern-based arpeggiator. It includes over 150 factory chord presets, MIDI import, direct chord recording/analysis, and sorting by Circle of Fifths, chromatic order, or low note ([Xfer Records](https://xferrecords.com/products/cthulhu)).
- Its arp provides step-level rhythm, ties, duration/velocity sequencing, intelligent transpose, harmony, and independent tab lengths for polymetric patterns ([Xfer Records](https://xferrecords.com/products/cthulhu)).

**What users praise / complain about**

- Reviewers praise fast inspiration, learned chords, the “WTF” randomizer, and an unusually powerful step sequencer ([MusicRadar review](https://musicradar.com/reviews/tech/xfer-records-cthulhu-574652)).
- Its known friction is that it is MIDI-only and needs routing to an instrument; Logic routing can be especially awkward. Independent coverage also describes its interface as dated/small/non-resizable ([Resident Advisor review](https://ra.co/reviews/13139); [MusicRadar review](https://musicradar.com/reviews/tech/xfer-records-cthulhu-574652)).

**Implication:** copy “learn played chord,” useful sort orders, a clearly bounded randomize action, and a compact performance surface. Do not copy opaque routing or a tiny fixed UI.

### 1.5 ChordPotion — transform an input into a usable part

**Verified features worth copying**

- Starts with incoming chords and transforms them into riffs, melodies, basslines, arpeggios, and rhythmic parts in real time. It has hundreds of presets, free extension packages, a built-in preview piano, independent sequencer rows, swing/randomization, and user presets ([ChordPotion](https://feelyoursound.com/chordpotion/)).
- Generated notes are recorded and exported by dragging a MIDI symbol to the DAW. It supports standard MIDI export and multi-part/channel workflows ([ChordPotion](https://feelyoursound.com/chordpotion/)).
- It is offline-friendly by design: the vendor says no online activation is needed and updates are free after purchase ([ChordPotion](https://feelyoursound.com/chordpotion/)).

**What users praise / complain about**

- Reviews praise the few-click workflow, inspiration, musical results, presets, flexibility, and low friction for non-keyboardists ([ChordPotion customer/review collection](https://feelyoursound.com/chordpotion/); [independent review](https://www.andrulian.com/review-of-chordpotion-2-midi-sequencer-and-effect-plugin-vst-au-by-feelyoursound/)).
- A recurring conceptual criticism is that it can look like an elaborate arpeggiator; this is an anecdotal comparison, not a product defect ([user discussion](https://www.reddit.com/r/LogicPro/comments/bjw6gq/anyone_have_any_experience_with_chordpotion/)).

**Implication:** export must be a first-class affordance, not a file-browser chore. MIDI Jar can apply the same principle to accepted chord suggestions and progression history.

### 1.6 ChordPrism — “play parts,” not only generate them

**Verified features worth copying**

- More than 300 seven-chord presets, per-note chord editing, strumming/rhythmic sequencing/velocity patterns, Pattern Generator, MIDI import into playable presets, MIDI drag/drop, and MIDI mapping ([ChordPrism 2.1](https://www.chordprism.com/products/chordprism-2-1)).
- Its distinctive Smart Scale changes the playable keyboard so the same hand position produces notes appropriate to the active chord. It offers Chord Tones, Dynamic Scale, and Relative Scale variants ([ChordPrism 2.1](https://www.chordprism.com/products/chordprism-2-1)).
- It can host or route to instruments and synchronizes key/scale/chord information between open instances ([ChordPrism product information](https://www.musehub.com/plugin/chord-prism-2-852)).

**What users praise**

- Expert/user quotes consistently praise playing complex parts with minimal theory and the “safety net” of scale-constrained input. These are vendor-selected testimonials, so use them as qualitative signals ([ChordPrism](https://www.chordprism.com/products/chordprism-2-1)).

**Implication:** add an optional “safe keyboard” or pad mode: the user can play melody notes constrained to the currently accepted chord/scale, with an explicit off switch so the tool never hides what it is doing.

### 1.7 Unison MIDI Chord Pack — the baseline for instant content

**Verified feature:** a large, categorized downloadable MIDI library; the product page advertises more than 1,200 MIDI files that can be dragged into tracks ([Unison MIDI Chord Pack](https://unison.audio/product/unison-midi-chord-pack/)).

**What it teaches:** users do not always want an algorithm. They often want a fast, previewable starting point with predictable ownership and a familiar drag/drop result. MIDI Jar’s equivalent is a small, bundled, open preset library plus an “export this exact thing” gesture—not a claim to replace a commercial content catalog.

### 1.8 Hooktheory Hookpad and Trends — data, examples, and explanation

**Verified features worth copying**

- Trends uses a database of 75,000+ analyzed songs to show probability-driven next chords, matching songs/sections, and a key/scale reframing control ([Hooktheory Trends](https://www.hooktheory.com/trends)).
- Hookpad combines color-coded chords/melodies, MIDI input, guides, chord search, popular chords, progression browsing, “Magic Chords,” transposition, looping, and export; current product material also describes Aria, a generative add-on ([Hookpad](https://www.hooktheory.com/hookpad)).
- The visual convention is important: make the likely next choice larger/more prominent, then show the evidence and examples behind it. Hooktheory explicitly describes chord bubbles growing according to probability ([Trends blog](https://www.hooktheory.com/blog/trends-tool)).

**Implication:** MIDI Jar should not imply that theory rules are song-frequency probabilities. Offer two clearly labeled ranking modes: **Theory** (functional/voice-leading rules) and **Corpus** (when a licensed/local dataset exists). Explain sample size and source for corpus rankings.

### 1.9 Ableton Live 12, Logic Pro, and FL Studio — table stakes inside modern DAWs

**Ableton Live 12**

- Scale Mode attaches root/scale to a clip; scale-aware devices and MIDI Tools then use scale degrees. Highlight Scale, Fold to Scale, Fit to Scale, and “Use Current Scale” are concrete interaction patterns ([Live concepts](https://www.ableton.com/en/live-manual/12/live-concepts/); [editing MIDI](https://www.ableton.com/en/live-manual/12/editing-midi/)).
- Generators create new material; Transformations change existing material; Auto Apply makes results immediate but reversible. This is a good model for audition-first controls and an explicit Apply/Undo boundary ([MIDI Tools](https://www.ableton.com/en/live-manual/12/midi-tools/)).
- Ableton also documents native and Max for Live extension points, which explains why a compact standalone tool should export clean MIDI instead of trying to own the whole arrangement ([MIDI Tools](https://www.ableton.com/en/live-manual/12/midi-tools/)).

**Logic Pro**

- The Chord track is a global harmonic timeline; Session Players follow it, while regions can override it. Chord groups can be copied/looped, and Apple Loops can carry compatible region chords ([Apple Chord Track overview](https://support.apple.com/en-sa/guide/logicpro/lgcp2633963f/mac)).
- The important convention is “analysis becomes editable project metadata.” MIDI Jar should similarly turn a recorded session into a correction-friendly history/progression rather than only changing a label in place.

**FL Studio**

- Scale Highlighting selects root/scale, shades the piano roll, can automatically detect a score scale, and offers Snap to Scale for edited and incoming MIDI. Detection is described as an average over the whole score or selection and requires several notes ([FL Studio piano roll menu](https://cluster.image-line.com/fl-studio-learning/fl-studio-online-manual/html/pianoroll_menu.htm); [piano roll](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/pianoroll.htm)).
- FL’s piano roll also exposes Generate Chord Progression, export/import, a chord stamp, and a large set of direct editing tools ([piano roll menu](https://cluster.image-line.com/fl-studio-learning/fl-studio-online-manual/html/pianoroll_menu.htm)).

**Implication:** key/scale state needs to be persistent, visible, overridable, and applied consistently to every suggestion/audition—not hidden in a setup panel.

### 1.10 Web and mobile references

**ChordChord**

- Current product material advertises prompt-to-demo, pasted chord input with auto-detection and extension suggestions, genre-matched arrangement layers, browser/no-install operation, share links, and drag/drop MIDI/WAV/stems ([ChordChord pricing/features](https://chordchord.com/pricing)).
- Copy the short path: input → editable blocks → preview → export/share. Do not copy a cloud dependency into a local-first utility.

**Autochords**

- The web tool asks for feel/progression type and key, then shows a main progression, alternatives, all chords in key, and notes in each chord; it includes randomize and Circle-of-Fifths-derived alternatives ([AutoChords](https://autochords.com)).
- The iOS listing describes mood/style selection, guitar/piano/ukulele diagrams, full progression preview, and alternative progressions ([App Store listing](https://apps.apple.com/us/app/autochords/id788423364?l=zh-Hans-CN&platform=mac)).
- Copy the beginner-friendly “feel first, theory second” entry point and alternate section suggestions.

**Chord Player (oneMotion)**

- The public page is a searchable catalog of recognizable songs and their chord sequences ([Chord Player](https://www.onemotion.com/chord-player/)).
- Copy recognizable examples and quick auditioning only if licensing/attribution permits; do not ship copyrighted song data without a clear basis.

**Suggester (iOS)**

- The vendor description emphasizes finding chords that work together, Roman numerals, classic progressions, section dividers, rests, and modulation; the App Store also lists chord/scale creation and suggestions ([Suggester](http://www.mathieurouthier.com/suggester_ios/); [Suggester 2 App Store](https://apps.apple.com/us/app/suggester-2-chords-scales/id6448964737)).
- Copy section dividers, rests, Roman numeral and modulation-aware composition. It is a useful precedent for a progression canvas that remains educational.

**Navichord**

- Navichord’s product page describes a harmonic grid, chord pads, progression sequencing, Roman numerals, matching chords to melodies and melodies to chords, scale lock to white keys, MIDI routing, MIDI footswitch control, and desktop/hardware control ([Navichord](https://www.navichord.com/)).
- App Store feedback praises its simple harmonic-grid UI, one-finger chord discovery, MIDI footswitch next/previous progression control, and accessibility for users without deep theory; one reviewer reports that switching editors is not immediately discoverable ([App Store listing](https://apps.apple.com/us/app/navichord-chord-sequencer/id916452748)).
- Copy the grid/pads and footswitch stepping. Avoid burying the primary editor behind ambiguous icons.

### 1.11 Open-source and extensible references

- **MIDI Jar itself** already solves a problem many browser tools cannot: desktop MIDI routing, internal module outputs, a chord display/dictionary, configurable omissions/notation, OBS/browser integration, tray/background operation, and quiz anticipation ([README](https://github.com/la-jarre-a-son/midi-jar)). Preserve that advantage.
- **JASS-APP** is a direct open-source reference: real-time MIDI chord detection and suggestion streamed to a web UI over WebSocket. Its README separates MIDI capture, chord/suggestion logic, and frontend, and supports running without a MIDI device ([JASS-APP](https://github.com/J4Joshua/JASS-APP)). This validates a local service/overlay architecture, but its setup still requires Python, Node, dependency installation, and a localhost frontend—precisely the integration friction MIDI Jar can remove.
- **Kalliste for VCV Rack** demonstrates a focused open-source harmonic sequencer with user-controlled chords, visual arpeggio matrix, scenes, looping, real-time editing, external clock/gate/CV outputs, and presets ([Kalliste](https://github.com/GabTiorbi/Kalliste)). Copy scene recall, live editing, and explicit sync state—not its modular-CV scope.
- **Bitwig Note FX** provides a native Multi-note chord builder, Learn Chord, Strum, arpeggiation, probability/chance, velocity spread, and real-time note updating ([Bitwig Note FX](https://www.bitwig.com/userguide/latest/note_fx)). Copy Learn Chord, chance/velocity controls, and a no-surprise pass-through concept.

---

## 2. Ranked feature-gap list for MIDI Jar

Priority uses **P0 = table stakes / high leverage**, **P1 = competitive**, **P2 = differentiating or later**.

| Rank | Priority | Gap / feature | Why it matters | Smallest useful version |
|---:|:---:|---|---|---|
| 1 | P0 | Persistent MIDI input state + hot-plug recovery | A chord assistant is useless if it silently loses the keyboard or makes users reselect it every launch. Web MIDI exposes port state changes; desktop MIDI APIs have the same concept ([Web MIDI spec](https://www.w3.org/TR/webmidi/)). | Show input name, connected/disconnected state, last message time, and auto-rebind by stable ID/name. Offer “Use this input next time.” |
| 2 | P0 | One-click audible output | Competitors assume users want to hear the result immediately; MIDI-only plugins often force routing. | Ship a built-in preview instrument or reliable Web Audio preview and a visible “Preview only / Send MIDI” switch. Never make the first-run user configure a DAW just to hear a suggestion. |
| 3 | P0 | Acceptable progression canvas | A ranked list is not a songwriting workflow. | Add chord slots with add/replace/delete, duration, loop, undo/redo, clear, and click-to-audition. Preserve detected input separately from accepted ideas. |
| 4 | P0 | MIDI export and drag/drop | Scaler, Captain, ChordPotion, ChordPrism, Hookpad, and DAWs all make output portable. | Export the current suggestion or progression as `.mid`; support drag/drop from a visible MIDI handle where Electron permits it; include root/voicing/timing/velocity. |
| 5 | P0 | Play suggestions from computer keyboard and MIDI pads | Live performance tools turn harmonic knowledge into one-finger actions. | Bind eight visible suggestion pads to a configurable octave or computer-key row; send note-off/panic safely; show the binding range. |
| 6 | P0 | Detection confidence + evidence | A key/scale inference is probabilistic and ambiguous, especially with modal material, omitted thirds, pedal tones, or modulation. | Show confidence as High/Medium/Low with a percentage only if calibrated; show detected notes, evidence window, and top alternatives. A low-confidence result must not masquerade as fact. |
| 7 | P0 | Lock/override and “follow input” modes | Users need to choose between automatic assistance and intentional composition. | Three explicit modes: **Auto**, **Locked**, **Ask before changing**. Key and scale are editable at all times. |
| 8 | P1 | Detection history and correction | Scaler and Logic turn input into a reviewable timeline. | Record timestamped chord/key observations; click a history item to audition, rename, correct, pin, or add it to the progression. |
| 9 | P1 | Modulation/change-point handling | A single global key is wrong for many songs. Silently re-inferencing causes distracting UI jumps. | Segment the recording into windows; show “possible change at 00:12,” local key/scale candidates, and an explicit accept/split action. Preserve the previous segment. |
| 10 | P1 | Voice-leading-aware suggestion variants | Users care whether the next chord sounds playable, not only whether its pitch classes are diatonic. | For each suggestion offer root position, nearest voice-leading, open, and user-range variants; show movement in semitones and keep notes in a configurable range. |
| 11 | P1 | Better ranking controls | One ranking cannot satisfy theory learners, pop writers, jazz players, and streamers. | Mix sliders/toggles: safe ↔ adventurous, diatonic ↔ borrowed, close voice-leading ↔ harmonic function, common ↔ rare. Explain the contribution of each factor. |
| 12 | P1 | Style presets that change rules, not labels | “Pop/jazz/classical/modal” is weak if only the display changes. | Ship transparent presets with inspectable weights/rules and examples; include cadence, borrowed chord, secondary dominant, modal, and pedal-tone behaviors. |
| 13 | P1 | MIDI routing wizard | Windows has no native virtual MIDI driver; macOS IAC requires enabling a bus. Ableton documents this distinction ([Ableton virtual MIDI bus](https://help.ableton.com/hc/en-us/articles/209774225-Setting-up-a-virtual-MIDI-bus)). | Detect DAW/ports, explain input/output direction, test with a note, and link to loopMIDI/IAC instructions. Offer internal output first and remember the chosen route. |
| 14 | P1 | MIDI learn and controller feedback | Performance users need to bind next/previous, accept, regenerate, panic, and pads without keyboard hunting. | Learn one note/CC, display the binding, prevent collisions, support MIDI note or CC, and optionally send LED feedback where supported. |
| 15 | P1 | Tempo/grid/transport sync | Chord lengths and exports need musical timing; competitors follow DAW transport or Ableton Link. | Manual BPM and beat length first; then MIDI clock/host sync where available. Show sync source and latency. |
| 16 | P1 | Presets and session persistence | Instant recall is a major part of “plug and play.” | Save input/output, key/scale, style, ranking settings, mappings, progression, UI/overlay settings as named JSON presets. Include starter presets. |
| 17 | P1 | Stream/overlay mode | MIDI Jar’s existing OBS/WebSocket advantage is underused if Suggester is not stream-ready. | One clean route showing current chord, key/scale, confidence, next three choices, and optional Roman numerals; theme/size controls; no settings chrome; stable local URL. |
| 18 | P2 | Melody-aware suggestions | Hookpad/Navichord show value in matching chords to melody and vice versa. | Analyze a selected melody window, require chord candidates to contain configurable melody tones, and explain conflicts. |
| 19 | P2 | Corpus-informed rankings | Hooktheory demonstrates the appeal of data-driven probabilities, but data provenance/licensing matters. | Optional local/open corpus with source, count, smoothing, and “theory vs corpus” labels. Never fabricate percentages from small samples. |
| 20 | P2 | Community/open preset exchange | An open-source tool can build a transparent ecosystem without vendor lock-in. | Import/export signed or plain JSON preset packs; include schema version, author, license, and compatibility. |

### What is table stakes versus optional

**Table stakes today:** stable device discovery/recovery; immediate audition; one-finger/pad triggering; key/scale lock and override; common chord vocabulary and inversions; progression history; undo; presets; MIDI export; a clear route to a DAW instrument; no stuck notes; and readable latency/status feedback.

**Competitive but not mandatory for first release:** audio detection, a huge content library, host plugin formats, integrated synth hosting, multi-track arrangement, AI prompting, online song databases, and deep rhythmic generators. MIDI Jar should not lose its small-tool identity chasing every Scaler/DAW feature.

---

## 3. Plug-and-play expectations

### Device and routing

1. On first run, list MIDI inputs with manufacturer/name, show a live “last message” indicator, and select the first available keyboard only with an explicit, reversible default.
2. Subscribe to connect/disconnect events. If the selected device disappears, retain the selection and show **Waiting for [name]**; automatically reconnect when it returns. Do not fall back silently to another keyboard.
3. Offer two paths:
   - **Standalone preview:** no routing required; hear suggestions immediately.
   - **DAW output:** choose an existing MIDI output or create/use a named virtual port.
4. Windows users should get a concise loopMIDI setup guide and a “test output” button. macOS users should get IAC instructions. Windows does not ship a native virtual MIDI driver; macOS’s IAC bus is built into Audio MIDI Setup but must be enabled ([Ableton routing guide](https://help.ableton.com/hc/en-us/articles/209774225-Setting-up-a-virtual-MIDI-bus); [Apple IAC guide](https://support.apple.com/en-gb/guide/audio-midi-setup/ams1013/mac)).
5. Remember the route per preset, but validate that the port still exists before sending. Display direction explicitly: **Keyboard → MIDI Jar → Preview/DAW**.
6. Include All Notes Off / panic, sustain handling, channel selection, transpose, octave, and an optional MIDI-thru toggle. A stuck note destroys trust faster than a wrong suggestion.

### Zero-config first run

The ideal first five minutes:

1. Launch → “Choose MIDI input” with live device names.
2. Press a key/chord → current notes and detected chord appear.
3. Suggestions appear with playable preview buttons.
4. Press a pad or computer key → hear the suggestion.
5. Click **Add to progression** → see a slot and duration.
6. Click **Export MIDI** or **Send to DAW** → a clear success state.

Do not require an account, internet connection, virtual MIDI driver, DAW template, or theory decision before step 3. Advanced routing belongs behind “Connect to DAW.”

### Presets, MIDI learn, drag/drop

- Starter presets should include “Pop safe,” “Jazz ii–V,” “Modal/ambient,” “Practice Roman numerals,” and “Streamer large text.”
- A preset must include the selected key/scale behavior, style, complexity, ranking weights, octave/range, preview sound, pad mapping, output, and overlay appearance.
- Drag/drop should work from a visible handle on a single suggestion and the progression canvas. If OS drag is unreliable, retain a clearly labeled **Save MIDI** fallback; never make users guess where a generated file went.
- Keep suggested chord identity separate from its voicing. Export should include both the actual notes and optional metadata (JSON sidecar or embedded text track) so the user can understand what was sent.

### Latency and feedback

No unsupported hard number should be promised without measuring on target machines. Product behavior should nevertheless be:

- note display and chord recognition on the next UI frame where possible;
- no blocking analysis on the MIDI event path;
- debounce/chord-window behavior visible or configurable;
- MIDI output scheduled with timestamps when available;
- a status indicator for input-to-display and input-to-output latency;
- preview audio with a safe note-off timeout and panic action.

The open-source MIDI chord-detector reference explicitly markets zero-latency MIDI pass-through and real-time confidence scoring, demonstrating that users notice both responsiveness and trust signals ([MIDI Chord Detector](https://github.com/LongKelvin/midi-chord-detector-plugin)). Treat that project as a reference point, not as an independent benchmark.

### Overlay/streaming

MIDI Jar’s existing HTTP/WebSocket and OBS support is a competitive wedge. Add a Suggester overlay that can be opened directly as a browser source:

- current chord and alternate names;
- key/scale and confidence;
- three next suggestions, with Roman numerals and short reasons;
- optional note keyboard/interval display;
- configurable “hide theory details” mode for casual viewers;
- large text, high contrast, color plus shape/icon cues (not color alone);
- freeze/hold-last-state option during silence;
- no MIDI device access or permissions in OBS—the desktop app remains the MIDI owner.

---

## 4. Record-and-detect-key UX

### Recommended flow

**State 1 — Ready**

- Header says **Record and detect key**.
- Show selected input, channel, note count, and whether sustain is included.
- Show the current manual key/scale as **Manual** if one is locked; do not imply the system is already confident.
- Offer a short hint: “Play 4–8 bars, preferably with the tonic or a cadence.”

**State 2 — Listening**

- Record button changes to **Stop** with a timer and a clear active indicator.
- Show live note/chord events, but do not constantly rewrite the global key. A small “candidate key” preview may update with stability, while the committed key stays unchanged.
- Provide **Clear**, **Pause**, and **Include sustain** controls. Capture raw MIDI locally so the result is reproducible.

**State 3 — Analysis**

- On stop, show top candidates with confidence and evidence:
  - `C major — 78%`
  - `A minor — 64%`
  - `G Mixolydian — 41%`
- Explain the basis in plain language: “Most notes fit; C appears as a tonal center; G7 → C cadence detected.” If the engine cannot provide a meaningful explanation, say “fit score,” not “confidence.”
- Show the analyzed time span and whether pedal/sustained notes were included.

**State 4 — Review**

- Let the user audition candidate scales and toggle a piano/key visualization.
- Provide **Use this key**, **Use as starting key**, **Keep current key**, and **Analyze again**.
- Preserve alternatives instead of deleting them. A manual override should be visually distinct and should stop auto-apply until the user chooses **Follow detection** again.

**State 5 — Accepted**

- Apply the accepted key/scale to suggestions and audition.
- Add a compact “Detected from recording” badge with an edit/lock control.
- Keep the recording and detection history available for undo and comparison.

### Modulation handling

A single recording can contain multiple tonal centers. Recommended behavior:

- Analyze in overlapping windows, but require persistence before proposing a change.
- Surface a change point as a suggestion: **Possible modulation at 00:16: C major → E minor (medium confidence)**.
- Let users split the progression into sections, assign a local key/scale per section, or keep one global key intentionally.
- Never retune already accepted chords merely because a later segment suggests another key.
- For modal ambiguity, phrase results as candidates: “C major / A minor / G Mixolydian share the same pitch collection; tonal center is unresolved.”
- For chromatic/borrowed chords, do not interpret one out-of-scale note as a modulation. Mark it as possible borrowing or secondary function when the surrounding evidence supports it.

### Common failure states

- **Too little data:** “Play more notes or a cadence; no stable key yet.”
- **Ambiguous:** show candidates, not a forced winner.
- **Contradictory:** “Multiple centers detected; review sections.”
- **No input:** verify device/channel and offer a MIDI monitor test.
- **Sustain-heavy:** say whether sustained notes changed the result.
- **Single chord only:** identify chord, but label key as provisional.

This is more trustworthy than a single auto-filled dropdown and follows the stronger conventions visible in Scaler’s detection modes/history, FL Studio’s score/selection-based detection, and Logic’s editable chord-track workflow ([Scaler guide](https://downloads.scalermusic.com/Scaler-3_User_Guide.pdf); [FL Studio manual](https://cluster.image-line.com/fl-studio-learning/fl-studio-online-manual/html/pianoroll_menu.htm); [Logic Chord Track](https://support.apple.com/en-sa/guide/logicpro/lgcp2633963f/mac)).

---

## 5. Distinctive ideas for MIDI Jar

### 5.1 “Explainable harmonic co-pilot”

Make every suggestion inspectable:

- functional role: tonic, predominant, dominant, prolongation, color, pivot;
- voice-leading cost: total semitone movement and common tones;
- scale relationship: diatonic, borrowed, secondary dominant, modal interchange;
- confidence/evidence: rule-based fit versus corpus probability;
- a one-line reason written for the selected learning level.

This positions MIDI Jar between a theory teacher and a live assistant, rather than as another opaque generator.

### 5.2 Streamer-first harmonic HUD

Most commercial chord tools optimize producers inside a DAW. MIDI Jar can optimize a performer and audience: current chord, next options, Roman numeral, and confidence in a clean overlay, with hotkeys/footswitch navigation. The existing OBS/browser architecture makes this a natural extension ([MIDI Jar README](https://github.com/la-jarre-a-son/midi-jar)).

### 5.3 “Suggestion ladder” instead of one ranking

Show three lanes:

- **Safe:** common, in-scale, close voice-leading.
- **Character:** borrowed/modal/secondary movement.
- **Surprise:** chromatic or distant but explainable options.

Users get controlled exploration without a style dropdown pretending to encode an entire genre. The ladder can remain rule-based and deterministic, which is easier to trust and test than a generic AI button.

### 5.4 Record → review → teach

Turn every recording into a mini lesson: detected chord timeline, possible key candidates, Roman numerals, intervals, modulation candidates, and “play next” practice mode. MIDI Jar already has a chord quiz and next-chord anticipation concept; connect the Suggester to that learning loop rather than building only a producer feature ([MIDI Jar README](https://github.com/la-jarre-a-son/midi-jar)).

### 5.5 Open, portable harmonic sessions

Save a human-readable session format containing MIDI events, detected labels, accepted labels, key segments, ranking settings, and provenance. Export MIDI plus JSON. This is a meaningful open-source advantage over cloud-bound or proprietary plugin projects, while remaining easy to share and diff.

### 5.6 Community corpus without black-box lock-in

If a corpus mode is added, ship the corpus metadata and computation method, identify license/source/count, and show “based on N transitions.” Permit users to disable corpus ranking and use local theory rules only. Hooktheory proves the creative value of probabilities; MIDI Jar can make their provenance unusually clear ([Hooktheory Trends](https://www.hooktheory.com/trends)).

### 5.7 Accessibility as a product feature

Support keyboard-only navigation, scalable UI, high contrast, non-color cues, screen-reader labels for chord/scale/degree, and a large overlay mode. Navichord and Hookpad show that users value visual systems that make theory legible; Scaler’s touch complaints show that more features do not compensate for ambiguous controls.

---

## 6. Recommended delivery order

### Release A — make the current feature feel finished

1. MIDI status, remembered input, hot-plug recovery, panic, sustain/channel controls.
2. Built-in preview and clear Preview/Send routing states.
3. Eight playable suggestion pads with computer-keyboard mapping.
4. Add-to-progression canvas with duration, loop, undo, and save.
5. MIDI export and drag/drop fallback.
6. Detection confidence/evidence, manual override, lock, and history.
7. Starter presets and a streamer overlay.

### Release B — become a serious assistant

1. Modulation/change-point review.
2. Voice-leading variants and range constraints.
3. Safe/Character/Surprise ranking lanes.
4. MIDI learn, footswitch next/previous, transport/BPM sync.
5. Section dividers, rests, alternate progressions, and preset/session files.

### Release C — distinctive research features

1. Melody-aware chord filtering.
2. Provenance-labeled corpus ranking.
3. Practice mode generated from a user’s own recordings.
4. Open preset/corpus exchange and documented suggestion API.
5. Optional audio input only after MIDI detection and routing are solid.

## Bottom line

The market standard is no longer “show me the chord name.” It is **hear it immediately, play it with one key, understand why it works, capture it into a progression, and get it into the DAW without a routing puzzle**. MIDI Jar should close those gaps while staying local, lightweight, transparent, streamable, and open. Its strongest defensible identity is not “Scaler but free”; it is **an explainable, offline, controller-aware harmonic co-pilot that doubles as a practice and streaming overlay**.

---

## Source index

- [MIDI Jar GitHub](https://github.com/la-jarre-a-son/midi-jar)
- [Scaler 3 User Guide](https://downloads.scalermusic.com/Scaler-3_User_Guide.pdf)
- [Scaler forum user feedback](https://forum.scalerplugin.com/t/scaler-3-user-feedback-suggestions/20730?page=10)
- [Captain Chords](https://mixedinkey.com/captain-plugins/captain-chords/)
- [Captain Chords guide](https://mixedinkey.com/captain-plugins/how-to-guide/captain-chords)
- [MusicRadar Captain review](https://www.musicradar.com/reviews/mixed-in-key-captain-plugins)
- [InstaChord 2 manual](https://www.lootaudio.com/_media/images/loot/wa-production/instachord-2/Instachord_2_Manual.pdf)
- [Cthulhu official](https://xferrecords.com/products/cthulhu)
- [ChordPotion official](https://feelyoursound.com/chordpotion/)
- [ChordPrism 2.1](https://www.chordprism.com/products/chordprism-2-1)
- [Unison MIDI Chord Pack](https://unison.audio/product/unison-midi-chord-pack/)
- [Hooktheory Trends](https://www.hooktheory.com/trends)
- [Hookpad](https://www.hooktheory.com/hookpad)
- [Ableton Live 12 MIDI Tools](https://www.ableton.com/en/live-manual/12/midi-tools/)
- [Ableton Live 12 scale awareness](https://www.ableton.com/en/live-manual/12/live-concepts/)
- [Apple Logic Chord Track](https://support.apple.com/en-sa/guide/logicpro/lgcp2633963f/mac)
- [FL Studio piano roll manual](https://cluster.image-line.com/fl-studio-learning/fl-studio-online-manual/html/pianoroll_menu.htm)
- [ChordChord features](https://chordchord.com/pricing)
- [AutoChords](https://autochords.com)
- [Chord Player](https://www.onemotion.com/chord-player/)
- [Suggester](http://www.mathieurouthier.com/suggester_ios/)
- [Navichord](https://www.navichord.com/)
- [JASS-APP](https://github.com/J4Joshua/JASS-APP)
- [Kalliste for VCV Rack](https://github.com/GabTiorbi/Kalliste)
- [Bitwig Note FX](https://www.bitwig.com/userguide/latest/note_fx)
- [Web MIDI specification](https://www.w3.org/TR/webmidi/)
- [Ableton virtual MIDI bus guide](https://help.ableton.com/hc/en-us/articles/209774225-Setting-up-a-virtual-MIDI-bus)
