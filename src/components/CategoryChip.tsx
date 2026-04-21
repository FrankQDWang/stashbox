import { Text } from 'react-native';

import { PressableScale } from '@/components/PressableScale';

interface CategoryChipProps {
  label: string;
  icon?: string | null;
  selected: boolean;
  onPress: () => void;
}

export function CategoryChip({ label, icon, selected, onPress }: CategoryChipProps) {
  return (
    <PressableScale
      onPress={onPress}
      className={`mr-2 rounded-full border px-4 py-2 ${
        selected ? 'border-stash-brandTo bg-[#f7d9e8]' : 'border-stash-line bg-white'
      }`}
    >
      <Text className={`text-sm font-semibold ${selected ? 'text-stash-text' : 'text-stash-muted'}`}>
        {icon ? `${icon} ` : ''}
        {label}
      </Text>
    </PressableScale>
  );
}
