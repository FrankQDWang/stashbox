import { useState } from 'react';
import { Text, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View className="border-b border-stash-line py-4">
      <PressableScale onPress={() => setOpen((value) => !value)}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-black text-stash-text">{title}</Text>
          <Text className="text-lg font-black text-stash-brandTo">{open ? '−' : '＋'}</Text>
        </View>
      </PressableScale>
      {open ? <View className="mt-4">{children}</View> : null}
    </View>
  );
}
