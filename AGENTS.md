<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BazarHisab Project & Architecture Log

This document outlines the core architecture and development progress of **BazarHisab**, a mobile-first, local-first grocery and household expense tracking app built for personal/household use in Bangladesh.

---

## 1. Architectural Decisions

* **Deployment Model:** Single-user / Private deployment. The app stores a single household's data (no login pages).
* **ID Strategy:** **UUIDs** are used for all entities. This allows clients to generate new records (such as shopping items and custom products) offline without ID collisions when syncing to the database.
* **Storage Single Source of Truth:**
  * **Client-side:** **IndexedDB** using **Dexie.js** (reactive local-first queries using `useLiveQuery` hooks).
  * **Server-side:** **PostgreSQL (Neon)** using **Prisma ORM (v7)**.
* **Price History Representation:** Price history of products is calculated dynamically by querying `ShoppingItem` rows (unitPrice, quantity, date). No separate PriceHistory table is required.

---

## 2. Synchronization Strategy (Offline-First)

1. **State Flags:** Every IndexedDB record contains a `synced` column (`0` = dirty, `1` = clean) and a `deleted` column (`0` = active, `1` = soft-deleted).
2. **Push:** The client checks for records with `synced === 0`. It sends them to `/api/sync` in the order of relationships (`Category` -> `Product` -> `ProductAlias` -> `Market` -> `ShoppingSession` -> `ShoppingItem` -> `Budget`). The server deletes soft-deleted records and upserts active ones.
3. **Pull:** The client fetches server updates since the client's `lastSyncTimestamp`. It applies them to IndexedDB using a **Last-Write-Wins (LWW)** model based on `updatedAt`.
4. **Permanent Purge:** Soft-deleted local records are deleted permanently from IndexedDB after a successful sync confirmation.

---

## 3. Product Search Logic (Bangla, English & Banglish)

* Products are search-matched client-side using `src/lib/searchHelper.ts`.
* The search query is matched against the product's English name, Bangla name, and custom search aliases (e.g. typing `pey`, `piaz`, or `onion` returns `পেঁয়াজ`).
* In-memory search allows instant partial matches while remaining fully functional offline.

---

## 4. Short Project Structure

```text
├── prisma/
│   ├── schema.prisma   # PostgreSQL Models
│   └── seed.ts         # Default categories, products, aliases
├── src/
│   ├── app/
│   │   ├── page.tsx          # Dashboard
│   │   ├── budget/page.tsx   # Budget settings
│   │   ├── history/page.tsx  # Logs & filters
│   │   ├── market/           # Add/edit sessions (/new, /[id])
│   │   ├── products/         # Master products (/page.tsx, /[id])
│   │   ├── reports/page.tsx  # Stats breakdown
│   │   └── settings/page.tsx # JSON/CSV export & backup
│   ├── components/     # Reusable UI (Header, Navigation, Form)
│   ├── db/
│   │   ├── localDb.ts      # IndexedDB / Dexie.js Schema
│   │   └── syncManager.ts  # Push/pull client sync logic
│   └── lib/
│       ├── prisma.ts       # Prisma Pg Adapter instance
│       └── searchHelper.ts # Bangla/English/Banglish fuzzy search
```

---

## 5. Database Schema Summary (UUIDs)

* **`Category`**: Groceries categories (`id`, `name`, `banglaName`)
* **`Product`**: Items dictionary (`id`, `name`, `banglaName`, `categoryId`, `defaultUnit`)
* **`ProductAlias`**: Synonyms for search (`id`, `productId`, `alias` [unique])
* **`Market`**: Bazaar names (`id`, `name`)
* **`ShoppingSession`**: Single market trip summary (`id`, `date`, `marketId`, `notes`, `total`)
* **`ShoppingItem`**: Items inside a session (`id`, `sessionId`, `productId`, `quantity`, `unit`, `unitPrice`, `totalPrice`)
* **`Budget`**: Monthly planning limits (`id`, `month`, `year`, `amount` [unique month+year])
