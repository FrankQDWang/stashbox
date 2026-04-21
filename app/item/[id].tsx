import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import {
  archiveItem,
  deleteItem,
  markItemOpened,
  markItemUsedUp,
  unarchiveItem,
  updateRemainingPercent,
} from '@/db/repositories/itemRepository';
import { deleteItemImageDirectory, deleteLocalImages } from '@/features/images/imageService';
import { ItemDetail } from '@/features/items/ItemDetail';
import { useItem } from '@/features/items/useItems';
import { useAppStore } from '@/store/useAppStore';
import { todayDateOnly } from '@/utils/date';

export default function ItemDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, loading, reload } = useItem(id);
  const showToast = useAppStore((state) => state.showToast);
  const bumpRefreshToken = useAppStore((state) => state.bumpRefreshToken);

  const runAction = async (action: () => Promise<void>, message: string) => {
    try {
      await action();
      bumpRefreshToken();
      reload();
      showToast('success', message);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '操作失败');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-stash-bgFrom">
        <ActivityIndicator color="#ce93d8" />
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-stash-bgFrom px-8">
        <Text className="text-center font-bold text-stash-muted">没有找到这个宝贝</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-stash-bgFrom" contentContainerStyle={{ paddingBottom: 40 }}>
      <ItemDetail
        item={item}
        onEdit={() => router.push({ pathname: '/item/edit/[id]', params: { id: item.id } })}
        onMarkOpened={() =>
          runAction(async () => {
            await markItemOpened(db, item.id, todayDateOnly());
          }, '已标记开封')
        }
        onMarkUsedUp={() =>
          runAction(async () => {
            await markItemUsedUp(db, item.id);
          }, '已标记用完')
        }
        onArchiveToggle={() =>
          runAction(async () => {
            if (item.isArchived) {
              await unarchiveItem(db, item.id);
            } else {
              await archiveItem(db, item.id);
            }
          }, item.isArchived ? '已取消归档' : '已归档')
        }
        onUpdateRemaining={(value) =>
          runAction(async () => {
            await updateRemainingPercent(db, item.id, value);
          }, '剩余量已更新')
        }
        onDelete={() => {
          Alert.alert('删除物品', '删除后无法恢复，确定要删除吗？', [
            { text: '取消', style: 'cancel' },
            {
              text: '删除',
              style: 'destructive',
              onPress: () => {
                void runAction(async () => {
                  const result = await deleteItem(db, item.id);
                  deleteLocalImages(result.deletedImageUris);
                  deleteItemImageDirectory(item.id);
                  router.replace('/(tabs)/inventory');
                }, '已删除');
              },
            },
          ]);
        }}
      />
    </ScrollView>
  );
}
