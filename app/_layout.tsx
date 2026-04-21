import '../global.css';

import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ToastHost } from '@/components/ToastHost';
import { DATABASE_NAME } from '@/db/database';
import { migrateDbIfNeeded } from '@/db/migrations';

export const unstable_settings = {
  anchor: '(tabs)',
};

function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-stash-bgFrom">
      <ActivityIndicator color="#ce93d8" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Suspense fallback={<LoadingScreen />}>
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded} useSuspense>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: '#fff5f7' },
                headerTintColor: '#4a3742',
                headerTitleStyle: { fontWeight: '700' },
                contentStyle: { backgroundColor: '#fff5f7' },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="item/new" options={{ title: '添加宝贝', presentation: 'modal' }} />
              <Stack.Screen name="item/[id]" options={{ title: '宝贝详情' }} />
              <Stack.Screen name="item/edit/[id]" options={{ title: '编辑宝贝' }} />
              <Stack.Screen name="archived" options={{ title: '归档物品' }} />
            </Stack>
            <StatusBar style="dark" />
            <ToastHost />
          </SQLiteProvider>
        </Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
