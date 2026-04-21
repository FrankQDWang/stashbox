import { Text, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = '还没有录入宝贝呢',
  message = '快来录入你的囤货吧～再也不怕过期浪费啦',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="items-center justify-center px-8 py-14">
      <Text className="text-6xl">🎀</Text>
      <Text className="mt-5 text-center text-xl font-bold text-stash-text">{title}</Text>
      <Text className="mt-2 text-center text-sm leading-6 text-stash-muted">{message}</Text>
      {actionLabel && onAction ? (
        <PressableScale
          onPress={onAction}
          className="mt-6 rounded-full bg-stash-brandFrom px-6 py-3"
        >
          <Text className="font-bold text-white">{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}
