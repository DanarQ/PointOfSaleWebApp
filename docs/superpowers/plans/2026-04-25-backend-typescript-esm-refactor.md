# Backend TypeScript + ESM Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Express backend from CommonJS JavaScript to TypeScript with ES Modules using `tsx` as the dev runner.

**Architecture:** All source files live under `src/` and use ESM `import`/`export` syntax. `tsx` runs TypeScript directly without a compile step in development. Feature folders (`src/<feature>/`) each contain `routes.ts` and `controller.ts`.

**Tech Stack:** Node.js, Express 5, TypeScript, tsx, Prisma 6 (prisma-client generator), dotenv, cors

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `backend/package.json` | Add `"type": "module"`, dev/start scripts, devDependencies |
| Create | `backend/tsconfig.json` | TypeScript compiler config |
| Delete | `backend/src/db.js` | Replaced by db.ts |
| Create | `backend/src/db.ts` | Prisma client singleton (ESM) |
| Create | `backend/src/index.ts` | Express app entry point |

> Note: This is a config/infrastructure refactor — no business logic to unit test. Verification is done by running the dev server and hitting the health endpoint.

---

### Task 1: Install TypeScript Dev Dependencies

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install packages**

Run from `backend/` directory:
```bash
npm install --save-dev typescript tsx @types/node @types/express @types/cors
```

Expected output: packages added, no errors.

- [ ] **Step 2: Verify package.json has new devDependencies**

`backend/package.json` devDependencies should now include:
```json
"@types/cors": "^2.x.x",
"@types/express": "^5.x.x",
"@types/node": "^x.x.x",
"tsx": "^x.x.x",
"typescript": "^x.x.x"
```

---

### Task 2: Update package.json — Module Type and Scripts

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Replace package.json content**

Set `backend/package.json` to:
```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "src/index.ts",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "prisma": "^6.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

> Keep the actual installed version numbers from your node_modules — just ensure `"type": "module"` and the scripts are present.

---

### Task 3: Create tsconfig.json

**Files:**
- Create: `backend/tsconfig.json`

- [ ] **Step 1: Create tsconfig.json**

Create `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "generated"]
}
```

---

### Task 4: Convert src/db.js → src/db.ts

**Files:**
- Delete: `backend/src/db.js`
- Create: `backend/src/db.ts`

- [ ] **Step 1: Delete src/db.js**

Delete the file `backend/src/db.js`.

- [ ] **Step 2: Create src/db.ts**

Create `backend/src/db.ts`:
```typescript
import { PrismaClient } from '../../generated/prisma/index.js'

const prisma = new PrismaClient()

export default prisma
```

> The import path `../../generated/prisma/index.js` is correct because the Prisma schema outputs to `backend/generated/prisma/` (configured in schema.prisma as `output = "../generated/prisma"`). With NodeNext module resolution, `.js` extension is required on all imports even for `.ts` source files.

---

### Task 5: Create src/index.ts

**Files:**
- Create: `backend/src/index.ts`

- [ ] **Step 1: Create src/index.ts**

Create `backend/src/index.ts`:
```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

---

### Task 6: Regenerate Prisma Client and Verify

**Files:**
- Generated: `backend/generated/prisma/` (auto-generated, do not edit)

- [ ] **Step 1: Regenerate Prisma client**

Run from `backend/`:
```bash
npx prisma generate
```

Expected output: `✔ Generated Prisma Client ...` with no errors.

- [ ] **Step 2: Start the dev server**

Run from `backend/`:
```bash
npm run dev
```

Expected output:
```
Server running on port 3000
```

- [ ] **Step 3: Test the health endpoint**

In a new terminal or browser, hit:
```
GET http://localhost:3000/health
```

Expected response:
```json
{ "status": "ok" }
```

If the server starts and health endpoint responds, the refactor is complete.
