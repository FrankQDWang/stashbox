# StashBox

StashBox Phase 1 is a local-first Expo Go iPhone app for managing small personal items, expiry dates, remaining amount, photos, and archived items.

## Development

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npx expo start --clear
```

Validation gates:

```bash
npm test
npx tsc --noEmit
npm run lint
npx expo-doctor
```

## Scope

The locked Phase 1 scope is defined in:

- `docs/superpowers/specs/2026-04-21-stashbox-design.md`
- `docs/IMPLEMENTATION_GUIDE.md`
- `AGENTS.md`
