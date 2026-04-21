import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { PressableScale } from '@/components/PressableScale';

interface StatTileProps {
  label: string;
  value: number;
  colors: [string, string];
  onPress?: () => void;
}

export function StatTile({ label, value, colors, onPress }: StatTileProps) {
  return (
    <PressableScale onPress={onPress} className="flex-1">
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 18, padding: 14, minHeight: 92 }}
      >
        <View>
          <Text className="text-sm font-semibold text-white/90">{label}</Text>
          <Text className="mt-3 text-3xl font-black text-white">{value}</Text>
        </View>
      </LinearGradient>
    </PressableScale>
  );
}
