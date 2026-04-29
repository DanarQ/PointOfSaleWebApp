<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This project uses Next.js 16 App Router with React 19 and Tailwind CSS 4.
Framework APIs, conventions, rendering behavior, and project patterns may differ from your training data.
Before writing or changing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`.
Respect deprecation notices and do not assume older Next.js patterns are valid.

<!-- END:nextjs-agent-rules -->

# PointOfSaleWebApp Frontend Agent Guide

## Project Runtime

- Frontend runtime: `http://localhost:3000`
- Backend runtime: `http://localhost:5000`
- Backend API base URL must stay configurable through `NEXT_PUBLIC_API_URL`.
- Never hardcode localhost backend URLs inside components.

---

## Mandatory Pre-Check Before Coding

Before editing any file:

1. Inspect the current implementation first.
2. Read surrounding related files to understand the existing pattern.
3. Check if helper functions/components already exist.
4. Read relevant local Next.js docs if touching routing, server components, client components, caching, metadata, middleware, forms, or navigation.

Never start coding based purely on assumptions.

---

## Stability Rules

- Do not rewrite stable working features just for refactoring.
- Do not rename files, move folders, or change architecture unless the user explicitly requests it.
- Do not replace existing working components unless required for the requested feature.
- Prefer minimal surgical edits over broad rewrites.
- Preserve all currently working API contracts.
- Respect existing user edits and do not delete unrelated code.

---

## Backend Coordination Rules

- Before creating any new frontend API integration, inspect:
  - `../backend/README.md` when API contract details are needed
  - `src/lib/pos-api.ts`
- Do not invent backend endpoints.
- Do not mock fake API routes if backend support does not exist.
- If backend dependency is missing, clearly work around existing available routes or note the limitation.

---

## Existing App Structure (Follow This)

- App Router pages: `src/app`
- Dashboard routes: `src/app/(dashboard)`
- Shared shell/layout: `src/components/app-shell`
- Sidebar/navigation: `src/components/sidebar`
- Shared UI primitives: `src/components/ui`
- Product admin client: `src/components/products/ProductsClient.tsx`
- Category admin client: `src/components/categories/CategoriesClient.tsx`

Backend/session helpers:

- `src/lib/auth.ts`
- `src/lib/pos-api.ts`
- `src/lib/session.ts`
- `src/lib/use-auth-session.ts`

Do not create duplicate parallel structures if these already solve the need.

---

## Data Fetching Rules

- Reuse `src/lib/pos-api.ts` helpers whenever possible.
- Do not place raw fetch logic everywhere if helper abstraction exists.
- Use existing auth storage keys: `pos_token`, `pos_refresh_token`, and `pos_user`.
- Frontend write operations should send `Authorization: Bearer <pos_token>` when the backend requires authentication.
- Keep App Router server/client boundaries correct.
- Use async/await cleanly.
- Add loading state and error fallback for user-facing data requests.
- Prefer typed and predictable response handling.

---

## UI Design Direction (Strict)

This application is NOT a generic SaaS dashboard.

This application must feel like:

> Modern Retail POS / Checkout Control Workspace

Meaning:

- dense but readable
- operational
- fast to scan
- practical for repeated cashier/admin use
- supermarket workflow oriented

Avoid:

- startup landing page aesthetics
- oversized empty whitespace
- marketing widgets
- decorative-only panels
- random gradients
- playful consumer app styling

Keep:

- Green + Amber palette
- operational card layouts
- practical table layouts
- compact information hierarchy

Use shared theme from `src/app/globals.css` before introducing one-off styles.

Do not introduce visual inconsistency between pages.

---

## UI Consistency Rules

- New pages must visually match existing dashboard language.
- Reuse current spacing rhythm, border radius, shadow depth, cards, badges, tables, and button patterns.
- Reuse existing shadcn/ui primitives before creating custom replacements.
- Use lucide-react icons where operationally useful.
- Text should stay straightforward, concise, and business-operational.

---

## Coding Style Rules

- Keep changes incremental and focused.
- Follow existing import aliases and naming conventions.
- Prefer maintainability over cleverness.
- Avoid unnecessary abstractions.
- Do not create large new folder structures unless absolutely justified.
- Keep components readable and production-oriented.

---

## Decision Rule When Unsure

If unsure how to implement something:

1. inspect existing files
2. extend the current pattern
3. choose the least disruptive approach

Do not invent a brand new architecture when the repository already has one.

---

## Verification Checklist (Mandatory After Code Changes)

After UI, data, or runtime code changes, verify in this order:

1. `npm run lint`
2. `npm run build`
3. Start or reuse dev server on port 3000
4. Visually inspect major routes:

- `/`
- `/dashboard`
- `/pos`
- `/products`
- `/categories`
- `/transactions`

5. Confirm there are no obvious hydration, client/server, or runtime fetch issues.

If `npm run build` fails only with Windows `spawn EPERM` after successful compile/lint, treat it as environment-specific unless proven otherwise.

---

## Expected Agent Behavior

Act like a careful senior maintainer of an existing production POS application.

Not like an experimental code generator.

Priorities:

1. preserve stability
2. preserve consistency
3. preserve architecture
4. then implement requested feature
