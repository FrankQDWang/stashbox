# GPT Pro 提示词：StashBox 实施细节补全

你是一位细心严谨的技术执行顾问。我给你的压缩包是 StashBox 项目的当前状态，核心文件是 `docs/superpowers/specs/2026-04-21-stashbox-design.md`（设计文档）。

## 你的任务

基于这份已确认的设计文档，补全所有实现细节和执行链路，产出一份 **Codex / Claude Code 拿到就能直接开干、不会感到困惑** 的完整实施文档。

## 绝对不能改的（已锁定的产品设计决策）

以下内容已经和产品方确认完毕，你不能修改、质疑或建议替代方案：

- 产品定位、核心设计原则（5 条）
- Phase 1 功能边界（P0 必做 + 不做列表）
- 技术栈选型（Expo + TS + SQLite + NativeWind + Zustand + react-hook-form + zod + dayjs + nanoid）
- SQLite Schema（4 张表 + 索引 + 种子数据）
- 核心领域逻辑（到期计算、排序、自动填充）
- 信息架构（3 个 Tab + 7 个页面文件 + 页面流转）
- UI 设计规范（色彩系统、卡片结构、视觉风格）
- 各页面的布局和交互设计
- 项目目录结构
- 交付方式（Expo Go 扫码，iPhone）

## 你需要补全的（实现细节 + 执行链路）

请逐一覆盖以下维度，每个维度都要给出 **具体到可以直接写代码的细节**，不要留任何 TBD 或"视情况而定"：

### 1. 环境初始化与依赖配置
- 完整的 `npx create-expo-app` 命令和参数
- 所有 npm 依赖的精确安装命令（分 dependencies 和 devDependencies）
- `tsconfig.json` 的关键配置（strict mode、path alias `@/*`）
- `app.json` / `app.config.ts` 的关键配置（app name、slug、scheme、plugins）
- NativeWind / Tailwind 的完整配置步骤（`tailwind.config.js`、`global.css`、`babel.config.js` 或 `metro.config.js` 的改动）
- Expo Router 的 `app/_layout.tsx` 基础结构
- 如果有任何版本兼容性注意事项，明确指出

### 2. SQLite 数据库层实现细节
- `expo-sqlite` 的初始化方式（同步 vs 异步 API，推荐哪个）
- 数据库文件命名和存储位置
- Migration 机制设计（用 `PRAGMA user_version` 还是自建 migration 表）
- 每个 repository 函数的完整签名（参数类型、返回类型）
- `itemRepository` 的所有 CRUD 函数列表及 SQL 语句要点
- `categoryRepository` 的函数列表
- 种子数据的插入时机和幂等性保证
- `computed_due_date` 的更新时机（insert/update item 时自动计算）
- 事务处理策略（哪些操作需要事务）

### 3. TypeScript 类型定义
- `Item`、`Category`、`ItemImage`、`AppSetting` 的完整 interface
- `ItemFormData`（表单输入）vs `Item`（数据库记录）的区别
- `ExpiryLevel` 和 `ItemStatus` 的 enum/union type
- zod schema 定义（表单验证规则）

### 4. 领域逻辑的完整实现规范
- `src/domain/expiry.ts` 的所有导出函数签名和边界条件
- `src/domain/sorting.ts` 的排序函数签名
- `src/domain/validation.ts` 的验证规则
- 每个函数需要覆盖的测试用例列表（输入 → 期望输出）
- `diffInDays`、`addMonths`、`minDate` 用 dayjs 还是自己写

### 5. 图片处理完整链路
- `expo-image-picker` 的调用参数（质量、尺寸限制、mediaTypes）
- 图片从临时路径复制到 App document directory 的完整流程
- 本地图片目录结构（`${documentDirectory}/images/` ?）
- 图片文件命名规则（用 item id？用 nanoid？）
- 图片删除时机（删除 item 时是否同步删除本地文件）
- 多图支持的上限（Phase 1 建议限制几张）

### 6. 状态管理设计
- Zustand store 的结构（哪些状态放 store，哪些用 React Query / 直接查 SQLite）
- 数据流：UI → store → repository → SQLite 的调用链路
- 列表数据的刷新策略（添加/编辑/删除后如何触发列表更新）
- 是否需要 React Context 配合（比如数据库实例的注入）

