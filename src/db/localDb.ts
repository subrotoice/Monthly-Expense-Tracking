import Dexie, { type Table } from 'dexie';

export interface LocalCategory {
  id: string;
  name: string;
  banglaName?: string | null;
  createdAt: Date;
  updatedAt: Date;
  synced: number; // 0 = unsynced, 1 = synced
  deleted: number; // 0 = active, 1 = deleted
}

export interface LocalProduct {
  id: string;
  name: string;
  banglaName?: string | null;
  categoryId: string;
  defaultUnit?: string | null;
  createdAt: Date;
  updatedAt: Date;
  synced: number;
  deleted: number;
}

export interface LocalProductAlias {
  id: string;
  productId: string;
  alias: string;
  createdAt: Date;
  updatedAt: Date;
  synced: number;
  deleted: number;
}

export interface LocalMarket {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  synced: number;
  deleted: number;
}

export interface LocalShoppingSession {
  id: string;
  date: Date;
  marketId?: string | null;
  notes?: string | null;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  synced: number;
  deleted: number;
}

export interface LocalShoppingItem {
  id: string;
  sessionId: string;
  productId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
  synced: number;
  deleted: number;
}

export interface LocalBudget {
  id: string;
  month: number;
  year: number;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
  synced: number;
  deleted: number;
}

export interface LocalPersonalExpense {
  id: string;
  title: string;
  amount: number;
  date: Date;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  synced: number; // 0 = unsynced, 1 = synced
  deleted: number; // 0 = active, 1 = deleted
}

class BazarHisabDexie extends Dexie {
  categories!: Table<LocalCategory, string>;
  products!: Table<LocalProduct, string>;
  productAliases!: Table<LocalProductAlias, string>;
  markets!: Table<LocalMarket, string>;
  shoppingSessions!: Table<LocalShoppingSession, string>;
  shoppingItems!: Table<LocalShoppingItem, string>;
  budgets!: Table<LocalBudget, string>;
  personalExpenses!: Table<LocalPersonalExpense, string>;

  constructor() {
    super('BazarHisabDB');
    this.version(1).stores({
      categories: 'id, name, synced, deleted',
      products: 'id, name, categoryId, synced, deleted',
      productAliases: 'id, productId, alias, synced, deleted',
      markets: 'id, name, synced, deleted',
      shoppingSessions: 'id, date, marketId, synced, deleted',
      shoppingItems: 'id, sessionId, productId, synced, deleted',
      budgets: 'id, [month+year], synced, deleted',
    });
    this.version(2).stores({
      personalExpenses: 'id, date, synced, deleted',
    });
  }
}

export const localDb = new BazarHisabDexie();
