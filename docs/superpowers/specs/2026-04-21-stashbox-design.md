# StashBox 设计文档 — Phase 1 MVP

> 内部代号：StashBox
> 版本：v0.1.0 Phase 1
> 日期：2026-04-21
> 目标：让女朋友愿意打开 App 录入 10 个物品，觉得比 Excel 顺手

---

## 1. 产品定位

一个私密的「小物库存 + 临期提醒」App。帮女生管理护肤品、彩妆、香水、首饰、饰品和囤货：知道有什么、放在哪、什么时候过期、还剩多少、要不要回购。

### 核心设计原则

1. 本地优先，无网络依赖
2. 不需要注册登录
3. 快速录入 > 完整数据（先能保存，之后再补全）
4. 比 Excel 更愿意打开
5. 情绪价值优先，视觉体验 > 功能密度

### 目标用户

女朋友（iOS / Android 手机用户），目前用 Excel 管理囤货，核心痛点是怕过期浪费。

### 交付方式

Expo Go 扫码（iOS / Android 双端兼容，无 Apple Developer 账号），中文界面 + 英文代码，温柔少女风视觉。

> 2026-04-21 更新：人类明确批准 Phase 1 从 iPhone-only 调整为 iOS + Android Expo Go 双端兼容。该变更不包含 Web、应用商店发布、EAS / development build 或原生工程维护。

---

## 2. Phase 1 功能边界

### P0 必做

- 首页仪表盘：已过期 / 30天内到期 / 总数统计卡片 + 按风险分段的物品列表
- 库存列表：搜索 + 分类筛选 + 排序（到期优先 / 最新录入）
- 添加/编辑物品：拍照+相册 + 分段折叠表单（仅名称必填）
- 物品详情页：大图 + 快捷操作（标记开封/用完/调整剩余量/归档）
- 11 个默认分类（带 emoji 图标）
- 到期状态计算 + 首页排序逻辑
- 归档功能（用完的物品从主列表消失，在"我的"中查看）
- 空状态友好引导
- 到期时间快捷选项（未开封3年 / 开封后12/6/3个月）
- 添加成功后"继续添加"按钮（支持批量录入）

### Phase 1 不做

| 功能 | 原因 |
|------|------|
| 本地通知推送 | Phase 2，先用列表展示临期 |
| 标签系统 | Phase 2 |
| usage_events 使用记录 | Phase 2 |
| 数据导出/备份 | Phase 2 |
| 低库存统计 | Phase 2，依赖用户填写总量 |
| 复杂多维度排序 | Phase 2，仅保留 2 种排序 |
| 云同步/登录/后端 | V2 |
| AI 建议/电商联盟 | V3+ |

---

## 3. 技术栈

| 模块 | 选型 |
|------|------|
| App 框架 | Expo + React Native |
| 语言 | TypeScript (strict mode) |
| 路由 | Expo Router |
| UI 样式 | NativeWind (Tailwind) |
| 本地数据库 | expo-sqlite |
| 图片选择 | expo-image-picker |
| 图片存储 | expo-file-system（本地目录） |
| 表单 | react-hook-form + zod |
| 状态管理 | Zustand |
| 日期处理 | dayjs |
| ID 生成 | nanoid |
| AI Coding | Codex CLI |

---

## 4. 数据模型（SQLite Schema）

### categories 表

```sql
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
```

### items 表

