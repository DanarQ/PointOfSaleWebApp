<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# PointOfSaleWebApp Frontend Agent Guide

## Project Runtime

- This frontend is a Next.js 16 App Router app using React 19 and Tailwind CSS 4.
- The frontend normally runs on `http://localhost:3000`.
- The backend normally runs on `http://localhost:5000`.
- Keep API helpers configurable with `NEXT_PUBLIC_API_URL`; do not hardcode the frontend port as the backend URL.

## Before Coding

- Read the relevant local Next.js docs under `node_modules/next/dist/docs/` before touching Next-specific code.
- Check current files before making assumptions; this repo has already moved through React/Vite and Next.js phases.
- Respect existing user edits. Do not reset, delete, or rewrite unrelated files unless the user explicitly asks.
- If you want to get context for backend you can Read README.md

## App Structure

- App Router routes live in `src/app`.
- Dashboard routes live under `src/app/(dashboard)`.
- Shared shell components live in `src/components/app-shell` and `src/components/sidebar`.
- shadcn/ui primitives live in `src/components/ui`.
- Product and category admin clients live in:
  - `src/components/products/ProductsClient.tsx`
  - `src/components/categories/CategoriesClient.tsx`
- Backend API helpers live in:
  - `src/lib/auth.ts`
  - `src/lib/pos-api.ts`
  - `src/lib/session.ts`
  - `src/lib/use-auth-session.ts`

## Design Direction

- Preserve the approved POS direction: Modern Retail / Checkout Control.
- The UI should feel like an operational supermarket POS/admin workspace, not a generic starter dashboard.
- Keep the current Green + Amber direction unless the user asks to change it.
- Use the shared theme in `src/app/globals.css` and shared UI primitives before adding one-off page styles.
- Keep layouts dense, clear, and practical for repeated POS/admin work.
- Avoid `next/font/google` unless it is already proven to work locally; prefer system/local fonts for reliable offline builds.

## Auth And Data

- Login/auth state currently uses localStorage keys such as `pos_token`, `pos_refresh_token`, and `pos_user`.
- Write operations to POS admin APIs should send `Authorization: Bearer <pos_token>`.
- Product form v1 intentionally focuses on core POS fields: `name`, `price`, `sku`, `barcode`, `category`, `stock`, `unit`, and `isActive`.
- Backend-supported fields such as `costPrice`, `description`, and `imageUrl` are deferred unless the user asks to add them.

## Verification

- Prefer this verification order for frontend changes:
  1. `npm run lint`
  2. `npm run build`
  3. Start or reuse the dev server on port 3000
  4. Check important routes such as `/`, `/dashboard`, `/pos`, `/products`, `/categories`, and `/transactions`
- If `npm run build` fails with `Error: spawn EPERM` on Windows after compile/lint looks healthy, treat it as environment-specific until revalidated outside the sandbox.
- When the user asks to inspect or fix UI visually, use a real browser or screenshot-based check before saying the UI is verified.

## Coding Style

- Keep changes focused and incremental.
- Prefer existing patterns, aliases, components, and helper APIs.
- Use lucide-react icons where appropriate for POS/admin controls.
- Keep text straightforward and operational.
- Do not introduce large new folder structures unless the app has clearly grown into them.

<!-- END:nextjs-agent-rules -->
