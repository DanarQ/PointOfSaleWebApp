# Core POS API Design

## Goal

Build the next backend slice for the POS API by introducing clear route, controller, and service layers for products, categories, and stock movements.

## Scope

- Keep existing product and auth API behavior compatible.
- Add category CRUD endpoints.
- Add stock movement endpoints for listing movements, listing a product's movements, and creating manual stock adjustments.
- Defer transactions, payments, and transaction items to a later slice.

## Architecture

Routes only bind URL paths to controller methods. Controllers parse HTTP input and translate service results into HTTP responses. Services hold validation, Prisma queries, and business rules.

Stock movement creation updates `Product.stock` and creates a `StockMovement` record in one Prisma transaction. This keeps stock totals and movement history consistent.

## Endpoints

- `GET /categories`
- `POST /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`
- `GET /stock-movements`
- `POST /stock-movements`
- `GET /products/:id/stock-movements`

## Error Handling

Invalid input returns `400`. Missing records return `404`. Duplicate unique category slugs return `409` where detected before write. Unexpected errors are allowed to surface to Express during this slice, matching the current backend style.

## Verification

Run:

- `npm exec prisma validate -- --schema prisma/schema.prisma`
- `npm run build`
- `npm test`
- `npm run start` and a live `GET /health` smoke test
