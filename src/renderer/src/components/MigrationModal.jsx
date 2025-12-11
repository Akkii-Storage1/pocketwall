import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MigrationManager from '../utils/MigrationManager';
import { useAuth } from '../context/AuthContext';

const MigrationModal = ({ onClose }) => {
    const { currentUser } = useAuth();
    const [status, setStatus] = useState('idle'); // idle, migrating, success, error
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('Ready to sync your data to the cloud.');
    const [error, setError] = useState('');

    const startMigration = async () => {
        if (!currentUser) return;

        try {
            setStatus('migrating');
            await MigrationManager.migrateLocalToCloud(currentUser.uid, (msg, pct) => {
                setMessage(msg);
                setProgress(pct);
            });
            setStatus('success');
            setMessage('All data synced successfully!');
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            console.error(err);
            setStatus('error');
            setError('Migration failed: ' + err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700"
            >
                <div className="text-center mb-6">
                    <div className="text-4xl mb-4">☁️</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Syncing Data</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        We are moving your local data to the secure cloud so you can access it anywhere.
                    </p>
                </div>

                {status === 'idle' && (
                    <div className="text-center">
                        <button
                            onClick={startMigration}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors w-full"
                        >
                            Start Sync
                        </button>
                    </div>
                )}

                {status === 'migrating' && (
                    <div className="space-y-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-blue-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <p className="text-center text-sm font-medium text-blue-600 dark:text-blue-400 animate-pulse">
                            {message}
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center space-y-4">
                        <div className="text-green-500 text-5xl">✓</div>
                        <p className="text-lg font-medium text-green-600 dark:text-green-400">
                            {message}
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center space-y-4">
                        <div className="text-red-500 text-5xl">✕</div>
                        <p className="text-red-600 dark:text-red-400 font-medium">
                            {error}
                        </p>
                        <button
                            onClick={startMigration}
                            className="text-blue-600 hover:underline text-sm"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default MigrationModal;
