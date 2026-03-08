import React, { useEffect, useState } from 'react';
import { rfidOfflineService } from '../services/rfidOfflineService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';

/**
 * Global component to handle background synchronization of offline attendance records.
 * Listens for network status changes and periodically checks for pending syncs.
 */
const GlobalSyncManager: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (!user?.school_id) return;

        const performSync = async () => {
            if (isSyncing || !navigator.onLine) return;

            try {
                const queue = await rfidOfflineService.getQueue();
                if (queue.length === 0) return;

                setIsSyncing(true);
                const result = await rfidOfflineService.syncQueue();

                if (result.success > 0 || result.failed > 0) {
                    // Notify any listening pages (like RFIDAttendancePage) to refresh their queue counts/stats
                    window.dispatchEvent(new CustomEvent('offline-sync-completed', { detail: result }));
                }

                if (result.success > 0) {
                    showToast(`Synced ${result.success} offline records successfully`, 'success');
                }

                if (result.failed > 0) {
                    showToast(`Failed to sync ${result.failed} records. Will retry later.`, 'error');
                }
            } catch (error) {
                console.error('Background sync failed:', error);
            } finally {
                setIsSyncing(false);
            }
        };

        // 1. Sync when network status changes to online
        const handleOnline = () => {
            console.log('[GlobalSync] Network back online. Triggering sync...');
            performSync();
        };

        window.addEventListener('online', handleOnline);

        // 2. Periodic sync check (every 5 minutes) as a fallback
        const interval = setInterval(performSync, 5 * 60 * 1000);

        // 3. Initial check on mount
        performSync();

        return () => {
            window.removeEventListener('online', handleOnline);
            clearInterval(interval);
        };
    }, [user?.school_id, isSyncing]);

    return null; // This component doesn't render anything visible
};

export default GlobalSyncManager;
