'use client';

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/db/localDb';
import Link from 'next/link';
import { ShoppingBag, TrendingUp, Calendar, ArrowRight, Store, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const data = useLiveQuery(async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of current week (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get active sessions
    const sessions = await localDb.shoppingSessions
      .where('deleted')
      .equals(0)
      .toArray();

    // Sort sessions by date descending
    sessions.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate stats
    let todayExpense = 0;
    let weekExpense = 0;
    let monthExpense = 0;

    const todayMs = startOfToday.getTime();
    const weekMs = startOfWeek.getTime();
    const monthMs = startOfMonth.getTime();

    sessions.forEach((s) => {
      const time = s.date.getTime();
      if (time >= todayMs) todayExpense += s.total;
      if (time >= weekMs) weekExpense += s.total;
      if (time >= monthMs) monthExpense += s.total;
    });

    // Get current month budget
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const budgetRecord = await localDb.budgets
      .where('[month+year]')
      .equals([currentMonth, currentYear])
      .first();

    const budget = budgetRecord ? budgetRecord.amount : 20000; // Default budget if not set

    // Show only sessions from the current month in the dashboard list.
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const recentSessions = sessions.filter(
      (session) => session.date >= startOfMonth && session.date < startOfNextMonth
    );

    // Fetch markets for names
    const markets = await localDb.markets.toArray();
    const marketMap = new Map(markets.map(m => [m.id, m.name]));

    // Fetch categories and products for category breakdown
    const categories = await localDb.categories.toArray();
    const catMap = new Map(categories.map(c => [c.id, c.name]));
    const catBanglaMap = new Map(categories.map(c => [c.id, c.banglaName || c.name]));

    const products = await localDb.products.toArray();
    const prodToCatMap = new Map(products.map(p => [p.id, p.categoryId]));
    const prodNameMap = new Map(products.map(p => [p.id, p.name]));

    // Calculate category breakdown and session items for quick view
    const categoryTotals: Record<string, number> = {};
    const sessionItemsMap = new Map<string, string[]>();
    const items = await localDb.shoppingItems.where('deleted').equals(0).toArray();

    items.forEach((item) => {
      // Find session to check if it's in the current month
      const sess = sessions.find(s => s.id === item.sessionId);
      if (sess && sess.date.getTime() >= monthMs) {
        const catId = prodToCatMap.get(item.productId);
        if (catId) {
          categoryTotals[catId] = (categoryTotals[catId] || 0) + item.totalPrice;
        }
      }

      // Collect product name for session quick view
      const pName = prodNameMap.get(item.productId);
      if (pName) {
        const list = sessionItemsMap.get(item.sessionId) || [];
        list.push(pName);
        sessionItemsMap.set(item.sessionId, list);
      }
    });

    const categoryBreakdown = Object.entries(categoryTotals).map(([catId, total]) => ({
      name: catMap.get(catId) || 'Other',
      banglaName: catBanglaMap.get(catId) || 'অন্যান্য',
      amount: total,
      percentage: monthExpense > 0 ? Math.round((total / monthExpense) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    return {
      todayExpense,
      weekExpense,
      monthExpense,
      budget,
      recentSessions,
      marketMap,
      sessionItemsMap,
      categoryBreakdown,
    };
  });

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  const { todayExpense, weekExpense, monthExpense, budget, recentSessions, marketMap, sessionItemsMap, categoryBreakdown } = data;
  const remainingBudget = budget - monthExpense;
  const budgetPercentage = budget > 0 ? Math.min(Math.round((monthExpense / budget) * 100), 100) : 0;
  const isOverBudget = remainingBudget < 0;
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  return (
    <div className="space-y-5">
      {/* Welcome Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Bazar summary</h2>
        <p className="text-xs text-gray-500">Track your monthly expenses and limits</p>
      </div>

      {/* Budget Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Budget</span>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">৳{budget.toLocaleString()}</h3>
          </div>
          <Link
            href="/budget"
            className="text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Adjust Budget
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget ? 'bg-red-500' : budgetPercentage > 85 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${budgetPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs font-medium">
            <span className="text-gray-500">{budgetPercentage}% Spent</span>
            <span className={isOverBudget ? 'text-red-600 font-bold' : 'text-gray-600'}>
              {isOverBudget ? `Over limit by ৳${Math.abs(remainingBudget).toLocaleString()}` : `৳${remainingBudget.toLocaleString()} left`}
            </span>
          </div>
        </div>
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-100/80 shadow-2xs">
          <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">Today</span>
          <span className="text-base font-extrabold text-gray-900 block mt-1">৳{todayExpense.toLocaleString()}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-100/80 shadow-2xs">
          <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">This Week</span>
          <span className="text-base font-extrabold text-gray-900 block mt-1">৳{weekExpense.toLocaleString()}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-100/80 shadow-2xs">
          <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">This Month</span>
          <span className="text-base font-extrabold text-gray-900 block mt-1">৳{monthExpense.toLocaleString()}</span>
        </div>
      </div>

      {/* Recent Shopping Sessions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-green-600" />
            {currentMonthName} Bazar Sessions
          </h4>
          <Link href="/history" className="text-xs font-semibold text-green-700 hover:text-green-800 flex items-center gap-1 rounded-lg border border-green-100 bg-green-50 px-2.5 py-1.5 transition-colors">
            Older sessions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-6 text-center">
            <Store className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500 font-medium">No bazaar sessions this month yet.</p>
            <Link
              href="/market/new"
              className="text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors mt-3 inline-block"
            >
              Add Your First Bazar
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-2xs">
            {recentSessions.map((session, index) => {
              const marketName = session.marketId
                ? marketMap.get(session.marketId)
                : (session.notes?.trim() || 'No Notes');
              const itemsList = sessionItemsMap.get(session.id) || [];
              const itemsSummary = itemsList.join(', ');

              return (
                <Link
                  key={session.id}
                  href={`/market/${session.id}`}
                  className={`flex justify-between items-center px-4 py-3.5 hover:bg-gray-50/50 transition-colors gap-3 ${
                    index < recentSessions.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="space-y-0.5 shrink-0">
                    <span className="text-sm font-bold text-gray-800 block leading-tight">
                      {new Date(session.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-gray-400 block" style={{ fontSize: '11px' }}>{marketName}</span>
                  </div>

                  {itemsSummary && (
                    <div className="flex-1 min-w-0 px-2 text-left" title={itemsSummary}>
                      <span className="text-xs text-gray-500 font-medium line-clamp-2 leading-snug block">
                        {itemsSummary}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-sm font-extrabold text-gray-900">৳{session.total.toLocaleString()}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Spending Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-green-600" />
            {currentMonthName} Category Expense
          </h4>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs space-y-3">
            {categoryBreakdown.map((item) => (
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
    </div>
  );
}
