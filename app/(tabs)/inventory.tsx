import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { CategoryChip } from '@/components/CategoryChip';
import { ItemList } from '@/features/items/ItemList';
import { useCategories, useInventoryItems } from '@/features/items/useItems';
import { useAppStore } from '@/store/useAppStore';

export default function InventoryScreen() {
  const search = useAppStore((state) => state.inventorySearch);
  const categoryId = useAppStore((state) => state.selectedCategoryId);
  const sortMode = useAppStore((state) => state.inventorySortMode);
  const setSearch = useAppStore((state) => state.setInventorySearch);
  const setCategoryId = useAppStore((state) => state.setSelectedCategoryId);
  const setSortMode = useAppStore((state) => state.setInventorySortMode);
  const { data: categories } = useCategories();
  const options = useMemo(
    () => ({
      searchQuery: search,
      categoryId,
      sortMode,
    }),
    [categoryId, search, sortMode],
  );
  const { data: items, loading, error } = useInventoryItems(options);

  return (
    <LinearGradient colors={['#fff5f7', '#fefefe']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <Text className="pt-4 text-3xl font-black text-stash-text">库存</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="搜索物品名称、品牌"
          placeholderTextColor="#bca9b4"
          className="mt-4 rounded-2xl border border-stash-line bg-white px-4 py-3 text-stash-text"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
          <CategoryChip label="全部" selected={categoryId === null} onPress={() => setCategoryId(null)} />
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              label={category.name}
              icon={category.icon}
              selected={categoryId === category.id}
              onPress={() => setCategoryId(category.id)}
            />
          ))}
        </ScrollView>

        <View className="mt-4 flex-row rounded-2xl bg-[#f7e7ee] p-1">
          <SortButton
            label="到期优先"
            selected={sortMode === 'due_first'}
            onPress={() => setSortMode('due_first')}
          />
          <SortButton
            label="最新录入"
            selected={sortMode === 'latest'}
            onPress={() => setSortMode('latest')}
          />
        </View>

        {loading ? <ActivityIndicator className="mt-10" color="#ce93d8" /> : null}
        {error ? <Text className="mt-6 text-center font-semibold text-stash-expired">{error}</Text> : null}
        {!loading ? (
          <View className="mt-5">
            <ItemList
              items={items}
              onItemPress={(item) => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
              emptyTitle="库存还是空的"
              emptyMessage="添加几件宝贝后，就能在这里搜索和筛选啦"
            />
          </View>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

function SortButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      className={`flex-1 rounded-xl py-3 text-center text-sm font-black ${
        selected ? 'bg-white text-stash-text' : 'text-stash-muted'
      }`}
    >
      {label}
    </Text>
  );
}
