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
import { InputNote, Icon, ScrollContainer } from 'renderer/components';

import { fields } from './constants';

const ChordSuggesterSettings: React.FC = () => {
  const { settings, updateSetting, resetSettings } = useSettings();
  const { outputs } = useMidiRouting();
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

  return (
    <>
      <ScrollContainer pad="md">
        <Container size="md">
          <FormField label="Tonic" hint="The root of the key used for suggestions">
            <InputNote
              value={config.tonic}
              onChange={(value: string) => updateSetting('chordSuggester.tonic', value)}
              type="text"
            />
          </FormField>

          <FormField label="Mode" hint="The scale and diatonic chord field used for ranking">
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
