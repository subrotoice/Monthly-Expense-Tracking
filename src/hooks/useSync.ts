'use client';

import { useState, useEffect, useCallback } from 'react';
import { SyncManager, type SyncStatus } from '@/db/syncManager';

export function useSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<string>('Never');

  const triggerSync = useCallback(async () => {
    await SyncManager.performSync((status) => {
      setSyncStatus(status);
      if (status === 'success') {
        const time = SyncManager.getLastSyncTime();
        setLastSync(time === '1970-01-01T00:00:00.000Z' ? 'Never' : new Date(time).toLocaleTimeString());
      } else if (status === 'offline') {
        setSyncStatus('offline');
      }
    });
  }, []);

  // Run on mount, set up intervals and event listeners
  useEffect(() => {
    // Initial sync
    triggerSync();

    // Set up auto-sync every 30 seconds
    const interval = setInterval(() => {
      triggerSync();
    }, 30000);

    // Event listener for online/offline events
    const handleOnline = () => {
      triggerSync();
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update last sync text on mount
    const time = SyncManager.getLastSyncTime();
    setLastSync(time === '1970-01-01T00:00:00.000Z' ? 'Never' : new Date(time).toLocaleTimeString());

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  return {
    syncStatus,
    lastSync,
    triggerSync,
  };
}
