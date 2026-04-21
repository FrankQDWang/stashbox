# StashBox Phase 1 Implementation Guide

> 文件目标位置：`docs/IMPLEMENTATION_GUIDE.md`  
> 依据：`docs/superpowers/specs/2026-04-21-stashbox-design.md`  
> 目标读者：Codex CLI / Claude Code / 熟悉 TypeScript 的 App 新手开发者  
> Phase 1 目标：2-3 天交付可在 iPhone Expo Go 运行的本地优先 MVP

---

## 0. 执行原则与最终技术补全

本文档只补全实现细节，不改变已锁定产品设计。

### 0.1 固定实现决策

- [补全] **Expo SDK 固定使用 SDK 54 项目**：截至 2026-04-21，Phase 1 交付目标是 iPhone Expo Go 扫码运行，初始化命令不使用 `--template default@sdk-55`。SDK 55 iOS Expo Go 正处于过渡期，物理 iPhone 的 App Store Expo Go 默认仍以 SDK 54 为主。后续升级 SDK 55/56 不属于 Phase 1。
- [补全] **NativeWind 使用 v4 配置方式**：使用 `tailwind.config.js`、`global.css`、`babel.config.js`、`metro.config.js`。不使用 NativeWind v5 preview 的 CSS-first 配置。
- [补全] **日期字段统一存 `YYYY-MM-DD`**：`purchase_date`、`expiry_date`、`open_date`、`computed_due_date` 都存 date-only 字符串，避免 `toISOString()` 在 iOS/时区下产生前后一天偏移。`created_at`、`updated_at` 仍存完整 ISO datetime。
- [补全] **SQLite 使用 async API + `SQLiteProvider`**：根布局注入数据库，repository 函数显式接收 `SQLiteDatabase`。不用同步 API 执行业务读写，避免阻塞 JS 线程。
- [补全] **Migration 使用 `PRAGMA user_version`**：Phase 1 只有首版 schema，用 SQLite 内置版本足够；不新增 migration 表。
- [补全] **不引入 React Query**：技术栈未锁定 React Query。列表数据通过 SQLite repository 读取，Zustand 只保存 UI filter、sort、toast、refresh token。
- [补全] **Toast 自己实现**：不用 `react-native-toast-message`，减少依赖。用 Zustand + `Animated` 实现轻量 `ToastHost`。
- [补全] **图片存储使用 `expo-file-system` 新 API**：使用 `Directory`、`File`、`Paths.document`。不使用会在新 SDK 中 runtime throw 的 legacy `copyAsync`。
- [补全] **ID 使用 `nanoid/non-secure`**：React Native 环境中避免额外引入 crypto polyfill。所有 ID 前缀化，便于调试。
- [补全] **Phase 1 不支持暗色模式**：`app.json` 锁定 `userInterfaceStyle: "light"`，UI 不写 dark class。

---

## 1. 环境初始化与依赖配置

### 1.1 本地前置环境

开发机安装：

- Node.js 20 LTS 或 22 LTS
- npm 10+
- iPhone 安装 Expo Go
- VS Code / Cursor / Windsurf 任一编辑器

中国大陆网络环境先执行：

```bash
npm config set registry https://registry.npmmirror.com
```

恢复官方源命令：

```bash
npm config set registry https://registry.npmjs.org
```

### 1.2 创建 Expo 项目

在目标父目录执行：

```bash
npx create-expo-app@latest stashbox --yes
cd stashbox
```

不要传 `--template default@sdk-55`。Phase 1 要保证物理 iPhone Expo Go 可扫。

清理模板示例代码：

```bash
npm run reset-project
```

创建项目目录：

```bash
mkdir -p app/(tabs) app/item/edit src/components src/db/repositories src/domain src/features/items src/features/images src/store src/types src/utils
```

如果 shell 对括号报错，使用：

```bash
mkdir -p "app/(tabs)" "app/item/edit" src/components src/db/repositories src/domain src/features/items src/features/images src/store src/types src/utils
```

### 1.3 安装 dependencies

Expo / React Native 原生模块必须用 `npx expo install`，让 Expo CLI 选择与当前 SDK 匹配的版本。

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npx expo install expo-sqlite expo-image-picker expo-file-system expo-linear-gradient @react-native-community/datetimepicker
npx expo install react-native-reanimated react-native-gesture-handler
npm install nativewind zustand react-hook-form @hookform/resolvers zod dayjs nanoid
```

说明：

- `expo-router`、`react-native-safe-area-context`、`react-native-screens` 通常已随默认模板安装；再次执行 `expo install` 会校准版本。
- `react-native-reanimated` 是 NativeWind peer dependency；Phase 1 动画仍优先使用 React Native 内置 `Animated`，不直接写 Reanimated 动画逻辑。
- `@react-native-community/datetimepicker` 在 Expo Go 中可用，用于日期选择。

### 1.4 安装 devDependencies

```bash
npm install --save-dev tailwindcss@^3.4.17 prettier-plugin-tailwindcss@^0.5.11 babel-preset-expo jest-expo @types/jest
```

初始化 Tailwind 配置：

```bash
npx tailwindcss init
```

### 1.5 `package.json` 关键字段

确保存在：

```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "ios": "expo start --ios",
    "android": "expo start --android",
    "web": "expo start --web",
    "lint": "expo lint",
    "test": "jest --watchAll=false"
  },
  "jest": {
    "preset": "jest-expo",
    "testMatch": ["**/*.test.ts"]
  }
}
```

### 1.6 `tsconfig.json`

完整配置：

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts",
    "nativewind-env.d.ts"
  ]
}
```

### 1.7 `app.json`

使用 `app.json`，不要改成 `app.config.ts`。Phase 1 不需要环境变量驱动配置。

```json
{
  "expo": {
    "name": "StashBox",
    "slug": "stashbox",
    "scheme": "stashbox",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#fff5f7"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.local.stashbox",
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "StashBox 需要访问相册，用于为物品添加照片。",
        "NSCameraUsageDescription": "StashBox 需要使用相机，用于拍摄物品照片。"
      }
    },
    "android": {
      "package": "com.local.stashbox"
    },
    "plugins": [
      "expo-router",
      "expo-sqlite",
      [
        "expo-image-picker",
        {
          "photosPermission": "StashBox 需要访问相册，用于为物品添加照片。",
          "cameraPermission": "StashBox 需要使用相机，用于拍摄物品照片。",
          "microphonePermission": false
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "web": {
      "bundler": "metro"
    }
  }
}
```

[补全] Expo Go 使用的是 Expo Go 自己的原生壳，`Info.plist` 权限文案不会完全按本项目配置展示；这不影响 Phase 1 扫码运行。配置仍保留，方便以后 development build / EAS build 直接复用。

### 1.8 NativeWind / Tailwind 配置

#### `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        stash: {
          brandFrom: '#f48fb1',
          brandTo: '#ce93d8',
          expired: '#ef5350',
          urgent: '#ffa726',
          soon: '#f9a825',
          safe: '#ce93d8',
          unknown: '#bdbdbd',
          unopened: '#66bb6a',
          bgFrom: '#fff5f7',
          bgTo: '#fefefe',
          card: '#ffffff',
          text: '#4a3742',
          muted: '#8f7b87',
          line: '#f3dce6',
        },
      },
      borderRadius: {
        stash: '16px',
        'stash-lg': '24px',
      },
      boxShadow: {
        soft: '0 6px 16px rgba(244, 143, 177, 0.18)',
      },
    },
  },
  plugins: [],
};
```

#### `global.css`

项目根目录创建：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### `babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

#### `metro.config.js`

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

#### `nativewind-env.d.ts`

项目根目录创建：

```typescript
/// <reference types="nativewind/types" />
```

文件名必须是 `nativewind-env.d.ts`，不要命名为 `nativewind.d.ts`。

### 1.9 Expo Router 根布局

#### `app/_layout.tsx`

```tsx
import '../global.css';

import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { migrateDbIfNeeded } from '@/db/migrations';
import { ToastHost } from '@/components/ToastHost';

function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-stash-bgFrom">
      <ActivityIndicator />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Suspense fallback={<LoadingScreen />}>
          <SQLiteProvider
            databaseName="stashbox.db"
            onInit={migrateDbIfNeeded}
            useSuspense
          >
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
            <ToastHost />
          </SQLiteProvider>
        </Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

#### `app/(tabs)/_layout.tsx`

```tsx
import { Tabs, router } from 'expo-router';
import { View } from 'react-native';

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
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: '首页', tabBarIcon: () => null }} />
        <Tabs.Screen name="inventory" options={{ title: '库存', tabBarIcon: () => null }} />
        <Tabs.Screen name="me" options={{ title: '我的', tabBarIcon: () => null }} />
      </Tabs>
      <FloatingAddButton onPress={() => router.push('/item/new')} />
    </View>
  );
}
```

后续实现中用 emoji 自定义 tab label 时，可以把 `tabBarIcon` 换成 `<Text>💖</Text>`；Phase 1 不引入 icon 库。

### 1.10 版本兼容注意事项

- 固定以 `npx expo install` 安装 Expo / React Native 原生相关依赖。
- 不安装需要自定义 native code 的库。
- 不使用 NativeWind v5 preview。
- 不使用 Expo Router alpha native tabs。使用稳定的 JavaScript Tabs。
- 不使用本地通知、推送、后台任务、CloudBase、Firebase、Supabase。

---

## 2. SQLite 数据库层实现细节

### 2.1 初始化方式

使用：

```tsx
<SQLiteProvider databaseName="stashbox.db" onInit={migrateDbIfNeeded} useSuspense>
```

Repository 中通过页面或 hook 的 `useSQLiteContext()` 获取 db，再把 db 显式传给 repository 函数。

```typescript
import { useSQLiteContext } from 'expo-sqlite';

