# Product REST API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build product CRUD REST endpoints for the POS backend with consistent validation and JSON error responses.

**Architecture:** Extract the Express app into a reusable module, mount a dedicated product router, and keep validation close to the route handlers. Tests will exercise the HTTP surface using an in-memory Express app with Prisma mocked at the module boundary so behavior can be verified without a live database.

**Tech Stack:** TypeScript, Express 5, Prisma, PostgreSQL, Node test runner, Supertest

---

## File Map

- Create: `backend/src/app.ts`
- Create: `backend/src/routes/products.ts`
- Create: `backend/src/__tests__/products.test.ts`
- Modify: `backend/src/index.ts`
- Modify: `backend/package.json`

### Task 1: Add the test harness and first failing API tests

**Files:**
- Modify: `backend/package.json`
- Create: `backend/src/__tests__/products.test.ts`

- [ ] **Step 1: Add a test script and test dependency**

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "test": "node --import tsx --test src/__tests__/*.test.ts"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/node": "^25.6.0",
    "@types/pg": "^8.20.0",
    "@types/supertest": "^6.0.3",
    "prisma": "^7.8.0",
    "supertest": "^7.1.1",
    "tsx": "^4.21.0",
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 2: Write the first failing tests for health and product list**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

test('GET /health returns ok', async () => {
  const { app } = await import('../app.js')
  const response = await request(app).get('/health')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { status: 'ok' })
})

test('GET /products returns product list', async () => {
  const { app } = await import('../app.js')
  const response = await request(app).get('/products')

  assert.equal(response.status, 200)
  assert.ok(Array.isArray(response.body))
})
```

- [ ] **Step 3: Run the tests to verify they fail for the right reason**

Run: `npm test`

Expected: failure because `../app.js` or `/products` support does not exist yet.

- [ ] **Step 4: Commit the red test harness**

```bash
git add package.json package-lock.json src/__tests__/products.test.ts
git commit -m "test: add product api harness"
```

### Task 2: Extract the reusable app module and make the first tests pass

**Files:**
- Create: `backend/src/app.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write minimal app module**

```ts
import express from 'express'
import cors from 'cors'

export const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/products', (_req, res) => {
  res.json([])
})
```

- [ ] **Step 2: Make the server entry start the extracted app**

```ts
import 'dotenv/config'
import { app } from './app.js'

const PORT = process.env.PORT ?? 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

- [ ] **Step 3: Run the tests to verify they pass**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 4: Commit the first green state**

```bash
git add src/app.ts src/index.ts
git commit -m "refactor: extract express app module"
```

### Task 3: Add failing validation and CRUD behavior tests

**Files:**
- Modify: `backend/src/__tests__/products.test.ts`

- [ ] **Step 1: Expand tests to cover product CRUD**

```ts
test('POST /products rejects an empty name', async () => {
  const { app } = await import('../app.js')
  const response = await request(app).post('/products').send({ name: '   ', price: 10 })

  assert.equal(response.status, 400)
  assert.deepEqual(response.body, { error: 'name is required' })
})

test('GET /products/:id returns 404 when missing', async () => {
  const { app } = await import('../app.js')
  const response = await request(app).get('/products/999')

  assert.equal(response.status, 404)
  assert.deepEqual(response.body, { error: 'product not found' })
})

test('POST /products creates a product', async () => {
  const { app } = await import('../app.js')
  const response = await request(app).post('/products').send({ name: 'Coffee', price: 15000 })

  assert.equal(response.status, 201)
  assert.equal(response.body.name, 'Coffee')
  assert.equal(response.body.price, 15000)
})

test('PUT /products/:id updates a product', async () => {
  const { app } = await import('../app.js')
  const response = await request(app).put('/products/1').send({ name: 'Latte', price: 20000 })

  assert.equal(response.status, 200)
  assert.equal(response.body.name, 'Latte')
})

