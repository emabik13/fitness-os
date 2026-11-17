import { View } from 'react-native';

import type { DayChoice } from '@/utils/dates';

import { ChipGroup } from './ChipGroup';
import { TextField } from './TextField';

interface DayPickerProps {
  choice: DayChoice;
  onChoice: (c: DayChoice) => void;
  otherText: string;
  onOtherText: (t: string) => void;
  error?: string | null;
}

export function DayPicker({ choice, onChoice, otherText, onOtherText, error }: DayPickerProps) {
  return (
    <View style={{ gap: 12 }}>
      <ChipGroup
        options={[
          { value: 'today', label: 'Hoy' },
          { value: 'yesterday', label: 'Ayer' },
          { value: 'other', label: 'Otra fecha' },
        ]}
        selected={[choice]}
        onToggle={onChoice}
      />
      {choice === 'other' ? (
        <TextField
          label="Fecha"
          placeholder="DD/MM/AAAA"
          value={otherText}
          onChangeText={onOtherText}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          error={error}
        />
      ) : null}
    </View>
  );
}