const db = useSQLiteContext();
```

### 2.2 同步 API vs 异步 API

- 业务代码全部使用 `getFirstAsync`、`getAllAsync`、`runAsync`、`execAsync`、`withExclusiveTransactionAsync`。
- 不使用 `openDatabaseSync`、`getAllSync`、`runSync` 执行业务读写。
- 唯一允许同步的是 `expo-file-system` 新 API 的轻量本地文件复制/删除，因为图片数量 Phase 1 限制为 3 张。

### 2.3 数据库文件名和存储位置

- 文件名：`stashbox.db`
- 位置：Expo SQLite 默认数据库目录，由 `SQLiteProvider` 管理。
- 图片不写入 SQLite blob；SQLite 只存 `item_images.local_uri`。

### 2.4 Migration 机制

使用 `PRAGMA user_version`。

#### `src/db/database.ts`

```typescript
export const DATABASE_NAME = 'stashbox.db';
export const DATABASE_VERSION = 1;
```

#### `src/db/migrations.ts`

```typescript
import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION } from '@/db/database';
import { seedDefaultCategories } from '@/db/seed';

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
  `);

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category_id TEXT,
          brand TEXT,
          series TEXT,
          shade TEXT,
          status TEXT NOT NULL DEFAULT 'unopened',
          remaining_percent INTEGER DEFAULT 100,
          purchase_date TEXT,
          purchase_price REAL,
          purchase_channel TEXT,
          expiry_date TEXT,
          open_date TEXT,
          after_open_months INTEGER,
          computed_due_date TEXT,
          storage_location TEXT,
          repurchase_rating INTEGER,
          notes TEXT,
          is_archived INTEGER DEFAULT 0,
          favorite INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (category_id) REFERENCES categories(id)
        );

        CREATE TABLE IF NOT EXISTS item_images (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          local_uri TEXT NOT NULL,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
        CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
        CREATE INDEX IF NOT EXISTS idx_items_due_date ON items(computed_due_date);
        CREATE INDEX IF NOT EXISTS idx_items_archived ON items(is_archived);
        CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at);

        PRAGMA user_version = 1;
      `);
    });
  }

  await seedDefaultCategories(db);
}
```

### 2.5 种子数据插入时机与幂等性

每次 app 启动、migration 完成后调用 `seedDefaultCategories(db)`。使用固定 ID + `INSERT OR IGNORE` 保证幂等。

#### `src/db/seed.ts`

```typescript
import type { SQLiteDatabase } from 'expo-sqlite';

const DEFAULT_CATEGORIES = [
  { id: 'cat_skincare', name: '护肤', icon: '🧴', sortOrder: 0 },
  { id: 'cat_makeup', name: '彩妆', icon: '💄', sortOrder: 1 },
  { id: 'cat_perfume', name: '香水', icon: '🌸', sortOrder: 2 },
  { id: 'cat_haircare', name: '美发', icon: '💇‍♀️', sortOrder: 3 },
  { id: 'cat_bodycare', name: '身体护理', icon: '🛁', sortOrder: 4 },
  { id: 'cat_jewelry', name: '首饰', icon: '💍', sortOrder: 5 },
  { id: 'cat_accessory', name: '饰品', icon: '🎀', sortOrder: 6 },
  { id: 'cat_bag_accessory', name: '包包配件', icon: '👜', sortOrder: 7 },
  { id: 'cat_clothing_small', name: '服饰小件', icon: '👗', sortOrder: 8 },
  { id: 'cat_supplies', name: '囤货耗材', icon: '📦', sortOrder: 9 },
  { id: 'cat_other', name: '其他', icon: '✨', sortOrder: 10 },
] as const;

export async function seedDefaultCategories(db: SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const category of DEFAULT_CATEGORIES) {
      await txn.runAsync(
        `
        INSERT OR IGNORE INTO categories (id, name, icon, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?)
        `,
        category.id,
        category.name,
        category.icon,
        category.sortOrder,
        now,
      );
    }
  });
}
```

### 2.6 Repository 数据映射规则

SQLite 表字段使用 snake_case，TypeScript 类型使用 camelCase。所有 repository 出口都返回 camelCase。

布尔字段映射：

- SQLite `is_archived INTEGER`：`0 | 1`
- TypeScript `isArchived boolean`
- SQLite `favorite INTEGER`：`0 | 1`
- TypeScript `favorite boolean`

空值规则：

- repository 入库时把 `undefined` 转成 `null`
- repository 出库时把 SQLite `null` 保持为 TypeScript `null`
- 表单层可以用 `undefined`；domain / repository 层统一为 `null`

### 2.7 `itemRepository` 类型与函数签名

#### `src/db/repositories/itemRepository.ts` 类型

```typescript
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Item, ItemImage, ItemStatus, ItemWithImages } from '@/types/item';
import type { ItemFormData } from '@/types/itemForm';

export type InventorySortMode = 'due_first' | 'latest';

