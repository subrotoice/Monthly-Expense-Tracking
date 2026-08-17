# BazarHisab Guidelines

This guide details development commands, style conventions, and database workflows for the BazarHisab project.

---

## 1. Development Commands

### Development Server
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Type Checking & Linting
```bash
npx tsc --noEmit
npm run lint
```

### Database Operations (Prisma v7)
```bash
# Generate Prisma Client
npx prisma generate

# Create and apply migrations (Neon Live DB)
npx prisma migrate dev --name <migration_name>

# Execute Database Seed Script
npx prisma db seed
```

---

## 2. Code Conventions & Style

### Client & Server Split
* **Client Components:** Always use `'use client';` for pages and components that interact with the local IndexedDB database, state hooks, or browser APIs.
* **Server Components:** Use for backend API routes under `src/app/api/` or statically rendered shells.

### Database Imports
* **Client-side Storage:** Use local Dexie DB instance:
  ```typescript
  import { localDb } from '@/db/localDb';
  ```
* **Server-side Storage:** Use Prisma Client singleton instance (supported by `@prisma/adapter-pg` driver adapter):
  ```typescript
  import { prisma } from '@/lib/prisma';
  ```

### Local-First Queries & Mutations
* **Live Queries:** Wrap local database fetches in Dexie's reactive live query wrapper:
  ```typescript
  const data = useLiveQuery(() => localDb.tableName.toArray());
  ```
* **Mutations & Soft Deletions:** Always update timestamps and mark sync flags:
  * For inserts/updates: set `synced: 0` and `updatedAt: new Date()`.
  * For deletions: set `deleted: 1`, `synced: 0`, and `updatedAt: new Date()`. Do not call `db.delete()` directly on the client; the sync scheduler will purge soft-deleted items after pushing them to Neon.

### Design System
* Use vanilla CSS and **Tailwind CSS v4** (`@import "tailwindcss"` syntax).
* Follow the mobile-first UI container. Centering classes are applied in the root layout wrapper to keep desktop previews structured cleanly.
