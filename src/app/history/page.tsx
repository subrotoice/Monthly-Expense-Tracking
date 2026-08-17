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

  // Fetch reference lists for filter dropdowns
  const markets = useLiveQuery(() => localDb.markets.where('deleted').equals(0).toArray()) || [];
  const categories = useLiveQuery(() => localDb.categories.where('deleted').equals(0).toArray()) || [];

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

    return {
      sessions,
      marketMap,
    };
  }, [searchQuery, selectedMarketId, selectedCategoryId, startDate, endDate, markets]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedMarketId('');
    setSelectedCategoryId('');
    setStartDate('');
    setEndDate('');
  };

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Loading history...</p>
      </div>
    );
  }

  const { sessions, marketMap } = data;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Bazar History</h2>
        <p className="text-xs text-gray-500">Search and filter your past shopping sessions</p>
      </div>

      {/* Search and Filter Trigger */}
      <div className="flex space-x-2">
        <div className="flex-1 flex items-center border border-gray-200 bg-white rounded-xl px-3 py-2 focus-within:border-green-600 shadow-2xs">
          <Search className="w-4.5 h-4.5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search notes or market..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
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
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none"
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
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none"
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
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col space-y-1">
              <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
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
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-2xs divide-y divide-gray-100">
          {sessions.map((session) => {
            const marketName = session.marketId ? marketMap.get(session.marketId) : 'Unknown Bazar';
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
      )}
    </div>
  );
}