export interface ListItemsOptions {
  searchQuery?: string;
  categoryId?: string | null;
  sortMode: InventorySortMode;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface DashboardCounts {
  expired: number;
  dueWithin30Days: number;
  totalActive: number;
}

export interface CreateItemInput extends Omit<ItemFormData, 'images'> {
  id?: string;
  imageLocalUris: string[];
}

export interface UpdateItemInput extends Partial<Omit<ItemFormData, 'images'>> {
  imageLocalUris?: string[];
}

export interface QuickUpdateResult {
  item: ItemWithImages;
}
```

#### 函数列表

```typescript
export async function getItemById(
  db: SQLiteDatabase,
  id: string,
): Promise<ItemWithImages | null>;

export async function listItems(
  db: SQLiteDatabase,
  options: ListItemsOptions,
): Promise<ItemWithImages[]>;

export async function listHomeRiskItems(
  db: SQLiteDatabase,
  today: string,
): Promise<ItemWithImages[]>;

export async function listArchivedItems(
  db: SQLiteDatabase,
): Promise<ItemWithImages[]>;

export async function getDashboardCounts(
  db: SQLiteDatabase,
  today: string,
): Promise<DashboardCounts>;

export async function createItem(
  db: SQLiteDatabase,
  input: CreateItemInput,
): Promise<ItemWithImages>;

export async function updateItem(
  db: SQLiteDatabase,
  id: string,
  input: UpdateItemInput,
): Promise<ItemWithImages>;

export async function deleteItem(
  db: SQLiteDatabase,
  id: string,
): Promise<{ deletedImageUris: string[] }>;

export async function archiveItem(
  db: SQLiteDatabase,
  id: string,
): Promise<ItemWithImages>;

export async function unarchiveItem(
  db: SQLiteDatabase,
  id: string,
): Promise<ItemWithImages>;

export async function markItemOpened(
  db: SQLiteDatabase,
  id: string,
  openDate: string,
): Promise<ItemWithImages>;

export async function markItemUsedUp(
  db: SQLiteDatabase,
  id: string,
): Promise<ItemWithImages>;

export async function updateRemainingPercent(
  db: SQLiteDatabase,
  id: string,
  remainingPercent: number,
): Promise<ItemWithImages>;

export async function addItemImage(
  db: SQLiteDatabase,
  itemId: string,
  localUri: string,
  sortOrder: number,
): Promise<ItemImage>;

export async function replaceItemImages(
  db: SQLiteDatabase,
  itemId: string,
  imageLocalUris: string[],
): Promise<{ insertedImages: ItemImage[]; removedImageUris: string[] }>;

export async function deleteItemImage(
  db: SQLiteDatabase,
  imageId: string,
): Promise<{ removedImageUri: string | null }>;
```

### 2.8 `itemRepository` SQL 要点

#### `getItemById`

```sql
SELECT * FROM items WHERE id = ? LIMIT 1;
SELECT * FROM item_images WHERE item_id = ? ORDER BY sort_order ASC, created_at ASC;
```

#### `listItems`

基础条件：

```sql
WHERE is_archived = ?
```

搜索条件：

```sql
AND (
  LOWER(name) LIKE ?
  OR LOWER(COALESCE(brand, '')) LIKE ?
)
```

分类条件：

```sql
AND category_id = ?
```

到期优先排序：

```sql
ORDER BY
  CASE WHEN computed_due_date IS NULL THEN 1 ELSE 0 END ASC,
  computed_due_date ASC,
  created_at DESC
```

最新录入排序：

```sql
ORDER BY created_at DESC
```

图片加载：先取 item rows，再用 `IN` 查询图片。

```sql
SELECT * FROM item_images
WHERE item_id IN (?, ?, ?)
ORDER BY item_id ASC, sort_order ASC, created_at ASC;
```

#### `listHomeRiskItems`

`today` 和 `soonBoundary` 都是 `YYYY-MM-DD`。

```sql
SELECT * FROM items
WHERE is_archived = 0
  AND computed_due_date IS NOT NULL
  AND computed_due_date <= ?
ORDER BY computed_due_date ASC, created_at DESC;
```

参数：`soonBoundary = addMonthsOrDays(today, 30 days)`，由 domain/date util 生成。

#### `getDashboardCounts`

```sql
SELECT
  SUM(CASE WHEN computed_due_date IS NOT NULL AND computed_due_date < ? THEN 1 ELSE 0 END) AS expired,
  SUM(CASE WHEN computed_due_date IS NOT NULL AND computed_due_date >= ? AND computed_due_date <= ? THEN 1 ELSE 0 END) AS dueWithin30Days,
  COUNT(*) AS totalActive
FROM items
WHERE is_archived = 0;
```

参数顺序：`today, today, soonBoundary`。

解释：`dueWithin30Days` 不包含已过期；首页仍单独有“已过期”卡片。

#### `createItem`

写入前先计算：

```typescript
const computedDueDate = computeDueDate({
  expiryDate: input.expiryDate,
  openDate: input.openDate,
  afterOpenMonths: input.afterOpenMonths,
});
```

事务内执行：

```sql
INSERT INTO items (
  id, name, category_id, brand, series, shade, status,
  remaining_percent, purchase_date, purchase_price, purchase_channel,
  expiry_date, open_date, after_open_months, computed_due_date,
  storage_location, repurchase_rating, notes,
  is_archived, favorite, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
```

随后按顺序插入图片：

```sql
INSERT INTO item_images (id, item_id, local_uri, sort_order, created_at)
VALUES (?, ?, ?, ?, ?);
```

#### `updateItem`

流程：

1. 查询当前 item。
2. 将 `current + input` 合并。
3. 如果合并后 `status === 'opened'` 且原本不是 `opened` 且 `openDate` 为空，填入今天。
4. 重算 `computed_due_date`。
5. 更新 item。
6. 如果 `imageLocalUris` 存在，调用 `replaceItemImages`。
7. 返回最新 `getItemById`。

SQL：

```sql
UPDATE items SET
  name = ?,
  category_id = ?,
  brand = ?,
  series = ?,
  shade = ?,
  status = ?,
  remaining_percent = ?,
  purchase_date = ?,
  purchase_price = ?,
  purchase_channel = ?,
  expiry_date = ?,
  open_date = ?,
  after_open_months = ?,
  computed_due_date = ?,
  storage_location = ?,
  repurchase_rating = ?,
  notes = ?,
  favorite = ?,
  updated_at = ?
WHERE id = ?;
```

#### `deleteItem`

事务前先查图片 URI：

```sql
SELECT local_uri FROM item_images WHERE item_id = ?;
```

事务中删除 item：

```sql
DELETE FROM items WHERE id = ?;
```

由于 `item_images` 外键 `ON DELETE CASCADE`，图片记录自动删除。事务后返回 `deletedImageUris` 给 image service 删除本地文件。

#### 快捷操作 SQL

标记开封：

```sql
UPDATE items SET
  status = 'opened',
  open_date = ?,
  computed_due_date = ?,
  updated_at = ?
WHERE id = ?;
```

标记用完：

```sql
UPDATE items SET
  status = 'used_up',
  remaining_percent = 0,
  updated_at = ?
WHERE id = ?;
```

调整剩余量：

```sql
UPDATE items SET
  remaining_percent = ?,
  updated_at = ?
WHERE id = ?;
```

归档：

```sql
UPDATE items SET
  is_archived = 1,
  updated_at = ?
WHERE id = ?;
```

取消归档：

```sql
UPDATE items SET
  is_archived = 0,
  updated_at = ?
WHERE id = ?;
```

### 2.9 `categoryRepository` 函数签名

```typescript
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, CategoryWithCount } from '@/types/category';

export async function listCategories(db: SQLiteDatabase): Promise<Category[]>;

export async function getCategoryById(
  db: SQLiteDatabase,
  id: string,
): Promise<Category | null>;

export async function listCategoriesWithActiveCount(
  db: SQLiteDatabase,
): Promise<CategoryWithCount[]>;

export async function countCategories(db: SQLiteDatabase): Promise<number>;
```

SQL：

```sql
SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC;
```

```sql
SELECT * FROM categories WHERE id = ? LIMIT 1;
```

```sql
SELECT
  c.*,
  COUNT(i.id) AS active_count
FROM categories c
LEFT JOIN items i
  ON i.category_id = c.id
  AND i.is_archived = 0
GROUP BY c.id
ORDER BY c.sort_order ASC, c.created_at ASC;
```

### 2.10 `app_settings` repository

Phase 1 只预留，不做页面。实现最小函数，供未来版本和测试使用。

```typescript
export async function getSetting(
  db: SQLiteDatabase,
  key: string,
): Promise<string | null>;

export async function setSetting(
  db: SQLiteDatabase,
  key: string,
  value: string,
): Promise<void>;
```

SQL：

```sql
SELECT value FROM app_settings WHERE key = ? LIMIT 1;
```

```sql
INSERT INTO app_settings (key, value, updated_at)
VALUES (?, ?, ?)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = excluded.updated_at;
```

### 2.11 `computed_due_date` 更新时机

必须在以下操作中重算：

- `createItem`
- `updateItem`
- `markItemOpened`

不需要重算：

- `markItemUsedUp`
- `updateRemainingPercent`
- `archiveItem`
- `unarchiveItem`
- `replaceItemImages`

重算只依赖：

- `expiry_date`
- `open_date`
- `after_open_months`

### 2.12 事务策略

必须使用 `withExclusiveTransactionAsync` 的操作：

- migration 建表和建索引
- seed 默认分类
- create item + images
- update item + replace images
- replace item images
- delete item

单条 UPDATE 可以不包事务：

- mark opened
- mark used up
- update remaining percent
- archive / unarchive

文件删除不放进 SQLite 事务。数据库成功后再删除本地图片文件；删除失败记录 `console.warn`，不回滚数据库。

---

## 3. TypeScript 类型定义

### 3.1 基础类型

#### `src/types/common.ts`

```typescript
export type ISODateString = string; // YYYY-MM-DD
export type ISODateTimeString = string; // new Date().toISOString()
```

### 3.2 Item 类型

#### `src/types/item.ts`

```typescript
import type { ISODateString, ISODateTimeString } from '@/types/common';

export type ItemStatus = 'unopened' | 'opened' | 'used_up' | 'idle';

export type ExpiryLevel = 'expired' | 'urgent' | 'soon' | 'safe' | 'unknown';

export interface Item {
  id: string;
  name: string;
  categoryId: string | null;
  brand: string | null;
  series: string | null;
  shade: string | null;
  status: ItemStatus;
  remainingPercent: number;
  purchaseDate: ISODateString | null;
  purchasePrice: number | null;
  purchaseChannel: string | null;
  expiryDate: ISODateString | null;
  openDate: ISODateString | null;
  afterOpenMonths: number | null;
  computedDueDate: ISODateString | null;
  storageLocation: string | null;
  repurchaseRating: 1 | 2 | 3 | 4 | null;
  notes: string | null;
  isArchived: boolean;
  favorite: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface ItemImage {
  id: string;
  itemId: string;
  localUri: string;
  sortOrder: number;
  createdAt: ISODateTimeString;
}

export interface ItemWithImages extends Item {
  images: ItemImage[];
}

export interface AppSetting {
  key: string;
  value: string;
  updatedAt: ISODateTimeString;
}
```

### 3.3 Category 类型

#### `src/types/category.ts`

```typescript
import type { ISODateTimeString } from '@/types/common';

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  createdAt: ISODateTimeString;
}

export interface CategoryWithCount extends Category {
  activeCount: number;
}
```

### 3.4 Form 类型

#### `src/types/itemForm.ts`

```typescript
import type { ISODateString } from '@/types/common';
import type { ItemStatus } from '@/types/item';

export type ItemFormImageState = 'existing' | 'new';

export interface ItemFormImage {
  id?: string;
  uri: string;
  state: ItemFormImageState;
  sortOrder: number;
}

export interface ItemFormData {
  name: string;
  categoryId: string | null;
  brand: string;
  series: string;
  shade: string;
  status: ItemStatus;
  remainingPercent: number;
  purchaseDate: ISODateString | null;
  purchasePrice: string;
  purchaseChannel: string;
  expiryDate: ISODateString | null;
  openDate: ISODateString | null;
  afterOpenMonths: number | null;
  storageLocation: string;
  repurchaseRating: 1 | 2 | 3 | 4 | null;
  favorite: boolean;
  notes: string;
  images: ItemFormImage[];
}
```

### 3.5 `ItemFormData` vs `Item`

| 维度 | `ItemFormData` | `Item` |
|---|---|---|
| 用途 | UI 表单输入 | 数据库记录 / 页面展示 |
| 字段命名 | camelCase | camelCase |
| `id` | 无 | 必有 |
| `computedDueDate` | 无 | 必有，可为 null |
| `createdAt/updatedAt` | 无 | 必有 |
| 字符串可选字段 | 空字符串 | `null` |
| `purchasePrice` | 字符串，方便 TextInput | number 或 null |
| `images` | 包含 existing/new 状态 | `ItemImage[]` |

表单提交前必须 normalize：

```typescript
function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalPrice(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
```

### 3.6 Zod schema

#### `src/domain/validation.ts`

```typescript
import { z } from 'zod';

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

export const itemStatusSchema = z.union([
  z.literal('unopened'),
  z.literal('opened'),
  z.literal('used_up'),
  z.literal('idle'),
]);

export const itemFormSchema = z
  .object({
    name: z.string().trim().min(1, '请填写物品名称').max(80, '名称最多 80 个字'),
    categoryId: z.string().nullable(),
    brand: z.string().max(50, '品牌最多 50 个字'),
    series: z.string().max(50, '系列最多 50 个字'),
    shade: z.string().max(50, '色号/款式最多 50 个字'),
    status: itemStatusSchema,
    remainingPercent: z.number().int().min(0).max(100),
    purchaseDate: dateOnlySchema,
    purchasePrice: z
      .string()
      .trim()
      .refine((value) => value === '' || /^\d+(\.\d{1,2})?$/.test(value), '价格格式不正确'),
    purchaseChannel: z.string().max(80, '购买渠道最多 80 个字'),
    expiryDate: dateOnlySchema,
    openDate: dateOnlySchema,
    afterOpenMonths: z.number().int().min(1).max(120).nullable(),
    storageLocation: z.string().max(80, '存放位置最多 80 个字'),
    repurchaseRating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable(),
    favorite: z.boolean(),
    notes: z.string().max(1000, '备注最多 1000 个字'),
    images: z
      .array(
        z.object({
          id: z.string().optional(),
          uri: z.string().min(1),
          state: z.union([z.literal('existing'), z.literal('new')]),
          sortOrder: z.number().int().min(0),
        }),
      )
      .max(3, 'Phase 1 最多添加 3 张图片'),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'opened' && !data.openDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['openDate'],
        message: '已开封物品需要开封日期',
      });
    }
  });

export type ItemFormSchemaData = z.infer<typeof itemFormSchema>;
```

---

## 4. 领域逻辑完整实现规范

### 4.1 日期工具策略

- 使用 `dayjs`。
- 不自己手写月份进位逻辑。
- 所有 date-only 比较先 `.startOf('day')`。
- 输出 `YYYY-MM-DD`。

#### `src/utils/date.ts`

```typescript
import dayjs from 'dayjs';

import type { ISODateString } from '@/types/common';

export type DateInput = string | Date;

export function toDateOnly(input: DateInput): ISODateString {
  return dayjs(input).format('YYYY-MM-DD');
}

