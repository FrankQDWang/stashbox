import { useState } from 'react';
import { Image, Modal, Text, TextInput, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { ProgressBar } from '@/components/ProgressBar';
import { getExpiryLabel, getExpiryLevel, getExpiryText } from '@/domain/expiry';
import type { ItemWithImages } from '@/types/item';

interface ItemDetailProps {
  item: ItemWithImages;
  onEdit: () => void;
  onMarkOpened: () => void;
  onMarkUsedUp: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
  onUpdateRemaining: (value: number) => void;
}

const STATUS_LABELS: Record<ItemWithImages['status'], string> = {
  unopened: '未开封',
  opened: '已开封',
  used_up: '已用完',
  idle: '闲置',
};

export function ItemDetail({
  item,
  onEdit,
  onMarkOpened,
  onMarkUsedUp,
  onArchiveToggle,
  onDelete,
  onUpdateRemaining,
}: ItemDetailProps) {
  const [remainingPanelOpen, setRemainingPanelOpen] = useState(false);
  const [customRemaining, setCustomRemaining] = useState(String(item.remainingPercent));
  const expiryLevel = getExpiryLevel(item.computedDueDate);
  const firstImage = item.images[0]?.localUri;

  const submitRemaining = (value: number) => {
    onUpdateRemaining(value);
    setRemainingPanelOpen(false);
  };

  return (
    <View className="flex-1">
      <View className="overflow-hidden rounded-b-[32px] bg-[#fff0f5]">
        {firstImage ? (
          <Image source={{ uri: firstImage }} className="h-80 w-full" resizeMode="cover" />
        ) : (
          <View className="h-80 items-center justify-center">
            <Text className="text-8xl">{item.category?.icon ?? '✨'}</Text>
          </View>
        )}
      </View>

      <View className="px-5 py-5">
        <View className="flex-row items-start justify-between">
          <View className="min-w-0 flex-1">
            <Text className="text-3xl font-black text-stash-text">{item.name}</Text>
            <Text className="mt-2 text-sm font-semibold text-stash-muted">
              {item.category?.name ?? '未分类'} · {STATUS_LABELS[item.status]} · {getExpiryLabel(expiryLevel)}
            </Text>
          </View>
          <PressableScale onPress={onEdit} className="rounded-full bg-white px-4 py-2">
            <Text className="font-black text-stash-brandTo">编辑</Text>
          </PressableScale>
        </View>

        <View className="mt-6 rounded-stash bg-white p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-black text-stash-text">剩余量</Text>
            <Text className="font-black text-stash-text">{item.remainingPercent}%</Text>
          </View>
          <ProgressBar value={item.remainingPercent} expiryLevel={expiryLevel} />
        </View>

        <View className="mt-4 rounded-stash bg-white p-4">
          <Text className="text-base font-black text-stash-text">到期信息</Text>
          <Text className="mt-2 text-sm font-semibold leading-6 text-stash-muted">
            {item.computedDueDate ? `实际风险到期日：${item.computedDueDate}` : '暂未填写到期日期'}
          </Text>
          <Text className="text-sm font-semibold leading-6 text-stash-muted">
            {getExpiryText(item.computedDueDate)}
            {item.openDate ? ` · 开封：${item.openDate}` : ''}
          </Text>
        </View>

        <View className="mt-4 flex-row flex-wrap">
          {item.status !== 'opened' ? <ActionButton label="标记开封" onPress={onMarkOpened} /> : null}
          <ActionButton label="标记用完" onPress={onMarkUsedUp} />
          <ActionButton label="调整剩余量" onPress={() => setRemainingPanelOpen(true)} />
          <ActionButton label={item.isArchived ? '取消归档' : '归档'} onPress={onArchiveToggle} />
        </View>

        <View className="mt-4 rounded-stash bg-white p-4">
          <InfoLine label="品牌" value={item.brand} />
          <InfoLine label="系列" value={item.series} />
          <InfoLine label="色号/款式" value={item.shade} />
          <InfoLine label="购买日期" value={item.purchaseDate} />
          <InfoLine label="价格" value={item.purchasePrice ? `¥${item.purchasePrice}` : null} />
          <InfoLine label="渠道" value={item.purchaseChannel} />
          <InfoLine label="存放位置" value={item.storageLocation} />
          <InfoLine label="备注" value={item.notes} />
        </View>

        <PressableScale onPress={onDelete} className="mt-5 rounded-full border border-stash-expired py-3">
          <Text className="text-center font-black text-stash-expired">删除物品</Text>
        </PressableScale>
      </View>

      <Modal transparent animationType="fade" visible={remainingPanelOpen}>
        <View className="flex-1 justify-end bg-black/30">
          <View className="rounded-t-[28px] bg-white p-5">
            <Text className="text-xl font-black text-stash-text">调整剩余量</Text>
            <View className="mt-4 flex-row">
              {[75, 50, 25].map((value) => (
                <PressableScale
                  key={value}
                  onPress={() => submitRemaining(value)}
                  className="mr-3 flex-1 rounded-2xl bg-[#fff5f7] py-3"
                >
                  <Text className="text-center font-black text-stash-text">{value}%</Text>
                </PressableScale>
              ))}
            </View>
            <TextInput
              value={customRemaining}
              onChangeText={setCustomRemaining}
              keyboardType="number-pad"
              placeholder="自定义百分比"
              placeholderTextColor="#bca9b4"
              className="mt-4 rounded-2xl border border-stash-line px-4 py-3 text-stash-text"
            />
            <View className="mt-4 flex-row">
              <PressableScale
                onPress={() => setRemainingPanelOpen(false)}
                className="mr-3 flex-1 rounded-full bg-[#f5edf2] py-3"
              >
                <Text className="text-center font-black text-stash-muted">取消</Text>
              </PressableScale>
              <PressableScale
                onPress={() => submitRemaining(Number(customRemaining))}
                className="flex-1 rounded-full bg-stash-brandFrom py-3"
              >
                <Text className="text-center font-black text-white">确定</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} className="mb-3 mr-3 rounded-full bg-white px-4 py-3">
      <Text className="font-black text-stash-text">{label}</Text>
    </PressableScale>
  );
}

function InfoLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <View className="border-b border-[#f7e7ee] py-3">
      <Text className="text-xs font-bold text-stash-muted">{label}</Text>
      <Text className="mt-1 text-sm font-semibold text-stash-text">{value}</Text>
    </View>
  );
}