test('DELETE /products/:id deletes a product', async () => {
  const { app } = await import('../app.js')
  const response = await request(app).delete('/products/1')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { message: 'product deleted' })
})
```

- [ ] **Step 2: Run tests to verify they fail because handlers are missing**

Run: `npm test`

Expected: failures on `POST`, `PUT`, `DELETE`, and missing not-found behavior.

- [ ] **Step 3: Commit the red CRUD tests**

```bash
git add src/__tests__/products.test.ts
git commit -m "test: cover product crud behavior"
```

### Task 4: Implement the product router with validation and Prisma access

**Files:**
- Create: `backend/src/routes/products.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Create the product router**

```ts
import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

router.get('/', async (_req, res) => {
  const products = await prisma.product.findMany({ orderBy: { id: 'asc' } })
  res.json(products)
})

export default router
```

- [ ] **Step 2: Add validation helpers and full CRUD handlers**

```ts
function parseProductId(rawId: string) {
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }
  return id
}

function parseProductBody(body: unknown) {
  if (!body || typeof body !== 'object') {
    return { error: 'invalid request body' as const }
  }

  const { name, price } = body as { name?: unknown; price?: unknown }
  const normalizedName = typeof name === 'string' ? name.trim() : ''

  if (!normalizedName) {
    return { error: 'name is required' as const }
  }

  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    return { error: 'price must be a non-negative number' as const }
  }

  return { data: { name: normalizedName, price } as const }
}
```

Mount handlers for:

- `GET /`
- `GET /:id`
- `POST /`
- `PUT /:id`
- `DELETE /:id`

Return:

- `400` for invalid id/body
- `404` for missing products
- `201` for create
- `200` for success

- [ ] **Step 3: Mount the router in the app**

```ts
import productsRouter from './routes/products.js'

app.use('/products', productsRouter)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`

Expected: all CRUD endpoint tests pass.

- [ ] **Step 5: Commit the product API implementation**

```bash
git add src/app.ts src/routes/products.ts
git commit -m "feat: add product rest api"
```

### Task 5: Add robust test doubles for Prisma and cover edge cases

**Files:**
- Modify: `backend/src/__tests__/products.test.ts`

- [ ] **Step 1: Mock the Prisma module per test case**

```ts
const productApi = {
  findMany: async () => [],
  findUnique: async () => null,
  create: async ({ data }: { data: { name: string; price: number } }) => ({ id: 1, ...data }),
  update: async ({ where, data }: { where: { id: number }; data: { name: string; price: number } }) => ({
    id: where.id,
    ...data,
  }),
  delete: async ({ where }: { where: { id: number } }) => ({ id: where.id }),
}
```

Inject this mock before importing `../app.js` so tests are deterministic and do not require a database connection.

- [ ] **Step 2: Add edge-case tests**

```ts
test('GET /products/:id rejects invalid id', async () => {
  const { app } = await import('../app.js')
  const response = await request(app).get('/products/abc')

  assert.equal(response.status, 400)
  assert.deepEqual(response.body, { error: 'invalid product id' })
})

test('POST /products rejects negative price', async () => {
  const { app } = await import('../app.js')
  const response = await request(app).post('/products').send({ name: 'Tea', price: -1 })

  assert.equal(response.status, 400)
  assert.deepEqual(response.body, { error: 'price must be a non-negative number' })
})
```

- [ ] **Step 3: Run tests to verify all pass**

Run: `npm test`

Expected: full test suite passes with no database access.

- [ ] **Step 4: Commit the test hardening**

```bash
git add src/__tests__/products.test.ts
git commit -m "test: isolate product api from prisma"
```

### Task 6: Verify the finished API manually

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Ensure a convenient start script exists**

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "test": "node --import tsx --test src/__tests__/*.test.ts"
  }
}
```

- [ ] **Step 2: Run automated verification**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Start the backend**

Run: `npm run start`

Expected: `Server running on port 3000`

- [ ] **Step 4: Smoke-test the API**

Run:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/products
```

Expected:

- `/health` returns `{"status":"ok"}`
- `/products` returns a JSON array

- [ ] **Step 5: Commit the verified result**

```bash
git add package.json package-lock.json
git commit -m "chore: verify product api workflow"
```
