/**
 * CloudSync - Firebase Firestore Cloud Sync for PocketWall
 * 
 * Features:
 * - Auto-push data to cloud on every save
 * - Pull data from cloud on login
 * - Conflict detection with timestamp comparison
 * - Offline support (queue changes when offline)
 */

import { db, auth } from './firebase';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

// Sync status for UI feedback
let syncStatus = 'idle'; // idle, syncing, success, error, offline
let lastSyncTime = null;
let syncListeners = [];

// Queue for offline changes
let offlineQueue = [];

/**
 * Subscribe to sync status changes
 */
export const onSyncStatusChange = (callback) => {
    syncListeners.push(callback);
    return () => {
        syncListeners = syncListeners.filter(cb => cb !== callback);
    };
};

const notifySyncStatus = (status, message = '') => {
    syncStatus = status;
    if (status === 'success') lastSyncTime = new Date();
    syncListeners.forEach(cb => cb({ status, message, lastSyncTime }));
};

/**
 * Get current user ID
 */
const getUserId = () => {
    const user = auth.currentUser;
    if (!user) return null;
    return user.uid;
};

/**
 * Push all data to cloud
 * Called after every local save
 */
export const pushToCloud = async (data) => {
    const userId = getUserId();
    if (!userId) {
        console.log('CloudSync: No user logged in, skipping push');
        return false;
    }

    // Check if online
    if (!navigator.onLine) {
        console.log('CloudSync: Offline, queuing changes');
        offlineQueue.push({ type: 'push', data, timestamp: Date.now() });
        notifySyncStatus('offline', 'Changes will sync when online');
        return false;
    }

    try {
        notifySyncStatus('syncing', 'Saving to cloud...');

        const userDocRef = doc(db, 'users', userId);

        // Prepare data with metadata
        const cloudData = {
            ...data,
            _meta: {
                lastModified: serverTimestamp(),
                lastModifiedLocal: new Date().toISOString(),
                deviceId: getDeviceId(),
                version: '1.0'
            }
        };

        await setDoc(userDocRef, cloudData, { merge: true });

        notifySyncStatus('success', 'Saved to cloud');
        console.log('CloudSync: Data pushed successfully');
        return true;
    } catch (error) {
        console.error('CloudSync: Push failed', error);
        notifySyncStatus('error', error.message);

        // Queue for retry
        offlineQueue.push({ type: 'push', data, timestamp: Date.now() });
        return false;
    }
};

/**
 * Pull data from cloud
 * Called on app start / login
 */
export const pullFromCloud = async () => {
    const userId = getUserId();
    if (!userId) {
        console.log('CloudSync: No user logged in, skipping pull');
        return null;
    }

    if (!navigator.onLine) {
        notifySyncStatus('offline', 'Using local data');
        return null;
    }

    try {
        notifySyncStatus('syncing', 'Loading from cloud...');

        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const cloudData = docSnap.data();
            notifySyncStatus('success', 'Loaded from cloud');
            console.log('CloudSync: Data pulled successfully');

            // Remove metadata before returning
            const { _meta, ...userData } = cloudData;
            return { data: userData, meta: _meta };
        } else {
            console.log('CloudSync: No cloud data found for user');
            notifySyncStatus('success', 'No cloud data');
            return null;
        }
    } catch (error) {
        console.error('CloudSync: Pull failed', error);
        notifySyncStatus('error', error.message);
        return null;
    }
};

/**
 * Check if cloud data is newer than local
 */
export const checkForUpdates = async (localTimestamp) => {
    const userId = getUserId();
    if (!userId) return { hasUpdates: false };

    try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) return { hasUpdates: false };

        const cloudData = docSnap.data();
        const cloudTimestamp = cloudData._meta?.lastModified?.toDate?.() || new Date(0);
        const localDate = new Date(localTimestamp || 0);

        return {
            hasUpdates: cloudTimestamp > localDate,
            cloudTimestamp,
            localTimestamp: localDate
        };
    } catch (error) {
        console.error('CloudSync: Check failed', error);
        return { hasUpdates: false, error };
    }
};

/**
 * Sync pending offline changes
 */
export const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    if (!navigator.onLine) return;

    console.log(`CloudSync: Syncing ${offlineQueue.length} offline changes`);

    // Get latest data and push
    const pendingPush = offlineQueue.filter(q => q.type === 'push');
    if (pendingPush.length > 0) {
        // Use the most recent push
        const latest = pendingPush.sort((a, b) => b.timestamp - a.timestamp)[0];
        await pushToCloud(latest.data);
    }

    offlineQueue = [];
};

/**
 * Generate a unique device ID
 */
const getDeviceId = () => {
    let deviceId = localStorage.getItem('pocketwall_device_id');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('pocketwall_device_id', deviceId);
    }
    return deviceId;
};

/**
 * Get sync status
 */
export const getSyncStatus = () => ({
    status: syncStatus,
    lastSyncTime,
    isOnline: navigator.onLine,
    pendingChanges: offlineQueue.length
});

/**
 * Force sync now
 */
export const forceSync = async (localData) => {
    if (!navigator.onLine) {
        notifySyncStatus('offline', 'Cannot sync while offline');
        return false;
    }

    // First push local changes
    await pushToCloud(localData);

    // Then pull any cloud updates
    const cloudResult = await pullFromCloud();

    return cloudResult;
};

// Listen for online/offline events
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('CloudSync: Back online, syncing...');
        notifySyncStatus('syncing', 'Back online, syncing...');
        syncOfflineQueue();
    });

    window.addEventListener('offline', () => {
        console.log('CloudSync: Went offline');
        notifySyncStatus('offline', 'Working offline');
    });
}

export default {
    pushToCloud,
    pullFromCloud,
    checkForUpdates,
    syncOfflineQueue,
    getSyncStatus,
    forceSync,
    onSyncStatusChange
};
