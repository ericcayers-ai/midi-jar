import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames/bind';
import { Chord as TonalChord, Note } from 'tonal';

import { useSettings } from 'renderer/contexts/Settings';
import useNotes from 'renderer/hooks/useNotes';
import { useOptionalMidiRouting } from 'renderer/contexts/MidiRouting';
import {
  buildDiatonicField,
  encodeMidiFile,
  getChordSuggestions,
  inferAutoContext,
  type AutoContext,
  type ChordSuggestion,
  type KeyPosterior,
  type ProgressionChord,
  type RecordedChord,
} from 'renderer/helpers';
import { ChordName, ChordNameLink, Notation, PianoKeyboard } from 'renderer/components';
import { defaultKeyboardSettings } from 'main/store/defaults';

import { fields } from '../Settings/ChordSuggesterSettings/constants';
import styles from './ChordSuggester.module.scss';

const cx = classnames.bind(styles);

const ChordSuggester: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const config = settings.chordSuggester;
  const { inputs, wires, addRoute, deleteRoute } = useOptionalMidiRouting();
  const { midiNotes, sustainedMidiNotes, playedMidiNotes, chords, params, lastMidiEvent } =
    useNotes({
      key: 'C',
      accidentals: settings.notation.accidentals,
      midiChannel: 0,
      allowOmissions: config.allowOmissions,
      useSustain: config.useSustain,
      detectOnRelease: config.detectOnRelease,
      disabledChords: settings.chordDictionary.disabled,
    });
  const [history, setHistory] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<ChordSuggestion | null>(null);
  const [auditionMessage, setAuditionMessage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChords, setRecordedChords] = useState<RecordedChord[]>([]);
  const [autoContext, setAutoContext] = useState<AutoContext | null>(null);
  const [pendingContext, setPendingContext] = useState<AutoContext | null>(null);
  const [autoStatus, setAutoStatus] = useState<string | null>(null);
  const [progression, setProgression] = useState<ProgressionChord[]>(() => {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem('midi-jar.chord-suggester.progression') || 'null'
      );
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [progressionPast, setProgressionPast] = useState<ProgressionChord[][]>([]);
  const [progressionMessage, setProgressionMessage] = useState<string | null>(null);
  const appliedContext = useRef<string | null>(null);
  const previousPosterior = useRef<KeyPosterior[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const currentSymbol = chords[0]?.symbol;
  const field = useMemo(
    () => buildDiatonicField(config.tonic, config.mode),
    [config.tonic, config.mode]
  );
  const autoOptions = useMemo(
    () => ({
      mode: config.autoHelperMode,
      scaleScope: config.autoScaleScope,
      evidence: config.autoEvidence,
      minimumConfidence: config.autoHelperMode === 'advanced' ? config.autoMinimumConfidence : 0.25,
    }),
    [
      config.autoEvidence,
      config.autoHelperMode,
      config.autoMinimumConfidence,
      config.autoScaleScope,
    ]
  );
  const selectedInput = config.input
    ? inputs.find((input) => input.name === config.input)
    : inputs.find((input) => input.connected);
  const suggesterRouteInput = wires.find(
    (wire) => wire.route.output === 'chord-suggester' && wire.route.input === selectedInput?.name
  );
  const routedInput = useRef<string | null>(null);
  const persistedInput = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedInput?.connected) return;
    if (!config.input && persistedInput.current !== selectedInput.name) {
      persistedInput.current = selectedInput.name;
      updateSettings({
        ...settings,
        chordSuggester: {
          ...settings.chordSuggester,
          input: selectedInput.name,
        },
      });
    }
    wires
      .filter(
        (wire) => wire.route.output === 'chord-suggester' && wire.route.input !== selectedInput.name
      )
      .forEach((wire) => deleteRoute(wire.route));
    if (routedInput.current !== selectedInput.name && !suggesterRouteInput) {
      routedInput.current = selectedInput.name;
      addRoute({
        input: selectedInput.name,
        output: 'chord-suggester',
        type: 'internal',
        enabled: true,
      });
    }
  }, [
    addRoute,
    config.input,
    deleteRoute,
    selectedInput,
    settings,
    suggesterRouteInput,
    updateSettings,
  ]);

  const inferContext = useCallback(
    (recordings: RecordedChord[]) => {
      const context = inferAutoContext(recordings, {
        ...autoOptions,
        previousPosterior: previousPosterior.current,
      });
      if (context) previousPosterior.current = context.posterior.slice(0, 64);
      return context;
    },
    [autoOptions]
  );
  const finalizeRecordings = useCallback((recordings: RecordedChord[]) => {
    if (!recordings.length) return recordings;
    const now = performance.now();
    return recordings.map((recording, index) => {
      if (index !== recordings.length - 1) return recording;
      const observedAt = recording.observedAt ?? now;
      return {
        ...recording,
        durationMs: Math.max(recording.durationMs ?? 0, now - observedAt),
      };
    });
  }, []);
  const persistContext = useCallback(
    async (context: AutoContext) => {
      const contextKey = `${context.tonic}|${context.scaleType}`;
      if (appliedContext.current === contextKey) {
        setAutoStatus(
          `Registered ${context.tonic} · ${context.scaleName} (${Math.round(
            context.confidence * 100
          )}% posterior).`
        );
        return;
      }

      appliedContext.current = contextKey;
      try {
        await updateSettings({
          ...settings,
          chordSuggester: {
            ...settings.chordSuggester,
            tonic: context.tonic,
            mode: context.scaleType,
          },
        });
        setPendingContext(null);
        setAutoStatus(
          `Registered ${context.tonic} · ${context.scaleName} (${Math.round(
            context.confidence * 100
          )}% posterior).`
        );
      } catch {
        appliedContext.current = null;
        setAutoStatus('Context found, but it could not be saved to settings.');
      }
    },
    [settings, updateSettings]
  );
  const registerContext = useCallback(
    async (context: AutoContext) => {
      setAutoContext(context);
      if (config.autoApplyPolicy === 'locked') {
        setAutoStatus(
          `Detected ${context.tonic} · ${context.scaleName} (${Math.round(
            context.confidence * 100
          )}% posterior); settings are locked.`
        );
        return;
      }
      if (config.autoApplyPolicy === 'ask') {
        setPendingContext(context);
        setAutoStatus(
          `Detected ${context.tonic} · ${context.scaleName}. Review it, then apply or keep your settings.`
        );
        return;
      }
      await persistContext(context);
    },
    [config.autoApplyPolicy, persistContext]
  );
  const applyPendingContext = useCallback(async () => {
    if (pendingContext) await persistContext(pendingContext);
  }, [pendingContext, persistContext]);
  const commitProgression = useCallback(
    (updater: (current: ProgressionChord[]) => ProgressionChord[]) => {
      setProgression((current) => {
        const next = updater(current);
        if (next !== current) setProgressionPast((past) => [...past, current].slice(-20));
        return next;
      });
    },
    []
  );
  const undoProgression = useCallback(() => {
    setProgression((current) => {
      const previous = progressionPast.at(-1);
      if (!previous) return current;
      setProgressionPast((past) => past.slice(0, -1));
      return previous;
    });
  }, [progressionPast]);

  const historyRomans = useMemo(
    () =>
      history
        .slice(1)
        .map((symbol) => {
          const root = TonalChord.get(symbol).tonic;
          if (!root) return undefined;
          return field.find((candidate) => Note.chroma(candidate.root) === Note.chroma(root))
            ?.roman;
        })
        .filter((roman): roman is string => !!roman),
    [field, history]
  );
  const suggestions = useMemo(
    () =>
      getChordSuggestions({
        tonic: config.tonic,
        mode: config.mode,
        style: config.style,
        extensionComplexity: config.extensionComplexity,
        currentChord: chords[0],
        count: config.suggestionCount,
        recentRomans: config.considerPreviousChord ? historyRomans : undefined,
      }),
    [
      chords,
      config.tonic,
      config.mode,
      config.style,
      config.extensionComplexity,
      config.suggestionCount,
      config.considerPreviousChord,
      historyRomans,
    ]
  );
  const currentDegree = useMemo(() => {
    const currentRoot = chords[0]?.tonic || chords[0]?.root;
    if (!currentRoot) return null;
    return (
      field.find((candidate) => Note.chroma(candidate.root) === Note.chroma(currentRoot)) || null
    );
  }, [chords, field]);
  const activeTargets = useMemo(
    () =>
      activeSuggestion?.chord.notes.flatMap((note) => {
        const midi = Note.midi(`${note}4`);
        return typeof midi === 'number' ? [midi] : [];
      }),
    [activeSuggestion]
  );
  const modeLabel = fields.mode.choices.find((choice) => choice.value === config.mode)?.label;
  const styleLabel = fields.style.choices.find((choice) => choice.value === config.style)?.label;
  const inputStatus = selectedInput
    ? `${selectedInput.name} · ${selectedInput.connected ? 'connected' : 'waiting for device'}`
    : 'No MIDI input detected';
  const recordButtonLabel = isRecording ? 'Stop & register' : 'Record key + scale';
  let recordState = 'Simple mode: stop recording to register the most likely context.';
  if (isRecording) recordState = `${recordedChords.length} chord changes captured`;
  if (!isRecording && autoContext) {
    recordState = `Registered ${autoContext.tonic} · ${autoContext.scaleName}`;
  }
  let recordDetail = 'The helper will set the tonic and scale automatically.';
  if (isRecording) recordDetail = 'Play at least two different chords, then stop.';
  if (!isRecording && autoContext) {
    recordDetail = `${Math.round(autoContext.confidence * 100)}% posterior · ${
      autoContext.chordCount
    } chords analyzed · ${autoContext.evidenceMass.toFixed(1)} evidence mass`;
  }

  useEffect(() => {
    if (!currentSymbol) return;
    setHistory((previous) =>
      previous[0] === currentSymbol ? previous : [currentSymbol, ...previous].slice(0, 5)
    );
  }, [currentSymbol]);

  useEffect(() => {
    const currentChord = chords[0];
    if (!isRecording || !currentChord || !currentSymbol) return;

    const observedAt = lastMidiEvent?.timestamp ?? performance.now();
    setRecordedChords((previous) => {
      if (previous.at(-1)?.symbol === currentSymbol) return previous;
      const previousWithDuration = previous.map((recording, index) =>
        index === previous.length - 1 && recording.observedAt
          ? {
              ...recording,
              durationMs: Math.max(recording.durationMs ?? 0, observedAt - recording.observedAt),
            }
          : recording
      );
      return [
        ...previousWithDuration,
        {
          symbol: currentSymbol,
          root: currentChord.tonic || currentChord.root,
          bass: currentChord.notes[0],
          notes: [...currentChord.notes],
          velocity: lastMidiEvent?.velocity,
          observedAt,
        },
      ].slice(-64);
    });
  }, [chords, currentSymbol, isRecording, lastMidiEvent]);

  useEffect(() => {
    if (
      !isRecording ||
      config.autoHelperMode !== 'advanced' ||
      !config.autoRegisterWhileRecording ||
      config.autoApplyPolicy !== 'auto' ||
      recordedChords.length < 2
    ) {
      return;
    }

    const context = inferContext(recordedChords);
    if (context) registerContext(context);
  }, [
    config.autoApplyPolicy,
    config.autoHelperMode,
    config.autoRegisterWhileRecording,
    inferContext,
    isRecording,
    recordedChords,
    registerContext,
  ]);

  const handleRecordToggle = async () => {
    if (isRecording) {
      setIsRecording(false);
      const recordings = finalizeRecordings(recordedChords);
      const context = inferContext(recordings);
      if (!context) {
        setAutoStatus(
          recordedChords.length === 0
            ? 'No chords captured. Play a chord, then record again.'
            : 'No context met the selected confidence threshold.'
        );
        return;
      }
      await registerContext(context);
      return;
    }

    appliedContext.current = null;
    previousPosterior.current = [];
    setRecordedChords([]);
    setAutoContext(null);
    setPendingContext(null);
    setAutoStatus('Recording started. Play changing chords, then stop to register the context.');
    setIsRecording(true);
  };

  const notesToMidi = useCallback(
    (notes: string[]) =>
      notes.flatMap((note) => {
        const midi = Note.midi(`${note}4`);
        return typeof midi === 'number' ? [midi] : [];
      }),
    []
  );
  const previewNotes = useCallback(
    (notes: string[]) => {
      try {
        const context = audioContext.current ?? new window.AudioContext();
        audioContext.current = context;
        const now = context.currentTime;
        notesToMidi(notes).forEach((midi) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = 'triangle';
          oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(now);
          oscillator.stop(now + 0.8);
        });
        return true;
      } catch {
        return false;
      }
    },
    [notesToMidi]
  );
  const handleSuggestionClick = useCallback(
    (suggestion: ChordSuggestion) => {
      setActiveSuggestion(suggestion);
      const previewed = previewNotes(suggestion.chord.notes);
      const outputReady = config.audition && config.auditionOutput && window.midi;
      if (outputReady) {
        window.midi.audition(config.auditionOutput, notesToMidi(suggestion.chord.notes));
      }
      setAuditionMessage(
        outputReady
          ? `Previewed and sent ${suggestion.symbol} to ${config.auditionOutput}.`
          : previewed
          ? `Previewed ${suggestion.symbol} locally.`
          : 'Audio preview is unavailable in this environment.'
      );
    },
    [config.audition, config.auditionOutput, notesToMidi, previewNotes]
  );
  const addActiveSuggestion = () => {
    if (!activeSuggestion) {
      setProgressionMessage('Select a suggestion first.');
      return;
    }
    commitProgression((previous) => [
      ...previous,
      {
        symbol: activeSuggestion.symbol,
        notes: notesToMidi(activeSuggestion.chord.notes),
        durationBeats: 4,
      },
    ]);
    setProgressionMessage(`${activeSuggestion.symbol} added to progression.`);
  };
  const removeProgressionItem = (index: number) => {
    commitProgression((previous) => previous.filter((_item, itemIndex) => itemIndex !== index));
  };
  const updateProgressionDuration = (index: number, durationBeats: number) => {
    commitProgression((previous) =>
      previous.map((item, itemIndex) => (itemIndex === index ? { ...item, durationBeats } : item))
    );
  };
  const exportProgression = () => {
    if (!progression.length) {
      setProgressionMessage('Add at least one suggestion before exporting.');
      return;
    }
    const blob = new Blob([encodeMidiFile(progression)], {
      type: 'audio/midi',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'midi-jar-progression.mid';
    anchor.click();
    URL.revokeObjectURL(url);
    setProgressionMessage(
      `Exported ${progression.length} chord${progression.length === 1 ? '' : 's'}.`
    );
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'midi-jar.chord-suggester.progression',
        JSON.stringify(progression)
      );
    } catch {
      // Storage may be unavailable in the external overlay's private context.
    }
  }, [progression]);

  useEffect(() => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const index = keys.indexOf(event.key);
      const suggestion = index >= 0 ? suggestions[index] : undefined;
      if (!suggestion) return;
      event.preventDefault();
      handleSuggestionClick(suggestion);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSuggestionClick, suggestions]);

  return (
    <div className={cx('base')}>
      <header className={cx('header')}>
        <div>
          <p className={cx('eyebrow')}>Live harmony workspace</p>
          <h1>Chord Suggester</h1>
          <p className={cx('scale')}>
            {config.tonic} {modeLabel} · {styleLabel}
          </p>
        </div>
        <div className={cx('scaleNotes')} aria-label="Scale notes">
          {field.map((candidate) => candidate.root).join(' · ')}
        </div>
      </header>

      <section className={cx('recordBar')} aria-label="Automatic harmonic context recorder">
        <button
          className={cx('recordButton', { recordButtonActive: isRecording })}
          type="button"
          onClick={handleRecordToggle}
          aria-pressed={isRecording}
        >
          <span className={cx('recordDot')} aria-hidden="true" />
          {recordButtonLabel}
        </button>
        <div className={cx('recordInfo')}>
          <strong>{recordState}</strong>
          <span>{recordDetail}</span>
          <span className={cx('inputStatus')} aria-live="polite">
            MIDI input: {inputStatus}
          </span>
          {autoContext && autoContext.alternatives.length > 1 && (
            <span className={cx('autoAlternatives')}>
              Alternatives:{' '}
              {autoContext.alternatives
                .slice(1)
                .map(
                  (item) =>
                    `${item.tonic} ${item.scaleType} (${Math.round(item.probability * 100)}%)`
                )
                .join(' · ')}
            </span>
          )}
          {pendingContext && (
            <div className={cx('contextActions')}>
              <button type="button" onClick={applyPendingContext}>
                Apply {pendingContext.tonic} · {pendingContext.scaleName}
              </button>
              <button type="button" onClick={() => setPendingContext(null)}>
                Keep current settings
              </button>
            </div>
          )}
          {autoStatus && (
            <span className={cx('autoStatus')} role="status">
              {autoStatus}
            </span>
          )}
        </div>
      </section>

      <main className={cx('workspace')}>
        <section className={cx('currentPanel')} aria-label="Current chord">
          <p className={cx('sectionLabel')}>Now playing</p>
          <div className={cx('currentChord')}>
            {chords[0] ? (
              <ChordNameLink chord={chords[0]} notation="preferred" />
            ) : (
              <span>Play three or more notes</span>
            )}
          </div>
          <div className={cx('degree')}>
            <span>{currentDegree?.roman || '—'}</span>
            <span>
              {currentDegree
                ? `${currentDegree.quality} · ${currentDegree.harmonicFunction}`
                : 'Waiting for a detected chord'}
            </span>
          </div>
          <p className={cx('hint')}>
            Suggestions follow the selected mode, harmonic function, root motion, and style.
          </p>
          {config.showHistory && history.length > 0 && (
            <div className={cx('history')} aria-label="Recent chords">
              <span className={cx('sectionLabel')}>Recent</span>
              <div className={cx('historyList')}>
                {history.map((symbol, index) => (
                  <span className={cx({ historyCurrent: index === 0 })} key={`${symbol}-${index}`}>
                    {symbol}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className={cx('suggestionPanel')} aria-label="Suggested next chords">
          <div className={cx('sectionHeading')}>
            <div>
              <p className={cx('sectionLabel')}>Where to go next</p>
              <h2>{suggestions.length ? 'Try one of these' : 'Waiting for a chord'}</h2>
            </div>
            <div className={cx('suggestionActions')}>
              <span className={cx('deterministic')}>Deterministic ranking · keys 1–0</span>
              <button type="button" onClick={addActiveSuggestion} disabled={!activeSuggestion}>
                Add selected
              </button>
            </div>
          </div>
          <div className={cx('suggestions')}>
            {suggestions.map((suggestion) => (
              <button
                className={cx('suggestion', {
                  suggestionActive: activeSuggestion?.symbol === suggestion.symbol,
                })}
                type="button"
                key={`${suggestion.symbol}-${suggestion.roman}`}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setActiveSuggestion(suggestion)}
                onMouseLeave={() => setActiveSuggestion(null)}
                onFocus={() => setActiveSuggestion(suggestion)}
                aria-label={`Try ${suggestion.symbol}, ${suggestion.reason}`}
              >
                <span className={cx('suggestionRoman')}>{suggestion.roman}</span>
                <span className={cx('suggestionChord')}>
                  <ChordName chord={suggestion.chord} notation="preferred" />
                </span>
                <span className={cx('suggestionIntervals')}>
                  {suggestion.chord.intervals.join(' · ')}
                </span>
                <span className={cx('suggestionReason')}>
                  {config.displayReason ? suggestion.reason : 'Play this next'}
                </span>
                <span className={cx('confidence')}>
                  <span style={{ width: `${suggestion.confidence * 100}%` }} />
                </span>
              </button>
            ))}
          </div>
          <div className={cx('progression')} aria-label="Progression canvas">
            <div className={cx('progressionHeading')}>
              <div>
                <p className={cx('sectionLabel')}>Accepted progression</p>
                <h3>
                  {progression.length
                    ? `${progression.length} chord${progression.length === 1 ? '' : 's'}`
                    : 'Build a progression'}
                </h3>
              </div>
              <div className={cx('progressionActions')}>
                <button type="button" onClick={exportProgression} disabled={!progression.length}>
                  Export MIDI
                </button>
                <button type="button" onClick={undoProgression} disabled={!progressionPast.length}>
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => commitProgression(() => [])}
                  disabled={!progression.length}
                >
                  Clear
                </button>
              </div>
            </div>
            {progression.length > 0 && (
              <ol className={cx('progressionList')}>
                {progression.map((item, index) => (
                  <li key={`${item.symbol}-${index}`}>
                    <span>{item.symbol}</span>
                    <select
                      aria-label={`Duration for ${item.symbol}`}
                      value={item.durationBeats}
                      onChange={(event) =>
                        updateProgressionDuration(index, Number(event.target.value))
                      }
                    >
                      {[1, 2, 4, 8].map((beats) => (
                        <option value={beats} key={beats}>
                          {beats} beat{beats === 1 ? '' : 's'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeProgressionItem(index)}
                      aria-label={`Remove ${item.symbol}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {progressionMessage && (
              <p className={cx('progressionMessage')} role="status">
                {progressionMessage}
              </p>
            )}
          </div>
          {auditionMessage && (
            <p className={cx('auditionMessage')} role="status">
              {auditionMessage}
            </p>
          )}
        </section>
      </main>

      {config.displayNotation && (
        <div className={cx('notation')}>
          <Notation
            id="suggesterNotation"
            midiNotes={midiNotes}
            keySignature={params.keySignature}
            staffClef={settings.notation.staffClef}
            staffTranspose={settings.notation.staffTranspose}
          />
        </div>
      )}

      {config.displayKeyboard && (
        <div className={cx('piano')}>
          <PianoKeyboard
            id="suggesterKeyboard"
            className={cx('keyboard')}
            keyboard={defaultKeyboardSettings}
            keySignature={params.keySignature}
            sustained={sustainedMidiNotes}
            played={playedMidiNotes}
            midi={midiNotes}
            targets={activeTargets}
            chord={chords[0] ?? undefined}
          />
          <p className={cx('keyboardHint')}>
            Hover a suggestion to preview its shape on the keyboard.
          </p>
        </div>
      )}
    </div>
  );
};

export default ChordSuggester;
