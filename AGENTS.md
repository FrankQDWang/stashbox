# AGENTS.md — StashBox Phase 1

This file is the operating contract for AI coding agents working in this repository.

For Claude Code users: symlink or copy this file to `CLAUDE.md` at the repo root before starting a session.

---

## 1. Mission

Build **StashBox Phase 1 MVP**: a local-first iOS and Android app, distributed through Expo Go, for managing small personal items (skincare, makeup, perfume, jewelry, accessories, stocked goods).

Target user is non-technical. The app must feel warmer, faster, and easier than Excel. Chinese UI text. English code, filenames, identifiers, and comments.

---

## 2. Source-of-truth order

Read these files before coding:

1. `docs/superpowers/specs/2026-04-21-stashbox-design.md` — locked product design.
2. `docs/IMPLEMENTATION_GUIDE.md` — concrete implementation plan and task sequence.
3. This `AGENTS.md` — agent operating rules and safety guardrails.
4. Existing code and tests.

Conflict handling:

- Product decisions in the design document are **locked**. Do not change product positioning, Phase 1 scope, schema, core domain rules, navigation, UI style, or delivery mode unless the human explicitly says those decisions changed.
- For technical implementation details, follow `docs/IMPLEMENTATION_GUIDE.md`.
- If code conflicts with the locked docs, fix the code.
- If two locked docs conflict on product behavior, **stop and report** the exact conflict.

---

## 3. Hard product boundaries

Do not add these in Phase 1:

- Login, registration, cloud sync, backend, Supabase, Firebase, CloudBase, server APIs
- Push/local notifications
- Analytics, tracking, ads, crash reporting, remote config
- Tags, usage history, data export, backup, import
- AI suggestions, ecommerce links, subscriptions
- Dark mode
- Web-specific scope expansion. Android support is limited to Phase 1 Expo Go compatibility.

Only build the seven locked pages defined in the design document.

---

## 4. Dependency rules

Use exactly the stack defined in the design document and implementation guide.

- Do not add production dependencies unless listed in `docs/IMPLEMENTATION_GUIDE.md` or explicitly approved by the human.
- Use `npx expo install` for Expo / React Native native modules.
- Use `npm install` only for pure JS libraries and dev tooling listed in the implementation guide.
- Do not upgrade Expo SDK, NativeWind major version, React Native, or Expo Router during Phase 1.
- Do not run `npm audit fix`, `npm update`, or broad version bump commands.

---

## 5. Repository bootstrap rule

The repo may start as docs-only. **Never create a nested `stashbox/stashbox` project.**

At the start of Task 01:

1. Run `pwd && ls && git status --short`.
2. If `package.json` exists, treat the current directory as the app root — do not run `create-expo-app` again.
3. If the current directory has `docs/` but no `package.json`, initialize Expo in a temp directory and rsync into the repo root. Preserve all existing `docs/` files.

---

## 6. Architecture rules

Keep responsibilities separated:

- **UI components** never contain SQL.
- **Repository functions** never import React, navigation, or UI components.
- **Domain functions** never access SQLite, Zustand, React Native, or the filesystem.
- **Zustand** stores UI state (filters, sort mode, refresh tokens, toast). SQLite is the source of truth for persisted data.
- **Images** are files in the app document directory; SQLite stores metadata and local URIs.

Follow the directory structure defined in the design document. Use path alias `@/*` for imports from `src/*`.

---

## 7. Validation gates

```bash
npm test              # domain logic
npx tsc --noEmit      # type safety
npm run lint          # code quality
npx expo-doctor       # expo compatibility
```

Use the smallest relevant gate while iterating. Before reporting a task as done, run every gate applicable to the touched area.

Never claim Expo Go manual QA passed unless a human or attached device actually verified it.

---

## 8. Git and file safety

- Do not overwrite human changes.
- Do not run destructive commands (`git reset --hard`, `git clean -fd`) unless the human explicitly requests them.
- Do not commit unless the human explicitly asks.
- Do not edit lockfiles manually.
- Do not store secrets, tokens, API keys, or personal data in the repo.
- Do not remove docs, mockups, or design files unless the human explicitly asks.

---

## 9. Done definition for Phase 1

Phase 1 is done only when all are true:

- The app starts through `npx expo start` and opens in iOS and Android Expo Go.
- The seven locked pages exist and are navigable.
- Default categories seed once and do not duplicate.
- Add, edit, detail, archive, and delete flows work locally.
- Images can be selected, copied, displayed, and removed.
- Expiry computation and sorting match the locked design.
- Home stats and inventory list exclude archived items.
- Domain tests pass. TypeScript strict mode passes. Lint passes or remaining issues are explicitly reported.
- No Phase 2/V2/V3 features were added.

---

All domain rules, schema details, UI specs, form behavior, navigation patterns, image handling, and testing requirements are defined in the design document and implementation guide. Follow those documents exactly. Do not duplicate their content here.
