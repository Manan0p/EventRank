# EventRank deploy checklist

## Env template vs code — no drift
`.env.example` covers every variable read by `lib/config.ts` (`envSchema`):
`DATABASE_URL`, `DIRECT_DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`,
`NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`COLLEGE_DOMAIN`, `ENFORCE_COLLEGE_DOMAIN`, `EMBEDDING_API_KEY`,
`EMBEDDING_MODEL`, `SEMANTIC_SEARCH_ENABLED`, `DEMO_MODE`, `DEMO_NOW`,
`NEXT_PUBLIC_APP_URL`. Verified: no drift. (`next.config.mjs` sets only
`reactStrictMode` and `poweredByHeader: false`; no env reads.)

## Steps
1. Migrate (Neon): compile-then-node per the header of `scripts/migrate.ts`:
   `./node_modules/.bin/tsc scripts/migrate.ts --outDir .seed-build --module commonjs --target ES2020 --moduleResolution node --esModuleInterop --skipLibCheck`
   then `node .seed-build/scripts/migrate.js`, then `rm -rf .seed-build`.
   Requires human `DATABASE_URL`. Safe to rerun (IF NOT EXISTS).
2. Seed: same compile-then-node pattern per `scripts/seed.ts` header
   (include `data/seed-events.ts` in the tsc call). Idempotent upserts keyed
   on seed id; reruns converge.
3. Env vars: copy `.env.example` → `.env.local`; set `DATABASE_URL`,
   `AUTH_SECRET` (or `NEXTAUTH_SECRET`), `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL` (or `NEXT_PUBLIC_APP_URL`).
   `DEMO_MODE=true` forces demo even when credentials exist; leaving
   credentials blank keeps the explicit demo fallback.
4. OAuth callback URL: `${NEXT_PUBLIC_APP_URL ?? NEXTAUTH_URL}/api/auth/callback/google`
   (local default `http://localhost:3000/api/auth/callback/google`). Register
   it verbatim as the Authorized redirect URI in Google Cloud Console with the
   matching origin. Full notes in `lib/auth.ts` header.
5. Freeze: seed content and rank version frozen at `eventrank-v1`
   (`EVENT_RANK_VERSION` in `lib/events.ts`). Do not reseed mid-demo.
6. Smoke test: `npx tsc --noEmit`; eslint per build gate; both test files via
   the shim workaround; open app → search "hands-on AI workshop" → save +
   compare conflict → preferences → completed-event review. Then run the
   clean-browser OAuth check with human credentials.

## Deploy blockers for the human
- No `DATABASE_URL`: app runs in demo mode only (in-memory persistence).
- No Google OAuth credentials: sign-in is the explicit demo fallback.
- `AUTH_SECRET` unset: production sessions unsigned — set before any real users.
- Callback URL mismatch (env URL vs Google Console): OAuth fails even with
  valid credentials.
