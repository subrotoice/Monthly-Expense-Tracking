'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/db/localDb';
import Link from 'next/link';
import { Calendar, Store, Filter, Search, ArrowRight, X } from 'lucide-react';

export default function HistoryPage() {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarketId, setSelectedMarketId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCategoryExpenses, setShowCategoryExpenses] = useState(false);
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState('');

  // Fetch reference lists for filter dropdowns
  const markets = useLiveQuery(() => localDb.markets.where('deleted').equals(0).toArray()) || [];
  const categories = useLiveQuery(() => localDb.categories.where('deleted').equals(0).toArray()) || [];

  const categoryExpenseMonths = useLiveQuery(async () => {
    const [allSessions, items, products, allCategories] = await Promise.all([
      localDb.shoppingSessions.where('deleted').equals(0).toArray(),
      localDb.shoppingItems.where('deleted').equals(0).toArray(),
      localDb.products.where('deleted').equals(0).toArray(),
      localDb.categories.where('deleted').equals(0).toArray(),
    ]);
    const sessionsById = new Map(allSessions.map((session) => [session.id, session]));
    const categoryByProductId = new Map(products.map((product) => [product.id, product.categoryId]));
    const categoryMap = new Map(allCategories.map((category) => [category.id, category]));
    const monthMap = new Map<string, { label: string; total: number; categoryTotals: Map<string, number> }>();

    for (const session of allSessions) {
      const date = new Date(session.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      let month = monthMap.get(key);
      if (!month) {
        month = {
          label: date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
          total: 0,
          categoryTotals: new Map(),
        };
        monthMap.set(key, month);
      }
      month.total += session.total;
    }

    for (const item of items) {
      const session = sessionsById.get(item.sessionId);
      if (!session) continue;
      const date = new Date(session.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const month = monthMap.get(key);
      if (!month) continue;
      const categoryId = categoryByProductId.get(item.productId) || 'other';
      month.categoryTotals.set(categoryId, (month.categoryTotals.get(categoryId) || 0) + item.totalPrice);
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, month]) => ({
        key,
        label: month.label,
        total: month.total,
        categories: Array.from(month.categoryTotals.entries())
          .map(([categoryId, amount]) => ({
            name: categoryMap.get(categoryId)?.name || 'Other',
            banglaName: categoryMap.get(categoryId)?.banglaName || categoryMap.get(categoryId)?.name || 'অন্যান্য',
            amount,
            percentage: month.total > 0 ? Math.round((amount / month.total) * 100) : 0,
          }))
          .sort((a, b) => b.amount - a.amount),
      }));
  });

  // Fetch and filter sessions
  const data = useLiveQuery(async () => {
    let sessions = await localDb.shoppingSessions
      .where('deleted')
      .equals(0)
      .toArray();

    // Sort by date descending
    sessions.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Fetch markets map
    const marketMap = new Map(markets.map(m => [m.id, m.name]));

    // Filter by search (market name or notes)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sessions = sessions.filter((s) => {
        const marketName = (s.marketId ? marketMap.get(s.marketId) : '') || '';
        return (
          marketName.toLowerCase().includes(q) ||
          (s.notes || '').toLowerCase().includes(q)
        );
      });
    }

    // Filter by Market
    if (selectedMarketId) {
      sessions = sessions.filter(s => s.marketId === selectedMarketId);
    }

    // Filter by Date Range
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      sessions = sessions.filter(s => s.date.getTime() >= start.getTime());
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      sessions = sessions.filter(s => s.date.getTime() <= end.getTime());
    }

    // Filter by Category (requires checking shopping items)
    if (selectedCategoryId) {
      const products = await localDb.products.where('categoryId').equals(selectedCategoryId).toArray();
      const productIds = new Set(products.map(p => p.id));
      const items = await localDb.shoppingItems.where('deleted').equals(0).toArray();
      const sessionIdsWithCat = new Set(
        items.filter(item => productIds.has(item.productId)).map(item => item.sessionId)
      );
      sessions = sessions.filter(s => sessionIdsWithCat.has(s.id));
    }

    // Fetch items for sessions to display quick item overview
    const sessionIds = sessions.map(s => s.id);
    const sessionItems = sessionIds.length > 0 
      ? await localDb.shoppingItems
          .where('sessionId')
          .anyOf(sessionIds)
          .and(item => item.deleted === 0)
          .toArray()
      : [];

    const productIds = Array.from(new Set(sessionItems.map(item => item.productId)));
    const products = productIds.length > 0
      ? await localDb.products.where('id').anyOf(productIds).toArray()
      : [];
    const productNameMap = new Map(products.map(p => [p.id, p.banglaName || p.name]));

    const sessionItemsMap = new Map<string, string[]>();
    for (const item of sessionItems) {
      const prodName = productNameMap.get(item.productId);
      if (prodName) {
        const list = sessionItemsMap.get(item.sessionId) || [];
        if (!list.includes(prodName)) {
          list.push(prodName);
        }
        sessionItemsMap.set(item.sessionId, list);
      }
    }

    return {
      sessions,
      marketMap,
      sessionItemsMap,
    };
  }, [searchQuery, selectedMarketId, selectedCategoryId, startDate, endDate, markets]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedMarketId('');
    setSelectedCategoryId('');
    setStartDate('');
    setEndDate('');
  };

  const monthGroups = React.useMemo(() => {
    if (!data?.sessions) return [];
    
    const groups: {
      key: string;
      label: string;
      total: number;
      sessionCount: number;
      sessions: typeof data.sessions;
    }[] = [];
    const groupMap = new Map<string, typeof groups[0]>();

    for (const session of data.sessions) {
      const d = new Date(session.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let group = groupMap.get(key);
      if (!group) {
        group = {
          key,
          label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
          total: 0,
          sessionCount: 0,
          sessions: [],
        };
        groupMap.set(key, group);
        groups.push(group);
      }
      group.sessions.push(session);
      group.total += session.total;
      group.sessionCount += 1;
    }

    return groups;
  }, [data?.sessions]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Loading history...</p>
      </div>
    );
  }

  const { sessions, marketMap, sessionItemsMap } = data;
  const selectedExpenseData = categoryExpenseMonths?.find((month) => month.key === selectedExpenseMonth)
    || categoryExpenseMonths?.[0];

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bazar History</h2>
          <p className="text-xs text-gray-500">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} recorded
          </p>
        </div>
        {sessions.length > 0 && (
          <div className="text-right">
            <span className="text-3xs font-semibold text-gray-400 uppercase tracking-wider block">Grand Total</span>
            <span className="text-sm font-black text-gray-900">
              ৳{sessions.reduce((sum, s) => sum + s.total, 0).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {showCategoryExpenses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCategoryExpenses(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-expense-title"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-gray-50 p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="category-expense-title" className="text-base font-bold text-gray-900">Category Expenses</h3>
                <p className="mt-1 text-xs text-gray-500">Choose a month to see its category breakdown.</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setShowCategoryExpenses(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            {categoryExpenseMonths?.length ? (
              <>
                <label htmlFor="expense-month" className="mb-1.5 block text-xs font-semibold text-gray-600">Month</label>
                <select
                  id="expense-month"
                  value={selectedExpenseData?.key || ''}
                  onChange={(event) => setSelectedExpenseMonth(event.target.value)}
                  className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800"
                >
                  {categoryExpenseMonths.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}
                </select>
                {selectedExpenseData?.categories.length ? (
                  <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
                    <div className="mb-1 flex justify-between text-xs font-semibold text-gray-500">
                      <span>{selectedExpenseData.label} total</span>
                      <span className="text-gray-900">৳{selectedExpenseData.total.toLocaleString()}</span>
                    </div>
                    {selectedExpenseData.categories.map((category) => (
                      <div key={category.name} className="space-y-1.5">
                        <div className="flex justify-between gap-3 text-xs">
                          <span className="font-semibold text-gray-700">{category.name} <span className="font-normal text-gray-400">({category.banglaName})</span></span>
                          <span className="shrink-0 font-bold text-gray-900">৳{category.amount.toLocaleString()} ({category.percentage}%)</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-green-600" style={{ width: `${category.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-500">No category expenses recorded for this month.</p>}
              </>
            ) : <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-500">No older month category expenses found.</p>}
          </section>
        </div>
      )}

      {/* Search and Filter Trigger */}
      <div className="flex space-x-2">
        <div className="flex-1 flex items-center border border-gray-300 bg-white rounded-xl px-3.5 py-2.5 focus-within:border-green-600 focus-within:ring-2 focus-within:ring-green-600/10 transition-all shadow-2xs">
          <Search className="w-4.5 h-4.5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search notes or market..."
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
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors shadow-2xs ${
            showFilters || selectedMarketId || selectedCategoryId || startDate || endDate
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-3 animate-fadeIn">
          <div className="flex justify-between items-center pb-1">
            <span className="text-xs font-bold text-gray-800">Advanced Filters</span>
            <button onClick={handleResetFilters} className="text-3xs font-semibold text-red-600 hover:underline">
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Market Filter */}
            <div className="flex flex-col space-y-1">
              <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Market</label>
              <select
                value={selectedMarketId}
                onChange={(e) => setSelectedMarketId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-xs text-black bg-white focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
              >
                <option value="">All Markets</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col space-y-1">
              <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Category</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-xs text-black bg-white focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="flex flex-col space-y-1">
              <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-xs text-black bg-white focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col space-y-1">
              <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-xs text-black bg-white focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* History List */}
      {sessions.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center text-xs text-gray-500 font-medium">
          No matching shopping sessions found.
        </div>
      ) : (
        <div className="space-y-5">
          {monthGroups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <div className="flex items-center justify-between border-b-2 border-green-100 px-1 pb-2">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-extrabold text-gray-800">{group.label}</h3>
                  <span className="text-3xs font-medium text-gray-400">
                    {group.sessionCount} {group.sessionCount === 1 ? 'session' : 'sessions'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-bold text-gray-600">৳{group.total.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExpenseMonth(group.key);
                      setShowCategoryExpenses(true);
                    }}
                    className="cursor-pointer text-[10px] font-semibold text-green-700 hover:text-green-800 hover:underline"
                  >
                    Category expenses
                  </button>
                </div>
              </div>
              <div className="mt-2 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xs divide-y divide-gray-100">
                {group.sessions.map((session) => {
            const marketName = session.marketId
              ? (marketMap.get(session.marketId) || session.notes?.trim() || 'No Notes')
              : (session.notes?.trim() || 'No Notes');
            return (
              <Link
                key={session.id}
                href={`/market/${session.id}`}
                className="flex justify-between items-center px-4 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-bold text-gray-800 leading-none">{marketName}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-3xs text-gray-400 font-medium">
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-0.5 text-gray-300" />
                      {new Date(session.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {session.notes && (
                      <span className="max-w-[150px] truncate block text-gray-400">
                        • {session.notes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm font-extrabold text-gray-900">৳{session.total.toLocaleString()}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
