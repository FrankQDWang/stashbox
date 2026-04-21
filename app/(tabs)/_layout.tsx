import { router, Tabs } from 'expo-router';
import { Text, View } from 'react-native';

import { FloatingAddButton } from '@/components/FloatingAddButton';

export default function TabsLayout() {
  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#ce93d8',
          tabBarInactiveTintColor: '#8f7b87',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#f3dce6',
            height: 82,
            paddingBottom: 24,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: '首页', tabBarIcon: () => <Text className="text-lg">💖</Text> }}
        />
        <Tabs.Screen
          name="inventory"
          options={{ title: '库存', tabBarIcon: () => <Text className="text-lg">🎀</Text> }}
        />
        <Tabs.Screen
          name="me"
          options={{ title: '我的', tabBarIcon: () => <Text className="text-lg">👧</Text> }}
        />
      </Tabs>
      <FloatingAddButton onPress={() => router.push('/item/new')} />
    </View>
  );
}
