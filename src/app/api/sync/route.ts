import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { push, since } = await request.json();
    const sinceDate = new Date(since || '1970-01-01T00:00:00.000Z');

    console.log(`[Sync API] Push payload received. Pulling updates since ${sinceDate.toISOString()}`);

    // Process push updates in dependency order
    await prisma.$transaction(async (tx) => {
      // 1. Categories
      if (push.categories && push.categories.length > 0) {
        for (const cat of push.categories) {
          if (cat.deleted === 1) {
            await tx.category.deleteMany({ where: { id: cat.id } });
          } else {
            await tx.category.upsert({
              where: { id: cat.id },
              update: { name: cat.name, banglaName: cat.banglaName, updatedAt: new Date(cat.updatedAt) },
              create: { id: cat.id, name: cat.name, banglaName: cat.banglaName, createdAt: new Date(cat.createdAt), updatedAt: new Date(cat.updatedAt) },
            });
          }
        }
      }

      // 2. Products
      if (push.products && push.products.length > 0) {
        for (const prod of push.products) {
          if (prod.deleted === 1) {
            await tx.product.deleteMany({ where: { id: prod.id } });
          } else {
            await tx.product.upsert({
              where: { id: prod.id },
              update: { name: prod.name, banglaName: prod.banglaName, categoryId: prod.categoryId, defaultUnit: prod.defaultUnit, updatedAt: new Date(prod.updatedAt) },
              create: { id: prod.id, name: prod.name, banglaName: prod.banglaName, categoryId: prod.categoryId, defaultUnit: prod.defaultUnit, createdAt: new Date(prod.createdAt), updatedAt: new Date(prod.updatedAt) },
            });
          }
        }
      }

      // 3. Product Aliases
      if (push.productAliases && push.productAliases.length > 0) {
        for (const alias of push.productAliases) {
          if (alias.deleted === 1) {
            await tx.productAlias.deleteMany({ where: { id: alias.id } });
          } else {
            await tx.productAlias.upsert({
              where: { id: alias.id },
              update: { alias: alias.alias, productId: alias.productId, updatedAt: new Date(alias.updatedAt) },
              create: { id: alias.id, alias: alias.alias, productId: alias.productId, createdAt: new Date(alias.createdAt), updatedAt: new Date(alias.updatedAt) },
            });
          }
        }
      }

      // 4. Markets
      if (push.markets && push.markets.length > 0) {
        for (const market of push.markets) {
          if (market.deleted === 1) {
            await tx.market.deleteMany({ where: { id: market.id } });
          } else {
            await tx.market.upsert({
              where: { id: market.id },
              update: { name: market.name, updatedAt: new Date(market.updatedAt) },
              create: { id: market.id, name: market.name, createdAt: new Date(market.createdAt), updatedAt: new Date(market.updatedAt) },
            });
          }
        }
      }

      // 5. Shopping Sessions
      if (push.shoppingSessions && push.shoppingSessions.length > 0) {
        for (const sess of push.shoppingSessions) {
          if (sess.deleted === 1) {
            await tx.shoppingSession.deleteMany({ where: { id: sess.id } });
          } else {
            await tx.shoppingSession.upsert({
              where: { id: sess.id },
              update: { date: new Date(sess.date), marketId: sess.marketId, notes: sess.notes, total: sess.total, updatedAt: new Date(sess.updatedAt) },
              create: { id: sess.id, date: new Date(sess.date), marketId: sess.marketId, notes: sess.notes, total: sess.total, createdAt: new Date(sess.createdAt), updatedAt: new Date(sess.updatedAt) },
            });
          }
        }
      }

      // 6. Shopping Items
      if (push.shoppingItems && push.shoppingItems.length > 0) {
        for (const item of push.shoppingItems) {
          if (item.deleted === 1) {
            await tx.shoppingItem.deleteMany({ where: { id: item.id } });
          } else {
            await tx.shoppingItem.upsert({
              where: { id: item.id },
              update: { sessionId: item.sessionId, productId: item.productId, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, totalPrice: item.totalPrice, updatedAt: new Date(item.updatedAt) },
              create: { id: item.id, sessionId: item.sessionId, productId: item.productId, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, totalPrice: item.totalPrice, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) },
            });
          }
        }
      }

      // 7. Budgets
      if (push.budgets && push.budgets.length > 0) {
        for (const budget of push.budgets) {
          if (budget.deleted === 1) {
            await tx.budget.deleteMany({ where: { id: budget.id } });
          } else {
            await tx.budget.upsert({
              where: { id: budget.id },
              update: { month: budget.month, year: budget.year, amount: budget.amount, updatedAt: new Date(budget.updatedAt) },
              create: { id: budget.id, month: budget.month, year: budget.year, amount: budget.amount, createdAt: new Date(budget.createdAt), updatedAt: new Date(budget.updatedAt) },
            });
          }
        }
      }
    });

    // Fetch changes to pull since last sync
    // This returns all records created/modified on the server since sinceDate
    const pullCategories = await prisma.category.findMany({ where: { updatedAt: { gt: sinceDate } } });
    const pullProducts = await prisma.product.findMany({ where: { updatedAt: { gt: sinceDate } } });
    const pullProductAliases = await prisma.productAlias.findMany({ where: { updatedAt: { gt: sinceDate } } });
    const pullMarkets = await prisma.market.findMany({ where: { updatedAt: { gt: sinceDate } } });
    const pullShoppingSessions = await prisma.shoppingSession.findMany({ where: { updatedAt: { gt: sinceDate } } });
    const pullShoppingItems = await prisma.shoppingItem.findMany({ where: { updatedAt: { gt: sinceDate } } });
    const pullBudgets = await prisma.budget.findMany({ where: { updatedAt: { gt: sinceDate } } });

    return NextResponse.json({
      success: true,
      pull: {
        categories: pullCategories,
        products: pullProducts,
        productAliases: pullProductAliases,
        markets: pullMarkets,
        shoppingSessions: pullShoppingSessions,
        shoppingItems: pullShoppingItems,
        budgets: pullBudgets,
      },
    });
  } catch (error: any) {
    console.error('[Sync API] Sync error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
