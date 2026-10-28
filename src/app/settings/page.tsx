'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { localDb } from '@/db/localDb';
import { SyncManager } from '@/db/syncManager';
import { useSync } from '@/hooks/useSync';
import { useRouter } from 'next/navigation';
import {
  Download,
  Upload,
  Database,
  Store,
  FolderOpen,
  Calendar,
  RefreshCw,
  Trash2,
  Check,
  TrendingUp,
  FileSpreadsheet,
  ChevronRight
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { syncStatus, lastSync, triggerSync } = useSync();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  // Export all IndexedDB data as JSON
  const handleExportJSON = async () => {
    try {
      const exportData: Record<string, any[]> = {};
      const tables = ['categories', 'products', 'productAliases', 'markets', 'shoppingSessions', 'shoppingItems', 'budgets', 'personalExpenses'];

      for (const tableName of tables) {
        const table = (localDb as any)[tableName];
        if (table) {
          exportData[tableName] = await table.toArray();
        }
      }

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bazarhisab_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMsg('Backup JSON downloaded successfully!', 'success');
    } catch (err) {
      showMsg('Failed to export data.', 'error');
    }
  };

  // Export all shopping items as CSV for Excel processing
  const handleExportCSV = async () => {
    try {
      const items = await localDb.shoppingItems.where('deleted').equals(0).toArray();
      const sessions = await localDb.shoppingSessions.where('deleted').equals(0).toArray();
      const sessionMap = new Map(sessions.map(s => [s.id, s]));

      const products = await localDb.products.toArray();
      const prodMap = new Map(products.map(p => [p.id, p]));

      const marketsList = await localDb.markets.toArray();
      const marketMap = new Map(marketsList.map(m => [m.id, m.name]));

      const categoriesList = await localDb.categories.toArray();
      const catMap = new Map(categoriesList.map(c => [c.id, c.name]));

      // CSV Header
      let csvContent = 'Date,Market,Category,Product,Quantity,Unit,Unit Price,Total Price,Notes\n';

      items.forEach((item) => {
        const sess = sessionMap.get(item.sessionId);
        if (sess) {
          const dateStr = new Date(sess.date).toISOString().split('T')[0];
          const market = sess.marketId ? marketMap.get(sess.marketId) || '' : 'Local Bazar';
          const prod = prodMap.get(item.productId);
          const prodName = prod ? prod.name : 'Unknown';
          const catName = prod ? catMap.get(prod.categoryId) || '' : '';
          const notes = sess.notes ? sess.notes.replace(/"/g, '""') : '';

          csvContent += `"${dateStr}","${market}","${catName}","${prodName}",${item.quantity},"${item.unit}",${item.unitPrice},${item.totalPrice},"${notes}"\n`;
        }
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bazarhisab_purchases_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMsg('Purchases CSV downloaded!', 'success');
    } catch (err) {
      showMsg('Failed to export CSV.', 'error');
    }
  };

  // Import JSON backup data
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const tables = ['categories', 'products', 'productAliases', 'markets', 'shoppingSessions', 'shoppingItems', 'budgets', 'personalExpenses'];

        // Simple validation check
        const hasValidTable = tables.some(t => Array.isArray(data[t]));
        if (!hasValidTable) {
          showMsg('Invalid backup file structure.', 'error');
          return;
        }

        if (!confirm('This will merge backup data with your current local database. Proceed?')) return;

        // Perform import in a transaction
        await localDb.transaction('rw', [
          localDb.categories,
          localDb.products,
          localDb.productAliases,
          localDb.markets,
          localDb.shoppingSessions,
          localDb.shoppingItems,
          localDb.budgets,
          localDb.personalExpenses
        ], async () => {
          for (const tableName of tables) {
            const list = data[tableName];
            if (Array.isArray(list)) {
              const table = (localDb as any)[tableName];
              for (const record of list) {
                // Convert date strings back to Date objects
                const formatted = { ...record };
                if (record.createdAt) formatted.createdAt = new Date(record.createdAt);
                if (record.updatedAt) formatted.updatedAt = new Date(record.updatedAt);
                if (record.date) formatted.date = new Date(record.date);

                // Set synced to 0 so these records will sync up to Neon on next online check
                formatted.synced = 0;

                await table.put(formatted);
              }
            }
          }
        });

        showMsg('Restore complete! Database updated.', 'success');
        triggerSync();
      } catch (err) {
        showMsg('Failed to parse backup file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Clear local DB completely
  const handleClearDatabase = async () => {
    if (!confirm('WARNING: This will delete ALL local data in IndexedDB. Ensure you have backed up. Proceed?')) return;
    if (!confirm('Are you absolutely sure? This action is irreversible.')) return;

    try {
      await localDb.delete();
      // Re-initialize database
      window.location.reload();
    } catch (err) {
      showMsg('Failed to clear database.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">More & Settings</h2>
        <p className="text-xs text-gray-500">Configure parameters, imports, exports, and sync</p>
      </div>

      {/* Floating alert message */}
      {msg && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold animate-pulse ${
            msg.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Navigation Menu Links */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-2xs divide-y divide-gray-100">
        <Link href="/budget" className="flex items-center justify-between px-4 py-4 hover:bg-gray-50/50 transition-colors">
          <div className="flex items-center space-x-3 text-gray-700">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-bold">Monthly Budgets</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>

        <Link href="/reports" className="flex items-center justify-between px-4 py-4 hover:bg-gray-50/50 transition-colors">
          <div className="flex items-center space-x-3 text-gray-700">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-bold">Spending Analysis & Reports</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
      </div>

      {/* Sync Status Section */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
          Neon PostgreSQL Synchronization
        </h3>

        <div className="flex justify-between items-center text-sm">
          <div>
            <span className="text-gray-500 font-semibold block">Last synced time:</span>
            <span className="text-gray-900 font-extrabold">{lastSync}</span>
          </div>

          <button
            onClick={triggerSync}
            disabled={syncStatus === 'syncing'}
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-xs disabled:opacity-50"
          >
            {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Backup and Export Section */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
          <Database className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
          Backup & Data Portability
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExportJSON}
            className="flex flex-col items-center justify-center border border-gray-200 hover:bg-gray-50 rounded-xl p-4 text-center space-y-2 transition-all active:scale-95"
          >
            <Download className="w-6 h-6 text-green-600" />
            <span className="text-xs font-bold text-gray-800">Export JSON</span>
            <span className="text-4xs text-gray-400 leading-none">Database Backup file</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex flex-col items-center justify-center border border-gray-200 hover:bg-gray-50 rounded-xl p-4 text-center space-y-2 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
            <span className="text-xs font-bold text-gray-800">Export CSV</span>
            <span className="text-4xs text-gray-400 leading-none">Open in Excel / Sheets</span>
          </button>
        </div>

        {/* Restore from JSON */}
        <div className="pt-2">
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImportJSON}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center space-x-1.5 border border-gray-200 hover:bg-gray-50 rounded-xl py-3 text-sm font-semibold text-gray-700 transition-colors"
          >
            <Upload className="w-4 h-4 text-gray-400" />
            <span>Restore from JSON Backup</span>
          </button>
        </div>
      </div>

      {/* Dangerous Operations */}
      <div className="bg-red-50/50 border border-red-100 rounded-xl p-5 space-y-3.5 shadow-2xs">
        <div className="space-y-1">
          <span className="text-xs font-bold text-red-800 block flex items-center">
            <Trash2 className="w-4 h-4 mr-1" /> Critical Actions
          </span>
          <span className="text-3xs text-red-600 font-medium block">
            Actions below affect your local device storage database state directly.
          </span>
        </div>

        <button
          onClick={handleClearDatabase}
          className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5"
        >
          <Trash2 className="w-4.5 h-4.5" />
          <span>Clear Local Database</span>
        </button>
      </div>
    </div>
  );
}
