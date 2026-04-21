import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { ItemList } from '@/features/items/ItemList';
import { useArchivedItems } from '@/features/items/useItems';

export default function ArchivedScreen() {
  const { data: items, loading, error } = useArchivedItems();

  return (
    <LinearGradient colors={['#fff5f7', '#fefefe']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 80 }}>
        {loading ? <ActivityIndicator className="mt-10" color="#ce93d8" /> : null}
        {error ? <Text className="mt-6 text-center font-semibold text-stash-expired">{error}</Text> : null}
        {!loading ? (
          <View>
            <ItemList
              items={items}
              onItemPress={(item) => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
              emptyTitle="还没有归档物品"
              emptyMessage="用完或暂时收起的宝贝会出现在这里"
            />
          </View>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}
