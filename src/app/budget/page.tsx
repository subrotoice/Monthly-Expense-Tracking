'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/db/localDb';
import { ArrowLeft, Save, Calendar, Check, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSync } from '@/hooks/useSync';

export default function BudgetPage() {
  const router = useRouter();
  const { triggerSync } = useSync();

  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [amount, setAmount] = useState<number | ''>('');
  const [successMsg, setSuccessMsg] = useState(false);

  // Fetch current month budget and history of budgets
  const data = useLiveQuery(async () => {
    // Current month config
    const current = await localDb.budgets
      .where('[month+year]')
      .equals([month, year])
      .first();

    // All budgets
    const allBudgets = await localDb.budgets
      .where('deleted')
      .equals(0)
      .toArray();

    // Sort by year desc, month desc
    allBudgets.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return {
      current,
      allBudgets,
    };
  }, [month, year]);

  // Set the input field amount if budget changes
  React.useEffect(() => {
    if (data?.current) {
      setAmount(data.current.amount);
    } else {
      setAmount('');
    }
  }, [data?.current]);

  const handleSaveBudget = async () => {
    if (amount === '' || amount <= 0) {
      alert('Please enter a valid budget amount.');
      return;
    }

    try {
      // Find if record already exists (even if synced/not synced)
      const existing = await localDb.budgets
        .where('[month+year]')
        .equals([month, year])
        .first();

      const id = existing ? existing.id : crypto.randomUUID();

      await localDb.budgets.put({
        id,
        month,
        year,
        amount: Number(amount),
        createdAt: existing ? existing.createdAt : new Date(),
        updatedAt: new Date(),
        synced: 0,
        deleted: 0,
      });

      setSuccessMsg(true);
      triggerSync();
      setTimeout(() => setSuccessMsg(false), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to save budget.');
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <h2 className="text-base font-bold text-gray-900">Monthly Budget Settings</h2>
        <div className="w-12"></div>
      </div>

      {/* Adjust Budget Form */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-2xs space-y-4">
        <div className="flex justify-between items-center pb-1">
          <span className="text-xs font-bold text-gray-800 flex items-center">
            <Calendar className="w-4 h-4 text-green-600 mr-1.5" />
            Set Budget Limit
          </span>
          {successMsg && (
            <span className="text-3xs text-green-700 bg-green-50 px-2 py-0.5 rounded-md flex items-center font-bold animate-pulse">
              <Check className="w-3 h-3 mr-0.5" /> Saved
            </span>
          )}
        </div>

        {/* Date Month/Year Picker */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col space-y-1">
            <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full border border-gray-300 text-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold bg-white shadow-2xs"
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
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full border border-gray-300 text-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold bg-white shadow-2xs"
            >
              {[2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Budget Amount */}
        <div className="flex flex-col space-y-1">
          <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Budget Amount (৳)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="e.g. 20000"
            className="w-full border border-gray-300 text-black bg-white placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
          />
        </div>

        <button
          onClick={handleSaveBudget}
          className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 text-sm font-bold transition-all transform active:scale-95 shadow-sm flex items-center justify-center space-x-1.5"
        >
          <Save className="w-4.5 h-4.5" />
          <span>Save Budget</span>
        </button>
      </div>

      {/* Budget History List */}
      {data?.allBudgets && data.allBudgets.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
            Defined Budgets History
          </h4>

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-2xs divide-y divide-gray-100">
            {data.allBudgets.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setMonth(b.month);
                  setYear(b.year);
                }}
                className="w-full text-left p-4 flex justify-between items-center hover:bg-gray-50/50 transition-colors"
              >
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-gray-800 leading-none">
                    {monthNames[b.month - 1]} {b.year}
                  </span>
                  <span className="text-3xs text-gray-400 block font-medium">Click to edit</span>
                </div>

                <span className="text-sm font-extrabold text-green-600">
                  ৳{b.amount.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