export function todayDateOnly(): ISODateString {
  return toDateOnly(new Date());
}

export function addDays(input: DateInput, days: number): ISODateString {
  return dayjs(input).add(days, 'day').format('YYYY-MM-DD');
}
```

### 4.2 `src/domain/expiry.ts`

完整导出函数：

```typescript
import dayjs from 'dayjs';

import type { ISODateString } from '@/types/common';
import type { ExpiryLevel } from '@/types/item';

type DateInput = string | Date | null | undefined;

function parseDay(input: DateInput): dayjs.Dayjs | null {
  if (!input) return null;
  const parsed = dayjs(input);
  return parsed.isValid() ? parsed.startOf('day') : null;
}

export function diffInDays(from: DateInput, to: DateInput): number | null {
  const fromDay = parseDay(from);
  const toDay = parseDay(to);
  if (!fromDay || !toDay) return null;
  return toDay.diff(fromDay, 'day');
}

export function addMonths(input: DateInput, months: number): ISODateString | null {
  const day = parseDay(input);
  if (!day || !Number.isInteger(months) || months <= 0) return null;
  return day.add(months, 'month').format('YYYY-MM-DD');
}

export function minDate(dates: DateInput[]): ISODateString | null {
  const validDates = dates
    .map(parseDay)
    .filter((value): value is dayjs.Dayjs => value !== null)
    .sort((a, b) => a.valueOf() - b.valueOf());

  return validDates[0]?.format('YYYY-MM-DD') ?? null;
}

export interface ComputeDueDateInput {
  expiryDate?: ISODateString | null;
  openDate?: ISODateString | null;
  afterOpenMonths?: number | null;
}

export function computeDueDate(input: ComputeDueDateInput): ISODateString | null {
  const candidates: ISODateString[] = [];

  if (parseDay(input.expiryDate)) {
    candidates.push(input.expiryDate as ISODateString);
  }

  if (input.openDate && input.afterOpenMonths) {
    const afterOpenDueDate = addMonths(input.openDate, input.afterOpenMonths);
    if (afterOpenDueDate) candidates.push(afterOpenDueDate);
  }

  return minDate(candidates);
}

export function getExpiryLevel(
  dueDate?: ISODateString | null,
  today: DateInput = new Date(),
): ExpiryLevel {
  const days = diffInDays(today, dueDate);
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'soon';
  return 'safe';
}