### 7. 每个页面的组件拆分和数据流
对 7 个页面文件，每个都要说清楚：
- 页面级组件引用了哪些子组件
- 数据从哪里来（哪个 repository 函数 / store）
- 用户操作触发什么函数
- 导航跳转的 `router.push` / `router.replace` 参数

### 8. 表单实现细节
- `react-hook-form` 的 `useForm` 配置（defaultValues、mode）
- zod schema 和 `zodResolver` 的接入方式
- 折叠区域的展开/收起实现方式（Animated？简单 state toggle？）
- 分类 Chip 选择器的实现（单选、选中态样式切换）
- 日期选择器用什么组件（`@react-native-community/datetimepicker`？Expo 内置？）
- 快捷选项按钮点击后如何更新表单字段

### 9. NativeWind 样式实现
- 全局样式文件的结构
- 自定义颜色 token 的定义方式（`tailwind.config.js` 的 `extend.colors`）
- 渐变背景的实现方式（NativeWind 不原生支持 gradient，用 `expo-linear-gradient`？）
- 圆角、阴影的统一 class 命名
- 暗色模式：Phase 1 是否支持？如果不支持，如何锁定浅色模式？

### 10. 动画和交互反馈
- 浮动按钮呼吸动画的实现（`Animated.loop` + `Animated.sequence`？`react-native-reanimated`？）
- 卡片点击缩放反馈的实现
- Toast 提示用什么库（`react-native-toast-message`？自己写？）
- 折叠区域展开动画（有无？用什么实现？）

### 11. Expo Go 兼容性检查
- 列出所有依赖，标注哪些在 Expo Go 中可用、哪些需要 development build
- 如果有不兼容的依赖，给出替代方案
- `expo-sqlite` 在 Expo Go 中的行为确认

### 12. 完整的任务拆分（给 Codex / Claude Code 的执行序列）
把整个 Phase 1 拆成 **有序的、可独立验证的任务**，每个任务包含：
- 任务编号和标题
- 前置依赖（哪些任务必须先完成）
- 具体要做什么（创建/修改哪些文件）
- 验收标准（怎么验证这个任务做完了：能编译？能跑测试？能在 Expo Go 看到效果？）
- 预估复杂度（简单/中等/复杂）

任务粒度要求：每个任务让 AI agent 一次性完成，不需要人工干预或追问。太大的任务要拆小，太小的可以合并。

### 13. 测试策略
- 哪些模块需要单元测试（domain 逻辑必须测）
- 测试框架选择（Jest？Vitest？）
- 测试文件放在哪里（`__tests__/` 还是 `.test.ts` 同目录）
- 关键测试用例清单（到期计算、排序、表单验证）

### 14. 已知风险和注意事项
- Expo SDK 版本和各依赖的兼容性
- iOS 相机/相册权限的 `Info.plist` 配置
- SQLite 在 iOS 上的性能注意事项
- NativeWind v4 vs v2 的 API 差异（如果有）
- 任何你在分析过程中发现的设计文档遗漏或模糊点

## 输出格式

产出一份完整的 Markdown 文档，结构清晰，可以直接作为 `docs/IMPLEMENTATION_GUIDE.md` 放进项目。

要求：
- 所有代码示例用 TypeScript
- 所有命令可以直接复制执行
- 不要有任何"建议考虑"、"可以选择"这种模糊表述，每个决策点都给出明确结论
- 如果你发现设计文档有遗漏但不涉及产品设计变更（纯技术实现层面），直接补全并标注 `[补全]`
- 如果你发现设计文档有潜在矛盾或技术上不可行的点，标注 `[需确认]` 并给出你的建议方案

## 上下文补充

- 开发者是 App 开发新手，熟悉 TypeScript，重度使用 AI Coding（Codex CLI / Claude Code）
- 目标平台：iPhone，通过 Expo Go 分发
- 中国大陆网络环境（npm 可能需要镜像源）
- 中文界面 + 英文代码
- Phase 1 目标：2-3 天交付 MVP
