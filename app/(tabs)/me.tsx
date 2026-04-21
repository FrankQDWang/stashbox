import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { PressableScale } from '@/components/PressableScale';
import { useArchivedItems, useCategoriesWithCount, useInventoryItems } from '@/features/items/useItems';

export default function MeScreen() {
  const { data: activeItems } = useInventoryItems({ sortMode: 'latest' });
  const { data: archivedItems } = useArchivedItems();
  const { data: categories } = useCategoriesWithCount();

  return (
    <LinearGradient colors={['#fff5f7', '#fefefe']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 130 }}>
        <View className="items-center pb-5 pt-6">
          <Text className="text-6xl">🎀</Text>
          <Text className="mt-3 text-3xl font-black text-stash-text">StashBox</Text>
          <Text className="mt-1 text-sm font-semibold text-stash-muted">你的私密小物管家</Text>
        </View>

        <View className="flex-row gap-3">
          <MiniStat label="在用物品" value={activeItems.length} />
          <MiniStat label="已归档" value={archivedItems.length} />
          <MiniStat label="分类数" value={categories.length} />
        </View>

        <View className="mt-6 rounded-stash bg-white p-4">
          <MenuRow label="归档物品" value={`${archivedItems.length} 个`} onPress={() => router.push('/archived')} />
          <MenuRow label="数据备份" value="Phase 2" />
          <MenuRow label="导入数据" value="Phase 2" />
          <MenuRow label="隐私说明" value="本地保存" />
          <MenuRow label="关于 StashBox" value="v0.1.0" last />
        </View>

        <View className="mt-6">
          <Text className="mb-3 text-lg font-black text-stash-text">分类管理</Text>
          <View className="rounded-stash bg-white p-4">
            {categories.map((category) => (
              <View key={category.id} className="flex-row items-center justify-between border-b border-[#f7e7ee] py-3">
                <Text className="text-base font-bold text-stash-text">
                  {category.icon} {category.name}
                </Text>
                <Text className="text-sm font-semibold text-stash-muted">{category.activeCount} 个</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 rounded-stash bg-white p-4">
      <Text className="text-2xl font-black text-stash-text">{value}</Text>
      <Text className="mt-1 text-xs font-bold text-stash-muted">{label}</Text>
    </View>
  );
}

function MenuRow({
  label,
  value,
  onPress,
  last,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const content = (
    <View className={`flex-row items-center justify-between py-4 ${last ? '' : 'border-b border-[#f7e7ee]'}`}>
      <Text className="text-base font-bold text-stash-text">{label}</Text>
      <Text className="text-sm font-semibold text-stash-muted">{value}</Text>
    </View>
  );

  return onPress ? <PressableScale onPress={onPress}>{content}</PressableScale> : content;
}