export function getExpiryText(
  dueDate?: ISODateString | null,
  today: DateInput = new Date(),
): string {
  const days = diffInDays(today, dueDate);
  if (days === null) return '无到期';
  if (days < 0) return `已过期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  return `${days} 天后到期`;
}

export function isRiskExpiryLevel(level: ExpiryLevel): boolean {
  return level === 'expired' || level === 'urgent' || level === 'soon';
}

export function getExpiryColor(level: ExpiryLevel): string {
  switch (level) {
    case 'expired':
      return '#ef5350';
    case 'urgent':
      return '#ffa726';
    case 'soon':
      return '#f9a825';
    case 'safe':
      return '#ce93d8';
    case 'unknown':
      return '#bdbdbd';
    default:
      return '#bdbdbd';
  }
}
```

### 4.3 `src/domain/sorting.ts`

```typescript
import type { ItemWithImages } from '@/types/item';
import { getExpiryLevel } from '@/domain/expiry';

export type HomeRiskGroups = {
  expired: ItemWithImages[];
  urgent: ItemWithImages[];
  soon: ItemWithImages[];
};

export type InventorySortMode = 'due_first' | 'latest';

export function sortItemsByDueDate(items: ItemWithImages[]): ItemWithImages[] {
  return [...items].sort((a, b) => {
    if (!a.computedDueDate && !b.computedDueDate) return b.createdAt.localeCompare(a.createdAt);
    if (!a.computedDueDate) return 1;
    if (!b.computedDueDate) return -1;
    const dueCompare = a.computedDueDate.localeCompare(b.computedDueDate);
    if (dueCompare !== 0) return dueCompare;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function sortItemsByLatest(items: ItemWithImages[]): ItemWithImages[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function sortInventoryItems(
  items: ItemWithImages[],
  mode: InventorySortMode,
): ItemWithImages[] {
  return mode === 'latest' ? sortItemsByLatest(items) : sortItemsByDueDate(items);
}

export function groupHomeRiskItems(
  items: ItemWithImages[],
  today: string,
): HomeRiskGroups {
  const groups: HomeRiskGroups = { expired: [], urgent: [], soon: [] };

  for (const item of sortItemsByDueDate(items)) {
    const level = getExpiryLevel(item.computedDueDate, today);
    if (level === 'expired') groups.expired.push(item);
    if (level === 'urgent') groups.urgent.push(item);
    if (level === 'soon') groups.soon.push(item);
  }

  return groups;
}
```

### 4.4 `src/domain/validation.ts` 额外导出

除 zod schema 外，导出 normalize 函数：

```typescript
import type { ItemFormData } from '@/types/itemForm';

export interface NormalizedItemFormData {
  name: string;
  categoryId: string | null;
  brand: string | null;
  series: string | null;
  shade: string | null;
  status: ItemFormData['status'];
  remainingPercent: number;
  purchaseDate: string | null;
  purchasePrice: number | null;
  purchaseChannel: string | null;
  expiryDate: string | null;
  openDate: string | null;
  afterOpenMonths: number | null;
  storageLocation: string | null;
  repurchaseRating: 1 | 2 | 3 | 4 | null;
  favorite: boolean;
  notes: string | null;
}

export function normalizeItemFormData(data: ItemFormData): NormalizedItemFormData {
  return {
    name: data.name.trim(),
    categoryId: data.categoryId,
    brand: data.brand.trim() || null,
    series: data.series.trim() || null,
    shade: data.shade.trim() || null,
    status: data.status,
    remainingPercent: data.remainingPercent,
    purchaseDate: data.purchaseDate,
    purchasePrice: data.purchasePrice.trim() ? Number(data.purchasePrice.trim()) : null,
    purchaseChannel: data.purchaseChannel.trim() || null,
    expiryDate: data.expiryDate,
    openDate: data.openDate,
    afterOpenMonths: data.afterOpenMonths,
    storageLocation: data.storageLocation.trim() || null,
    repurchaseRating: data.repurchaseRating,
    favorite: data.favorite,
    notes: data.notes.trim() || null,
  };
}
```

### 4.5 Domain 测试用例清单

#### `expiry.test.ts`

| 输入 | 期望 |
|---|---|
| `getExpiryLevel(null, '2026-04-21')` | `'unknown'` |
| `getExpiryLevel('2026-04-20', '2026-04-21')` | `'expired'` |
| `getExpiryLevel('2026-04-21', '2026-04-21')` | `'urgent'` |
| `getExpiryLevel('2026-04-28', '2026-04-21')` | `'urgent'` |
| `getExpiryLevel('2026-04-29', '2026-04-21')` | `'soon'` |
| `getExpiryLevel('2026-05-21', '2026-04-21')` | `'soon'` |
| `getExpiryLevel('2026-05-22', '2026-04-21')` | `'safe'` |
| `computeDueDate({ expiryDate: '2027-01-01' })` | `'2027-01-01'` |
| `computeDueDate({ openDate: '2026-04-21', afterOpenMonths: 12 })` | `'2027-04-21'` |
| expiry=`2027-01-01`, open+12=`2027-04-21` | `'2027-01-01'` |
| expiry=`2028-01-01`, open+6=`2026-10-21` | `'2026-10-21'` |
| all missing | `null` |
| `addMonths('2026-01-31', 1)` | `'2026-02-28'` |
| `diffInDays('2026-04-21', '2026-04-20')` | `-1` |

#### `sorting.test.ts`

| 输入 | 期望 |
|---|---|
| due dates `2026-04-22`, `2026-04-21` | `2026-04-21` 在前 |
| due date `null` 与非 null | null 排最后 |
| due date 相同，createdAt 后的在前 | 最新 createdAt 在前 |
| latest sort | createdAt 倒序 |
| groupHomeRiskItems | expired/urgent/soon 分组正确 |

#### `validation.test.ts`

| 输入 | 期望 |
|---|---|
| name 为空 | invalid |
| name 空格 | invalid |
| name 正常 | valid |
| purchasePrice `12.34` | valid |
| purchasePrice `12.345` | invalid |
| remainingPercent -1 | invalid |
| remainingPercent 101 | invalid |
| images 4 张 | invalid |
| status opened 且 openDate null | invalid |

---

## 5. 图片处理完整链路

### 5.1 Phase 1 图片规则

- 最多 3 张图。
- 支持拍照和相册。
- 不做云上传。
- 不把图片写入 SQLite blob。
- 添加/编辑保存成功后，图片复制到 app document directory。
- 删除 item 时同步删除本地图片文件。
- 归档 item 时不删除图片。

### 5.2 Image Picker 参数

#### 相册选择

```typescript
import * as ImagePicker from 'expo-image-picker';

export async function pickImagesFromLibrary(): Promise<ImagePicker.ImagePickerAsset[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 3,
    orderedSelection: true,
    allowsEditing: false,
    quality: 0.75,
    base64: false,
    exif: false,
    shouldDownloadFromNetwork: true,
  });

  if (result.canceled) return [];
  return result.assets;
}
```

#### 拍照

```typescript
export async function takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    cameraType: ImagePicker.CameraType.back,
    allowsEditing: false,
    quality: 0.75,
    base64: false,
    exif: false,
  });

  if (result.canceled) return null;
  return result.assets[0] ?? null;
}
```

[补全] `expo-image-picker` 不提供“按最大边长输出”的直接参数。Phase 1 不引入 `expo-image-manipulator`，尺寸控制采用：`quality: 0.75`、最多 3 张、单图文件大小超过 8MB 时拒绝并 toast。

### 5.3 本地图片目录结构

使用：

```text
Paths.document/images/{itemId}/{imageId}.{ext}
```

示例：

```text
file:///.../Documents/images/item_abcd1234/img_x9k2p1m0.jpg
```

### 5.4 文件命名规则

- item id：`item_${nanoid(12)}`
- image id：`img_${nanoid(12)}`
- 文件名：`${imageId}.${ext}`
- 扩展名从 `mimeType` / `fileName` / `uri` 推断，失败时用 `jpg`

### 5.5 `src/utils/id.ts`

```typescript
import { nanoid } from 'nanoid/non-secure';

export function createItemId(): string {
  return `item_${nanoid(12)}`;
}

export function createImageId(): string {
  return `img_${nanoid(12)}`;
}

export function createSettingId(): string {
  return `setting_${nanoid(12)}`;
}
```

### 5.6 `src/features/images/imageService.ts`

```typescript
import { Directory, File, Paths } from 'expo-file-system';
import type * as ImagePicker from 'expo-image-picker';

import { createImageId } from '@/utils/id';

const MAX_IMAGE_COUNT = 3;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function ensureItemImageDirectory(itemId: string): Directory {
  const root = new Directory(Paths.document, 'images');
  if (!root.exists) root.create({ intermediates: true });

  const itemDir = new Directory(root, itemId);
  if (!itemDir.exists) itemDir.create({ intermediates: true });

  return itemDir;
}

function inferExtension(asset: Pick<ImagePicker.ImagePickerAsset, 'mimeType' | 'fileName' | 'uri'>): string {
  if (asset.mimeType?.includes('png')) return 'png';
  if (asset.mimeType?.includes('heic')) return 'heic';
  if (asset.mimeType?.includes('webp')) return 'webp';

  const fromFileName = asset.fileName?.split('.').pop()?.toLowerCase();
  if (fromFileName && fromFileName.length <= 5) return fromFileName;

  const fromUri = asset.uri.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (fromUri && fromUri.length <= 5) return fromUri;

  return 'jpg';
}

export function validatePickedAssets(assets: ImagePicker.ImagePickerAsset[]): string | null {
  if (assets.length > MAX_IMAGE_COUNT) return `最多只能添加 ${MAX_IMAGE_COUNT} 张图片`;

  for (const asset of assets) {
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      return '单张图片不能超过 8MB';
    }
  }

  return null;
}

export function persistPickedImagesForItem(
  itemId: string,
  assets: ImagePicker.ImagePickerAsset[],
): string[] {
  const errorMessage = validatePickedAssets(assets);
  if (errorMessage) throw new Error(errorMessage);

  const itemDir = ensureItemImageDirectory(itemId);

  return assets.map((asset) => {
    const imageId = createImageId();
    const ext = inferExtension(asset);
    const source = new File(asset.uri);
    const destination = new File(itemDir, `${imageId}.${ext}`);

    source.copy(destination);
    return destination.uri;
  });
}

export function deleteLocalImage(localUri: string): void {
  try {
    const file = new File(localUri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Failed to delete local image:', localUri, error);
  }
}

export function deleteLocalImages(localUris: string[]): void {
  for (const uri of localUris) {
    deleteLocalImage(uri);
  }
}

export function deleteItemImageDirectory(itemId: string): void {
  try {
    const dir = new Directory(Paths.document, 'images', itemId);
    if (dir.exists) dir.delete();
  } catch (error) {
    console.warn('Failed to delete item image directory:', itemId, error);
  }
}
```

### 5.7 保存链路

#### 新增 item

1. Form 内图片是 `state: 'new'` 的临时 URI。
2. 提交时先生成 `itemId`。
3. 调用 `persistPickedImagesForItem(itemId, newAssets)` 得到持久化 `localUri[]`。
4. 调用 `createItem(db, { id: itemId, ...normalizedData, imageLocalUris })`。
5. repository 事务内插入 item + image rows。
6. store bump refresh token。

#### 编辑 item

1. 表单保留 existing images。
2. 新选图片先存在表单中。
3. 保存时复制 new images。
4. 构造完整 `imageLocalUris`，顺序等于用户看到的顺序。
5. `updateItem(db, id, { ...normalizedData, imageLocalUris })`。
6. repository 返回 `removedImageUris`。
7. 调用 `deleteLocalImages(removedImageUris)`。

#### 删除 item

1. `deleteItem(db, id)` 返回全部图片 URI。
2. 数据库删除成功后调用 `deleteLocalImages(deletedImageUris)`。
3. 再调用 `deleteItemImageDirectory(id)` 清理空目录。

---

## 6. 状态管理设计

### 6.1 Zustand 存什么

Zustand 只存跨页面 UI 状态和轻量事件：

- `inventorySearchQuery`
- `inventoryCategoryId`
- `inventorySortMode`
- `refreshToken`
- `toast`
- `lastCreatedItemId`

不存完整 items 列表，不把 SQLite 数据复制到全局 store。

### 6.2 `src/store/useAppStore.ts`

```typescript
import { create } from 'zustand';

import type { InventorySortMode } from '@/db/repositories/itemRepository';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastState {
  id: string;
  kind: ToastKind;
  message: string;
}

interface AppStoreState {
  inventorySearchQuery: string;
  inventoryCategoryId: string | null;
  inventorySortMode: InventorySortMode;
  refreshToken: number;
  toast: ToastState | null;
  lastCreatedItemId: string | null;

  setInventorySearchQuery: (query: string) => void;
  setInventoryCategoryId: (categoryId: string | null) => void;
  setInventorySortMode: (mode: InventorySortMode) => void;
  bumpRefreshToken: () => void;
  showToast: (kind: ToastKind, message: string) => void;
  clearToast: () => void;
  setLastCreatedItemId: (id: string | null) => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  inventorySearchQuery: '',
  inventoryCategoryId: null,
  inventorySortMode: 'due_first',
  refreshToken: 0,
  toast: null,
  lastCreatedItemId: null,

  setInventorySearchQuery: (query) => set({ inventorySearchQuery: query }),
  setInventoryCategoryId: (categoryId) => set({ inventoryCategoryId: categoryId }),
  setInventorySortMode: (mode) => set({ inventorySortMode: mode }),
  bumpRefreshToken: () => set((state) => ({ refreshToken: state.refreshToken + 1 })),
  showToast: (kind, message) =>
    set({ toast: { id: `${Date.now()}`, kind, message } }),
  clearToast: () => set({ toast: null }),
  setLastCreatedItemId: (id) => set({ lastCreatedItemId: id }),
}));
```

### 6.3 数据流

```text
UI 页面 / 组件
  → 调用 feature hook action
  → hook 调用 repository(db, input)
  → repository 执行 SQLite
  → hook 调用 imageService 处理本地文件
  → hook 调用 bumpRefreshToken()
  → 页面 useEffect / useFocusEffect 监听 refreshToken 重新读取 SQLite
```

### 6.4 `useItems` hook 结构

#### `src/features/items/useItems.ts`

```typescript
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { listItems, type ListItemsOptions } from '@/db/repositories/itemRepository';
import type { ItemWithImages } from '@/types/item';
import { useAppStore } from '@/store/useAppStore';

export function useInventoryItems(options: ListItemsOptions) {
  const db = useSQLiteContext();
  const refreshToken = useAppStore((state) => state.refreshToken);
  const [items, setItems] = useState<ItemWithImages[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const nextItems = await listItems(db, options);
      setItems(nextItems);
    } finally {
      setLoading(false);
    }
  }, [db, options.searchQuery, options.categoryId, options.sortMode, options.includeArchived, refreshToken]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { items, loading, reload };
}
```

实现时把 `options` 拆成 primitive dependencies，避免对象引用导致重复请求。

### 6.5 列表刷新策略

所有会改变 item/category 可见数据的操作完成后必须调用：

```typescript
useAppStore.getState().bumpRefreshToken();
```

需要触发刷新：

- 新增 item
- 编辑 item
- 删除 item
- 标记开封
- 标记用完
- 调整剩余量
- 归档 / 取消归档
- 替换图片

不需要触发刷新：

- 修改搜索框文本本身，因为 inventory page 直接监听 search query
- toast 显示/隐藏

### 6.6 React Context

需要 React Context：

- SQLite 使用 `SQLiteProvider`。

不需要额外自建 DatabaseContext。

---

## 7. 每个页面的组件拆分和数据流

### 7.1 `app/(tabs)/index.tsx` 首页

子组件：

- `StatTile`
- `ItemList`
- `ItemCard`
- `EmptyState`
- `GradientScreen`

数据来源：

- `getDashboardCounts(db, today)`
- `listHomeRiskItems(db, today)`
- `groupHomeRiskItems(items, today)`

用户操作：

- 点击统计卡片：`ScrollView.scrollTo({ y: sectionOffset })`
- 点击物品卡片：跳转详情
- 点击空状态按钮：跳转添加页

导航：

```typescript
router.push({ pathname: '/item/[id]', params: { id: item.id } });
router.push('/item/new');
```

加载策略：

- `useFocusEffect` 中读取 dashboard + risk list。
- 监听 `refreshToken`。

### 7.2 `app/(tabs)/inventory.tsx` 库存

子组件：

- `SearchBar`
- `CategoryChip`
- `SortToggle`
- `ItemList`
- `ItemCard`
- `EmptyState`

数据来源：

- categories：`listCategories(db)`
- items：`listItems(db, { searchQuery, categoryId, sortMode, includeArchived: false })`
- filters：Zustand

用户操作：

- 搜索输入：`setInventorySearchQuery(text)`
- 分类 chip：`setInventoryCategoryId(categoryIdOrNull)`
- 排序切换：`setInventorySortMode('due_first' | 'latest')`
- 点击物品：详情页

导航：

```typescript
router.push({ pathname: '/item/[id]', params: { id: item.id } });
```

### 7.3 `app/(tabs)/me.tsx` 我的

子组件：

- `ProfileHeader`
- `OverviewCard`
- `MenuRow`
- `CategoryPreviewList`

数据来源：

- active count：`getDashboardCounts(db, today).totalActive`
- archived count：`listArchivedItems(db)` 后取 length，或实现 `countArchivedItems(db)`
- category count：`countCategories(db)`
- category list：`listCategoriesWithActiveCount(db)`

用户操作：

- 点击归档物品：跳转归档列表
- 点击分类管理：展开/收起默认分类列表；不跳新页面
- 点击隐私说明：本页内弹出简单说明卡片
- 点击关于：本页内弹出简单说明卡片

导航：

```typescript
router.push('/archived');
```

[补全] 设计文档页面清单只有 7 个文件，没有分类管理独立页。Phase 1 分类管理在 `me.tsx` 内展示默认分类列表，不新增 route。

### 7.4 `app/item/new.tsx` 添加物品

子组件：

- `ItemForm`
- `SaveSuccessBar`

数据来源：

- categories：`listCategories(db)`
- form default：`getDefaultItemFormData()`

用户操作：

- 保存：
  1. `itemFormSchema` 校验
  2. 生成 item id
  3. 持久化图片
  4. `createItem`
  5. `showToast('success', '保存成功啦')`
  6. `setLastCreatedItemId(newItem.id)`
  7. 显示底部成功栏
- 继续添加：重置表单，清空图片，隐藏成功栏
- 查看详情：跳转详情页

导航：

```typescript
router.replace({ pathname: '/item/[id]', params: { id: createdItem.id } });
```

继续添加不导航。

### 7.5 `app/item/edit/[id].tsx` 编辑物品

子组件：

- `ItemForm`

数据来源：

- item：`getItemById(db, id)`
- categories：`listCategories(db)`
- defaultValues：`mapItemToFormData(item)`

用户操作：

- 保存：
  1. 校验
  2. 持久化新增图片
  3. `updateItem(db, id, input)`
  4. 删除被移除图片文件
  5. `showToast('success', '修改已保存')`
  6. `router.replace({ pathname: '/item/[id]', params: { id } })`

导航：

```typescript
router.replace({ pathname: '/item/[id]', params: { id } });
```

### 7.6 `app/item/[id].tsx` 物品详情

子组件：

- `ItemDetailHero`
- `ProgressBar`
- `ExpiryInfoCard`
- `QuickActionGrid`
- `RemainingSheet`

数据来源：

- `getItemById(db, id)`

用户操作：

- 编辑：跳转编辑页
- 标记开封：`markItemOpened(db, id, today)`
- 标记用完：`markItemUsedUp(db, id)`
- 调整剩余量：打开 bottom sheet；确认后 `updateRemainingPercent(db, id, value)`
- 归档：`archiveItem(db, id)` 后 `router.back()`
- 删除：Phase 1 详情页可以放在编辑页或详情页底部；确认后 `deleteItem` + 删除文件 + `router.replace('/(tabs)/inventory')`

导航：

```typescript
router.push({ pathname: '/item/edit/[id]', params: { id } });
router.replace('/(tabs)/inventory');
```

每个快捷操作完成后：

```typescript
showToast('success', '已更新');
bumpRefreshToken();
await reloadItem();
```

### 7.7 `app/archived.tsx` 归档列表

子组件：

- `ItemList`
- `ItemCard`
- `EmptyState`

数据来源：

- `listArchivedItems(db)`

用户操作：

- 点击卡片：详情页
- 在详情页可取消归档

导航：

```typescript
router.push({ pathname: '/item/[id]', params: { id: item.id } });
```

---

## 8. 表单实现细节

### 8.1 `useForm` 配置

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { itemFormSchema } from '@/domain/validation';
import type { ItemFormData } from '@/types/itemForm';

export function useItemForm(defaultValues: ItemFormData) {
  return useForm<ItemFormData>({
    defaultValues,
    resolver: zodResolver(itemFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
}
```

### 8.2 默认值

```typescript
export function getDefaultItemFormData(): ItemFormData {
  return {
    name: '',
    categoryId: null,
    brand: '',
    series: '',
    shade: '',
    status: 'unopened',
    remainingPercent: 100,
    purchaseDate: null,
    purchasePrice: '',
    purchaseChannel: '',
    expiryDate: null,
    openDate: null,
    afterOpenMonths: null,
    storageLocation: '',
    repurchaseRating: null,
    favorite: false,
    notes: '',
    images: [],
  };
}
```

### 8.3 状态切换自动填充 openDate

在 `ItemForm` 中：

```typescript
const status = watch('status');
const openDate = watch('openDate');

useEffect(() => {
  if (status === 'opened' && !openDate) {
    setValue('openDate', todayDateOnly(), { shouldDirty: true, shouldValidate: true });
  }
}, [status, openDate, setValue]);
```

### 8.4 折叠区域实现

使用简单 state + `LayoutAnimation`。

```tsx
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((value) => !value);
  }

  return (
    <View className="mb-3 rounded-stash bg-white p-4 shadow-sm">
      <Pressable onPress={toggle} className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-stash-text">{title}</Text>
        <Text className="text-lg text-stash-muted">{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      {open ? <View className="mt-4">{children}</View> : null}
    </View>
  );
}
```

### 8.5 分类 Chip 选择器

- 单选。
- 默认不选。
- 点击已选中的分类会取消选择。

```tsx
interface CategoryChipProps {
  label: string;
  icon?: string | null;
  selected: boolean;
  onPress: () => void;
}

export function CategoryChip({ label, icon, selected, onPress }: CategoryChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'mr-2 mb-2 rounded-full border px-3 py-2',
        selected ? 'border-stash-brandTo bg-stash-brandTo/15' : 'border-stash-line bg-white',
      ].join(' ')}
    >
      <Text className={selected ? 'font-semibold text-stash-brandTo' : 'text-stash-muted'}>
        {icon ? `${icon} ` : ''}{label}
      </Text>
    </Pressable>
  );
}
```

在 form 中：

```typescript
setValue('categoryId', selected ? null : category.id, { shouldDirty: true });
```

### 8.6 日期选择器

使用 `@react-native-community/datetimepicker`。

```tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { toDateOnly } from '@/utils/date';

