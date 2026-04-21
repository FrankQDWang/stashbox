import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { PressableScale } from '@/components/PressableScale';
import { createItem } from '@/db/repositories/itemRepository';
import { persistImageUrisForItem } from '@/features/images/imageService';
import { ItemForm } from '@/features/items/ItemForm';
import { useCategories } from '@/features/items/useItems';
import { useAppStore } from '@/store/useAppStore';
import { createItemId } from '@/utils/id';
import type { ItemFormData } from '@/types/itemForm';

export default function NewItemScreen() {
  const db = useSQLiteContext();
  const { data: categories } = useCategories();
  const showToast = useAppStore((state) => state.showToast);
  const bumpRefreshToken = useAppStore((state) => state.bumpRefreshToken);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (data: ItemFormData) => {
    const id = createItemId();
    const imageLocalUris = persistImageUrisForItem(
      id,
      data.images.map((image) => ({ uri: image.uri })),
    );
    const created = await createItem(db, {
      ...data,
      id,
      imageLocalUris,
    });

    bumpRefreshToken();
    setSavedId(created.id);
    showToast('success', '保存成功');
  };

  return (
    <View className="flex-1 bg-stash-bgFrom">
      <ItemForm key={formKey} categories={categories} submitLabel="保存宝贝" onSubmit={handleSubmit} />
      {savedId ? (
        <View className="absolute bottom-0 left-0 right-0 flex-row border-t border-stash-line bg-white p-4">
          <PressableScale
            onPress={() => {
              setSavedId(null);
              setFormKey((value) => value + 1);
            }}
            className="mr-3 flex-1 rounded-full bg-[#f5edf2] py-3"
          >
            <Text className="text-center font-black text-stash-muted">继续添加</Text>
          </PressableScale>
          <PressableScale
            onPress={() => router.replace({ pathname: '/item/[id]', params: { id: savedId } })}
            className="flex-1 rounded-full bg-stash-brandFrom py-3"
          >
            <Text className="text-center font-black text-white">查看详情</Text>
          </PressableScale>
        </View>
      ) : null}
    </View>
  );
}
