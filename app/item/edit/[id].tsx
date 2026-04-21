import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { updateItem } from '@/db/repositories/itemRepository';
import { deleteLocalImages, persistImageUrisForItem } from '@/features/images/imageService';
import { ItemForm, itemToFormData } from '@/features/items/ItemForm';
import { useCategories, useItem } from '@/features/items/useItems';
import { useAppStore } from '@/store/useAppStore';
import type { ItemFormData } from '@/types/itemForm';

export default function EditItemScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, loading } = useItem(id);
  const { data: categories } = useCategories();
  const showToast = useAppStore((state) => state.showToast);
  const bumpRefreshToken = useAppStore((state) => state.bumpRefreshToken);

  const handleSubmit = async (data: ItemFormData) => {
    if (!item) return;

    const existingUris = data.images
      .filter((image) => image.state === 'existing')
      .map((image) => image.uri);
    const newUris = persistImageUrisForItem(
      item.id,
      data.images
        .filter((image) => image.state === 'new')
        .map((image) => ({ uri: image.uri })),
    );
    const imageLocalUris = [...existingUris, ...newUris];
    const removedUris = item.images
      .map((image) => image.localUri)
      .filter((uri) => !imageLocalUris.includes(uri));

    await updateItem(db, item.id, {
      ...data,
      imageLocalUris,
    });

    deleteLocalImages(removedUris);
    bumpRefreshToken();
    showToast('success', '保存成功');
    router.replace({ pathname: '/item/[id]', params: { id: item.id } });
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
    <View className="flex-1 bg-stash-bgFrom">
      <ItemForm
        categories={categories}
        initialValues={itemToFormData(item)}
        submitLabel="保存修改"
        onSubmit={handleSubmit}
      />
    </View>
  );
}