interface DateFieldProps {
  label: string;
  value: string | null;
  maximumDate?: Date;
  onChange: (value: string | null) => void;
}

export function DateField({ label, value, maximumDate, onChange }: DateFieldProps) {
  const [visible, setVisible] = useState(false);
  const selectedDate = value ? new Date(`${value}T00:00:00`) : new Date();

  return (
    <View className="mb-3">
      <Text className="mb-1 text-sm font-semibold text-stash-text">{label}</Text>
      <Pressable
        onPress={() => setVisible(true)}
        className="rounded-stash border border-stash-line bg-white px-4 py-3"
      >
        <Text className={value ? 'text-stash-text' : 'text-stash-muted'}>
          {value ?? '请选择日期'}
        </Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade">
        <View className="flex-1 justify-end bg-black/30">
          <View className="rounded-t-stash-lg bg-white p-4">
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              maximumDate={maximumDate}
              onChange={(_, date) => {
                if (date) onChange(toDateOnly(date));
              }}
            />
            <View className="mt-3 flex-row gap-3">
              <Pressable className="flex-1 rounded-full bg-stash-line py-3" onPress={() => onChange(null)}>
                <Text className="text-center font-semibold text-stash-muted">清空</Text>
              </Pressable>
              <Pressable className="flex-1 rounded-full bg-stash-brandTo py-3" onPress={() => setVisible(false)}>
                <Text className="text-center font-semibold text-white">完成</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
```

使用规则：

- `purchaseDate.maximumDate = new Date()`
- `openDate.maximumDate = new Date()`
- `expiryDate` 不设置 maximum/minimum，允许录入已过期物品

### 8.7 快捷选项按钮

```typescript
function applyShelfLifePreset(type: 'unopened_3y' | 'open_12m' | 'open_6m' | 'open_3m') {
  const today = todayDateOnly();

  if (type === 'unopened_3y') {
    setValue('expiryDate', addMonths(today, 36), { shouldDirty: true, shouldValidate: true });
    return;
  }

  const months = type === 'open_12m' ? 12 : type === 'open_6m' ? 6 : 3;
  setValue('afterOpenMonths', months, { shouldDirty: true, shouldValidate: true });

  if (watch('status') === 'opened' && !watch('openDate')) {
    setValue('openDate', today, { shouldDirty: true, shouldValidate: true });
  }
}
```

按钮文案：

- `未开封3年`
- `开封后12个月`
- `开封后6个月`
- `开封后3个月`

---

## 9. NativeWind 样式实现

### 9.1 全局样式文件

`global.css` 只放 Tailwind 三行指令，不写业务 CSS。

### 9.2 自定义颜色 token

所有颜色从 `tailwind.config.js` 的 `theme.extend.colors.stash` 读取。

推荐 class：

- 背景：`bg-stash-bgFrom`
- 卡片：`bg-stash-card`
- 主文字：`text-stash-text`
- 次文字：`text-stash-muted`
- 分割线：`border-stash-line`
- 到期色：通过 `getExpiryColor(level)` 动态 style 写入，不用拼 class

### 9.3 渐变背景

NativeWind 不负责渐变。统一使用 `expo-linear-gradient`。

```tsx
import { LinearGradient } from 'expo-linear-gradient';

export function GradientScreen({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={['#fff5f7', '#fefefe']} className="flex-1">
      {children}
    </LinearGradient>
  );
}
```

统计卡片和浮动按钮也使用 `LinearGradient`：

```tsx
<LinearGradient
  colors={['#f48fb1', '#ce93d8'] as const}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  className="rounded-stash-lg p-4"
>
  {children}
</LinearGradient>
```

### 9.4 圆角与阴影统一 class

- 卡片：`rounded-stash bg-white shadow-sm`
- 大卡片 / hero：`rounded-stash-lg bg-white shadow-sm`
- 按钮：`rounded-full`
- 页面 padding：`px-4 pt-4`
- 列表间距：`gap-3`

React Native 阴影在 Android/iOS 上表现不同。Phase 1 使用 `shadow-sm` + 浅色边框：

```tsx
<View className="rounded-stash border border-stash-line bg-white p-4 shadow-sm" />
```

### 9.5 暗色模式

Phase 1 不支持暗色模式：

- `app.json`：`"userInterfaceStyle": "light"`
- 不使用 `dark:` class
- 不读取 `useColorScheme`

---

## 10. 动画和交互反馈

### 10.1 浮动按钮呼吸动画

使用 React Native 内置 `Animated.loop` + `Animated.sequence`。

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text } from 'react-native';

interface FloatingAddButtonProps {
  onPress: () => void;
}

export function FloatingAddButton({ onPress }: FloatingAddButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [scale]);

  return (
    <Animated.View
      style={{ transform: [{ scale }] }}
      className="absolute bottom-24 right-5 z-50"
    >
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="添加物品">
        <LinearGradient
          colors={['#f48fb1', '#ce93d8'] as const}
          className="h-16 w-16 items-center justify-center rounded-full shadow-sm"
        >
          <Text className="text-3xl text-white">＋</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
```

### 10.2 卡片点击缩放反馈

封装 `PressableScale`。

```tsx
import { useRef } from 'react';
import { Animated, Pressable, type PressableProps } from 'react-native';

interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
}

export function PressableScale({ children, onPress, ...props }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function animate(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  }

  return (
    <Pressable
      {...props}
      onPress={onPress}
      onPressIn={() => animate(0.98)}
      onPressOut={() => animate(1)}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}
```

### 10.3 Toast 实现

不使用第三方库。`ToastHost` 监听 Zustand `toast`。

```tsx
import { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

export function ToastHost() {
  const toast = useAppStore((state) => state.toast);
  const clearToast = useAppStore((state) => state.clearToast);
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;

    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 40, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => clearToast());
    }, 1600);

    return () => clearTimeout(timer);
  }, [toast?.id, clearToast, opacity, translateY]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{ opacity, transform: [{ translateY }] }}
      className="absolute bottom-28 left-6 right-6 z-[100] rounded-full bg-stash-text px-4 py-3"
    >
      <Text className="text-center font-semibold text-white">{toast.message}</Text>
    </Animated.View>
  );
}
```

### 10.4 折叠区域展开动画

使用 `LayoutAnimation.Presets.easeInEaseOut`。不引入 Reanimated。

---

## 11. Expo Go 兼容性检查

| 依赖 | 用途 | Expo Go 可用 | 是否需要 development build | 处理方式 |
|---|---|---:|---:|---|
| `expo` | App 框架 | 是 | 否 | create-expo-app 安装 |
| `expo-router` | 文件路由 | 是 | 否 | `expo install` |
| `expo-sqlite` | 本地数据库 | 是 | 否 | `SQLiteProvider` |
| `expo-image-picker` | 相机/相册 | 是 | 否 | 权限在调用时请求 |
| `expo-file-system` | 本地图片文件 | 是 | 否 | 使用新 API |
| `expo-linear-gradient` | 渐变 UI | 是 | 否 | 统计卡片/背景/按钮 |
| `@react-native-community/datetimepicker` | 日期选择 | 是 | 否 | `expo install` |
| `react-native-reanimated` | NativeWind peer | 是 | 否 | 只作为依赖，不写复杂动画 |
| `react-native-safe-area-context` | 安全区 | 是 | 否 | Root provider |
| `react-native-screens` | 导航性能 | 是 | 否 | Expo Router 依赖 |
| `react-native-gesture-handler` | 手势基础 | 是 | 否 | Root wrapper |
| `nativewind` | 样式 | 是 | 否 | v4 配置 |
| `zustand` | UI 状态 | 是 | 否 | JS-only |
| `react-hook-form` | 表单 | 是 | 否 | JS-only |
| `zod` | 校验 | 是 | 否 | JS-only |
| `dayjs` | 日期 | 是 | 否 | JS-only |
| `nanoid` | ID | 是 | 否 | 使用 `nanoid/non-secure` |
| `jest-expo` | 测试 | 本地开发 | 否 | devDependency |

不兼容依赖：无。

禁止引入：

- `react-native-date-picker`：需要 custom native code，不适合 Expo Go。
- `react-native-mmkv`：需要 native module，不适合 Phase 1 Expo Go。
- `expo-notifications`：本地通知是 Phase 2，不引入。
- Firebase / Supabase / CloudBase：违反本地优先 Phase 1。

---

## 12. Codex / Claude Code 执行任务序列

### Task 01 — 初始化项目与依赖

- 前置依赖：无
- 修改/创建文件：`package.json`、lockfile
- 执行：第 1 章所有初始化和安装命令
- 验收标准：
  - `npm install` 成功
  - `npx expo start --clear` 能启动
  - iPhone Expo Go 能看到默认空页面
- 复杂度：简单

### Task 02 — 配置 TypeScript、Expo、NativeWind

- 前置依赖：Task 01
- 修改/创建文件：`tsconfig.json`、`app.json`、`tailwind.config.js`、`global.css`、`babel.config.js`、`metro.config.js`、`nativewind-env.d.ts`
- 验收标准：
  - `npm run lint` 不报配置错误
  - 任意页面写 `className="bg-stash-bgFrom"` 生效
  - `npx expo start --clear` 无 NativeWind 报错
- 复杂度：中等

### Task 03 — 建立目录结构和基础类型

- 前置依赖：Task 02
- 修改/创建文件：`src/types/common.ts`、`src/types/item.ts`、`src/types/category.ts`、`src/types/itemForm.ts`、`src/utils/id.ts`、`src/utils/date.ts`
- 验收标准：
  - `npx tsc --noEmit` 通过
  - `createItemId()` 输出 `item_` 前缀
- 复杂度：简单

### Task 04 — 实现 domain expiry / sorting / validation

- 前置依赖：Task 03
- 修改/创建文件：`src/domain/expiry.ts`、`src/domain/sorting.ts`、`src/domain/validation.ts`
- 验收标准：
  - `npm test -- expiry.test.ts` 通过
  - 到期边界测试覆盖 expired/urgent/soon/safe/unknown
- 复杂度：中等

### Task 05 — 配置 Jest 并补齐 domain 单元测试

- 前置依赖：Task 04
- 修改/创建文件：`src/domain/expiry.test.ts`、`src/domain/sorting.test.ts`、`src/domain/validation.test.ts`、`package.json`
- 验收标准：
  - `npm test` 全部通过
  - 至少覆盖第 4.5 节表格中的测试用例
- 复杂度：中等

### Task 06 — 实现 SQLite migration 和 seed

- 前置依赖：Task 03
- 修改/创建文件：`src/db/database.ts`、`src/db/migrations.ts`、`src/db/seed.ts`
- 验收标准：
  - App 启动无 SQLite 报错
  - 启动后 categories 表有 11 条默认分类
  - 重启 app 不重复插入分类
- 复杂度：中等

### Task 07 — 实现 categoryRepository

- 前置依赖：Task 06
- 修改/创建文件：`src/db/repositories/categoryRepository.ts`
- 验收标准：
  - `listCategories` 返回 11 条，按 `sortOrder` 升序
  - `listCategoriesWithActiveCount` 在无 item 时 activeCount 全为 0
- 复杂度：简单

### Task 08 — 实现 itemRepository 基础 CRUD

- 前置依赖：Task 04、Task 06
- 修改/创建文件：`src/db/repositories/itemRepository.ts`
- 验收标准：
  - `createItem` 能插入仅 name 的 item
  - `getItemById` 能返回 item + images
  - `listItems` 默认只返回未归档
  - `computedDueDate` 在 insert/update 时正确写入
- 复杂度：复杂

### Task 09 — 实现 itemRepository 快捷操作和统计

- 前置依赖：Task 08
- 修改/创建文件：`src/db/repositories/itemRepository.ts`
- 验收标准：
  - `markItemOpened` 自动写 openDate 并重算 due date
  - `markItemUsedUp` 写 status=used_up 且 remainingPercent=0
  - `archiveItem` 后 inventory list 不再返回该 item
  - `getDashboardCounts` 统计正确
- 复杂度：中等

### Task 10 — 实现图片服务

- 前置依赖：Task 03
- 修改/创建文件：`src/features/images/imageService.ts`
- 验收标准：
  - 相册选择 1 张图后能复制到 `Paths.document/images/{itemId}/`
  - 超过 3 张返回错误
  - 删除 item 后本地文件被删除
- 复杂度：中等

### Task 11 — 实现 Zustand store 和 ToastHost

- 前置依赖：Task 03
- 修改/创建文件：`src/store/useAppStore.ts`、`src/components/ToastHost.tsx`
- 验收标准：
  - 调用 `showToast('success', '测试')` 能显示并自动消失
  - `bumpRefreshToken` 每次递增
- 复杂度：简单

### Task 12 — 实现根布局和 Tabs 布局

- 前置依赖：Task 02、Task 06、Task 11
- 修改/创建文件：`app/_layout.tsx`、`app/(tabs)/_layout.tsx`
- 验收标准：
  - App 启动后进入首页 tab
  - 底部有 首页 / 库存 / 我的 三个 tab
  - 浮动添加按钮可跳转 `/item/new`
- 复杂度：中等

### Task 13 — 实现基础 UI 组件

- 前置依赖：Task 02、Task 04
- 修改/创建文件：`src/components/EmptyState.tsx`、`StatTile.tsx`、`ProgressBar.tsx`、`CategoryChip.tsx`、`PressableScale.tsx`、`FloatingAddButton.tsx`
- 验收标准：
  - 组件可在 Story-like 临时页面渲染
  - ProgressBar 0/25/50/100 色彩正确
  - FloatingAddButton 有呼吸动画
- 复杂度：中等

### Task 14 — 实现 ItemCard 和 ItemList

- 前置依赖：Task 13
- 修改/创建文件：`src/components/ItemCard.tsx`、`src/features/items/ItemList.tsx`
- 验收标准：
  - 有图显示第一张图
  - 无图显示分类 emoji 或 ✨
  - 左侧边框按 expiry level 变色
  - 无到期显示灰色“无到期”
- 复杂度：中等

### Task 15 — 实现表单基础组件

- 前置依赖：Task 04、Task 07、Task 10、Task 13
- 修改/创建文件：`src/features/items/ItemForm.tsx`、`src/components/CollapsibleSection.tsx`、`src/components/DateField.tsx`
- 验收标准：
  - 仅填写名称可通过保存校验
  - 三个折叠区默认只有基本信息展开
  - 状态切换 opened 自动填 openDate
  - 快捷保质期按钮写入字段正确
- 复杂度：复杂

### Task 16 — 实现添加物品页

- 前置依赖：Task 08、Task 10、Task 15
- 修改/创建文件：`app/item/new.tsx`
- 验收标准：
  - 仅填写名称能保存成功
  - 保存后显示“继续添加”和“查看详情”
  - 点击继续添加清空表单
  - 点击查看详情进入新 item 详情页
- 复杂度：中等

### Task 17 — 实现编辑物品页

- 前置依赖：Task 09、Task 15
- 修改/创建文件：`app/item/edit/[id].tsx`
- 验收标准：
  - 能加载现有 item 为 defaultValues
  - 修改名称/日期/分类后保存生效
  - 替换图片后旧图片文件被删除
  - 保存后回到详情页
- 复杂度：中等

### Task 18 — 实现首页

- 前置依赖：Task 09、Task 14
- 修改/创建文件：`app/(tabs)/index.tsx`
- 验收标准：
  - 空数据展示空状态
  - 录入过期/临期数据后分段展示
  - 三个统计卡片数字正确
  - 点击卡片滚动到对应分段
- 复杂度：中等

### Task 19 — 实现库存页

- 前置依赖：Task 07、Task 09、Task 14
- 修改/创建文件：`app/(tabs)/inventory.tsx`
- 验收标准：
  - 搜索名称/品牌生效
  - 分类筛选生效
  - 到期优先 / 最新录入切换生效
  - 归档 item 不显示
- 复杂度：中等

### Task 20 — 实现详情页快捷操作

- 前置依赖：Task 09、Task 14
- 修改/创建文件：`app/item/[id].tsx`、`src/features/items/ItemDetail.tsx`
- 验收标准：
  - 大图/emoji 展示正确
  - 标记开封、标记用完、调整剩余量、归档都生效
  - 每个操作有 toast
  - 归档后从库存消失
- 复杂度：复杂

### Task 21 — 实现我的页和归档列表

- 前置依赖：Task 07、Task 09、Task 14
- 修改/创建文件：`app/(tabs)/me.tsx`、`app/archived.tsx`
- 验收标准：
  - 我的页显示 active/archived/category 数字
  - 分类管理展示默认分类列表
  - 归档列表只展示归档 item
  - 点击归档 item 可进入详情
- 复杂度：中等

### Task 22 — 视觉 polish 和 Expo Go QA

- 前置依赖：Task 12-21
- 修改/创建文件：所有 UI 文件按需微调
- 验收标准：
  - `npm test` 通过
  - `npx tsc --noEmit` 通过
  - `npx expo start --clear` iPhone Expo Go 可扫码
  - 添加 10 个物品流程顺畅
  - 重启 App 数据仍存在
  - 删除 item 后图片不再占用目录
- 复杂度：中等

### Task 23 — 更新 AGENTS.md

- 前置依赖：Task 01
- 修改/创建文件：`AGENTS.md`
- 验收标准：
  - 包含设计文档中的 AGENTS 内容
  - 额外补充：执行前先读 `docs/IMPLEMENTATION_GUIDE.md`
- 复杂度：简单

---

## 13. 测试策略

### 13.1 测试框架

使用 Jest + `jest-expo`。

```bash
npm test
```

### 13.2 测试文件位置

测试与源码同目录，命名为 `.test.ts`：

```text
src/domain/expiry.ts
src/domain/expiry.test.ts
src/domain/sorting.ts
src/domain/sorting.test.ts
src/domain/validation.ts
src/domain/validation.test.ts
```

### 13.3 必测模块

必须单元测试：

- `src/domain/expiry.ts`
- `src/domain/sorting.ts`
- `src/domain/validation.ts`

不在 Phase 1 写自动化 UI 测试。SQLite repository 通过 Expo Go 手动 smoke test 验证。

### 13.4 `expiry.test.ts` 示例

```typescript
import { computeDueDate, getExpiryLevel } from '@/domain/expiry';

describe('getExpiryLevel', () => {
  const today = '2026-04-21';

  it('returns unknown when due date is missing', () => {
    expect(getExpiryLevel(null, today)).toBe('unknown');
  });

  it('returns expired for past due date', () => {
    expect(getExpiryLevel('2026-04-20', today)).toBe('expired');
  });

  it('returns urgent for today and next 7 days', () => {
    expect(getExpiryLevel('2026-04-21', today)).toBe('urgent');
    expect(getExpiryLevel('2026-04-28', today)).toBe('urgent');
  });

  it('returns soon for days 8 to 30', () => {
    expect(getExpiryLevel('2026-04-29', today)).toBe('soon');
    expect(getExpiryLevel('2026-05-21', today)).toBe('soon');
  });

  it('returns safe after 30 days', () => {
    expect(getExpiryLevel('2026-05-22', today)).toBe('safe');
  });
});

describe('computeDueDate', () => {
  it('uses expiry date when only expiry date exists', () => {
    expect(computeDueDate({ expiryDate: '2027-01-01' })).toBe('2027-01-01');
  });

  it('uses open date plus months when only after-open rule exists', () => {
    expect(computeDueDate({ openDate: '2026-04-21', afterOpenMonths: 12 })).toBe('2027-04-21');
  });

  it('uses earlier date when both exist', () => {
    expect(
      computeDueDate({
        expiryDate: '2028-01-01',
        openDate: '2026-04-21',
        afterOpenMonths: 6,
      }),
    ).toBe('2026-10-21');
  });

  it('returns null when no candidate exists', () => {
    expect(computeDueDate({})).toBeNull();
  });
});
```

### 13.5 手动 QA 清单

在 iPhone Expo Go 上执行：

1. 首次启动 App，首页为空状态。
2. 添加仅名称 item，保存成功。
3. 添加带分类、图片、未开封 3 年 item，详情页显示图片和安全状态。
4. 添加一个昨天过期 item，首页“已过期”统计 +1。
5. 添加一个 7 天内到期 item，首页 urgent 分段出现。
6. 添加一个 30 天内到期 item，首页 soon 分段出现。
7. 库存搜索名称命中。
8. 库存搜索品牌命中。
9. 分类筛选只显示该分类。
10. 排序切到“最新录入”后最新 item 在前。
11. 详情页标记开封，open date 自动写今天。
12. 详情页调整剩余量为 25%，进度条变化。
13. 标记用完，status 变 `used_up`，剩余量 0。
14. 归档 item 后库存不显示，我的页归档数 +1。
15. 进入归档列表能看到归档 item。
16. 重启 App，数据仍存在。
17. 删除带图片 item，本地图片不再显示。

---

## 14. 已知风险和注意事项

### 14.1 Expo SDK 版本风险

[补全] Phase 1 使用 SDK 54 是为了物理 iPhone Expo Go 交付稳定。不要在 Phase 1 主动升级 SDK 55/56。升级会触发 Expo Go 客户端版本、NativeWind/Reanimated、Router API 变化风险。

### 14.2 iOS 权限配置

- `expo-image-picker` 权限在用户点击拍照/相册时再请求。
- 不要在 App 启动时请求相机或相册权限。
- `app.json` 已写 `NSPhotoLibraryUsageDescription` 和 `NSCameraUsageDescription`。
- Expo Go 中权限弹窗文案由 Expo Go 壳决定；这不阻塞 Phase 1。

### 14.3 SQLite 性能注意事项

- 不把图片存入 SQLite。
- 列表页只查未归档 item。
- `computed_due_date` 持久化，避免每次列表都动态计算。
- 首页只查 30 天内风险 item。
- 保留设计文档中的索引。
- 所有用户输入 SQL 都使用参数绑定，不拼接字符串。
- 写事务使用 `withExclusiveTransactionAsync`。

### 14.4 NativeWind v4 / v5 / v2 差异

- 本项目使用 NativeWind v4。
- v4 需要 `tailwind.config.js`、`global.css`、`babel.config.js`、`metro.config.js`。
- 不使用 v2 的旧 `styled()` 迁移思路。
- 不使用 v5 preview 的 CSS-first 配置。

### 14.5 图片尺寸控制

[补全] Phase 1 不引入 `expo-image-manipulator`，所以不做图片 resize。通过 `quality: 0.75`、最多 3 张、单图 8MB 限制控制体积。若未来录入大量高清图导致存储膨胀，Phase 2 再引入压缩/导出策略。

### 14.6 日期时区

[补全] 禁止把 date-only 字段用 `toISOString()` 入库。只能用 `YYYY-MM-DD`。否则中国/美国时区切换、iOS Date 解析可能导致到期日偏移一天。

### 14.7 历史 mockup 与锁定设计文档

[需确认] 压缩包中的历史 brainstorm HTML 曾出现“4 个 Tab”的字样，但锁定设计文档明确是 3 个 Tab。Phase 1 实现严格采用锁定设计文档的 3 个 Tab：`首页 / 库存 / 我的`。

### 14.8 分类管理

[补全] 设计文档页面清单没有分类管理独立 route。Phase 1 在 `me.tsx` 内展示默认分类列表，不支持增删改，不新增页面文件。

### 14.9 删除 item 的交互确认

[补全] 设计文档没有明确删除入口。实现时在详情页底部放“删除物品”次要按钮，点击后用原生 `Alert.alert` 二次确认。删除是技术 CRUD 完整性需要，不改变核心产品边界。

### 14.10 数据备份

Phase 1 不做导出/备份。App 卸载会删除 SQLite 和 document directory 图片。我的页“数据备份 / 导入数据”只显示 Phase 2 标注，不可点击。

---

## 15. 最终交付检查命令

```bash
npm test
npx tsc --noEmit
npm run lint
npx expo start --clear
```

Expo Go 检查：

1. iPhone 与开发机在同一网络；网络不稳定时 Expo CLI 选择 Tunnel。
2. iPhone 扫码打开。
3. 完成第 13.5 节手动 QA。
4. 最终录入 10 个物品，确认比 Excel 更顺手。
