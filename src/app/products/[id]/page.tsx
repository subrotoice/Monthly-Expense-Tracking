'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/db/localDb';
import { ArrowLeft, TrendingUp, Calendar, Tag, Store, Check, Info } from 'lucide-react';

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  const router = useRouter();

  // Load product information and price history
  const data = useLiveQuery(async () => {
    const product = await localDb.products.get(productId);
    if (!product || product.deleted === 1) return null;

    const category = await localDb.categories.get(product.categoryId);
    const aliases = await localDb.productAliases.where('productId').equals(productId).toArray();
    const activeAliases = aliases.filter(a => a.deleted === 0).map(a => a.alias);

    // Get shopping items referencing this product
    const items = await localDb.shoppingItems
      .where('productId')
      .equals(productId)
      .toArray();

    const activeItems = items.filter(i => i.deleted === 0);

    // Fetch sessions associated with these items
    const sessions = await localDb.shoppingSessions.where('deleted').equals(0).toArray();
    const sessionMap = new Map(sessions.map(s => [s.id, s]));

    // Fetch markets map
    const markets = await localDb.markets.toArray();
    const marketMap = new Map(markets.map(m => [m.id, m.name]));

    // Build history list
    const historyList = activeItems
      .map((item) => {
        const session = sessionMap.get(item.sessionId);
        return {
          itemId: item.id,
          sessionId: item.sessionId,
          date: session ? session.date : new Date(),
          marketName: session && session.marketId ? marketMap.get(session.marketId) : 'Unknown Bazar',
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        };
      })
      // Sort by date descending
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate statistics
    if (historyList.length === 0) {
      return {
        product,
        category,
        aliases: activeAliases,
        historyList: [],
        stats: null,
      };
    }

    const prices = historyList.map(h => h.unitPrice);
    const latestPrice = historyList[0].unitPrice;
    const latestUnit = historyList[0].unit;
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const averagePrice = Number((prices.reduce((sum, p) => sum + p, 0) / prices.length).toFixed(2));

    return {
      product,
      category,
      aliases: activeAliases,
      historyList,
      stats: {
        latestPrice,
        latestUnit,
        lowestPrice,
        highestPrice,
        averagePrice,
        count: historyList.length,
      },
    };
  }, [productId]);

  if (data === null) {
    return (
      <div className="bg-red-50 p-4 rounded-xl text-center space-y-3">
        <Info className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-sm text-red-700 font-medium">Product not found.</p>
        <button onClick={() => router.back()} className="text-xs font-semibold text-red-600 underline">
          Go Back
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Loading product details...</p>
      </div>
    );
  }

  const { product, category, aliases, historyList, stats } = data;

  return (
    <div className="space-y-5">
      {/* Navigation Header */}
      <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-5 h-5 mr-1" />
        <span className="text-sm font-semibold">Back</span>
      </button>

      {/* Product Title */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{product.name}</h2>
            {product.banglaName && <h3 className="text-sm text-gray-500 font-medium">{product.banglaName}</h3>}
          </div>
          <span className="text-xs bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded-full">
            {category?.name || 'Category'}
          </span>
        </div>

        {aliases.length > 0 && (
          <div className="flex items-center space-x-1.5 flex-wrap pt-1.5">
            <Tag className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-3xs text-gray-400 font-bold uppercase tracking-wider mr-1">Search terms:</span>
            {aliases.map((alias) => (
              <span key={alias} className="text-3xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium">
                {alias}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Price Statistics Grid */}
      {stats ? (
        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-1">
            <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">Latest Price</span>
            <span className="text-2xl font-extrabold text-green-600 block">
              ৳{stats.latestPrice} <span className="text-xs font-medium text-gray-400">/ {stats.latestUnit}</span>
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-1">
            <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">Average Price</span>
            <span className="text-2xl font-extrabold text-gray-800 block">
              ৳{stats.averagePrice} <span className="text-xs font-medium text-gray-400">/ {stats.latestUnit}</span>
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-1">
            <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">Lowest Price</span>
            <span className="text-lg font-extrabold text-gray-800 block">
              ৳{stats.lowestPrice} <span className="text-xs font-medium text-gray-400">/ {stats.latestUnit}</span>
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-1">
            <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">Highest Price</span>
            <span className="text-lg font-extrabold text-gray-800 block">
              ৳{stats.highestPrice} <span className="text-xs font-medium text-gray-400">/ {stats.latestUnit}</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl p-6 text-center shadow-2xs">
          <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-medium">No purchase history recorded for this product yet.</p>
        </div>
      )}

      {/* Historical Purchases List */}
      {historyList.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 px-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Purchase Price History ({stats?.count} records)
          </h4>

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-2xs divide-y divide-gray-100">
            {historyList.map((record) => (
              <div key={record.itemId} className="p-4 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1 text-sm font-bold text-gray-800">
                    <Store className="w-3.5 h-3.5 text-gray-400 mr-0.5" />
                    <span>{record.marketName}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-3xs text-gray-400 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-gray-300" />
                    <span>
                      {new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span>• Qty: {record.quantity} {record.unit}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-gray-900 block">
                    ৳{record.unitPrice} <span className="text-3xs font-medium text-gray-400">/ {record.unit}</span>
                  </span>
                  <span className="text-3xs text-gray-400 block font-medium">
                    Total: ৳{record.totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
