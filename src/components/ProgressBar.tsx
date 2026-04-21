import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { ExpiryLevel } from '@/types/item';

interface ProgressBarProps {
  value: number;
  expiryLevel?: ExpiryLevel;
}

export function ProgressBar({ value, expiryLevel }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const colors = getProgressColors(clamped, expiryLevel);

  return (
    <View className="h-2 overflow-hidden rounded-full bg-[#f7e7ee]">
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: '100%', width: `${clamped}%`, borderRadius: 999 }}
      />
    </View>
  );
}

function getProgressColors(value: number, expiryLevel?: ExpiryLevel): [string, string] {
  if (expiryLevel === 'expired' || value <= 25) {
    return ['#ef5350', '#ff8a80'];
  }

  if (value <= 50) {
    return ['#ffa726', '#ffd180'];
  }

  return ['#f48fb1', '#ce93d8'];
}
