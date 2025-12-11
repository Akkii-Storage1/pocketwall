import { db, auth } from './firebase';
import { doc, setDoc, getDoc, writeBatch, collection } from 'firebase/firestore';
import DataAdapter from './dataAdapter';

export const MigrationManager = {
    /**
     * Checks if the user has already migrated their data.
     */
    checkMigrationStatus: async (userId) => {
        if (!userId) return false;
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            return userDoc.data().isMigrated === true;
        }
        return false;
    },

    /**
     * Migrates all local data to Firestore.
     */
    migrateLocalToCloud: async (userId, onProgress) => {
        if (!userId) throw new Error("User ID is required for migration");

        console.log("Starting Migration for User:", userId);
        if (onProgress) onProgress("Fetching local data...", 10);

        // 1. Get all local data
        const localData = await DataAdapter.getAllData();

        // 2. Prepare Batches
        // Firestore allows max 500 writes per batch. We'll split by collection.
        const batchSize = 450; // Safe margin

        try {
            // --- Transactions ---
            if (localData.transactions && localData.transactions.length > 0) {
                if (onProgress) onProgress(`Migrating ${localData.transactions.length} transactions...`, 20);
                await uploadCollection(userId, 'transactions', localData.transactions, batchSize);
            }

            // --- Payees ---
            if (localData.payees && localData.payees.length > 0) {
                if (onProgress) onProgress("Migrating payees...", 40);
                await uploadCollection(userId, 'payees', localData.payees, batchSize);
            }

            // --- Recurring ---
            if (localData.recurring && localData.recurring.length > 0) {
                if (onProgress) onProgress("Migrating recurring rules...", 50);
                await uploadCollection(userId, 'recurring', localData.recurring, batchSize);
            }

            // --- Investments ---
            if (localData.investments && localData.investments.length > 0) {
                if (onProgress) onProgress("Migrating investments...", 60);
                await uploadCollection(userId, 'investments', localData.investments, batchSize);
            }

            // --- Goals ---
            if (localData.goals && localData.goals.length > 0) {
                if (onProgress) onProgress("Migrating goals...", 70);
                await uploadCollection(userId, 'goals', localData.goals, batchSize);
            }

            // --- Settings & Misc (Single Doc) ---
            if (onProgress) onProgress("Migrating settings...", 80);
            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, {
                settings: localData.settings || {},
                budgets: localData.budgets || {},
                alerts: localData.alerts || [],
                friends: localData.friends || [],
                shared_expenses: localData.shared_expenses || [],
                reminders: localData.reminders || [],
                loans: localData.loans || [],
                assets: localData.assets || [],
                charity: localData.charity || [],
                isMigrated: true,
                migrationDate: new Date().toISOString()
            }, { merge: true });

            if (onProgress) onProgress("Migration Complete!", 100);
            return true;

        } catch (error) {
            console.error("Migration Failed:", error);
            throw error;
        }
    }
};

/**
 * Helper to upload an array of items to a subcollection in batches.
 */
async function uploadCollection(userId, collectionName, items, batchSize) {
    const collectionRef = collection(db, 'users', userId, collectionName);

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = items.slice(i, i + batchSize);

        chunk.forEach(item => {
            // Use item.id as doc ID if available, else auto-id
            const docRef = item.id ? doc(collectionRef, String(item.id)) : doc(collectionRef);
            batch.set(docRef, item);
        });

        await batch.commit();
    }
}

export default MigrationManager;
