import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames/bind';
import { Chord as TonalChord, Note } from 'tonal';

import { useSettings } from 'renderer/contexts/Settings';
import useNotes from 'renderer/hooks/useNotes';
import {
  buildDiatonicField,
  getChordSuggestions,
  inferAutoContext,
  type AutoContext,
  type ChordSuggestion,
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
  const { midiNotes, sustainedMidiNotes, playedMidiNotes, chords, params } = useNotes({
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
  const [autoStatus, setAutoStatus] = useState<string | null>(null);
  const appliedContext = useRef<string | null>(null);
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
  const registerContext = useCallback(
    async (context: AutoContext) => {
      const contextKey = `${context.tonic}|${context.scaleType}`;
      setAutoContext(context);
      if (appliedContext.current === contextKey) {
        setAutoStatus(
          `Registered ${context.tonic} · ${context.scaleName} (${Math.round(
            context.confidence * 100
          )}% confidence).`
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
        setAutoStatus(
          `Registered ${context.tonic} · ${context.scaleName} (${Math.round(
            context.confidence * 100
          )}% confidence).`
        );
      } catch {
        appliedContext.current = null;
        setAutoStatus('Context found, but it could not be saved to settings.');
      }
    },
    [settings, updateSettings]
  );

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
  const recordButtonLabel = isRecording ? 'Stop & register' : 'Record key + scale';
  let recordState = 'Simple mode: stop recording to register the most likely context.';
  if (isRecording) recordState = `${recordedChords.length} chord changes captured`;
  if (!isRecording && autoContext) {
    recordState = `Registered ${autoContext.tonic} · ${autoContext.scaleName}`;
  }
  let recordDetail = 'The helper will set the tonic and scale automatically.';
  if (isRecording) recordDetail = 'Play at least two different chords, then stop.';
  if (!isRecording && autoContext) {
    recordDetail = `${Math.round(autoContext.confidence * 100)}% confidence · ${
      autoContext.chordCount
    } chords analyzed`;
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

    setRecordedChords((previous) => {
      if (previous.at(-1)?.symbol === currentSymbol) return previous;
      return [
        ...previous,
        {
          symbol: currentSymbol,
          root: currentChord.tonic || currentChord.root,
          notes: [...currentChord.notes],
        },
      ].slice(-64);
    });
  }, [chords, currentSymbol, isRecording]);

  useEffect(() => {
    if (
      !isRecording ||
      config.autoHelperMode !== 'advanced' ||
      !config.autoRegisterWhileRecording ||
      recordedChords.length < 2
    ) {
      return;
    }

    const context = inferAutoContext(recordedChords, autoOptions);
    if (context) registerContext(context);
  }, [
    autoOptions,
    config.autoHelperMode,
    config.autoRegisterWhileRecording,
    isRecording,
    recordedChords,
    registerContext,
  ]);

  const handleRecordToggle = async () => {
    if (isRecording) {
      setIsRecording(false);
      const context = inferAutoContext(recordedChords, autoOptions);
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
    setRecordedChords([]);
    setAutoContext(null);
    setAutoStatus('Recording started. Play changing chords, then stop to register the context.');
    setIsRecording(true);
  };

  const handleSuggestionClick = (suggestion: ChordSuggestion) => {
    setActiveSuggestion(suggestion);
    if (!config.audition) {
      setAuditionMessage(null);
      return;
    }
    if (!config.auditionOutput) {
      setAuditionMessage('Select a MIDI output in Settings to audition suggestions.');
      return;
    }
    if (!window.midi) {
      setAuditionMessage('Audition is available from the desktop app, not the external overlay.');
      return;
    }
    setAuditionMessage(`Sent ${suggestion.symbol} to ${config.auditionOutput}.`);
    window.midi.audition(
      config.auditionOutput,
      suggestion.chord.notes.flatMap((note) => {
        const midi = Note.midi(`${note}4`);
        return typeof midi === 'number' ? [midi] : [];
      })
    );
  };

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
            <span className={cx('deterministic')}>Deterministic ranking</span>
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
