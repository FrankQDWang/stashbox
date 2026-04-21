import { useRef } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { ItemCard } from '@/components/ItemCard';
import { StatTile } from '@/components/StatTile';
import { useHomeData } from '@/features/items/useItems';
import type { ItemWithImages } from '@/types/item';

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const { data, loading, error } = useHomeData();
  const allRiskItems = [
    ...data.groups.expired,
    ...data.groups.urgent,
    ...data.groups.soon,
  ];

  const openItem = (item: ItemWithImages) => {
    router.push({ pathname: '/item/[id]', params: { id: item.id } });
  };

  return (
    <LinearGradient colors={['#fff5f7', '#fefefe']} style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 18, paddingBottom: 130 }}>
        <View className="pb-3 pt-4">
          <Text className="text-4xl font-black text-stash-text">StashBox</Text>
          <Text className="mt-2 text-base font-semibold text-stash-muted">
            今天也帮你守住每一个宝贝
          </Text>
        </View>

        <View className="mt-3 flex-row gap-3">
          <StatTile
            label="已过期"
            value={data.counts.expired}
            colors={['#ef5350', '#f48fb1']}
            onPress={() => scrollRef.current?.scrollTo({ y: 230, animated: true })}
          />
          <StatTile
            label="30天内"
            value={data.counts.dueWithin30Days}
            colors={['#ffa726', '#f48fb1']}
            onPress={() => scrollRef.current?.scrollTo({ y: 230, animated: true })}
          />
          <StatTile
            label="全部"
            value={data.counts.totalActive}
            colors={['#ce93d8', '#f48fb1']}
          />
        </View>

        {loading ? <ActivityIndicator className="mt-10" color="#ce93d8" /> : null}
        {error ? <Text className="mt-6 text-center font-semibold text-stash-expired">{error}</Text> : null}

        {!loading && allRiskItems.length === 0 ? (
          data.counts.totalActive === 0 ? (
            <EmptyState
              actionLabel="添加第一个物品"
              onAction={() => router.push('/item/new')}
            />
          ) : (
            <View className="mt-8 rounded-stash bg-white p-6">
              <Text className="text-center text-5xl">✨</Text>
              <Text className="mt-4 text-center text-xl font-black text-stash-text">
                所有宝贝都安全哦
              </Text>
            </View>
          )
        ) : null}

        <RiskSection title="已过期" items={data.groups.expired} onItemPress={openItem} />
        <RiskSection title="7天内到期" items={data.groups.urgent} onItemPress={openItem} />
        <RiskSection title="30天内到期" items={data.groups.soon} onItemPress={openItem} />
      </ScrollView>
    </LinearGradient>
  );
}

function RiskSection({
  title,
  items,
  onItemPress,
}: {
  title: string;
  items: ItemWithImages[];
  onItemPress: (item: ItemWithImages) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View className="mt-6">
      <Text className="mb-3 text-lg font-black text-stash-text">{title}</Text>
      {items.map((item) => (
        <ItemCard key={item.id} item={item} onPress={() => onItemPress(item)} />
      ))}
    </View>
  );
}
