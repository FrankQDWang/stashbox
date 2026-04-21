import { Image, Platform, Text, View } from 'react-native';

import { getExpiryColor, getExpiryLabel, getExpiryLevel, getExpiryText } from '@/domain/expiry';
import { ProgressBar } from '@/components/ProgressBar';
import { PressableScale } from '@/components/PressableScale';
import type { ItemWithImages } from '@/types/item';

interface ItemCardProps {
  item: ItemWithImages;
  onPress: () => void;
}

const STATUS_LABELS: Record<ItemWithImages['status'], string> = {
  unopened: '未开封',
  opened: '已开封',
  used_up: '已用完',
  idle: '闲置',
};

export function ItemCard({ item, onPress }: ItemCardProps) {
  const expiryLevel = getExpiryLevel(item.computedDueDate);
  const expiryColor = getExpiryColor(expiryLevel);
  const firstImage = item.images[0]?.localUri;
  const categoryIcon = item.category?.icon ?? '✨';
  const categoryName = item.category?.name ?? '未分类';

  return (
    <PressableScale onPress={onPress} className="mb-3">
      <View
        className="rounded-stash bg-white p-3"
        style={{
          borderLeftWidth: 5,
          borderLeftColor: expiryColor,
          ...(Platform.OS === 'web'
            ? { boxShadow: '0 6px 12px rgba(244, 143, 177, 0.12)' }
            : {
                shadowColor: '#f48fb1',
                shadowOpacity: 0.12,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 2,
              }),
        }}
      >
        <View className="flex-row">
          <View className="mr-3 h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-2xl bg-[#fff0f5]">
            {firstImage ? (
              <Image source={{ uri: firstImage }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <Text className="text-2xl">{categoryIcon}</Text>
            )}
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-start justify-between">
              <View className="mr-2 min-w-0 flex-1">
                <Text className="text-base font-black text-stash-text" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="mt-1 text-xs font-semibold text-stash-muted" numberOfLines={1}>
                  {categoryName} · {STATUS_LABELS[item.status]} · 剩余 {item.remainingPercent}%
                </Text>
              </View>
              <View
                className="rounded-full px-2 py-1"
                style={{ backgroundColor: `${expiryColor}22` }}
              >
                <Text className="text-xs font-black" style={{ color: expiryColor }}>
                  {getExpiryLabel(expiryLevel)}
                </Text>
              </View>
            </View>
            <View className="mt-3">
              <ProgressBar value={item.remainingPercent} expiryLevel={expiryLevel} />
            </View>
            <Text className="mt-2 text-xs font-semibold text-stash-muted">
              {getExpiryText(item.computedDueDate)}
            </Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}
