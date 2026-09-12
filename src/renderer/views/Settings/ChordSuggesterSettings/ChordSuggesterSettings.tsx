import React, { useMemo } from 'react';
import {
  Button,
  Container,
  FormControlLabel,
  FormField,
  Select,
  Switch,
  Toolbar,
} from '@la-jarre-a-son/ui';

import { useMidiRouting } from 'renderer/contexts/MidiRouting';
import { useSettings } from 'renderer/contexts/Settings';
import { Icon, ScrollContainer } from 'renderer/components';

import { fields } from './constants';

const ChordSuggesterSettings: React.FC = () => {
  const { settings, updateSetting, resetSettings } = useSettings();
  const { outputs, inputs } = useMidiRouting();
  const config = settings.chordSuggester;
  const physicalOutputOptions = useMemo(
    () => [
      { value: '', label: 'No output selected' },
      ...outputs
        .filter((output) => output.type === 'physical')
        .map((output) => ({ value: output.name, label: output.name })),
    ],
    [outputs]
  );
  const inputOptions = useMemo(
    () => [
      { value: '', label: 'Any connected MIDI input' },
      ...inputs
        .filter((input) => input.connected || input.name === config.input)
        .map((input) => ({
          value: input.name,
          label: `${input.name}${input.connected ? '' : ' (waiting)'}`,
        })),
    ],
    [config.input, inputs]
  );

  return (
    <>
      <ScrollContainer pad="md">
        <Container size="md">
          <FormField
            label="Key / tonic"
            hint="All common and theoretical enharmonic key spellings are available"
          >
            <Select
              options={fields.tonic.choices}
              onChange={(value: string) => updateSetting('chordSuggester.tonic', value)}
              value={config.tonic}
            />
          </FormField>

          <FormField
            label="MIDI input"
            hint="Remember this device and recover it automatically after hot-plug"
          >
            <Select
              options={inputOptions}
              onChange={(value: string) => updateSetting('chordSuggester.input', value)}
              value={config.input}
            />
          </FormField>

          <FormField
            label="Scale / mode"
            hint="The scale and diatonic chord field used for ranking"
          >
            <Select
              options={fields.mode.choices}
              onChange={(value: string) => updateSetting('chordSuggester.mode', value)}
              value={config.mode}
            />
          </FormField>

          <FormField label="Style" hint="Changes progression priorities and chord extensions">
            <Select
              options={fields.style.choices}
              onChange={(value: string) => updateSetting('chordSuggester.style', value)}
              value={config.style}
            />
          </FormField>

          <FormField label="Suggestions" hint="How many next-chord options to show">
            <Select
              options={fields.suggestionCount.choices}
              onChange={(value: string) =>
                updateSetting('chordSuggester.suggestionCount', Number(value))
              }
              value={`${config.suggestionCount}`}
            />
          </FormField>

          <FormField
            label="Extension complexity"
            hint="Controls the voicing notation used in suggestions"
          >
            <Select
              options={fields.extensionComplexity.choices}
              onChange={(value: string) =>
                updateSetting('chordSuggester.extensionComplexity', value)
              }
              value={config.extensionComplexity}
            />
          </FormField>

          <FormField
            label="Auto helper mode"
            hint="Record a passage, then register its most likely key and scale"
          >
            <Select
              options={fields.autoHelperMode.choices}
              onChange={(value: string) => updateSetting('chordSuggester.autoHelperMode', value)}
              value={config.autoHelperMode}
            />
          </FormField>

          <FormField
            label="Context registration"
            hint="Choose whether recording may change the selected key and scale"
          >
            <Select
              options={fields.autoApplyPolicy.choices}
              onChange={(value: string) => updateSetting('chordSuggester.autoApplyPolicy', value)}
              value={config.autoApplyPolicy}
            />
          </FormField>

          <FormField
            label="Advanced scale search"
            hint="Simple searches common modes; advanced can search every Tonal scale"
          >
            <Select
              options={fields.autoScaleScope.choices}
              onChange={(value: string) => updateSetting('chordSuggester.autoScaleScope', value)}
              value={config.autoScaleScope}
              disabled={config.autoHelperMode !== 'advanced'}
            />
          </FormField>

          <FormField
            label="Advanced evidence"
            hint="Choose whether notes, chord roots, or both drive registration"
          >
            <Select
              options={fields.autoEvidence.choices}
              onChange={(value: string) => updateSetting('chordSuggester.autoEvidence', value)}
              value={config.autoEvidence}
              disabled={config.autoHelperMode !== 'advanced'}
            />
          </FormField>

          <FormField
            label="Minimum confidence"
            hint="Do not register a context below this confidence in advanced mode"
          >
            <Select
              options={fields.autoMinimumConfidence.choices}
              onChange={(value: string) =>
                updateSetting('chordSuggester.autoMinimumConfidence', Number(value))
              }
              value={`${config.autoMinimumConfidence}`}
              disabled={config.autoHelperMode !== 'advanced'}
            />
          </FormField>

          <FormControlLabel
            label="Register while recording"
            hint="Advanced mode updates the detected key and scale as evidence arrives"
            reverse
          >
            <Switch
              checked={config.autoRegisterWhileRecording}
              onChange={(value: boolean) =>
                updateSetting('chordSuggester.autoRegisterWhileRecording', value)
              }
              disabled={config.autoHelperMode !== 'advanced'}
            />
          </FormControlLabel>

          <FormControlLabel
            label="Allow omitted chord tones"
            hint="Use MIDI Jar's omission-aware chord detector"
            reverse
          >
            <Switch
              checked={config.allowOmissions}
              onChange={(value: boolean) => updateSetting('chordSuggester.allowOmissions', value)}
            />
          </FormControlLabel>

          <FormControlLabel
            label="Use sustain pedal"
            hint="Keep sustained notes in the detected chord"
            reverse
          >
            <Switch
              checked={config.useSustain}
              onChange={(value: boolean) => updateSetting('chordSuggester.useSustain', value)}
            />
          </FormControlLabel>

          <FormControlLabel
            label="Detect on release"
            hint="Update the chord after notes are released"
            reverse
          >
            <Switch
              checked={config.detectOnRelease}
              onChange={(value: boolean) => updateSetting('chordSuggester.detectOnRelease', value)}
            />
          </FormControlLabel>

          <FormControlLabel
            label="Display keyboard"
            hint="Show the live MIDI keyboard below the suggestions"
            reverse
          >
            <Switch
              checked={config.displayKeyboard}
              onChange={(value: boolean) => updateSetting('chordSuggester.displayKeyboard', value)}
            />
          </FormControlLabel>

          <FormControlLabel label="Display notation" hint="Show the live notes on a staff" reverse>
            <Switch
              checked={config.displayNotation}
              onChange={(value: boolean) => updateSetting('chordSuggester.displayNotation', value)}
            />
          </FormControlLabel>

          <FormControlLabel
            label="Show suggestion reasons"
            hint="Explain the progression or harmonic-function signal"
            reverse
          >
            <Switch
              checked={config.displayReason}
              onChange={(value: boolean) => updateSetting('chordSuggester.displayReason', value)}
            />
          </FormControlLabel>

          <FormControlLabel
            label="Show recent chords"
            hint="Keep a short trail of the last detected chords"
            reverse
          >
            <Switch
              checked={config.showHistory}
              onChange={(value: boolean) => updateSetting('chordSuggester.showHistory', value)}
            />
          </FormControlLabel>

          <FormControlLabel
            label="Consider previous chord"
            hint="Use recent harmonic context when ranking the next chord"
            reverse
          >
            <Switch
              checked={config.considerPreviousChord}
              onChange={(value: boolean) =>
                updateSetting('chordSuggester.considerPreviousChord', value)
              }
            />
          </FormControlLabel>

          <FormControlLabel
            label="Enable audition"
            hint="Allow clicking a suggestion to send it to one selected MIDI output"
            reverse
          >
            <Switch
              checked={config.audition}
              onChange={(value: boolean) => updateSetting('chordSuggester.audition', value)}
            />
          </FormControlLabel>

          <FormField
            label="Audition output"
            hint="Only this physical output receives clicked suggestions"
          >
            <Select
              options={physicalOutputOptions}
              onChange={(value: string) => updateSetting('chordSuggester.auditionOutput', value)}
              value={config.auditionOutput}
              disabled={!config.audition}
            />
          </FormField>
        </Container>
      </ScrollContainer>
      <Toolbar elevation={2} placement="bottom">
        <Button onClick={() => resetSettings('chordSuggester')} intent="neutral">
          <Icon name="reset" />
          Reset to Defaults
        </Button>
      </Toolbar>
    </>
  );
};

export default ChordSuggesterSettings;
