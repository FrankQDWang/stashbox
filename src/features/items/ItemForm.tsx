import { useEffect } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, type Control, type Path, type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { CategoryChip } from '@/components/CategoryChip';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { DateField } from '@/components/DateField';
import { PressableScale } from '@/components/PressableScale';
import { getDefaultItemFormData, itemFormSchema, normalizeItemFormData } from '@/domain/validation';
import { pickImagesFromLibrary, takePhoto } from '@/features/images/imageService';
import { addYears, todayDateOnly } from '@/utils/date';
import { useAppStore } from '@/store/useAppStore';
import type { Category } from '@/types/category';
import type { ItemStatus, ItemWithImages } from '@/types/item';
import type { ItemFormData, ItemFormImage } from '@/types/itemForm';

interface ItemFormProps {
  categories: Category[];
  initialValues?: ItemFormData;
  submitLabel: string;
  onSubmit: (data: ItemFormData) => Promise<void>;
}

const STATUSES: { value: ItemStatus; label: string }[] = [
  { value: 'unopened', label: '未开封' },
  { value: 'opened', label: '已开封' },
  { value: 'idle', label: '闲置' },
];

export function ItemForm({ categories, initialValues, submitLabel, onSubmit }: ItemFormProps) {
  const showToast = useAppStore((state) => state.showToast);
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    defaultValues: initialValues ?? getDefaultItemFormData(),
    mode: 'onSubmit',
    resolver: zodResolver(itemFormSchema) as Resolver<ItemFormData>,
  });
  const status = watch('status');
  const images = watch('images');

  useEffect(() => {
    if (status === 'opened' && !watch('openDate')) {
      setValue('openDate', todayDateOnly(), { shouldDirty: true });
    }
  }, [setValue, status, watch]);

  const addLibraryImages = async () => {
    try {
      const picked = await pickImagesFromLibrary();
      const remainingSlots = Math.max(0, 3 - images.length);
      const nextImages: ItemFormImage[] = picked.slice(0, remainingSlots).map((asset) => ({
        uri: asset.uri,
        state: 'new',
      }));

      setValue('images', [...images, ...nextImages], { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '选择照片失败');
    }
  };

  const addCameraImage = async () => {
    try {
      if (images.length >= 3) {
        showToast('info', '最多添加 3 张照片');
        return;
      }

      const picked = await takePhoto();
      if (picked) {
        setValue(
          'images',
          [...images, { uri: picked.uri, state: 'new' }],
          { shouldDirty: true, shouldValidate: true },
        );
      }
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '拍照失败');
    }
  };

  const removeImageAt = (index: number) => {
    setValue(
      'images',
      images.filter((_, imageIndex) => imageIndex !== index),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="rounded-stash-lg bg-white px-4">
          <CollapsibleSection title="基本信息" defaultOpen>
            <Text className="mb-2 text-sm font-bold text-stash-text">照片</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {images.map((image, index) => (
                <View key={`${image.uri}-${index}`} className="mr-3">
                  <Image
                    source={{ uri: image.uri }}
                    className="h-20 w-20 rounded-2xl bg-[#fff0f5]"
                    resizeMode="cover"
                  />
                  <PressableScale
                    onPress={() => removeImageAt(index)}
                    className="absolute -right-2 -top-2 rounded-full bg-stash-expired px-2 py-1"
                  >
                    <Text className="text-xs font-black text-white">×</Text>
                  </PressableScale>
                </View>
              ))}
              <PressableScale
                onPress={addCameraImage}
                className="mr-3 h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-stash-brandFrom bg-[#fff7fa]"
              >
                <Text className="text-2xl">📷</Text>
                <Text className="mt-1 text-xs font-bold text-stash-muted">拍照</Text>
              </PressableScale>
              <PressableScale
                onPress={addLibraryImages}
                className="h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-stash-brandTo bg-[#fff7fa]"
              >
                <Text className="text-2xl">🖼️</Text>
                <Text className="mt-1 text-xs font-bold text-stash-muted">相册</Text>
              </PressableScale>
            </ScrollView>
            {errors.images?.message ? (
              <Text className="mb-3 text-xs font-semibold text-stash-expired">
                {errors.images.message}
              </Text>
            ) : null}

            <TextField control={control} name="name" label="物品名称" placeholder="例如：小棕瓶精华" />
            <ErrorText message={errors.name?.message} />

            <Text className="mb-2 text-sm font-bold text-stash-text">分类</Text>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <CategoryChip
                    label="不选"
                    selected={field.value === null}
                    onPress={() => field.onChange(null)}
                  />
                  {categories.map((category) => (
                    <CategoryChip
                      key={category.id}
                      label={category.name}
                      icon={category.icon}
                      selected={field.value === category.id}
                      onPress={() => field.onChange(category.id)}
                    />
                  ))}
                </ScrollView>
              )}
            />

            <Text className="mb-2 text-sm font-bold text-stash-text">使用状态</Text>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <View className="mb-4 flex-row rounded-2xl bg-[#fff5f7] p-1">
                  {STATUSES.map((entry) => (
                    <PressableScale
                      key={entry.value}
                      onPress={() => field.onChange(entry.value)}
                      className={`flex-1 rounded-xl py-3 ${
                        field.value === entry.value ? 'bg-white' : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`text-center text-sm font-black ${
                          field.value === entry.value ? 'text-stash-text' : 'text-stash-muted'
                        }`}
                      >
                        {entry.label}
                      </Text>
                    </PressableScale>
                  ))}
                </View>
              )}
            />
          </CollapsibleSection>

          <CollapsibleSection title="日期与保质期">
            <Controller
              control={control}
              name="expiryDate"
              render={({ field }) => (
                <DateField label="到期日期" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="openDate"
              render={({ field }) => (
                <DateField label="开封日期" value={field.value} onChange={field.onChange} />
              )}
            />
            <Text className="mb-2 text-sm font-bold text-stash-text">快捷选项</Text>
            <View className="mb-2 flex-row flex-wrap">
              <QuickButton
                label="未开封3年"
                onPress={() => setValue('expiryDate', addYears(todayDateOnly(), 3), { shouldDirty: true })}
              />
              {[12, 6, 3].map((months) => (
                <QuickButton
                  key={months}
                  label={`开封后${months}个月`}
                  onPress={() => setValue('afterOpenMonths', months, { shouldDirty: true })}
                />
              ))}
            </View>
            <Controller
              control={control}
              name="afterOpenMonths"
              render={({ field }) => (
                <NumberField
                  label="开封后保质期（月）"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="例如：12"
                />
              )}
            />
            <ErrorText message={errors.openDate?.message ?? errors.afterOpenMonths?.message} />
          </CollapsibleSection>

          <CollapsibleSection title="更多信息">
            <TextField control={control} name="brand" label="品牌" placeholder="例如：雅诗兰黛" />
            <TextField control={control} name="series" label="系列" placeholder="例如：小棕瓶" />
            <TextField control={control} name="shade" label="色号/款式" placeholder="例如：#02" />
            <Controller
              control={control}
              name="purchaseDate"
              render={({ field }) => (
                <DateField label="购买日期" value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="purchasePrice"
              render={({ field }) => (
                <NumberField
                  label="购买价格"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="例如：299"
                />
              )}
            />
            <TextField control={control} name="purchaseChannel" label="购买渠道" placeholder="例如：专柜" />
            <TextField control={control} name="storageLocation" label="存放位置" placeholder="例如：卧室抽屉" />
            <Controller
              control={control}
              name="repurchaseRating"
              render={({ field }) => (
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-bold text-stash-text">回购意愿</Text>
                  <View className="flex-row">
                    {[1, 2, 3, 4].map((rating) => (
                      <PressableScale
                        key={rating}
                        onPress={() => field.onChange(field.value === rating ? null : rating)}
                        className={`mr-2 rounded-full px-4 py-2 ${
                          field.value === rating ? 'bg-stash-brandTo' : 'bg-[#fff5f7]'
                        }`}
                      >
                        <Text
                          className={`font-black ${
                            field.value === rating ? 'text-white' : 'text-stash-muted'
                          }`}
                        >
                          {rating}
                        </Text>
                      </PressableScale>
                    ))}
                  </View>
                </View>
              )}
            />
            <Controller
              control={control}
              name="remainingPercent"
              render={({ field }) => (
                <NumberField
                  label="剩余量（%）"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="100"
                />
              )}
            />
            <TextField
              control={control}
              name="notes"
              label="备注"
              placeholder="想记录的使用感、位置或提醒"
              multiline
            />
          </CollapsibleSection>
        </View>

        <PressableScale
          disabled={isSubmitting}
          onPress={handleSubmit(async (data) => onSubmit(normalizeItemFormData(data)))}
          className="mt-6 rounded-full bg-stash-brandFrom py-4"
        >
          <Text className="text-center text-base font-black text-white">
            {isSubmitting ? '保存中...' : submitLabel}
          </Text>
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function itemToFormData(item: ItemWithImages): ItemFormData {
  return {
    name: item.name,
    categoryId: item.categoryId,
    brand: item.brand,
    series: item.series,
    shade: item.shade,
    status: item.status,
    remainingPercent: item.remainingPercent,
    purchaseDate: item.purchaseDate,
    purchasePrice: item.purchasePrice,
    purchaseChannel: item.purchaseChannel,
    expiryDate: item.expiryDate,
    openDate: item.openDate,
    afterOpenMonths: item.afterOpenMonths,
    storageLocation: item.storageLocation,
    repurchaseRating: item.repurchaseRating,
    favorite: item.favorite,
    notes: item.notes,
    images: item.images.map((image) => ({
      id: image.id,
      uri: image.localUri,
      state: 'existing',
    })),
  };
}

function TextField({
  control,
  name,
  label,
  placeholder,
  multiline,
}: {
  control: Control<ItemFormData>;
  name: Path<ItemFormData>;
  label: string;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <View className="mb-4">
          <Text className="mb-2 text-sm font-bold text-stash-text">{label}</Text>
          <TextInput
            value={typeof field.value === 'string' ? field.value : ''}
            onChangeText={field.onChange}
            placeholder={placeholder}
            placeholderTextColor="#bca9b4"
            multiline={multiline}
            className="rounded-2xl border border-stash-line bg-white px-4 py-3 text-stash-text"
            style={multiline ? { minHeight: 96, textAlignVertical: 'top' } : undefined}
          />
        </View>
      )}
    />
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder: string;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-stash-text">{label}</Text>
      <TextInput
        value={value === null ? '' : String(value)}
        onChangeText={(text) => onChange(text.trim() === '' ? null : Number(text))}
        placeholder={placeholder}
        placeholderTextColor="#bca9b4"
        keyboardType="decimal-pad"
        className="rounded-2xl border border-stash-line bg-white px-4 py-3 text-stash-text"
      />
    </View>
  );
}

function QuickButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} className="mb-2 mr-2 rounded-full bg-[#fff5f7] px-4 py-2">
      <Text className="text-sm font-black text-stash-text">{label}</Text>
    </PressableScale>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;

  return <Text className="-mt-2 mb-4 text-xs font-semibold text-stash-expired">{message}</Text>;
}
