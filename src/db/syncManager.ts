import { localDb } from './localDb';

const LAST_SYNC_KEY = 'bazar_hisab_last_sync';

export interface SyncPayload {
  categories: any[];
  products: any[];
  productAliases: any[];
  markets: any[];
  shoppingSessions: any[];
  shoppingItems: any[];
  budgets: any[];
  personalExpenses?: any[];
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export class SyncManager {
  private static isSyncing = false;

  static getLastSyncTime(): string {
    if (typeof window === 'undefined') return '1970-01-01T00:00:00.000Z';
    return localStorage.getItem(LAST_SYNC_KEY) || '1970-01-01T00:00:00.000Z';
  }

  static setLastSyncTime(time: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_SYNC_KEY, time);
    }
  }

  static async performSync(onStatusChange?: (status: SyncStatus) => void): Promise<void> {
    if (this.isSyncing) return;
    if (typeof window !== 'undefined' && !navigator.onLine) {
      onStatusChange?.('offline');
      return;
    }

    this.isSyncing = true;
    onStatusChange?.('syncing');

    try {
      console.log('[SyncManager] Starting sync...');

      // 1. Collect all local dirty (synced === 0) records
      const dirtyCategories = await localDb.categories.where('synced').equals(0).toArray();
      const dirtyProducts = await localDb.products.where('synced').equals(0).toArray();
      const dirtyProductAliases = await localDb.productAliases.where('synced').equals(0).toArray();
      const dirtyMarkets = await localDb.markets.where('synced').equals(0).toArray();
      const dirtySessions = await localDb.shoppingSessions.where('synced').equals(0).toArray();
      const dirtyItems = await localDb.shoppingItems.where('synced').equals(0).toArray();
      const dirtyBudgets = await localDb.budgets.where('synced').equals(0).toArray();
      const dirtyPersonalExpenses = await localDb.personalExpenses.where('synced').equals(0).toArray();

      const pushPayload: SyncPayload = {
        categories: dirtyCategories,
        products: dirtyProducts,
        productAliases: dirtyProductAliases,
        markets: dirtyMarkets,
        shoppingSessions: dirtySessions,
        shoppingItems: dirtyItems,
        budgets: dirtyBudgets,
        personalExpenses: dirtyPersonalExpenses,
      };

      const lastSync = this.getLastSyncTime();
      const currentSyncTime = new Date().toISOString();

      // 2. Push dirty changes to server & pull latest changes since last sync
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          push: pushPayload,
          since: lastSync,
        }),
      });

      if (!response.ok) {
        let serverError = `Server returned status: ${response.status}`;
        try {
          const errBody = await response.json();
          if (errBody?.error) serverError += ` — ${errBody.error}`;
        } catch {
          // response body wasn't JSON, ignore
        }
        throw new Error(serverError);
      }

      const syncResult = await response.json();
      const pullPayload: SyncPayload = syncResult.pull;

      // 3. Mark locally pushed records as synced = 1
      // If a local record was marked as deleted = 1 and pushed, we can now permanently delete it from local IndexedDB
      await localDb.transaction('rw', [
        localDb.categories,
        localDb.products,
        localDb.productAliases,
        localDb.markets,
        localDb.shoppingSessions,
        localDb.shoppingItems,
        localDb.budgets,
        localDb.personalExpenses
      ], async () => {
        // Categories
        for (const cat of dirtyCategories) {
          if (cat.deleted === 1) {
            await localDb.categories.delete(cat.id);
          } else {
            await localDb.categories.update(cat.id, { synced: 1 });
          }
        }
        // Products
        for (const prod of dirtyProducts) {
          if (prod.deleted === 1) {
            await localDb.products.delete(prod.id);
          } else {
            await localDb.products.update(prod.id, { synced: 1 });
          }
        }
        // Product Aliases
        for (const alias of dirtyProductAliases) {
          if (alias.deleted === 1) {
            await localDb.productAliases.delete(alias.id);
          } else {
            await localDb.productAliases.update(alias.id, { synced: 1 });
          }
        }
        // Markets
        for (const market of dirtyMarkets) {
          if (market.deleted === 1) {
            await localDb.markets.delete(market.id);
          } else {
            await localDb.markets.update(market.id, { synced: 1 });
          }
        }
        // Sessions
        for (const sess of dirtySessions) {
          if (sess.deleted === 1) {
            await localDb.shoppingSessions.delete(sess.id);
          } else {
            await localDb.shoppingSessions.update(sess.id, { synced: 1 });
          }
        }
        // Items
        for (const item of dirtyItems) {
          if (item.deleted === 1) {
            await localDb.shoppingItems.delete(item.id);
          } else {
            await localDb.shoppingItems.update(item.id, { synced: 1 });
          }
        }
        // Budgets
        for (const budget of dirtyBudgets) {
          if (budget.deleted === 1) {
            await localDb.budgets.delete(budget.id);
          } else {
            await localDb.budgets.update(budget.id, { synced: 1 });
          }
        }
        // Personal Expenses
        for (const exp of dirtyPersonalExpenses) {
          if (exp.deleted === 1) {
            await localDb.personalExpenses.delete(exp.id);
          } else {
            await localDb.personalExpenses.update(exp.id, { synced: 1 });
          }
        }

        // 4. Apply pulled changes from server (Last-Write-Wins based on updatedAt)
        // Helper to upsert pulled records
        const applyPull = async (table: any, items: any[]) => {
          for (const item of items) {
            const existing = await table.get(item.id);
            // Convert date strings from JSON to Date objects
            const itemDates = {
              ...item,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
            };
            if (item.date) {
              itemDates.date = new Date(item.date);
            }

            if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
              if (item.deleted === 1) {
                await table.delete(item.id);
              } else {
                await table.put({
                  ...itemDates,
                  synced: 1,
                  deleted: 0,
                });
              }
            }
          }
        };

        await applyPull(localDb.categories, pullPayload.categories);
        await applyPull(localDb.products, pullPayload.products);
        await applyPull(localDb.productAliases, pullPayload.productAliases);
        await applyPull(localDb.markets, pullPayload.markets);
        await applyPull(localDb.shoppingSessions, pullPayload.shoppingSessions);
        await applyPull(localDb.shoppingItems, pullPayload.shoppingItems);
        await applyPull(localDb.budgets, pullPayload.budgets);
        if (pullPayload.personalExpenses) {
          await applyPull(localDb.personalExpenses, pullPayload.personalExpenses);
        }
      });

      this.setLastSyncTime(currentSyncTime);
      console.log('[SyncManager] Sync completed successfully.');
      onStatusChange?.('success');
    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
      onStatusChange?.('error');
    } finally {
      this.isSyncing = false;
    }
  }
}
