'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/db/localDb';
import Link from 'next/link';
import { Search, Apple, ArrowRight, X } from 'lucide-react';
import { searchProducts } from '@/lib/searchHelper';

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch and group products
  const data = useLiveQuery(async () => {
    const categories = await localDb.categories.toArray();
    const catMap = new Map(categories.map(c => [c.id, c]));

    let productsList;
    if (searchQuery.trim().length >= 1) {
      // Use our fuzzy search helper
      productsList = await searchProducts(searchQuery);
    } else {
      // Just fetch all active products
      const prods = await localDb.products.where('deleted').equals(0).toArray();
      const aliases = await localDb.productAliases.where('deleted').equals(0).toArray();
      const aliasMap = new Map<string, string[]>();
      aliases.forEach((a) => {
        const list = aliasMap.get(a.productId) || [];
        list.push(a.alias);
        aliasMap.set(a.productId, list);
      });

      productsList = prods.map(p => {
        const cat = catMap.get(p.categoryId);
        return {
          ...p,
          categoryName: cat?.name,
          categoryBanglaName: cat?.banglaName,
          aliases: aliasMap.get(p.id) || [],
        };
      });
    }

    // Group by category
    const grouped: Record<string, { catName: string; catBangla: string | null; list: typeof productsList }> = {};

    productsList.forEach((p) => {
      const catId = p.categoryId;
      const catName = p.categoryName || 'Other';
      const catBangla = p.categoryBanglaName || 'অন্যান্য';

      if (!grouped[catId]) {
        grouped[catId] = { catName, catBangla, list: [] };
      }
      grouped[catId].list.push(p);
    });

    // Sort categories by name
    return Object.entries(grouped).sort((a, b) => a[1].catName.localeCompare(b[1].catName));
  }, [searchQuery]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Products Master Catalog</h2>
        <p className="text-xs text-gray-500">View and track historical prices of grocery items</p>
      </div>

      {/* Search Input */}
      <div className="flex items-center border border-gray-300 bg-white rounded-xl px-3.5 py-2.5 focus-within:border-green-600 focus-within:ring-2 focus-within:ring-green-600/10 transition-all shadow-2xs">
        <Search className="w-4.5 h-4.5 text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search products (e.g. Rice, পেঁয়াজ, alu)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-black placeholder-gray-400 font-semibold focus:outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-0.5 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Products list grouped by category */}
      {data.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center text-xs text-gray-500 font-medium">
          No matching products found.
        </div>
      ) : (
        <div className="space-y-5">
          {data.map(([catId, group]) => (
            <div key={catId} className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                {group.catName} <span className="text-3xs font-normal">({group.catBangla})</span>
              </h4>

              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-2xs divide-y divide-gray-100">
                {group.list.map((prod) => (
                  <Link
                    key={prod.id}
                    href={`/products/${prod.id}`}
                    className="flex justify-between items-center px-4 py-3.5 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-gray-800 block">
                        {prod.name}{' '}
                        {prod.banglaName && (
                          <span className="text-gray-400 font-normal">({prod.banglaName})</span>
                        )}
                      </span>
                      {prod.aliases && prod.aliases.length > 0 && (
                        <span className="text-3xs text-gray-400 block max-w-[280px] truncate">
                          Aliases: {prod.aliases.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-3xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                        {prod.defaultUnit || 'unit'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
