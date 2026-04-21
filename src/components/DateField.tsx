import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { toDateOnly } from '@/utils/date';

interface DateFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  maximumDate?: Date;
}

export function DateField({ label, value, onChange, maximumDate }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowPicker(false);
    }

    if (date) {
      onChange(toDateOnly(date));
    }
  };

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-stash-text">{label}</Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        className="rounded-2xl border border-stash-line bg-white px-4 py-3"
      >
        <Text className={value ? 'text-stash-text' : 'text-stash-muted'}>
          {value ?? '选择日期'}
        </Text>
      </Pressable>
      {value ? (
        <Pressable onPress={() => onChange(null)} className="mt-2">
          <Text className="text-sm font-semibold text-stash-muted">清除日期</Text>
        </Pressable>
      ) : null}
      {showPicker ? (
        <DateTimePicker
          value={value ? new Date(`${value}T00:00:00`) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}
