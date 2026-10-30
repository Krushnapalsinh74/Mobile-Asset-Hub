---
name: EduLearn project overview
description: Key architecture decisions and sharp edges for the EduLearn mobile+backend monorepo
---

# EduLearn project overview

**Why:** Captures the non-obvious decisions that aren't obvious from reading the code.

## Architecture
- pnpm monorepo: `artifacts/mobile` (Expo), `artifacts/api-server` (Express), `lib/db` (Drizzle+PG), `lib/api-spec`, `lib/api-zod`, `lib/api-client-react`
- The Express API server (`artifacts/api-server`) is currently a scaffold — it only has `/api/healthz`. All real educational data (boards, subjects, chapters, AI chat, question generation) comes from external APIs at `kparkit.com` / `dalalifree.com` defined in `artifacts/mobile/services/api.ts`
- Auth is email OTP via `otp.kparkit.com` — NOT Replit Auth. Do not replace.
- Student state (test history, progress, last studied) lives in AsyncStorage via `artifacts/mobile/context/AppContext.tsx`, not the database.

## Expo/Replit dev setup
- The mobile dev script (`artifacts/mobile/scripts/dev.js`) starts a proxy on port 5000 → Expo on port 18115.
- The expo binary lives in `artifacts/mobile/node_modules/.bin/expo`, NOT the workspace root — the dev script must use the full path (already fixed).
- The proxy rewrites the `Origin` and `Referer` headers to the `REPLIT_EXPO_DEV_DOMAIN` subdomain to pass Expo's CORS middleware (already fixed).
- Workflow: `Mobile App` runs `node artifacts/mobile/scripts/dev.js` on port 5000 (webview).
- Workflow: `Start Backend` runs `PORT=8080 pnpm --filter @workspace/api-server run dev` on port 8080 (console).

## How to apply
- When adding new API routes, add them to the Express server in `artifacts/api-server/src/routes/` and define the OpenAPI contract in `lib/api-spec/openapi.yaml`, then run codegen.
- When editing the home screen, that is `artifacts/mobile/app/subjects.tsx` (not `app/(tabs)/index.tsx` which just redirects).
- Test results are saved via `addTestResult()` in AppContext and persisted to AsyncStorage key `@edu:testHistory`.
