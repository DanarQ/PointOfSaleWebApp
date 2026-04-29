# PointOfSaleWebApp Monorepo Guide

This repository contains two isolated subprojects:

- `frontend/` = Next.js 16 POS frontend
- `backend/` = Express + Prisma POS backend

Always read the nearest AGENTS.md inside the active subproject before making changes.

Do not mix frontend conventions with backend conventions.
Preserve API contract consistency between both projects.

## Runtime Map

- Frontend runs on `http://localhost:3000`.
- Backend runs on `http://localhost:5000`.

## Cross-Project Rules

- If a task touches both frontend and backend, inspect both subproject `AGENTS.md` files first.
- Do not run destructive commands such as database reset, migration deletion, or broad file cleanup without explicit user approval.
- Verify changes using the checklist from the subproject that was changed.
