# Knowledge Park

AI-powered quiz and test prep app for Indian school students (CBSE/ICSE/GSEB).

## Run & Operate

- `node artifacts/mobile/scripts/dev.js` — run the mobile app (port 5000, webview)
- `PORT=8080 pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54 (React Native), expo-router, expo-linear-gradient, @tanstack/react-query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/app/` — all screens (subjects.tsx = home, login.tsx, test-quiz.tsx, onboarding.tsx, chat.tsx, etc.)
- `artifacts/mobile/constants/colors.ts` — design tokens (primary #4F46E5, gradient indigo→violet)
- `artifacts/mobile/context/AppContext.tsx` — all student state (test history, progress, AsyncStorage)
- `artifacts/mobile/services/api.ts` — external API calls (kparkit.com)
- `artifacts/mobile/components/BottomTabBar.tsx` — bottom nav bar
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth for Express routes

## Architecture decisions

- All educational data (boards, subjects, chapters, questions, AI chat) comes from external APIs at `kparkit.com` / `dalalifree.com`, NOT the local Express server. The Express server is a scaffold (`/api/healthz` only).
- Auth is email OTP via `otp.kparkit.com` — NOT Replit Auth. Do not replace or change the auth flow.
- Student state (test history, progress, last studied, chat history) lives in AsyncStorage via `AppContext.tsx`, not the database.
- The mobile dev script proxies port 5000 → Expo on port 18116 and rewrites Origin/Referer headers so Expo's CORS middleware accepts the Replit iframe.
- Theme: primary `#4F46E5`, gradient `['#4F46E5','#7C3AED']`, success `#10B981`, warning `#F59E0B`, error `#EF4444`, background `#F8F7FF`.

## Product

- Students select board (CBSE/ICSE/GSEB) and standard (class 9–12) on onboarding
- Home screen shows progress stats, recent test history, subjects list, improvement tracking, and quick-action shortcuts
- Subject → Chapters → Quiz/Test: students pick a subject, chapter, and test mode (MCQ/True-False/Fill-in-the-blank)
- Quiz screen: one question at a time, countdown timer (90s/question), flag button, question navigator, bottom-sheet submit confirmation
- Result screen: gradient header with score, expandable per-question review with explanations
- AI Chat: topic-specific chat sessions per chapter, persistent history in AsyncStorage

## Gotchas

- The home screen is `artifacts/mobile/app/subjects.tsx` (not `app/(tabs)/index.tsx`, which just redirects)
- `test-quiz.tsx` uses `useCallback` for `doSubmit` to avoid stale closure in the countdown timer effect
- When editing the Metro bundler port, update both `dev.js` and any hardcoded references in the proxy script
