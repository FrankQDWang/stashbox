import { Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ItemCard } from '@/components/ItemCard';
import type { ItemWithImages } from '@/types/item';

interface ItemListProps {
  items: ItemWithImages[];
  onItemPress: (item: ItemWithImages) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function ItemList({ items, onItemPress, emptyTitle, emptyMessage }: ItemListProps) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <View>
      {items.map((item) => (
        <ItemCard key={item.id} item={item} onPress={() => onItemPress(item)} />
      ))}
      <Text className="pb-6 pt-2 text-center text-xs font-semibold text-stash-muted">
        共 {items.length} 个宝贝
      </Text>
    </View>
  );
}
