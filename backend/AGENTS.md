# PointOfSaleWebApp Backend Agent Guide

## Project Runtime

- This backend is an Express 5 API using TypeScript, Prisma 7, PostgreSQL, and JSON Web Tokens.
- Backend runtime: `http://localhost:5000`.
- Frontend runtime: `http://localhost:3000`.
- Development server uses `npm run dev`, which runs `nodemon` and executes `tsx src/index.ts`.
- Production-style startup uses `npm run start`, which builds first and then runs `node dist/src/index.js`.

## Mandatory Pre-Check Before Coding

Before editing any backend file:

1. Inspect the current implementation first.
2. Read the related route, controller, service, and Prisma schema before changing behavior.
3. Check `src/app.ts` for mounted routes and middleware wiring.
4. Check `README.md` for current API contracts before adding or changing endpoints.
5. Check `prisma/schema.prisma` before touching data models, Prisma queries, or generated client types.

Never start coding based purely on assumptions.

---

## Stability Rules

- Do not rewrite stable working features just for refactoring.
- Do not rename routes, files, models, fields, or response shapes unless the user explicitly requests it.
- Preserve existing API contracts used by the frontend.
- Prefer minimal surgical edits over broad rewrites.
- Respect existing user edits and do not delete unrelated code.
- Do not delete migrations, reset the database, or run destructive Prisma commands unless the user explicitly approves data loss.

---

## Existing App Structure (Follow This)

- App composition and route mounting: `src/app.ts`
- Server entrypoint: `src/index.ts`
- Prisma schema: `prisma/schema.prisma`
- Prisma config: `prisma.config.ts`
- Product routes/controllers/services: `src/routes`, `src/controllers`, `src/services`
- Existing POS slices include products, auth, categories, stock movements, transactions, payments, and transaction voiding.

Follow the existing layered pattern:

1. route
2. controller
3. service
4. Prisma/database access

Do not create duplicate parallel structures if the existing layers already solve the need.

---

## Auth Rules

- Use the existing `AUTH_TOKEN_SECRET` from `.env`; do not introduce a new secret name.
- Auth uses `jsonwebtoken`.
- `/auth/me` and protected operations expect `Authorization: Bearer <token>`.
- Preserve the current JWT behavior unless the user asks to change auth policy.
- Password hashing already exists in the auth flow; do not replace it casually.

---

## Prisma And Data Model Rules

- Re-read `prisma/schema.prisma` before every schema change, even if it was read earlier in the same session.
- Keep schema edits incremental and localized.
- After schema changes, run Prisma format and validate before trusting the code.
- Run `npx prisma generate` whenever Prisma Client types or generated imports may have changed.
- Category normalization is intentional: product category input should map case/space variants such as `mie`, `Mie`, and `MIE` to one normalized category row.
- Preserve unique-conflict behavior where applicable, such as returning `409` for duplicate category creation instead of leaking a generic `500`.

---

## Transaction And Stock Rules

- Transaction creation should remain atomic with Prisma transactions.
- Do not allow sale flows to produce negative stock.
- Preserve transaction item snapshots such as product name, unit price, cost price, quantity, and subtotal.
- Invoice numbers should remain persisted consistently, not only returned in the response.
- Voiding should only apply to completed transactions, restore stock, mark the transaction voided, and write stock movement audit rows.

---

## API Coordination Rules

- Do not invent backend endpoints without checking existing routes and `README.md`.
- When adding endpoints, update route mounting in `src/app.ts` if needed.
- Keep frontend compatibility in mind, especially response shapes consumed by `../frontend/src/lib/pos-api.ts`.
- Add or update focused tests for behavior changes.
- Return clear HTTP status codes for user-facing API errors.

---

## Verification Checklist (Mandatory After Code Changes)

For ordinary backend code changes, verify in this order:

1. `npm run build`
2. `npm test`
3. Start the real server path when runtime wiring changed.
4. Smoke test `GET /health`.

For Prisma schema/client changes, verify in this order:

1. `npm exec prisma format -- --schema prisma/schema.prisma`
2. `npm exec prisma validate -- --schema prisma/schema.prisma`
3. `npx prisma generate`
4. `npm run build`
5. `npm test`
6. Start the real server path and smoke test `GET /health` when route/runtime wiring changed.

Do not rely on tests alone when `src/index.ts`, `src/app.ts`, Prisma generated imports, or startup behavior changed. Build, start, and smoke test the real runtime path.

When smoke testing with `npm run start`, run it as a controlled background process and stop it after the `GET /health` check. Do not leave long-running backend server processes behind after verification.

If a Windows process helper fails with command-resolution or `spawn EPERM` behavior, treat it as environment-specific only after code-level verification passes and rerun with a Windows-safe command path such as `npm.cmd` when appropriate.

---

## Coding Style Rules

- Keep changes incremental and focused.
- Follow existing TypeScript, Express, Prisma, and error-handling patterns.
- Prefer maintainability over cleverness.
- Avoid unnecessary abstractions.
- Keep controllers thin and put business rules in services.
- Keep API behavior explicit and predictable.

---

## Expected Agent Behavior

Act like a careful senior maintainer of an existing POS backend.

Priorities:

1. preserve data safety
2. preserve API compatibility
3. preserve runtime correctness
4. then implement the requested feature
