'use client';

import React from 'react';
import { Cloud, CloudLightning, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useSync } from '@/hooks/useSync';

export default function Header() {
  const { syncStatus, lastSync, triggerSync } = useSync();

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-xs">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-lg">
          ৳
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">BazarHisab</h1>
          <span className="text-2xs text-gray-500">Household Expense Tracker</span>
        </div>
      </div>

      <button
        onClick={triggerSync}
        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100"
        title={`Last sync: ${lastSync}`}
        disabled={syncStatus === 'syncing'}
      >
        {syncStatus === 'syncing' && (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            <span className="text-amber-700">Syncing...</span>
          </>
        )}
        {syncStatus === 'success' && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-700 text-3xs">Synced</span>
          </>
        )}
        {syncStatus === 'offline' && (
          <>
            <CloudOff className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-500 text-3xs">Offline</span>
          </>
        )}
        {syncStatus === 'error' && (
          <>
            <CloudLightning className="w-3.5 h-3.5 text-red-500 animate-bounce" />
            <span className="text-red-700 text-3xs">Sync Error</span>
          </>
        )}
        {syncStatus === 'idle' && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-700 text-3xs">Synced</span>
          </>
        )}
      </button>
    </header>
  );
}
