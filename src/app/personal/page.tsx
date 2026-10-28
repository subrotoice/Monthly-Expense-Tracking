'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb, type LocalPersonalExpense } from '@/db/localDb';
import { useSync } from '@/hooks/useSync';
import {
  Wallet,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Search,
  X,
  Check,
  TrendingDown,
  Clock,
  ChevronDown,
} from 'lucide-react';

export default function PersonalExpensesPage() {
  const { triggerSync } = useSync();

  // Input state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('current');

  // Edit state
  const [editingExpense, setEditingExpense] = useState<LocalPersonalExpense | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState<number | ''>('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Fetch all active personal expenses
  const allExpenses = useLiveQuery(async () => {
    const list = await localDb.personalExpenses
      .where('deleted')
      .equals(0)
      .toArray();

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt.getTime() - a.createdAt.getTime());
  }, []) || [];

  // Current date markers
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  // Distinct available months for dropdown
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthKey);

    allExpenses.forEach((exp) => {
      const d = new Date(exp.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(key);
    });

    return Array.from(monthsSet).sort().reverse();
  }, [allExpenses, currentMonthKey]);

  // Key stats
  const stats = useMemo(() => {
    let todayTotal = 0;
    let thisMonthTotal = 0;
    let allTimeTotal = 0;

    allExpenses.forEach((exp) => {
      const expDate = new Date(exp.date);
      const expDateStr = expDate.toISOString().split('T')[0];
      const expMonthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;

      if (expDateStr === todayStr) {
        todayTotal += exp.amount;
      }
      if (expMonthKey === currentMonthKey) {
        thisMonthTotal += exp.amount;
      }
      allTimeTotal += exp.amount;
    });

    return { todayTotal, thisMonthTotal, allTimeTotal };
  }, [allExpenses, todayStr, currentMonthKey]);

  // Filtered expenses based on search & month
  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((exp) => {
      const expDate = new Date(exp.date);
      const expMonthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;

      // Month filter
      if (selectedMonth === 'current' && expMonthKey !== currentMonthKey) {
        return false;
      }
      if (selectedMonth !== 'all' && selectedMonth !== 'current' && expMonthKey !== selectedMonth) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = exp.title.toLowerCase().includes(q);
        const matchesNotes = exp.notes ? exp.notes.toLowerCase().includes(q) : false;
        return matchesTitle || matchesNotes;
      }

      return true;
    });
  }, [allExpenses, selectedMonth, currentMonthKey, searchQuery]);

  // Group filtered expenses by date
  const groupedByDate = useMemo(() => {
    const groups: { dateStr: string; label: string; total: number; items: LocalPersonalExpense[] }[] = [];
    const map = new Map<string, { dateStr: string; label: string; total: number; items: LocalPersonalExpense[] }>();

    filteredExpenses.forEach((exp) => {
      const d = new Date(exp.date);
      const dateKey = d.toISOString().split('T')[0];

      let entry = map.get(dateKey);
      if (!entry) {
        let label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (dateKey === todayStr) {
          label = 'Today';
        } else if (dateKey === yesterdayStr) {
          label = 'Yesterday';
        }

        entry = {
          dateStr: dateKey,
          label,
          total: 0,
          items: [],
        };
        map.set(dateKey, entry);
        groups.push(entry);
      }

      entry.items.push(exp);
      entry.total += exp.amount;
    });

    return groups;
  }, [filteredExpenses, todayStr, now]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredExpenses]);

  // Handle Add Expense
  const handleAddExpense = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a title for the expense.');
      return;
    }
    if (amount === '' || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = crypto.randomUUID();
      await localDb.personalExpenses.put({
        id: newId,
        title: title.trim(),
        amount: Number(amount),
        date: new Date(date),
        notes: notes.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: 0,
        deleted: 0,
      });

      // Reset input form
      setTitle('');
      setAmount('');
      setNotes('');
      setShowNotesInput(false);
      triggerSync();
    } catch (err) {
      console.error('Failed to add personal expense:', err);
      alert('Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Edit
  const handleStartEdit = (exp: LocalPersonalExpense) => {
    setEditingExpense(exp);
    setEditTitle(exp.title);
    setEditAmount(exp.amount);
    setEditDate(new Date(exp.date).toISOString().split('T')[0]);
    setEditNotes(exp.notes || '');
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingExpense) return;
    if (!editTitle.trim()) {
      alert('Please enter an expense title.');
      return;
    }
    if (editAmount === '' || Number(editAmount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    try {
      await localDb.personalExpenses.update(editingExpense.id, {
        title: editTitle.trim(),
        amount: Number(editAmount),
        date: new Date(editDate),
        notes: editNotes.trim() || null,
        updatedAt: new Date(),
        synced: 0,
      });

      setEditingExpense(null);
      triggerSync();
    } catch (err) {
      console.error('Failed to update expense:', err);
      alert('Failed to update expense.');
    }
  };

  // Delete Expense
  const handleDelete = async (exp: LocalPersonalExpense) => {
    if (!confirm(`Delete "${exp.title}" (৳${exp.amount})?`)) return;

    try {
      await localDb.personalExpenses.update(exp.id, {
        deleted: 1,
        updatedAt: new Date(),
        synced: 0,
      });
      triggerSync();
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert('Failed to delete expense.');
    }
  };

  const formatMonthLabel = (key: string) => {
    const [year, month] = key.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-600" />
          Personal Expenses
        </h2>
        <p className="text-xs text-gray-500">Track small daily & personal expenses throughout the month</p>
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-gray-100/80 shadow-2xs">
          <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">Today</span>
          <span className="text-base font-extrabold text-gray-900 block mt-0.5">৳{stats.todayTotal.toLocaleString()}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100/80 shadow-2xs">
          <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">This Month</span>
          <span className="text-base font-extrabold text-green-700 block mt-0.5">৳{stats.thisMonthTotal.toLocaleString()}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-100/80 shadow-2xs">
          <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">All Time</span>
          <span className="text-base font-extrabold text-gray-900 block mt-0.5">৳{stats.allTimeTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Quick Add Expense Form */}
      <div className="bg-white rounded-2xl border border-green-200/80 p-4 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-green-600" />
            Quick Add Expense
          </span>
          <button
            type="button"
            onClick={() => setShowNotesInput(!showNotesInput)}
            className="text-3xs font-semibold text-green-700 hover:underline"
          >
            {showNotesInput ? '- Hide Note' : '+ Add Note'}
          </button>
        </div>

        <form onSubmit={handleAddExpense} className="space-y-2.5">
          {/* Title & Amount row */}
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-3">
              <input
                type="text"
                placeholder="Title (e.g. Rickshaw, Tea, Snack)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 text-black bg-white placeholder-gray-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
              />
            </div>
            <div className="col-span-2">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">৳</span>
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 text-black bg-white placeholder-gray-400 rounded-xl pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-bold shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Date row & Submit button */}
          <div className="grid grid-cols-5 gap-2 items-center">
            <div className="col-span-3 flex items-center space-x-1.5">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 text-black bg-white rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-medium shadow-2xs"
              />
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || amount === '' || Number(amount) <= 0}
                className="w-full flex items-center justify-center space-x-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2 text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Optional Note input */}
          {showNotesInput && (
            <input
              type="text"
              placeholder="Optional notes or context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-200 text-black bg-gray-50/50 placeholder-gray-400 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-medium"
            />
          )}
        </form>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex gap-2 items-center">
        {/* Search */}
        <div className="flex-1 flex items-center border border-gray-300 bg-white rounded-xl px-3 py-2 focus-within:border-green-600 focus-within:ring-2 focus-within:ring-green-600/10 transition-all shadow-2xs">
          <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-black placeholder-gray-400 font-semibold focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-0.5 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Month Selector */}
        <div className="shrink-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-xl px-2.5 py-2 text-xs text-black bg-white focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
          >
            <option value="current">This Month</option>
            <option value="all">All Months</option>
            {availableMonths
              .filter((m) => m !== currentMonthKey)
              .map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Total for current view */}
      <div className="flex justify-between items-center px-1 text-xs">
        <span className="text-gray-500 font-medium">
          {filteredExpenses.length} {filteredExpenses.length === 1 ? 'entry' : 'entries'}
        </span>
        <span className="font-extrabold text-gray-800">
          Total: <span className="text-green-700">৳{filteredTotal.toLocaleString()}</span>
        </span>
      </div>

      {/* Expenses List */}
      {groupedByDate.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center space-y-2">
          <Wallet className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-xs text-gray-500 font-medium">
            {searchQuery ? 'No matching expenses found.' : 'No personal expenses recorded for this period.'}
          </p>
          <p className="text-3xs text-gray-400">Use the form above to add your first expense!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div key={group.dateStr} className="space-y-1.5">
              {/* Date Header */}
              <div className="flex justify-between items-center px-1">
                <span className="text-2xs font-bold text-gray-400 uppercase tracking-wider">
                  {group.label}
                  {group.label !== 'Today' && group.label !== 'Yesterday' ? '' : ` (${new Date(group.dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`}
                </span>
                <span className="text-2xs font-extrabold text-gray-600">
                  ৳{group.total.toLocaleString()}
                </span>
              </div>

              {/* Items Card */}
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-2xs divide-y divide-gray-100">
                {group.items.map((exp) => (
                  <div key={exp.id} className="flex justify-between items-center px-3.5 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <span className="text-sm font-bold text-gray-800 block truncate">
                        {exp.title}
                      </span>
                      {exp.notes && (
                        <span className="text-3xs text-gray-400 block truncate">
                          {exp.notes}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-sm font-extrabold text-gray-900">
                        ৳{exp.amount.toLocaleString()}
                      </span>
                      <div className="flex items-center space-x-0.5">
                        <button
                          onClick={() => handleStartEdit(exp)}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingExpense(null)}>
          <div
            className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-green-600" />
                Edit Personal Expense
              </h3>
              <button onClick={() => setEditingExpense(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Title *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-gray-300 text-black bg-white rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Amount (৳) *</label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-gray-300 text-black bg-white rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Date *</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Note (Optional)</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Additional context"
                  className="w-full border border-gray-300 text-black bg-white rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600"
                />
              </div>

              <div className="flex space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 text-xs font-semibold text-gray-600 bg-white border border-gray-300 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded-xl transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
