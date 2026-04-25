# Backend TypeScript + ESM Refactor Design

## Overview

Refactor the Express backend from CommonJS JavaScript to TypeScript with ES Modules (ESM). The backend is currently in early setup with minimal code, making this an ideal time to migrate.

## Goals

- TypeScript for type safety across the codebase
- ESM (`"type": "module"`) for modern module syntax (`import`/`export`)
- `tsx` as the dev runner (no compile step needed in development)
- Feature-based folder structure under `src/`

## Architecture

**Runtime:** `tsx` — runs TypeScript directly without a build step during development.

**Module system:** ESM (`"type": "module"` in package.json). All files use `import`/`export`.

**Pattern:** Controller → Prisma directly (no service layer). Each feature folder contains its own `routes.ts` and `controller.ts`.

## Folder Structure

```
backend/
  src/
    index.ts          ← Express app setup and server start
    db.ts             ← Prisma client singleton (replaces src/db.js)
    <feature>/
      routes.ts       ← Express Router for the feature
      controller.ts   ← Request handlers, queries Prisma directly
  prisma/
    schema.prisma
  prisma.config.ts    ← (unchanged)
  tsconfig.json       ← new
  package.json        ← updated
  .env                ← unchanged
```

## Changes

### package.json
- `"type": "module"` (was `"commonjs"`)
- Add `"dev"` script: `tsx watch src/index.ts`
- Add `"start"` script: `tsx src/index.ts`
- Add devDependencies: `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/cors`

### tsconfig.json (new)
- `target`: `ESNext`
- `module`: `NodeNext`
- `moduleResolution`: `NodeNext`
- `strict`: `true`
- `outDir`: `dist` (for future production builds)

### src/db.ts (replaces src/db.js)
- Import `PrismaClient` from generated path using ESM syntax
- Export singleton `prisma` instance

### src/index.ts (new)
- Import Express, cors, dotenv
- Mount feature routers (none yet — placeholder ready)
- Start server on `process.env.PORT ?? 3000`

## Out of Scope

- Production build setup (tsc compile to `/dist`) — deferred
- Feature implementation (products, orders, etc.) — separate tasks
- Testing setup — separate task
