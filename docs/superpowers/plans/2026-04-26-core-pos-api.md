# Core POS API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add route, controller, and service layers for the core POS API slice.

**Architecture:** Existing product behavior remains stable while controllers and services become the reusable boundary for products, categories, and stock movements. Stock movement creation uses a Prisma transaction to update product stock and append movement history together.

**Tech Stack:** Express 5, TypeScript, Prisma 7, Node test scripts using `assert` and `fetch`.

---

### Task 1: Category API

**Files:**

- Create: `backend/src/services/categories.service.ts`
- Create: `backend/src/controllers/categories.controller.ts`
- Create: `backend/src/routes/categories.ts`
- Create: `backend/src/__tests__/categories.test.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/package.json`

- [ ] Add failing endpoint tests for list, create, update, delete, validation, duplicate slug, invalid id, and missing record.
- [ ] Implement category service validation and Prisma calls.
- [ ] Implement category controller and router.
- [ ] Wire `/categories` in `createApp`.
- [ ] Add the category test command to `npm test`.

### Task 2: Stock Movement API

**Files:**

- Create: `backend/src/services/stockMovements.service.ts`
- Create: `backend/src/controllers/stockMovements.controller.ts`
- Create: `backend/src/routes/stockMovements.ts`
- Create: `backend/src/__tests__/stockMovements.test.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/package.json`

- [ ] Add failing endpoint tests for list, create adjustment, product movement list, validation, invalid product id, and missing product.
- [ ] Implement stock movement service with transaction-backed stock updates.
- [ ] Implement stock movement controller and router.
- [ ] Wire `/stock-movements` and `/products/:id/stock-movements`.
- [ ] Add the stock movement test command to `npm test`.

### Task 3: Product Layer Refactor

**Files:**

- Create: `backend/src/services/products.service.ts`
- Create: `backend/src/controllers/products.controller.ts`
- Modify: `backend/src/routes/products.ts`
- Modify: `backend/src/__tests__/products.test.ts` only if the existing test stub needs to match the service boundary.

- [ ] Move product validation and Prisma calls into `products.service.ts`.
- [ ] Move HTTP response handling into `products.controller.ts`.
- [ ] Keep `routes/products.ts` as route binding only.
- [ ] Run the existing product tests to verify the public contract remains unchanged.

### Task 4: Verification

- [ ] Run `npm exec prisma validate -- --schema prisma/schema.prisma`.
- [ ] Run `npm run build`.
- [ ] Run `npm test`.
- [ ] Start the server with `npm run start`.
- [ ] Smoke test `GET /health`.
