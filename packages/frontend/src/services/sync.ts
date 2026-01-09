import {
  getPendingOperations,
  removePendingOperation,
  updatePendingOperationRetry,
  getPendingCount,
  type PendingOperation,
} from '../lib/offlineDb';
import { api } from '../lib/api';

const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';
type SyncListener = (status: SyncStatus, pendingCount: number) => void;

class SyncService {
  private status: SyncStatus = 'idle';
  private listeners: Set<SyncListener> = new Set();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Initial status
    this.isOnline = navigator.onLine;
    if (!this.isOnline) {
      this.setStatus('offline');
    }
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.setStatus('idle');
    // Trigger sync when coming back online
    this.sync();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.setStatus('offline');
  };

  private setStatus(status: SyncStatus) {
    this.status = status;
    this.notifyListeners();
  }

  private async notifyListeners() {
    const pendingCount = await getPendingCount();
    this.listeners.forEach((listener) => listener(this.status, pendingCount));
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current status
    this.notifyListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  async sync(): Promise<{ success: number; failed: number }> {
    if (!this.isOnline) {
      this.setStatus('offline');
      return { success: 0, failed: 0 };
    }

    const pendingOps = await getPendingOperations();
    if (pendingOps.length === 0) {
      this.setStatus('idle');
      return { success: 0, failed: 0 };
    }

    this.setStatus('syncing');
    let success = 0;
    let failed = 0;

    for (const op of pendingOps) {
      try {
        await this.processOperation(op);
        await removePendingOperation(op.id);
        success++;
      } catch (error) {
        console.error('Sync operation failed:', error);
        if (op.retryCount >= MAX_RETRIES) {
          // Max retries reached, remove the operation
          await removePendingOperation(op.id);
          failed++;
        } else {
          await updatePendingOperationRetry(op.id);
          failed++;
        }
      }
    }

    this.setStatus(failed > 0 ? 'error' : 'idle');
    await this.notifyListeners();

    return { success, failed };
  }

  private async processOperation(op: PendingOperation): Promise<void> {
    const { type, action, data } = op;
    const endpoint = `/${type}s`; // weights, meals, exercises

    switch (action) {
      case 'create':
        await api.post(endpoint, data);
        break;
      case 'update': {
        const updateData = data as { id: string; input: unknown };
        await api.patch(`${endpoint}/${updateData.id}`, updateData.input);
        break;
      }
      case 'delete': {
        const deleteId = data as string;
        await api.delete(`${endpoint}/${deleteId}`);
        break;
      }
    }
  }

  startAutoSync() {
    if (this.syncTimer) {
      return;
    }

    // Initial sync
    this.sync();

    // Periodic sync
    this.syncTimer = setInterval(() => {
      if (this.isOnline && this.status !== 'syncing') {
        this.sync();
      }
    }, SYNC_INTERVAL);
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  destroy() {
    this.stopAutoSync();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
  }
}

// Singleton instance
export const syncService = new SyncService();

// Hook for React components
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((newStatus, count) => {
      setStatus(newStatus);
      setPendingCount(count);
    });

    // Start auto sync when component mounts
    syncService.startAutoSync();

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    status,
    pendingCount,
    isOnline: syncService.isNetworkOnline(),
    sync: () => syncService.sync(),
  };
}

// Need to import React hooks
import { useState, useEffect } from 'react';
