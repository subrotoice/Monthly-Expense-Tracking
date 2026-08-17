'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/db/localDb';
import { ArrowLeft, TrendingUp, Calendar, Store, PieChart, Apple, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch reports data
  const data = useLiveQuery(async () => {
    // Start/End timestamps of selected month
    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    // Get active sessions
    const sessions = await localDb.shoppingSessions
      .where('deleted')
      .equals(0)
      .toArray();

    // Filter sessions in selected month
    const monthSessions = sessions.filter((s) => {
      const time = s.date.getTime();
      return time >= startMs && time <= endMs;
    });

    const totalSpent = monthSessions.reduce((sum, s) => sum + s.total, 0);
    const totalSessions = monthSessions.length;
    const averageSessionSpend = totalSessions > 0 ? Number((totalSpent / totalSessions).toFixed(2)) : 0;

    // Fetch related items, products, categories, markets
    const items = await localDb.shoppingItems.where('deleted').equals(0).toArray();
    const products = await localDb.products.toArray();
    const categories = await localDb.categories.toArray();
    const marketsList = await localDb.markets.toArray();

    const prodToCatMap = new Map(products.map(p => [p.id, p.categoryId]));
    const catMap = new Map(categories.map(c => [c.id, c]));
    const marketMap = new Map(marketsList.map(m => [m.id, m.name]));
    const prodMap = new Map(products.map(p => [p.id, p]));

    // 1. Calculate spending by Category
    const categoryTotals: Record<string, number> = {};
    const itemCounts: Record<string, number> = {};

    // 2. Calculate spending by Market
    const marketTotals: Record<string, number> = {};

    // 3. Calculate product purchase frequency
    const productFrequency: Record<string, { name: string; bangla: string | null; count: number; spend: number }> = {};

    const monthSessionIds = new Set(monthSessions.map(s => s.id));

    items.forEach((item) => {
      if (monthSessionIds.has(item.sessionId)) {
        // Category spend
        const catId = prodToCatMap.get(item.productId);
        if (catId) {
          categoryTotals[catId] = (categoryTotals[catId] || 0) + item.totalPrice;
        }

        // Product frequency
        const prod = prodMap.get(item.productId);
        if (prod) {
          if (!productFrequency[item.productId]) {
            productFrequency[item.productId] = {
              name: prod.name,
              bangla: prod.banglaName || null,
              count: 0,
              spend: 0,
            };
          }
          productFrequency[item.productId].count += 1;
          productFrequency[item.productId].spend += item.totalPrice;
        }
      }
    });

    // Market spend
    monthSessions.forEach((s) => {
      const marketId = s.marketId || 'unknown';
      marketTotals[marketId] = (marketTotals[marketId] || 0) + s.total;
    });

    // Format Category list
    const categoryReport = Object.entries(categoryTotals).map(([catId, total]) => {
      const cat = catMap.get(catId);
      return {
        name: cat ? cat.name : 'Unknown',
        banglaName: cat ? cat.banglaName : 'অন্যান্য',
        amount: total,
        percentage: totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0,
      };
    }).sort((a, b) => b.amount - a.amount);

    // Format Market list
    const marketReport = Object.entries(marketTotals).map(([mId, total]) => {
      return {
        name: mId === 'unknown' ? 'Local Bazar' : marketMap.get(mId) || 'Unknown Bazar',
        amount: total,
        percentage: totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0,
      };
    }).sort((a, b) => b.amount - a.amount);

    // Format Product Frequency list
    const productReport = Object.values(productFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5 products

    // Fetch budget for this month
    const budgetRecord = await localDb.budgets
      .where('[month+year]')
      .equals([selectedMonth, selectedYear])
      .first();
    const budget = budgetRecord ? budgetRecord.amount : 20000;

    return {
      totalSpent,
      totalSessions,
      averageSessionSpend,
      categoryReport,
      marketReport,
      productReport,
      budget,
    };
  }, [selectedMonth, selectedYear]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Generating analysis...</p>
      </div>
    );
  }

  const { totalSpent, totalSessions, averageSessionSpend, categoryReport, marketReport, productReport, budget } = data;
  const budgetPercentage = budget > 0 ? Math.min(Math.round((totalSpent / budget) * 100), 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <h2 className="text-base font-bold text-gray-900">Spending Analysis</h2>
        <div className="w-12"></div>
      </div>

      {/* Select Month/Year Panel */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs grid grid-cols-2 gap-3">
        <div className="flex flex-col space-y-1">
          <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-green-600"
          >
            {monthNames.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-green-600"
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-1">
          <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">Total Spent</span>
          <span className="text-xl font-extrabold text-gray-900 block">৳{totalSpent.toLocaleString()}</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-1">
          <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">Bazar Count</span>
          <span className="text-xl font-extrabold text-gray-900 block">{totalSessions} sessions</span>
        </div>
      </div>

      {totalSpent === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center shadow-2xs">
          <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-medium">No purchase records found for this month.</p>
        </div>
      ) : (
        <>
          {/* Budget status progress banner */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-500">Budget Progress ({monthNames[selectedMonth - 1]})</span>
              <span className="text-gray-900">৳{totalSpent.toLocaleString()} / ৳{budget.toLocaleString()} ({budgetPercentage}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${budgetPercentage > 85 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${budgetPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Category Spending list */}
          {categoryReport.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 flex items-center">
                <PieChart className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                Spending by Category
              </h4>

              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs space-y-3">
                {categoryReport.map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-gray-700">
                        {item.name} <span className="text-gray-400 font-normal">({item.banglaName})</span>
                      </span>
                      <span className="font-bold text-gray-900">৳{item.amount.toLocaleString()} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-green-600 h-full rounded-full" style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Spending list */}
          {marketReport.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 flex items-center">
                <Store className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                Spending by Market / Shop
              </h4>

              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs space-y-3">
                {marketReport.map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-gray-700">{item.name}</span>
                      <span className="font-bold text-gray-900">৳{item.amount.toLocaleString()} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-green-600 h-full rounded-full" style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Products purchased */}
          {productReport.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 flex items-center">
                <Apple className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                Most Frequently Purchased Items
              </h4>

              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-2xs divide-y divide-gray-100">
                {productReport.map((prod, index) => (
                  <div key={prod.name} className="px-4 py-3 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-gray-800 block">
                        {index + 1}. {prod.name}{' '}
                        {prod.bangla && <span className="text-gray-400 font-normal">({prod.bangla})</span>}
                      </span>
                      <span className="text-3xs text-gray-400 block font-medium">
                        Purchased {prod.count} {prod.count > 1 ? 'times' : 'time'}
                      </span>
                    </div>

                    <span className="text-sm font-extrabold text-gray-900">
                      ৳{prod.spend.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
