# Product REST API Design

**Date:** 2026-04-25
**Scope:** Backend product endpoints for the Point of Sale application

## Goal

Add a focused REST API for product management on top of the existing Express, Prisma, and PostgreSQL backend so the frontend can create, view, update, and delete products through stable JSON endpoints.

## Existing Context

- The backend already uses Express with JSON middleware and CORS.
- Prisma is configured with PostgreSQL and currently exposes a single `Product` model.
- The server currently only exposes `GET /health`.
- The current `Product` schema contains:
  - `id: Int`
  - `name: String`
  - `price: Float`

## Recommended Approach

Keep the implementation small but structured:

- Keep `src/index.ts` responsible for server setup and route registration.
- Add a dedicated product route module so product logic does not accumulate in the entry file.
- Reuse the existing Prisma client from `src/db.ts`.
- Implement input validation directly in the route layer because the scope is still narrow.

This gives us a clean path to add categories, inventory, and transactions later without introducing extra abstraction too early.

## API Design

### Endpoints

- `GET /products`
  - Returns all products ordered by `id` ascending.
- `GET /products/:id`
  - Returns a single product by numeric id.
- `POST /products`
  - Creates a product from JSON body `{ name, price }`.
- `PUT /products/:id`
  - Replaces product fields from JSON body `{ name, price }`.
- `DELETE /products/:id`
  - Deletes a product by id.

### Success Responses

- `GET /products`: `200`
- `GET /products/:id`: `200`
- `POST /products`: `201`
- `PUT /products/:id`: `200`
- `DELETE /products/:id`: `200`

### Error Responses

Use a consistent JSON error shape:

```json
{
  "error": "Human readable message"
}
```

Cases:

- Invalid `id` parameter: `400`
- Missing or empty `name`: `400`
- Missing, non-numeric, or negative `price`: `400`
- Product not found: `404`
- Unexpected server/database error: `500`

## Validation Rules

- `name` must be a string after trimming whitespace and must not be empty.
- `price` must be a number and must be greater than or equal to `0`.
- Route `id` must parse to a positive integer.

## File Responsibilities

- `backend/src/index.ts`
  - Express app setup, common middleware, and route mounting.
- `backend/src/db.ts`
  - Prisma client setup only.
- `backend/src/routes/products.ts`
  - Product endpoints, parameter/body validation, and Prisma calls.
- `backend/src/app.ts`
  - Optional extraction target if tests need the Express app without starting the server.
- `backend/src/__tests__/products.test.ts`
  - Endpoint-level tests for product CRUD behavior.

## Testing Strategy

Use focused endpoint tests that verify:

- Health check still works.
- Product list returns data.
- Create rejects invalid payloads.
- Create succeeds with valid payload.
- Get by id returns `404` for missing product.
- Update validates input and updates an existing product.
- Delete removes an existing product.

Because the project does not yet include a test runner, the implementation may need a lightweight test stack added first. If that turns out to be heavier than justified for this iteration, the fallback is to verify endpoints manually and leave the test harness as the next backend task. The preference remains automated tests first if the setup is straightforward.

## Out of Scope

- Authentication or authorization
- Category management
- Inventory stock tracking
- Transaction or cart endpoints
- Pagination, search, or sorting controls

## Result

After this work, the backend will expose a complete and predictable product CRUD API that the POS frontend can consume immediately, while keeping the codebase ready for later POS features.