```sql
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT,
  brand TEXT,
  series TEXT,
  shade TEXT,
  status TEXT NOT NULL DEFAULT 'unopened',
  -- unopened | opened | used_up | idle
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
  -- 1=不回购 2=一般 3=可回购 4=必回购
  notes TEXT,
  is_archived INTEGER DEFAULT 0,
  favorite INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### item_images 表

```sql
CREATE TABLE IF NOT EXISTS item_images (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  local_uri TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

### app_settings 表

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 索引

```sql
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_due_date ON items(computed_due_date);
CREATE INDEX IF NOT EXISTS idx_items_archived ON items(is_archived);
CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at);
```

### 默认分类种子数据

| name | icon | sort_order |
|------|------|------------|
| 护肤 | 🧴 | 0 |
| 彩妆 | 💄 | 1 |
| 香水 | 🌸 | 2 |
| 美发 | 💇‍♀️ | 3 |
| 身体护理 | 🛁 | 4 |
| 首饰 | 💍 | 5 |
| 饰品 | 🎀 | 6 |
| 包包配件 | 👜 | 7 |
| 服饰小件 | 👗 | 8 |
| 囤货耗材 | 📦 | 9 |
| 其他 | ✨ | 10 |

### Phase 1 低优先级字段

以下字段保留在 schema 中，在添加/编辑页的"更多信息"折叠区域可选填，但默认折叠、不主动引导用户填写：brand、series、shade、purchase_date、purchase_price、purchase_channel、storage_location、repurchase_rating、favorite、notes。首页和库存列表的卡片中不展示这些字段。

---

## 5. 核心领域逻辑

### 到期状态计算

```typescript
type ExpiryLevel = 'expired' | 'urgent' | 'soon' | 'safe' | 'unknown';

function getExpiryLevel(dueDate?: string, today = new Date()): ExpiryLevel {
  if (!dueDate) return 'unknown';
  const days = diffInDays(today, new Date(dueDate));
  if (days < 0) return 'expired';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'soon';
  return 'safe';
}
```

### 实际到期日计算

当 expiry_date 和 open_date + after_open_months 都存在时，取两者中更早的日期作为实际风险到期日（更保守的策略）。如果只有其中一个，直接使用。都没有则留空，该物品不进入临期统计。

```typescript
function computeDueDate(input: {
  expiryDate?: string;
  openDate?: string;
  afterOpenMonths?: number;
}): string | undefined {
  const candidates: Date[] = [];
  if (input.expiryDate) candidates.push(new Date(input.expiryDate));
  if (input.openDate && input.afterOpenMonths) {
    candidates.push(addMonths(new Date(input.openDate), input.afterOpenMonths));
  }
  if (candidates.length === 0) return undefined;
  return minDate(candidates).toISOString();
}
```

### 首页排序

默认按到期时间正序（快过期排最前），分三段展示：
1. 已过期（expired）
2. 7天内到期（urgent）
3. 30天内到期（soon）

无数据的分段自动隐藏。全部安全时显示「所有宝贝都安全哦 ✨」。

### 库存排序

两种模式切换：
- 到期优先：按 computed_due_date 正序，null 排最后
- 最新录入：按 created_at 倒序

### 自动填充逻辑

- status 从 unopened 切换为 opened 时，自动填充 open_date = 今天（允许手动修改）
- 已过期物品的 remaining_percent 进度条强制红色渐变

---

## 6. 信息架构

### 底部 3 个 Tab

| Tab | 图标 | 职责 |
|-----|------|------|
| 首页 | 💖 | 统计卡片 + 风险物品分段列表 + 浮动添加按钮 |
| 库存 | 🎀 | 完整未归档物品列表 + 搜索 + 分类筛选 + 排序 |
| 我的 | 👧 | 归档物品、分类管理、数据统计、关于 |

### 页面清单（7 个文件）

| 页面 | 路由 |
|------|------|
| 首页 | app/(tabs)/index.tsx |
| 库存 | app/(tabs)/inventory.tsx |
| 我的 | app/(tabs)/me.tsx |
| 添加物品 | app/item/new.tsx |
| 编辑物品 | app/item/edit/[id].tsx |
| 物品详情 | app/item/[id].tsx |
| 归档列表 | app/archived.tsx |

### 页面流转

```
App 启动 → 首页
  ├─ 点击物品卡片 → 物品详情 → 编辑
  ├─ 浮动按钮 → 添加物品 → 保存成功 → 继续添加 / 查看详情
  └─ 统计卡片点击 → 滚动到对应分段

库存 Tab
  ├─ 搜索/筛选/排序 → 物品列表
  └─ 点击卡片 → 物品详情 → 快捷操作

我的 Tab
  ├─ 归档物品 → 归档列表
  └─ 分类管理
```

---

## 7. UI 设计规范

### 视觉风格

温柔少女风：低饱和粉紫橙渐变、全圆角 16px、软萌 emoji 图标、柔和阴影。

### 色彩系统

| 用途 | 颜色 |
|------|------|
| 品牌主色 | 粉紫渐变 #f48fb1 → #ce93d8 |
| 已过期 | 红色 #ef5350 |
| 7天内到期 | 橙色 #ffa726 |
| 30天内到期 | 黄色 #f9a825 |
| 安全 | 紫色 #ce93d8 |
| 未知/无到期 | 灰色 #bdbdbd |
| 未开封状态 | 绿色 #66bb6a |
| 背景 | 粉白渐变 #fff5f7 → #fefefe |

### 物品卡片结构

```
[52x52 图片/emoji]  物品名称（14px 加粗）
                    分类 · 状态 · 剩余量（11px 灰色）
                    [剩余量进度条]
                                          [到期状态标签]
```

- 左侧边框颜色 = 到期状态颜色
- 有图显示图片，无图显示分类 emoji
- 进度条颜色：0-25% 红色、25-50% 橙色、50-100% 粉紫
- 已过期物品进度条强制红色

### 统计卡片

3 个卡片横排：已过期（粉红渐变）、30天内到期（橙色渐变）、全部物品（紫色渐变）。数字加粗放大，点击滚动到对应分段。

### 空状态

大 emoji 🎀 + 引导文案「还没有录入宝贝呢 / 快来录入你的囤货吧～再也不怕过期浪费啦」+ 醒目的「添加第一个物品」按钮。

### 浮动添加按钮

粉紫渐变圆形，全局悬浮在所有 Tab 之上，带轻微呼吸缩放动画。

### 交互反馈

- 卡片点击：轻微缩放 + 透明度变化
- 快捷操作完成：轻量 toast 提示
- 保存成功：底部出现「继续添加」+「查看详情」按钮

---

## 8. 添加物品页设计

### 表单结构

分段折叠，默认只展开"基本信息"：

**基本信息（默认展开）**
- 图片：拍照 + 相册（可选）
- 物品名称（唯一必填）
- 分类（Chip 单选，默认不选）
- 使用状态（未开封/已开封/闲置，默认未开封）

**日期与保质期（默认折叠）**
- 到期日期（日期选择器）
- 快捷选项：未开封3年 / 开封后12个月 / 6个月 / 3个月
- 开封日期（切换到已开封时自动填充今天）

**更多信息（默认折叠）**
- 品牌、系列、色号/款式
- 购买日期、价格、渠道
- 存放位置、回购意愿、备注

### 快捷选项逻辑

| 选项 | 写入字段 |
|------|----------|
| 未开封3年 | expiry_date = 今天 + 3年 |
| 开封后12个月 | after_open_months = 12 |
| 开封后6个月 | after_open_months = 6 |
| 开封后3个月 | after_open_months = 3 |

### 保存流程

保存 → toast 提示 → 底部出现「继续添加」（清空表单留在添加页）+「查看详情」（跳转详情页）。

---

## 9. 物品详情页设计

### 展示内容

- 大图展示区（有图显示图片，无图显示分类 emoji）
- 名称 + 分类/状态/到期标签
- 剩余量进度条（带百分比数字）
- 到期信息卡片（到期日 + 已过期天数 / 剩余天数 + 开封日期）

### 快捷操作

| 操作 | 效果 |
|------|------|
| 标记开封 | status=opened, open_date=今天, 重算 computed_due_date |
| 标记用完 | status=used_up, remaining_percent=0 |
| 调整剩余量 | 快捷 75%/50%/25% 或自定义输入 |
| 归档 | is_archived=1, 从主列表消失 |
| 编辑 | 跳转编辑页 |

每个操作完成后显示 toast 确认。

### 调整剩余量交互

弹出面板：3 个快捷按钮（75% / 50% / 25%）+ 自定义输入框 + 确定按钮。

---

## 10. 库存 Tab 设计

- 顶部搜索栏：搜索物品名称、品牌
- 分类筛选 Chips：全部 + 各分类（超出部分"更多"展开）
- 排序切换：到期优先 / 最新录入
- 物品卡片列表：复用首页同款卡片组件
- 仅展示 is_archived=0 的未归档物品
- 无到期日的物品显示"无到期"灰色标签
- 右下角全局浮动添加按钮

---

## 11. 我的 Tab 设计

- 顶部 App logo + 名称 + slogan「你的私密小物管家」
- 数据概览：在用物品 / 已归档 / 分类数
- 菜单分组：
  - 归档物品（→ 归档列表页）
  - 分类管理（Phase 1 仅查看默认分类列表，不支持增删改，Phase 2 开放编辑）
  - 数据统计（Phase 1 仅展示顶部数据概览卡片，无独立统计页，Phase 2 扩展）
  - 数据备份（Phase 2 标注）
  - 导入数据（Phase 2 标注）
  - 隐私说明
  - 关于 StashBox

---

## 12. 项目目录结构

```
stashbox/
  app/
    _layout.tsx
    (tabs)/
      _layout.tsx
      index.tsx          # 首页
      inventory.tsx      # 库存
      me.tsx             # 我的
    item/
      [id].tsx           # 物品详情
      new.tsx            # 添加物品
      edit/[id].tsx      # 编辑物品
    archived.tsx         # 归档列表
  src/
    components/
      ItemCard.tsx
      EmptyState.tsx
      StatTile.tsx
      CategoryChip.tsx
      ProgressBar.tsx
      FloatingAddButton.tsx
    db/
      database.ts
      migrations.ts
      seed.ts
      repositories/
        itemRepository.ts
        categoryRepository.ts
    domain/
      expiry.ts
      sorting.ts
      validation.ts
    features/
      items/
        ItemForm.tsx
        ItemList.tsx
        ItemDetail.tsx
        useItems.ts
      images/
        imageService.ts
    store/
      useAppStore.ts
    types/
      item.ts
      category.ts
    utils/
      date.ts
      id.ts
  AGENTS.md
  package.json
  app.json
  tsconfig.json
```

---

## 13. 交付策略

### Phase 1 交付

iOS 和 Android 用户通过 Expo Go 扫码使用。开发期间实时预览，无需上架。

### 后续路径

| 阶段 | 触发条件 | 内容 |
|------|----------|------|
| Phase 2 | 连续使用 7 天，录入 30+ 物品 | 本地通知、标签、导出备份、usage_events |
| V2 | 她担心换手机丢数据 | CloudBase 云同步、登录、多端 |
| V3 | 用户增长 | AI 建议、电商联盟、订阅付费 |

---

## 14. AGENTS.md 内容

```markdown
# Project: StashBox

StashBox is a local-first React Native app for managing small personal items
such as skincare, makeup, perfume, jewelry, accessories, and stocked goods.

## Tech Stack

- Expo React Native + Expo Router
- TypeScript (strict mode)
- expo-sqlite
- expo-image-picker + expo-file-system
- NativeWind (Tailwind)
- Zustand
- react-hook-form + zod
- dayjs
- nanoid

## Product Principles

1. Local-first. No backend in V1.
2. No login in V1.
3. Fast entry matters more than complete data.
4. The app must feel easier than Excel.
5. Never require all fields when adding an item — only name is required.
6. Photos are stored locally in the app document directory.
7. SQLite stores item metadata and local image URIs.
8. Emotion and visual appeal matter — warm, feminine aesthetic.
9. All domain logic must be tested before UI integration.

## Coding Rules

- Use TypeScript strict mode.
- Keep domain logic in src/domain/.
- Keep database access in src/db/repositories/.
- UI components should not contain SQL.
- Do not introduce a backend, Supabase, Firebase, or CloudBase in V1.
- Do not add analytics or tracking.
- Do not request permissions until the user uses the related feature.
- Write tests for expiry calculation, due-date calculation, and item sorting.
- Prefer simple, readable code over clever abstractions.
- All UI text in Chinese. All code in English.

## V1 Screens

- Home dashboard (3 tabs: 首页, 库存, 我的)
- Inventory list with search and category filter
- Add item (sectioned collapsible form)
- Edit item
- Item detail with quick actions
- Archived items list
```
